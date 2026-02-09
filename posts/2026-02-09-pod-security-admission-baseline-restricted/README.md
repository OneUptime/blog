# How to Configure Kubernetes Pod Security Admission for Baseline and Restricted Profiles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Compliance

Description: Learn how to implement Pod Security Admission with baseline and restricted profiles to enforce security standards across Kubernetes namespaces.

---

Pod Security Admission (PSA) replaced PodSecurityPolicy in Kubernetes 1.25, providing a simpler built-in mechanism to enforce security best practices. PSA uses three predefined profiles (privileged, baseline, and restricted) that you apply at the namespace level to control pod security configurations without complex policy objects.

## Understanding Pod Security Standards

Pod Security Standards define three levels of security restrictions:

**Privileged**: Unrestricted policy allowing all pod configurations. Use only for system components and trusted infrastructure workloads.

**Baseline**: Minimally restrictive policy preventing known privilege escalations. Prohibits hostNetwork, hostPID, hostIPC, and privileged containers but allows most common configurations.

**Restricted**: Heavily restricted policy following security hardening best practices. Enforces runAsNonRoot, drops all capabilities, and requires read-only root filesystems.

Each profile represents a different balance between security and compatibility.

## Enabling Pod Security Admission

PSA is enabled by default in Kubernetes 1.23+. Verify it's active:

```bash
# Check API server configuration
kubectl api-resources | grep podsecurity

# Verify admission controller is enabled
kubectl get --raw /api/v1/namespaces/default | jq '.metadata.labels'
```

## Applying Baseline Profile

Configure a namespace to enforce baseline security:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: development
  labels:
    pod-security.kubernetes.io/enforce: baseline
    pod-security.kubernetes.io/audit: baseline
    pod-security.kubernetes.io/warn: baseline
```

The three labels control different enforcement modes:
- **enforce**: Rejects pods that violate the standard
- **audit**: Logs violations to audit logs
- **warn**: Returns warnings to the user but allows the pod

Apply the namespace:

```bash
kubectl apply -f namespace-dev.yaml

# Test with a compliant pod
kubectl run nginx --image=nginx:1.21 -n development

# Test with a non-compliant pod (should be rejected)
kubectl run privileged-pod --image=nginx --privileged=true -n development
# Error: pods "privileged-pod" is forbidden: violates PodSecurity "baseline:latest"
```

## Applying Restricted Profile

Create a namespace with the strictest security profile:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

Pods in this namespace must meet all restricted requirements:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-app
  namespace: production
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: app
    image: nginx:1.21
    securityContext:
      allowPrivilegeEscalation: false
      runAsNonRoot: true
      capabilities:
        drop:
        - ALL
      readOnlyRootFilesystem: true
    ports:
    - containerPort: 8080
    volumeMounts:
    - name: cache
      mountPath: /var/cache/nginx
    - name: run
      mountPath: /var/run
  volumes:
  - name: cache
    emptyDir: {}
  - name: run
    emptyDir: {}
```

This pod meets all restricted requirements:
- Runs as non-root user
- Drops all capabilities
- Uses seccomp profile
- Disables privilege escalation
- Read-only root filesystem

## Mixed Enforcement Levels

Use different enforcement levels for gradual adoption:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: staging
  labels:
    # Warn about restricted violations
    pod-security.kubernetes.io/warn: restricted
    # Audit restricted violations
    pod-security.kubernetes.io/audit: restricted
    # But only enforce baseline
    pod-security.kubernetes.io/enforce: baseline
```

This configuration warns users about restricted violations while only blocking baseline violations, allowing gradual migration.

## Per-Version Pod Security Standards

Pin to specific Kubernetes versions:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: stable-app
  labels:
    pod-security.kubernetes.io/enforce: baseline
    pod-security.kubernetes.io/enforce-version: v1.27
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

This pins enforcement to the baseline standard as defined in Kubernetes v1.27, preventing policy changes when upgrading the cluster.

## Exemptions for System Components

Exempt specific namespaces, users, or RuntimeClasses:

```yaml
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
      # Exempt system namespaces
      namespaces:
        - kube-system
        - kube-public
        - kube-node-lease
      # Exempt specific users
      usernames:
        - system:serviceaccount:kube-system:daemon-set-controller
      # Exempt specific RuntimeClasses
      runtimeClasses:
        - kata-containers
```

This configuration sets cluster-wide defaults while exempting system components.

## Deployment Examples

Baseline-compliant deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: development
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: nginx
        image: nginx:1.21
        ports:
        - containerPort: 80
        securityContext:
          allowPrivilegeEscalation: false
```

Restricted-compliant deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  namespace: production
spec:
  replicas: 5
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 2000
        seccompProfile:
          type: RuntimeDefault
      containers:
      - name: api
        image: myapi:latest
        ports:
        - containerPort: 8080
        securityContext:
          allowPrivilegeEscalation: false
          runAsNonRoot: true
          capabilities:
            drop:
            - ALL
          readOnlyRootFilesystem: true
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: cache
          mountPath: /var/cache
      volumes:
      - name: tmp
        emptyDir: {}
      - name: cache
        emptyDir: {}
```

## Handling Legacy Applications

For applications that cannot meet restricted requirements, use baseline:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: legacy-apps
  labels:
    pod-security.kubernetes.io/enforce: baseline
    pod-security.kubernetes.io/audit: baseline
    pod-security.kubernetes.io/warn: restricted
  annotations:
    description: "Legacy applications that cannot meet restricted profile"
```

The warn label encourages teams to work toward restricted compliance while not blocking deployments.

## Monitoring Pod Security Violations

Check audit logs for violations:

```bash
# View warnings from kubectl
kubectl run test --image=nginx --privileged=true -n production
# Warning: would violate PodSecurity "restricted:latest"

# Check audit logs
kubectl get events -n production | grep PodSecurity

# Query API server audit logs
kubectl logs -n kube-system kube-apiserver-xxx | grep pod-security
```

## Automating Compliance Checks

Create a validation script:

```bash
#!/bin/bash
# check-pod-security-compliance.sh

echo "Pod Security Compliance Report"
echo "=============================="

namespaces=$(kubectl get namespaces -o jsonpath='{.items[*].metadata.name}')

for ns in $namespaces; do
  echo ""
  echo "Namespace: $ns"

  # Check PSA labels
  enforce=$(kubectl get namespace $ns -o jsonpath='{.metadata.labels.pod-security\.kubernetes\.io/enforce}')
  audit=$(kubectl get namespace $ns -o jsonpath='{.metadata.labels.pod-security\.kubernetes\.io/audit}')
  warn=$(kubectl get namespace $ns -o jsonpath='{.metadata.labels.pod-security\.kubernetes\.io/warn}')

  echo "  Enforce: ${enforce:-none}"
  echo "  Audit: ${audit:-none}"
  echo "  Warn: ${warn:-none}"

  # Count pods in namespace
  pod_count=$(kubectl get pods -n $ns --no-headers 2>/dev/null | wc -l)
  echo "  Pods: $pod_count"
done
```

## Gradual Migration Strategy

Migrate from permissive to restricted security:

Step 1: Audit mode

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: myapp
  labels:
    pod-security.kubernetes.io/audit: baseline
    pod-security.kubernetes.io/warn: baseline
```

Step 2: Enforce baseline, warn restricted

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: myapp
  labels:
    pod-security.kubernetes.io/enforce: baseline
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

Step 3: Enforce restricted

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: myapp
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

## Best Practices

Use restricted profile for all production workloads that can support it. This provides the strongest security posture.

Apply baseline profile to development and staging environments as a minimum security standard.

Use warn and audit modes during migration to identify violations without breaking deployments.

Pin enforcement versions when stability is critical. This prevents unexpected policy changes during cluster upgrades.

Document exemptions clearly. Any namespace using privileged or baseline in production needs justification and approval.

Regularly review namespace security labels. Ensure no namespaces have inadvertently weakened security settings.

## Conclusion

Pod Security Admission provides a simple, built-in mechanism for enforcing security standards across Kubernetes clusters. By applying baseline and restricted profiles at the namespace level, you ensure consistent security practices without complex policy management. Use gradual enforcement and monitoring to migrate workloads to more secure configurations over time.
