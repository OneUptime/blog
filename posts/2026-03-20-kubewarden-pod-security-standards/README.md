# How to Set Up Kubewarden for Pod Security Standards

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubewarden, Kubernetes, PodSecurity, Standard, Compliance

Description: Learn how to implement Kubernetes Pod Security Standards (Privileged, Baseline, and Restricted) using Kubewarden policies for fine-grained admission control.

## Introduction

Kubernetes Pod Security Standards (PSS) define three security profiles for pod workloads:
- **Privileged**: No restrictions, for trusted workloads
- **Baseline**: Prevents known privilege escalations
- **Restricted**: Follows best practices for hardened security

While Kubernetes has built-in Pod Security Admission (PSA), Kubewarden can complement it with more granular control - you can enforce specific checks individually, add exceptions per workload, combine them with custom policies, and get detailed violation messages.

## Prerequisites

- Kubewarden installed on the cluster
- `kubectl` with cluster-admin access

## Understanding Pod Security Standards Checks

The examples in this post focus on a subset of Baseline- and Restricted-aligned checks rather than a complete one-to-one implementation of every PSS control:

### Baseline-Aligned Checks
- No privileged containers
- No host namespaces (hostPID, hostIPC, hostNetwork)
- No host ports

### Restricted-Aligned Checks
- Non-root user required
- Restricted volume types
- Seccomp profiles limited to approved values
- Capabilities must drop ALL, and only `NET_BIND_SERVICE` can be added back

## Implementing Baseline-Aligned Checks

```yaml
# kubewarden-baseline.yaml - Selected Baseline-aligned checks

---
# Block privileged containers
apiVersion: policies.kubewarden.io/v1
kind: ClusterAdmissionPolicy
metadata:
  name: pss-baseline-no-privileged
  labels:
    pss-profile: baseline
spec:
  module: registry://ghcr.io/kubewarden/policies/pod-privileged:v1.0.8
  rules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      resources: ["pods"]
      operations: ["CREATE", "UPDATE"]
  mutating: false
  mode: protect
  namespaceSelector:
    matchExpressions:
      - key: pod-security.kubernetes.io/enforce
        operator: In
        values: ["baseline", "restricted"]
---
# Block host namespaces and host ports
apiVersion: policies.kubewarden.io/v1
kind: ClusterAdmissionPolicy
metadata:
  name: pss-baseline-no-host-namespaces
  labels:
    pss-profile: baseline
spec:
  module: registry://ghcr.io/kubewarden/policies/host-namespaces-psp:v1.1.6
  settings:
    allow_host_pid: false
    allow_host_ipc: false
    allow_host_network: false
    allow_host_ports: []
  rules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      resources: ["pods"]
      operations: ["CREATE", "UPDATE"]
  mutating: false
  mode: protect
  namespaceSelector:
    matchExpressions:
      - key: pod-security.kubernetes.io/enforce
        operator: In
        values: ["baseline", "restricted"]
```

## Implementing Restricted-Aligned Checks

```yaml
# kubewarden-restricted.yaml - Selected Restricted-aligned checks
---
# Require non-root user
apiVersion: policies.kubewarden.io/v1
kind: ClusterAdmissionPolicy
metadata:
  name: pss-restricted-non-root
  labels:
    pss-profile: restricted
spec:
  module: registry://ghcr.io/kubewarden/policies/user-group-psp:v1.1.3
  settings:
    run_as_user:
      rule: "MustRunAsNonRoot"
  rules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      resources: ["pods"]
      operations: ["CREATE", "UPDATE"]
  mutating: false
  mode: protect
  namespaceSelector:
    matchLabels:
      pod-security.kubernetes.io/enforce: restricted
---
# Restrict to the volume types allowed by the Restricted profile
apiVersion: policies.kubewarden.io/v1
kind: ClusterAdmissionPolicy
metadata:
  name: pss-restricted-allowed-volumes
  labels:
    pss-profile: restricted
spec:
  module: registry://ghcr.io/kubewarden/policies/volumes-psp:v1.1.5
  settings:
    allowedTypes:
      - configMap
      - csi
      - downwardAPI
      - emptyDir
      - ephemeral
      - persistentVolumeClaim
      - projected
      - secret
  rules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      resources: ["pods"]
      operations: ["CREATE", "UPDATE"]
  mutating: false
  mode: protect
  namespaceSelector:
    matchLabels:
      pod-security.kubernetes.io/enforce: restricted
---
# Require dropping ALL capabilities
apiVersion: policies.kubewarden.io/v1
kind: ClusterAdmissionPolicy
metadata:
  name: pss-restricted-capabilities
  labels:
    pss-profile: restricted
spec:
  module: registry://ghcr.io/kubewarden/policies/capabilities-psp:v1.0.7
  settings:
    allowed_capabilities:
      - NET_BIND_SERVICE
    required_drop_capabilities:
      - ALL
  rules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      resources: ["pods"]
      operations: ["CREATE", "UPDATE"]
  mutating: false
  mode: protect
  namespaceSelector:
    matchLabels:
      pod-security.kubernetes.io/enforce: restricted
---
# Restrict seccomp profiles
apiVersion: policies.kubewarden.io/v1
kind: ClusterAdmissionPolicy
metadata:
  name: pss-restricted-seccomp
  labels:
    pss-profile: restricted
spec:
  module: registry://ghcr.io/kubewarden/policies/seccomp-psp:v1.0.8
  settings:
    allowed_profiles:
      - "runtime/default"
  rules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      resources: ["pods"]
      operations: ["CREATE", "UPDATE"]
  mutating: false
  mode: protect
  namespaceSelector:
    matchLabels:
      pod-security.kubernetes.io/enforce: restricted
```

## Labeling Namespaces for PSS

Use the same namespace labels as PSA to scope the Kubewarden policies:

```bash
# Apply baseline to the development namespace
kubectl label namespace development \
  pod-security.kubernetes.io/enforce=baseline \
  pod-security.kubernetes.io/warn=restricted

# Apply restricted to the production namespace
kubectl label namespace production \
  pod-security.kubernetes.io/enforce=restricted

# Exempt system namespaces (they need privileged access)
kubectl label namespace kube-system \
  pod-security.kubernetes.io/enforce=privileged

kubectl label namespace kubewarden \
  pod-security.kubernetes.io/enforce=privileged
```

## Applying All Policies at Once

```bash
# Apply all PSS-aligned policies
kubectl apply -f kubewarden-baseline.yaml
kubectl apply -f kubewarden-restricted.yaml

# Wait for all policies to become active
kubectl wait clusteradmissionpolicies \
  -l 'pss-profile in (baseline, restricted)' \
  --for=condition=AdmissionPolicyActive \
  --timeout=120s

# Verify all PSS-aligned policies are active
kubectl get clusteradmissionpolicies \
  -l 'pss-profile in (baseline, restricted)'
```

## Testing PSS Compliance

```bash
# Test a restricted-profile non-compliant pod
kubectl apply -n production -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: test-non-compliant
spec:
  securityContext:
    runAsUser: 0
    seccompProfile:
      type: Unconfined
  containers:
    - name: app
      image: nginx:1.25.0
      securityContext:
        capabilities:
          add: ["NET_ADMIN"]
EOF

# Test a compliant pod
kubectl apply -n production -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: test-compliant
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    seccompProfile:
      type: RuntimeDefault
  containers:
    - name: app
      image: nginx:1.25.0
      securityContext:
        allowPrivilegeEscalation: false
        capabilities:
          drop: ["ALL"]
EOF
```

## Monitoring PSS Policy Compliance

```bash
# Check the status of the PSS-related Kubewarden policies
kubectl get clusteradmissionpolicies \
  -l 'pss-profile in (baseline, restricted)' \
  -o custom-columns=NAME:.metadata.name,STATUS:.status.policyStatus

# If the Kubewarden audit scanner is enabled, inspect the generated reports
kubectl get report -A
kubectl get clusterreport
```

## Conclusion

Implementing Pod Security checks with Kubewarden gives you more control than the built-in PSA admission controller. By deploying individual Kubewarden policies for specific Baseline- and Restricted-aligned checks, you get detailed violation messages, per-check exemptions, and the ability to combine these controls with your own custom security requirements. The namespace-label-based scoping mirrors the PSA interface, making it easy to complement the built-in admission controller.
