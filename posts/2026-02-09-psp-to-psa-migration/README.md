# How to Migrate from Pod Security Policies to Pod Security Admission Standards

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Pod Security

Description: Learn how to migrate from deprecated Pod Security Policies to the new Pod Security Admission controller with baseline, restricted, and privileged standards for Kubernetes security.

---

Pod Security Policies (PSP) are deprecated and removed in Kubernetes 1.25+. The replacement is Pod Security Admission (PSA), which enforces predefined security standards at the namespace level. Migrating from PSP to PSA requires understanding the three security levels and applying them appropriately. This guide shows you how to migrate safely while maintaining cluster security.

## Understanding PSA Security Levels

PSA provides three predefined security standards.

```yaml
# Pod Security Standards comparison
apiVersion: v1
kind: ConfigMap
metadata:
  name: psa-standards-reference
  namespace: kube-system
data:
  standards.yaml: |
    # Privileged: Unrestricted (no restrictions)
    - Allows everything
    - For system-level workloads only

    # Baseline: Minimally restrictive
    - Prevents known privilege escalations
    - Allows hostNetwork, hostPorts (with restrictions)
    - Blocks hostPath volumes
    - Blocks privileged containers

    # Restricted: Heavily restrictive (best practice)
    - Enforces pod hardening best practices
    - Blocks host namespaces
    - Requires running as non-root
    - Blocks privilege escalation
    - Drops all capabilities
    - Restricts volume types
```

These standards replace custom PSP definitions.

## Auditing Current PSP Usage

Identify which PSPs are in use before migrating.

```bash
#!/bin/bash
# Audit current PSP usage

echo "=== Current Pod Security Policies ==="
kubectl get psp

echo -e "\n=== PSP Details ==="
for PSP in $(kubectl get psp -o name); do
  echo "--- $PSP ---"
  kubectl describe $PSP | grep -A 20 "Spec:"
done

echo -e "\n=== Namespaces and Their Workloads ==="
for NS in $(kubectl get ns -o jsonpath='{.items[*].metadata.name}'); do
  POD_COUNT=$(kubectl get pods -n $NS 2>/dev/null | tail -n +2 | wc -l)
  if [ $POD_COUNT -gt 0 ]; then
    echo "Namespace: $NS (Pods: $POD_COUNT)"

    # Check for privileged containers
    PRIVILEGED=$(kubectl get pods -n $NS -o json | jq '[.items[].spec.containers[] | select(.securityContext.privileged == true)] | length')
    echo "  Privileged containers: $PRIVILEGED"

    # Check for hostNetwork
    HOST_NETWORK=$(kubectl get pods -n $NS -o json | jq '[.items[] | select(.spec.hostNetwork == true)] | length')
    echo "  Host network: $HOST_NETWORK"

    # Check for hostPath
    HOST_PATH=$(kubectl get pods -n $NS -o json | jq '[.items[].spec.volumes[]? | select(.hostPath != null)] | length')
    echo "  HostPath volumes: $HOST_PATH"
  fi
done
```

This audit reveals which security level each namespace needs.

## Mapping PSPs to PSA Standards

Determine the appropriate PSA level for each namespace.

```yaml
# PSP to PSA mapping
apiVersion: v1
kind: ConfigMap
metadata:
  name: psp-to-psa-mapping
data:
  mapping.yaml: |
    # Restrictive PSP -> Restricted
    restrictive-psp:
      psa_level: restricted
      namespaces:
      - production
      - staging
      - default

    # Baseline PSP -> Baseline
    baseline-psp:
      psa_level: baseline
      namespaces:
      - monitoring
      - logging

    # Privileged PSP -> Privileged
    privileged-psp:
      psa_level: privileged
      namespaces:
      - kube-system
      - kube-node-lease
      - kube-public
      - istio-system
      - ingress-nginx
```

Most application namespaces should use restricted or baseline.

## Enabling PSA in Audit Mode

Start with audit mode to identify violations without blocking pods.

```yaml
# Apply PSA labels in audit mode
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    # Audit mode: logs violations but allows pods
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/audit-version: latest

    # Warn mode: shows warnings but allows pods
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/warn-version: latest
---
apiVersion: v1
kind: Namespace
metadata:
  name: monitoring
  labels:
    pod-security.kubernetes.io/audit: baseline
    pod-security.kubernetes.io/audit-version: latest
    pod-security.kubernetes.io/warn: baseline
    pod-security.kubernetes.io/warn-version: latest
---
apiVersion: v1
kind: Namespace
metadata:
  name: kube-system
  labels:
    pod-security.kubernetes.io/audit: privileged
    pod-security.kubernetes.io/audit-version: latest
```

Audit mode lets you identify issues without disruption.

```bash
#!/bin/bash
# Apply PSA labels to all namespaces in audit mode

for NS in $(kubectl get ns -o jsonpath='{.items[*].metadata.name}'); do
  # Skip system namespaces for privileged
  if [[ "$NS" =~ ^(kube-|istio-|ingress-) ]]; then
    LEVEL="privileged"
  # Monitoring/logging gets baseline
  elif [[ "$NS" =~ (monitoring|logging|observability) ]]; then
    LEVEL="baseline"
  # Everything else gets restricted
  else
    LEVEL="restricted"
  fi

  echo "Setting $NS to PSA level: $LEVEL (audit mode)"

  kubectl label namespace $NS \
    pod-security.kubernetes.io/audit=$LEVEL \
    pod-security.kubernetes.io/audit-version=latest \
    pod-security.kubernetes.io/warn=$LEVEL \
    pod-security.kubernetes.io/warn-version=latest \
    --overwrite
done
```

Apply audit labels to all namespaces.

## Analyzing Audit Results

Review violations discovered in audit mode.

```bash
#!/bin/bash
# Analyze PSA audit logs

echo "=== PSA Audit Violations ==="

# Check API server audit logs
kubectl logs -n kube-system kube-apiserver-* | grep "pod-security.kubernetes.io/audit"

# Query for pods that would violate restricted
echo -e "\n=== Pods Violating Restricted Standard ==="
for NS in $(kubectl get ns -l pod-security.kubernetes.io/audit=restricted -o jsonpath='{.items[*].metadata.name}'); do
  echo "Namespace: $NS"

  # Privileged containers
  kubectl get pods -n $NS -o json | jq -r '.items[] | select(.spec.containers[]?.securityContext?.privileged == true) | "  Pod: \(.metadata.name) - has privileged container"'

  # Host namespaces
  kubectl get pods -n $NS -o json | jq -r '.items[] | select(.spec.hostNetwork == true) | "  Pod: \(.metadata.name) - uses hostNetwork"'

  # Missing securityContext
  kubectl get pods -n $NS -o json | jq -r '.items[] | select(.spec.securityContext.runAsNonRoot != true) | "  Pod: \(.metadata.name) - not running as non-root"'
done
```

This identifies pods that need remediation.

## Fixing Non-Compliant Workloads

Update pod specifications to comply with PSA standards.

```yaml
# Non-compliant pod (violates restricted)
apiVersion: v1
kind: Pod
metadata:
  name: app-old
spec:
  containers:
  - name: app
    image: myapp:v1.0
    # Missing securityContext
---
# Compliant pod (restricted standard)
apiVersion: v1
kind: Pod
metadata:
  name: app-new
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 2000
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: app
    image: myapp:v1.0
    securityContext:
      allowPrivilegeEscalation: false
      capabilities:
        drop:
        - ALL
      readOnlyRootFilesystem: true
    volumeMounts:
    - name: tmp
      mountPath: /tmp
  volumes:
  - name: tmp
    emptyDir: {}
```

Add security contexts to meet PSA standards.

```bash
#!/bin/bash
# Batch update deployments for PSA compliance

for DEPLOY in $(kubectl get deployments -n production -o name); do
  echo "Updating $DEPLOY..."

  kubectl patch $DEPLOY -n production --type='strategic' -p '{
    "spec": {
      "template": {
        "spec": {
          "securityContext": {
            "runAsNonRoot": true,
            "runAsUser": 1000,
            "fsGroup": 2000,
            "seccompProfile": {
              "type": "RuntimeDefault"
            }
          },
          "containers": [{
            "name": "*",
            "securityContext": {
              "allowPrivilegeEscalation": false,
              "capabilities": {
                "drop": ["ALL"]
              },
              "readOnlyRootFilesystem": true
            }
          }]
        }
      }
    }
  }'
done
```

Automate compliance updates where possible.

## Enforcing PSA Standards

Switch from audit mode to enforce mode after fixing violations.

```yaml
# Enforce restricted in production
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    # Enforce mode: blocks non-compliant pods
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/enforce-version: latest

    # Keep audit and warn for visibility
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/audit-version: latest
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/warn-version: latest
```

```bash
#!/bin/bash
# Gradually enable enforcement

NAMESPACES="production staging"

for NS in $NAMESPACES; do
  echo "Enabling PSA enforcement for $NS..."

  # Get current PSA level
  LEVEL=$(kubectl get ns $NS -o jsonpath='{.metadata.labels.pod-security\.kubernetes\.io/audit}')

  # Enable enforcement
  kubectl label namespace $NS \
    pod-security.kubernetes.io/enforce=$LEVEL \
    pod-security.kubernetes.io/enforce-version=latest \
    --overwrite

  # Verify no pods are blocked
  sleep 10
  PENDING=$(kubectl get pods -n $NS --field-selector=status.phase=Pending -o json | jq '.items | length')

  if [ $PENDING -gt 0 ]; then
    echo "WARNING: $PENDING pods pending in $NS after enforcement"
    kubectl get events -n $NS | grep "pod-security"
  else
    echo "✓ Enforcement enabled successfully for $NS"
  fi
done
```

Enable enforcement gradually with validation.

## Removing Deprecated PSPs

Delete PSPs after PSA is fully enforced.

```bash
#!/bin/bash
# Remove PSPs

echo "=== Verifying PSA Enforcement ==="

# Check all namespaces have PSA labels
NO_PSA=$(kubectl get ns -o json | jq '[.items[] | select(.metadata.labels["pod-security.kubernetes.io/enforce"] == null)] | length')

if [ $NO_PSA -gt 0 ]; then
  echo "WARNING: $NO_PSA namespaces without PSA enforcement"
  kubectl get ns -o json | jq -r '.items[] | select(.metadata.labels["pod-security.kubernetes.io/enforce"] == null) | .metadata.name'
  echo "Enable PSA before removing PSPs"
  exit 1
fi

echo "All namespaces have PSA enforcement"

# Backup PSPs
kubectl get psp -o yaml > psp-backup.yaml

# Delete PSPs
echo "Deleting Pod Security Policies..."
kubectl delete psp --all

# Delete PSP-related RoleBindings
kubectl delete rolebinding -A -l psp=true

echo "PSPs removed successfully"
```

Only remove PSPs after PSA is fully operational.

## Handling Exemptions

Configure exemptions for workloads that cannot meet PSA standards.

```yaml
# PSA exemption configuration (API server flag)
# --admission-control-config-file=/etc/kubernetes/admission-config.yaml

apiVersion: apiserver.config.k8s.io/v1
kind: AdmissionConfiguration
plugins:
- name: PodSecurity
  configuration:
    apiVersion: pod-security.admission.config.k8s.io/v1
    kind: PodSecurityConfiguration
    defaults:
      enforce: "restricted"
      enforce-version: "latest"
      audit: "restricted"
      audit-version: "latest"
      warn: "restricted"
      warn-version: "latest"
    exemptions:
      # Exempt specific users
      usernames:
      - system:serviceaccount:kube-system:daemon-set-controller

      # Exempt specific namespaces
      namespaces:
      - kube-system
      - ingress-nginx

      # Exempt specific RuntimeClasses
      runtimeClasses:
      - kata-containers
```

Use exemptions sparingly for legitimate cases.

## Monitoring PSA Compliance

Track PSA violations over time.

```yaml
# Prometheus rules for PSA monitoring
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: psa-compliance
  namespace: monitoring
spec:
  groups:
  - name: pod_security
    interval: 30s
    rules:
    - alert: PSAViolationDetected
      expr: |
        increase(apiserver_admission_webhook_rejection_count{
          name="pod-security.kubernetes.io"
        }[5m]) > 0
      labels:
        severity: warning
      annotations:
        summary: "Pod Security Admission rejecting pods"
        description: "{{ $value }} pods rejected by PSA in last 5 minutes"

    - alert: NamespaceMissingPSA
      expr: |
        kube_namespace_labels{label_pod_security_kubernetes_io_enforce=""} == 1
      labels:
        severity: warning
      annotations:
        summary: "Namespace {{ $labels.namespace }} missing PSA labels"
```

Monitor for compliance issues and violations.

## Conclusion

Migrating from Pod Security Policies to Pod Security Admission is mandatory for Kubernetes 1.25+. Understand the three PSA security levels: privileged (unrestricted), baseline (minimally restrictive), and restricted (best practice). Audit current PSP usage to determine appropriate PSA levels for each namespace. Apply PSA labels in audit and warn modes first to identify violations without blocking pods. Analyze audit results to find non-compliant workloads. Update pod specifications to meet PSA standards by adding security contexts, dropping capabilities, and running as non-root. Enable enforce mode gradually after fixing violations. Remove deprecated PSPs only after PSA is fully operational. Use exemptions sparingly for legitimate cases like system components. Monitor PSA compliance with metrics and alerts. The restricted standard should be the default for application namespaces, with baseline for specialized workloads and privileged only for system components.
