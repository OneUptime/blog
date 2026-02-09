# How to Configure Kubernetes Pod Security Standards Enforcement for Baseline and Restricted Profiles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Pod Security, PSS, Compliance, Hardening

Description: Configure Kubernetes Pod Security Standards enforcement across namespaces using Baseline and Restricted profiles to prevent insecure pod configurations and meet security compliance requirements without complex admission controllers.

---

Pod Security Standards (PSS) replaced Pod Security Policies as the native Kubernetes mechanism for enforcing pod security configurations. PSS defines three security profiles: Privileged (unrestricted), Baseline (prevents known privilege escalations), and Restricted (heavily restricted, security best practices). Properly configuring PSS enforcement prevents deployment of insecure workloads.

Unlike Pod Security Policies, PSS uses admission controller built into the API server, making it simpler to configure and more maintainable. However, rolling out enforcement requires careful planning to avoid breaking existing workloads while progressively hardening security posture.

## Understanding Pod Security Standard Profiles

The Privileged profile allows everything, suitable only for system components that genuinely require elevated privileges. The Baseline profile prevents known privilege escalations like host namespace access, privileged containers, and dangerous capabilities. Most applications should run under Baseline. The Restricted profile enforces additional hardening like dropping all capabilities, running as non-root, and preventing privilege escalation.

Each profile defines specific controls around security contexts, volume types, host access, and Linux capabilities. Violations of profile requirements result in pod rejection or warnings depending on enforcement mode.

## Enabling Pod Security Admission

Pod Security Admission is enabled by default in Kubernetes 1.25+. For older versions, enable it explicitly:

```yaml
# /etc/kubernetes/manifests/kube-apiserver.yaml
apiVersion: v1
kind: Pod
metadata:
  name: kube-apiserver
  namespace: kube-system
spec:
  containers:
  - name: kube-apiserver
    command:
    - kube-apiserver
    - --enable-admission-plugins=NodeRestriction,PodSecurity
    - --admission-control-config-file=/etc/kubernetes/admission-config.yaml
```

Create admission configuration:

```yaml
# admission-config.yaml
apiVersion: apiserver.config.k8s.io/v1
kind: AdmissionConfiguration
plugins:
- name: PodSecurity
  configuration:
    apiVersion: pod-security.admission.config.k8s.io/v1
    kind: PodSecurityConfiguration
    defaults:
      enforce: "baseline"
      enforce-version: "latest"
      audit: "restricted"
      audit-version: "latest"
      warn: "restricted"
      warn-version: "latest"
    exemptions:
      usernames: []
      runtimeClasses: []
      namespaces:
      - kube-system
      - kube-public
      - kube-node-lease
```

## Configuring Namespace-Level Security Standards

Set security standards per namespace using labels:

```yaml
# namespace-security-labels.yaml
---
# Development: Warn only, allow experimentation
apiVersion: v1
kind: Namespace
metadata:
  name: development
  labels:
    pod-security.kubernetes.io/enforce: privileged
    pod-security.kubernetes.io/audit: baseline
    pod-security.kubernetes.io/warn: baseline

---
# Staging: Enforce baseline, audit restricted
apiVersion: v1
kind: Namespace
metadata:
  name: staging
  labels:
    pod-security.kubernetes.io/enforce: baseline
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted

---
# Production: Enforce restricted profile
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted

---
# System: Privileged for infrastructure
apiVersion: v1
kind: Namespace
metadata:
  name: infrastructure
  labels:
    pod-security.kubernetes.io/enforce: privileged
    pod-security.kubernetes.io/audit: baseline
    pod-security.kubernetes.io/warn: baseline
```

Apply namespace labels:

```bash
kubectl apply -f namespace-security-labels.yaml

# Verify labels
kubectl get namespaces -L pod-security.kubernetes.io/enforce
```

## Testing Pod Security Standards Compliance

Create test workloads to verify PSS enforcement:

```yaml
# test-baseline-violations.yaml
---
# This should be REJECTED in baseline/restricted namespaces
apiVersion: v1
kind: Pod
metadata:
  name: privileged-pod
  namespace: staging
spec:
  containers:
  - name: nginx
    image: nginx:latest
    securityContext:
      privileged: true  # Violates baseline

---
# This should be REJECTED in baseline/restricted namespaces
apiVersion: v1
kind: Pod
metadata:
  name: hostpath-pod
  namespace: staging
spec:
  containers:
  - name: nginx
    image: nginx:latest
    volumeMounts:
    - name: hostpath
      mountPath: /host
  volumes:
  - name: hostpath
    hostPath:
      path: /  # Violates baseline

---
# This should be REJECTED in restricted namespaces
apiVersion: v1
kind: Pod
metadata:
  name: root-user-pod
  namespace: production
spec:
  containers:
  - name: nginx
    image: nginx:latest
    # Running as root violates restricted profile
```

Test the policies:

```bash
# These should fail
kubectl apply -f test-baseline-violations.yaml

# Check for expected rejection messages
kubectl get events -n staging | grep -i "forbidden"
```

## Creating Compliant Pod Specifications

Write pod specs that comply with restricted profile:

```yaml
# restricted-compliant-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secure-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: secure-app
  template:
    metadata:
      labels:
        app: secure-app
    spec:
      # Run as non-root user
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
        seccompProfile:
          type: RuntimeDefault

      containers:
      - name: app
        image: myapp:v1.0.0
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          runAsNonRoot: true
          runAsUser: 1000
          capabilities:
            drop:
            - ALL

        # Use emptyDir for writable directories
        volumeMounts:
        - name: cache
          mountPath: /tmp
        - name: data
          mountPath: /app/data

        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi

      volumes:
      - name: cache
        emptyDir: {}
      - name: data
        emptyDir: {}
```

Deploy and verify:

```bash
kubectl apply -f restricted-compliant-deployment.yaml

# Should succeed without warnings
kubectl get pods -n production -l app=secure-app
```

## Gradually Rolling Out Enforcement

Implement PSS progressively to avoid breaking existing workloads:

```bash
# pss-rollout-strategy.sh
#!/bin/bash

echo "=== Phase 1: Audit Mode ==="
echo "Enable audit and warn for all namespaces"

kubectl get namespaces -o json | \
  jq '.items[] |
    select(.metadata.name | test("^kube-") | not) |
    .metadata.name' -r | \
  while read ns; do
    kubectl label namespace $ns \
      pod-security.kubernetes.io/audit=baseline \
      pod-security.kubernetes.io/warn=baseline \
      --overwrite
    echo "  ✓ $ns: audit+warn enabled"
  done

echo
echo "Wait 2 weeks, review audit logs..."
read -p "Press enter when ready for Phase 2"

echo
echo "=== Phase 2: Baseline Enforcement (Non-Production) ==="

for ns in development staging test; do
  kubectl label namespace $ns \
    pod-security.kubernetes.io/enforce=baseline \
    --overwrite
  echo "  ✓ $ns: baseline enforcement enabled"
done

echo
echo "Wait 1 week, fix any issues..."
read -p "Press enter when ready for Phase 3"

echo
echo "=== Phase 3: Baseline Enforcement (Production) ==="

kubectl label namespace production \
  pod-security.kubernetes.io/enforce=baseline \
  --overwrite
echo "  ✓ production: baseline enforcement enabled"

echo
echo "Wait 2 weeks, verify stability..."
read -p "Press enter when ready for Phase 4"

echo
echo "=== Phase 4: Restricted Profile (Selected Namespaces) ==="

kubectl label namespace production \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/audit=restricted \
  pod-security.kubernetes.io/warn=restricted \
  --overwrite
echo "  ✓ production: restricted profile enforced"

echo
echo "PSS rollout complete!"
```

## Monitoring PSS Violations

Track violations using Kubernetes events and audit logs:

```yaml
# prometheus-pss-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: pss-violation-alerts
  namespace: monitoring
spec:
  groups:
  - name: pod_security
    interval: 1m
    rules:
    - alert: PSSViolationDetected
      expr: |
        increase(apiserver_admission_webhook_admission_duration_seconds_count{
          name="PodSecurity",
          rejected="true"
        }[5m]) > 0
      for: 2m
      labels:
        severity: warning
      annotations:
        summary: "Pod Security Standards violations detected"
        description: "{{ $value }} pods rejected due to PSS violations"

    - alert: HighPSSViolationRate
      expr: |
        rate(apiserver_admission_webhook_admission_duration_seconds_count{
          name="PodSecurity",
          rejected="true"
        }[10m]) > 0.1
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "High rate of PSS violations"
        description: "{{ $value }} violations per second"
```

Create dashboard showing PSS compliance:

```bash
# pss-compliance-report.sh
#!/bin/bash

echo "=== Pod Security Standards Compliance Report ==="
echo "Generated: $(date)"
echo

echo "Namespace Security Labels:"
echo "-------------------------"
kubectl get namespaces -o json | \
  jq -r '.items[] |
    select(.metadata.name | test("^kube-") | not) |
    "\(.metadata.name): enforce=\(.metadata.labels["pod-security.kubernetes.io/enforce"] // "none")"'

echo
echo "Recent PSS Violations:"
echo "--------------------"
kubectl get events --all-namespaces --field-selector type=Warning | \
  grep -i "pod-security" | \
  tail -20

echo
echo "Pods by Security Context:"
echo "------------------------"
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] |
    "\(.metadata.namespace)/\(.metadata.name): privileged=\(.spec.containers[0].securityContext.privileged // false), runAsRoot=\(if .spec.securityContext.runAsNonRoot then "false" else "true" end)"' | \
  column -t

echo
echo "Report Complete"
```

## Creating PSS-Compliant Base Templates

Provide developers with compliant templates:

```yaml
# templates/deployment-template.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: CHANGEME
  namespace: CHANGEME
  labels:
    app: CHANGEME
spec:
  replicas: 3
  selector:
    matchLabels:
      app: CHANGEME
  template:
    metadata:
      labels:
        app: CHANGEME
    spec:
      # Restricted profile compliant security context
      securityContext:
        runAsNonRoot: true
        runAsUser: 10000
        fsGroup: 10000
        seccompProfile:
          type: RuntimeDefault

      containers:
      - name: CHANGEME
        image: CHANGEME:latest
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          runAsNonRoot: true
          runAsUser: 10000
          capabilities:
            drop:
            - ALL

        ports:
        - containerPort: 8080
          protocol: TCP

        volumeMounts:
        - name: tmp
          mountPath: /tmp

        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 1000m
            memory: 512Mi

        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10

        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5

      volumes:
      - name: tmp
        emptyDir: {}
```

## Documenting Exemptions

Some workloads legitimately require exemptions. Document them:

```yaml
# pss-exemptions.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: pss-exemptions
  namespace: kube-system
data:
  exemptions.yaml: |
    # Pod Security Standards Exemptions Registry
    # Last Updated: 2026-02-09

    exemptions:
    - namespace: monitoring
      workload: prometheus-node-exporter
      profile_required: privileged
      justification: "Requires host namespace access for node metrics"
      approved_by: "security-team@company.com"
      approved_date: "2026-02-01"
      review_date: "2026-08-01"

    - namespace: logging
      workload: fluent-bit
      profile_required: privileged
      justification: "Requires access to host filesystem for log collection"
      approved_by: "security-team@company.com"
      approved_date: "2026-02-01"
      review_date: "2026-08-01"

    - namespace: networking
      workload: cilium-agent
      profile_required: privileged
      justification: "CNI plugin requires elevated privileges"
      approved_by: "infrastructure-team@company.com"
      approved_date: "2026-01-15"
      review_date: "2026-07-15"
```

Pod Security Standards provide native, maintainable security controls for Kubernetes workloads. By enforcing Baseline profile in most namespaces and Restricted profile for sensitive workloads, you prevent common misconfigurations that lead to security breaches. Progressive rollout with audit modes ensures you can harden security posture without disrupting existing applications.
