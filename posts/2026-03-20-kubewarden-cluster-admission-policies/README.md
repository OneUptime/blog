# How to Create Kubewarden Cluster Admission Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubewarden, Kubernetes, Policy, Security, ClusterPolicy

Description: Learn how to create and manage Kubewarden ClusterAdmissionPolicy resources to enforce security and compliance rules across all namespaces in your Kubernetes cluster.

## Introduction

ClusterAdmissionPolicies are cluster-wide Kubewarden policies that apply to resources across all namespaces, including cluster-scoped resources like Nodes, ClusterRoles, and PersistentVolumes. They are managed by cluster administrators and form the foundation of your organization-wide security and compliance posture.

This guide covers creating, configuring, and managing ClusterAdmissionPolicies for comprehensive cluster governance.

## Prerequisites

- Kubewarden installed with cluster-admin access
- `kubectl` with cluster-admin permissions
- Understanding of Kubernetes resource types

## Key Differences from AdmissionPolicy

ClusterAdmissionPolicies can:
- Apply to resources in **all namespaces** simultaneously
- Target **cluster-scoped resources** (Nodes, PVs, CRDs, etc.)
- Use **namespace selectors** to limit scope for namespaced resources
- Only be created/modified by cluster administrators

## Creating a Basic ClusterAdmissionPolicy

### Block Host Namespace Access

```yaml
# cluster-policy-host-namespace.yaml

apiVersion: policies.kubewarden.io/v1
kind: ClusterAdmissionPolicy
metadata:
  name: no-host-namespace
spec:
  module: registry://ghcr.io/kubewarden/policies/host-namespaces-psp:v1.1.6

  settings:
    # Block all host namespace sharing
    allow_host_pid: false
    allow_host_ipc: false
    allow_host_network: false

  rules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      resources: ["pods"]
      operations:
        - CREATE
        - UPDATE

  mutating: false
  failurePolicy: Fail
  mode: protect
```

```bash
# Apply the cluster-wide policy
kubectl apply -f cluster-policy-host-namespace.yaml

# Check policy status
kubectl get clusteradmissionpolicy no-host-namespace

# Wait for policy activation
kubectl wait clusteradmissionpolicy no-host-namespace \
  --for=condition=PolicyActive \
  --timeout=60s
```

### Require Trusted Container Registries

```yaml
# cluster-policy-trusted-registries.yaml
apiVersion: policies.kubewarden.io/v1
kind: ClusterAdmissionPolicy
metadata:
  name: allowed-registries
spec:
  module: registry://ghcr.io/kubewarden/policies/trusted-repos-policy:v2.0.4

  settings:
    # Only allow images from these registries
    registries:
      allow:
        - "registry.internal.example.com"
        - "gcr.io/my-org"
        - "ghcr.io/my-org"
        # Allow Docker Hub images
        - "docker.io"

  rules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      resources: ["pods"]
      operations:
        - CREATE
        - UPDATE

  mutating: false
  failurePolicy: Fail
  mode: protect
```

## Applying Policies to Specific Namespaces

Use `namespaceSelector` to target or exclude specific namespaces:

```yaml
# cluster-policy-selected-namespaces.yaml
apiVersion: policies.kubewarden.io/v1
kind: ClusterAdmissionPolicy
metadata:
  name: prod-strict-security
spec:
  module: registry://ghcr.io/kubewarden/policies/pod-privileged:v1.0.8

  rules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      resources: ["pods"]
      operations:
        - CREATE
        - UPDATE

  mutating: false
  failurePolicy: Fail
  mode: protect

  # Apply ONLY to namespaces with this label
  namespaceSelector:
    matchLabels:
      environment: production
```

### Excluding System Namespaces

```yaml
# cluster-policy-exclude-system.yaml
apiVersion: policies.kubewarden.io/v1
kind: ClusterAdmissionPolicy
metadata:
  name: no-privileged-except-system
spec:
  module: registry://ghcr.io/kubewarden/policies/pod-privileged:v1.0.8

  rules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      resources: ["pods"]
      operations:
        - CREATE
        - UPDATE
  mutating: false
  failurePolicy: Fail
  mode: protect

  # Skip system namespaces
  namespaceSelector:
    matchExpressions:
      - key: kubernetes.io/metadata.name
        operator: NotIn
        values:
          - kube-system
          - kube-public
          - cert-manager
          - kubewarden
          - cattle-fleet-system
```

## Policies for Cluster-Scoped Resources

ClusterAdmissionPolicies can target cluster-scoped resources. `namespaceSelector` filters namespaced resources, but other cluster-scoped resources are always evaluated:

```yaml
# cluster-policy-clusterroles.yaml
apiVersion: policies.kubewarden.io/v1
kind: ClusterAdmissionPolicy
metadata:
  name: require-clusterrole-labels
spec:
  module: registry://ghcr.io/kubewarden/policies/safe-labels:v1.0.7

  settings:
    mandatory_labels:
      - owner
      - team

  rules:
    # Target ClusterRole resources (cluster-scoped)
    - apiGroups: ["rbac.authorization.k8s.io"]
      apiVersions: ["v1"]
      resources: ["clusterroles"]
      operations:
        - CREATE
        - UPDATE

  mutating: false
  failurePolicy: Fail
  mode: protect
```

## Enforcing Pod Security Standards

A practical example enforcing the Pod Security Standards baseline profile by ensuring namespaces carry the required PSA labels:

```yaml
# cluster-policy-pod-security.yaml
apiVersion: policies.kubewarden.io/v1
kind: ClusterAdmissionPolicy
metadata:
  name: pod-security-standards-baseline
spec:
  module: registry://ghcr.io/kubewarden/policies/psa-label-enforcer:v1.0.8

  settings:
    modes:
      enforce: "baseline"
      enforce-version: "latest"

  rules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      resources: ["namespaces"]
      operations:
        - CREATE
        - UPDATE

  mutating: true
  failurePolicy: Fail
  mode: protect

  # Apply to all namespaces except selected system namespaces
  namespaceSelector:
    matchExpressions:
      - key: kubernetes.io/metadata.name
        operator: NotIn
        values:
          - kube-system
          - kube-public
          - kube-node-lease
          - kubewarden
```

## Monitoring ClusterAdmissionPolicy Status

```bash
# List all cluster admission policies
kubectl get clusteradmissionpolicies

# Get detailed policy status
kubectl describe clusteradmissionpolicy no-host-namespace

# Show the full resource, including status fields
kubectl get clusteradmissionpolicy no-host-namespace -o yaml

# List Kubewarden validating webhooks
kubectl get validatingwebhookconfigurations.admissionregistration.k8s.io -l kubewarden
```

## Disabling a Policy Temporarily

```bash
# Delete the protect-mode policy
kubectl delete clusteradmissionpolicy no-host-namespace

# Recreate it in monitor mode
sed 's/mode: protect/mode: monitor/' cluster-policy-host-namespace.yaml | kubectl apply -f -

# Re-enable enforcement
kubectl patch clusteradmissionpolicy no-host-namespace \
  --type=merge \
  -p '{"spec":{"mode":"protect"}}'
```

## Conclusion

ClusterAdmissionPolicies are the cornerstone of Kubewarden's cluster-wide governance model. By deploying policies that cover all namespaces and cluster-scoped resources, platform teams can establish consistent security baselines while using namespace selectors to exempt specific system components. The ability to operate in monitor mode before enforcing rules enables safe policy rollout with full visibility into what would be blocked before taking any action that could impact running workloads.
