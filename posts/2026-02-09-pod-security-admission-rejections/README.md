# How to Troubleshoot Kubernetes Pod Security Admission Rejections After PSA Migration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Pod Security

Description: Learn how to diagnose and fix Pod Security Admission rejections after migrating from Pod Security Policies, with practical examples and remediation strategies.

---

Pod Security Admission (PSA) replaced Pod Security Policies in Kubernetes 1.25, introducing a simpler security model. However, the migration often breaks existing workloads when pods that previously ran fine suddenly get rejected for violating security standards.

## Understanding Pod Security Standards

PSA enforces three predefined security standards: Privileged, Baseline, and Restricted. Each standard defines allowed and prohibited pod configurations.

Privileged allows everything, including highly privileged containers. Baseline prevents the most dangerous configurations while allowing common container patterns. Restricted enforces current pod hardening best practices with strict requirements.

## How PSA Works

PSA operates at the namespace level using labels. Three modes exist: enforce (blocks violating pods), audit (logs violations), and warn (shows warnings to users). You can set different standards for each mode.

```bash
# Check namespace PSA labels
kubectl get namespace production -o yaml | grep pod-security

# Example output:
# pod-security.kubernetes.io/enforce: baseline
# pod-security.kubernetes.io/audit: restricted
# pod-security.kubernetes.io/warn: restricted
```

When a pod violates the enforcement standard, admission rejects it immediately. Audit and warn modes allow the pod but generate events.

## Identifying PSA Rejections

PSA rejections produce clear error messages indicating which security standard was violated and why.

```bash
# Attempting to create a privileged pod with baseline enforcement
kubectl apply -f privileged-pod.yaml

Error from server (Forbidden): error when creating "privileged-pod.yaml":
pods "privileged-app" is forbidden: violates PodSecurity "baseline:latest":
privileged (container "app" must not set securityContext.privileged=true)

# Check namespace security settings
kubectl get ns production -o jsonpath='{.metadata.labels}'

# View audit events for violations
kubectl get events -n production | grep "PodSecurity"
```

The error message tells you exactly which field violates which standard, making troubleshooting straightforward.

## Common Baseline Violations

Baseline standard blocks several dangerous configurations commonly used in development clusters.

Running containers as root is allowed by Baseline, but Restricted blocks it. Privileged containers are blocked by Baseline. Host namespace access (hostNetwork, hostPID, hostIPC) is forbidden.

```yaml
# This pod violates Baseline standard
apiVersion: v1
kind: Pod
metadata:
  name: violating-pod
  namespace: production
spec:
  hostNetwork: true  # Violation: hostNetwork not allowed
  containers:
  - name: app
    image: myapp:1.0
    securityContext:
      privileged: true  # Violation: privileged not allowed
    ports:
    - containerPort: 8080
```

Attempting to create this pod in a namespace with Baseline enforcement fails.

## Fixing Privileged Container Requirements

Some containers legitimately need elevated privileges. Instead of making them fully privileged, grant specific capabilities.

```yaml
# Bad: Fully privileged container
apiVersion: v1
kind: Pod
metadata:
  name: network-tool
  namespace: tools
spec:
  containers:
  - name: tool
    image: network-debug:1.0
    securityContext:
      privileged: true  # Too permissive

---
# Good: Specific capabilities only
apiVersion: v1
kind: Pod
metadata:
  name: network-tool
  namespace: tools
spec:
  containers:
  - name: tool
    image: network-debug:1.0
    securityContext:
      capabilities:
        add:
        - NET_ADMIN
        - NET_RAW
```

Grant only the capabilities actually needed. Common capabilities include NET_ADMIN for network tools, SYS_TIME for time sync, and CHOWN for file ownership changes.

## Handling Host Namespace Requirements

Certain workloads like monitoring agents need host namespace access. Create an exception namespace for these workloads.

```yaml
# Create namespace with Privileged standard for system components
apiVersion: v1
kind: Namespace
metadata:
  name: monitoring-system
  labels:
    pod-security.kubernetes.io/enforce: privileged
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-exporter
  namespace: monitoring-system
spec:
  selector:
    matchLabels:
      app: node-exporter
  template:
    metadata:
      labels:
        app: node-exporter
    spec:
      hostNetwork: true  # Allowed in privileged namespace
      hostPID: true      # Allowed in privileged namespace
      containers:
      - name: node-exporter
        image: prom/node-exporter:v1.6.1
        ports:
        - containerPort: 9100
          hostPort: 9100
```

This approach isolates privileged workloads to specific namespaces while keeping application namespaces secure.

## Restricted Standard Violations

Restricted standard is much stricter than Baseline. It requires running as non-root, dropping all capabilities, and disallowing privilege escalation.

```yaml
# This pod violates Restricted standard but passes Baseline
apiVersion: v1
kind: Pod
metadata:
  name: almost-secure-pod
  namespace: production
spec:
  containers:
  - name: app
    image: myapp:2.0
    # Violation: must explicitly run as non-root
    # Violation: must drop all capabilities
    # Violation: must set seccompProfile
    ports:
    - containerPort: 8080
```

Fix all Restricted violations to run in a restricted namespace.

```yaml
# Compliant with Restricted standard
apiVersion: v1
kind: Pod
metadata:
  name: secure-pod
  namespace: production
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 1000
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: app
    image: myapp:2.0
    securityContext:
      allowPrivilegeEscalation: false
      capabilities:
        drop:
        - ALL
      runAsNonRoot: true
      runAsUser: 1000
      seccompProfile:
        type: RuntimeDefault
    ports:
    - containerPort: 8080
```

This configuration satisfies all Restricted requirements.

## Gradual Migration Strategy

Migrate to PSA gradually using warn and audit modes before enforcement.

```yaml
# Phase 1: Warn and audit only
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/warn: baseline
    pod-security.kubernetes.io/audit: baseline
```

Deploy workloads and collect violations.

```bash
# View audit events
kubectl get events -n production --field-selector reason=PodSecurityViolation

# Check warning messages during deployment
kubectl apply -f deployment.yaml
# Warning: would violate PodSecurity "baseline:latest": ...
```

Remediate violations before enabling enforcement.

```yaml
# Phase 2: Enforce after fixing violations
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: baseline
    pod-security.kubernetes.io/audit: baseline
    pod-security.kubernetes.io/warn: baseline
```

## Handling Volume Mount Restrictions

Restricted standard limits volume types to prevent security risks. Only specific volume types are allowed.

```yaml
# Allowed volume types in Restricted mode
apiVersion: v1
kind: Pod
metadata:
  name: restricted-volumes
  namespace: production
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: app
    image: myapp:1.0
    securityContext:
      allowPrivilegeEscalation: false
      capabilities:
        drop:
        - ALL
      runAsNonRoot: true
    volumeMounts:
    - name: config
      mountPath: /etc/config
    - name: data
      mountPath: /data
    - name: cache
      mountPath: /tmp
  volumes:
  - name: config
    configMap:
      name: app-config
  - name: data
    persistentVolumeClaim:
      claimName: app-data
  - name: cache
    emptyDir: {}
```

ConfigMap, Secret, PersistentVolumeClaim, EmptyDir, and DownwardAPI volumes are allowed. HostPath and others are forbidden.

## Container Image Requirements

Restricted mode doesn't directly restrict image sources, but following image best practices helps with other restrictions.

Build images that run as non-root by default.

```dockerfile
FROM node:18-alpine

# Create non-root user
RUN addgroup -g 1000 appuser && \
    adduser -D -u 1000 -G appuser appuser

# Set up application
WORKDIR /app
COPY --chown=appuser:appuser package*.json ./
RUN npm ci --only=production
COPY --chown=appuser:appuser . .

# Switch to non-root user
USER appuser

# Expose port (>1024 to avoid requiring privileges)
EXPOSE 8080

CMD ["node", "server.js"]
```

Images designed for non-root execution work seamlessly with Restricted standard.

## Exemptions and Exceptions

Sometimes workloads can't meet security standards. Use PSA exemptions sparingly.

```yaml
# Configure PSA exemptions in admission config
apiVersion: apiserver.config.k8s.io/v1
kind: AdmissionConfiguration
plugins:
- name: PodSecurity
  configuration:
    apiVersion: pod-security.admission.config.k8s.io/v1
    kind: PodSecurityConfiguration
    defaults:
      enforce: "baseline"
      audit: "restricted"
      warn: "restricted"
    exemptions:
      usernames:
      - system:serviceaccount:monitoring:node-exporter
      runtimeClasses:
      - privileged-class
      namespaces:
      - kube-system
      - monitoring-system
```

Exemptions bypass PSA entirely for specified users, namespaces, or runtime classes. Use them only when absolutely necessary.

## Monitoring PSA Violations

Track PSA violations with Prometheus and alerts.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-rules
  namespace: monitoring
data:
  psa-rules.yml: |
    groups:
    - name: pod_security_admission
      interval: 30s
      rules:
      - alert: PSAViolations
        expr: |
          increase(apiserver_admission_webhook_rejection_count{
            name="PodSecurity"
          }[5m]) > 5
        labels:
          severity: warning
        annotations:
          summary: "Multiple PSA rejections detected"
          description: "{{ $value }} pod security violations in last 5 minutes"

      - record: psa_audit_violations_total
        expr: |
          sum by (namespace, level) (
            increase(apiserver_admission_step_admission_duration_seconds_count{
              operation="CREATE",
              rejected="true"
            }[1h])
          )
```

Audit mode violations appear in Kubernetes audit logs. Configure audit logging to capture these events.

## Testing PSA Compliance

Test pods against PSA standards before deployment using kubectl dry-run with enforcement.

```bash
# Test against baseline standard
kubectl label namespace test-ns pod-security.kubernetes.io/enforce=baseline

# Dry-run to test compliance
kubectl apply -f pod.yaml --dry-run=server -n test-ns

# If successful, pod complies
# If rejected, fix violations

# Test against restricted standard
kubectl label namespace test-ns pod-security.kubernetes.io/enforce=restricted --overwrite
kubectl apply -f pod.yaml --dry-run=server -n test-ns
```

Use CI/CD pipelines to validate PSA compliance before merging configuration changes.

## Best Practices

Start with audit and warn modes to identify violations without breaking workloads. Gradually increase enforcement as you remediate issues.

Use Restricted standard for application workloads. Use Baseline only when necessary. Reserve Privileged for trusted system components.

Build container images that run as non-root by default. Design applications for secure operation from the beginning.

Document why specific namespaces use lower security standards. Future maintainers need context for security decisions.

Regularly review exemptions and privileged namespaces. Remove them when no longer necessary.

## Conclusion

Pod Security Admission rejections after PSP migration are expected but manageable. Understand which security standard your namespace enforces, identify specific violations from error messages, and remediate workloads accordingly. Use gradual migration strategies with audit and warn modes to minimize disruption. Build security into your container images and application designs for seamless PSA compliance. With proper planning and testing, PSA provides strong security without blocking legitimate workloads.
