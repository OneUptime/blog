# How to Migrate from Kyverno to Kubewarden

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubewarden, Kubernetes, Kyverno, Migration, Policy

Description: A practical guide to migrating your Kubernetes admission control policies from Kyverno to Kubewarden, including policy mapping, side-by-side testing, and cutover strategies.

## Introduction

Kyverno and Kubewarden both provide Kubernetes admission control, but with different approaches. Kyverno uses YAML-based policy definitions with pattern matching plus JMESPath/CEL expressions, while Kubewarden uses WebAssembly policies written in languages that compile to Wasm. Organizations migrate to Kubewarden when they need policy logic that is easier to express in a general-purpose language or when they want to standardize on Kubewarden's policy framework.

This guide covers migrating from Kyverno to Kubewarden with a structured, low-risk approach.

## Prerequisites

- Existing Kyverno installation
- Kubewarden installed (can run alongside Kyverno initially)
- `kubectl` with cluster-admin access
- Inventory of existing Kyverno policies

## Understanding the Differences

| Feature | Kyverno | Kubewarden |
|---------|---------|------------|
| Policy definition | YAML policies with patterns/CEL/JMESPath | WebAssembly modules |
| Mutation | Native YAML patches | JSON patches from code |
| Generate | Yes (create resources) | No direct equivalent |
| Language | YAML/CEL/JMESPath | Rust, Go, and other Wasm targets |
| Testing | Kyverno CLI | kwctl |
| Context | Native K8s API lookups | Host capability calls |

## Step 1: Inventory Existing Kyverno Policies

```bash
# List all Kyverno policies

kubectl get policies.kyverno.io -A
kubectl get clusterpolicies.kyverno.io

# Export all cluster policies
kubectl get clusterpolicies.kyverno.io -o yaml > kyverno-clusterpolicies.yaml

# Export all namespace policies
kubectl get policies.kyverno.io -A -o yaml > kyverno-policies.yaml

# Get a count of each policy type
echo "ClusterPolicies: $(kubectl get clusterpolicies.kyverno.io --no-headers | wc -l)"
echo "Namespace Policies: $(kubectl get policies.kyverno.io -A --no-headers | wc -l)"
```

## Step 2: Map Kyverno Policies to Kubewarden

### Disallow Privileged Containers

**Kyverno version:**
```yaml
# kyverno-disallow-privileged.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: disallow-privileged-containers
spec:
  rules:
    - name: privileged-containers
      match:
        any:
          - resources:
              kinds: [Pod]
      validate:
        failureAction: Enforce
        message: "Privileged mode is disallowed. The fields spec.containers[*].securityContext.privileged, spec.initContainers[*].securityContext.privileged, and spec.ephemeralContainers[*].securityContext.privileged must be unset or set to `false`."
        pattern:
          spec:
            "=(ephemeralContainers)":
              - "=(securityContext)":
                  "=(privileged)": "false"
            "=(initContainers)":
              - "=(securityContext)":
                  "=(privileged)": "false"
            containers:
              - "=(securityContext)":
                  "=(privileged)": "false"
```

**Kubewarden equivalent:**
```yaml
# kubewarden-disallow-privileged.yaml
apiVersion: policies.kubewarden.io/v1
kind: ClusterAdmissionPolicy
metadata:
  name: disallow-privileged-containers
spec:
  module: registry://ghcr.io/kubewarden/policies/pod-privileged:v1.0.10
  rules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      resources: ["pods"]
      operations: ["CREATE", "UPDATE"]
  mutating: false
  mode: protect
```

### Require Resource Limits

**Kyverno version:**
```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-resources
spec:
  rules:
    - name: check-container-resources
      match:
        any:
          - resources:
              kinds: [Pod]
      validate:
        failureAction: Enforce
        message: "CPU and memory limits are required."
        pattern:
          spec:
            containers:
              - resources:
                  limits:
                    memory: "?*"
                    cpu: "?*"
```

**Kubewarden equivalent (using the CEL meta-policy):**
```yaml
apiVersion: policies.kubewarden.io/v1
kind: ClusterAdmissionPolicy
metadata:
  name: require-resource-limits
spec:
  module: registry://ghcr.io/kubewarden/policies/cel-policy:v1.6.0
  settings:
    validations:
      - expression: "object.spec.containers.all(c, has(c.resources) && has(c.resources.limits) && 'cpu' in c.resources.limits && 'memory' in c.resources.limits)"
        message: "CPU and memory limits are required."
  rules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      resources: ["pods"]
      operations: ["CREATE", "UPDATE"]
  mutating: false
  mode: protect
```

### Require Labels

**Kyverno version:**
```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-labels
spec:
  rules:
    - name: check-for-labels
      match:
        any:
          - resources:
              kinds: [Pod]
      validate:
        failureAction: Enforce
        message: "The label `app` is required."
        pattern:
          metadata:
            labels:
              app: "?*"
```

**Kubewarden equivalent:**
```yaml
apiVersion: policies.kubewarden.io/v1
kind: ClusterAdmissionPolicy
metadata:
  name: require-app-label
spec:
  module: registry://ghcr.io/kubewarden/policies/safe-labels:v1.0.9
  settings:
    mandatory_labels:
      - app
  rules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      resources: ["pods"]
      operations: ["CREATE", "UPDATE"]
  mutating: false
  mode: protect
```

### Image Registry Restriction

**Kyverno version:**
```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: restrict-image-registries
spec:
  rules:
    - name: validate-registries
      match:
        any:
          - resources:
              kinds: [Pod]
      validate:
        failureAction: Enforce
        message: "Unknown image registry."
        pattern:
          spec:
            "=(ephemeralContainers)":
              - image: "registry.internal.example.com/* | gcr.io/my-org/*"
            "=(initContainers)":
              - image: "registry.internal.example.com/* | gcr.io/my-org/*"
            containers:
              - image: "registry.internal.example.com/* | gcr.io/my-org/*"
```

**Kubewarden equivalent:**
```yaml
apiVersion: policies.kubewarden.io/v1
kind: ClusterAdmissionPolicy
metadata:
  name: restrict-image-registries
spec:
  module: registry://ghcr.io/kubewarden/policies/trusted-repos:v2.1.0
  settings:
    images:
      allow:
        - registry.internal.example.com/*
        - gcr.io/my-org/*
  rules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      resources: ["pods"]
      operations: ["CREATE", "UPDATE"]
  mutating: false
  mode: protect
```

## Step 3: Handle Kyverno Mutation Policies

Kyverno's mutation policies that do not have a built-in Kubewarden equivalent need to be rewritten as Kubewarden mutation policies in Wasm:

```yaml
# Kyverno mutation (adds default labels)
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: add-labels
spec:
  rules:
    - name: add-app-label
      match:
        any:
          - resources:
              kinds: [Pod]
      mutate:
        patchStrategicMerge:
          metadata:
            labels:
              managed-by: kubewarden
```

For mutation policies without a built-in Kubewarden equivalent, you need to write a Kubewarden Wasm policy. The migration approach:
1. Check if the mutation is available on the Kubewarden Policy Hub
2. Write a custom Wasm policy if not available
3. Test extensively with `kwctl`

## Step 4: Side-by-Side Migration

```bash
#!/bin/bash
# migrate-policy.sh - Migrate one Kyverno policy to Kubewarden

KYVERNO_POLICY="$1"
KUBEWARDEN_POLICY="$2"

# Step 1: Deploy the Kubewarden policy with spec.mode already set to monitor
kubectl apply -f "${KUBEWARDEN_POLICY}"

echo "Kubewarden policy deployed in monitor mode"

# Step 2: Compare results for 24 hours
echo "Monitor for 24 hours and compare results..."

# Check Kyverno admission violations
echo "=== Kyverno Violations ==="
kubectl get events -A \
  --field-selector reason=PolicyViolation \
  | grep -F "${KYVERNO_POLICY}"

# Check Kubewarden audit reports (OpenReports is the default since Kubewarden 1.33)
echo "=== Kubewarden Audit Reports ==="
kubectl get report -A -o wide
kubectl get clusterreport -o wide
```

If your Kubewarden installation is still configured to use the deprecated PolicyReport CRDs, use `kubectl get policyreport -A -o wide` and `kubectl get clusterpolicyreport -o wide` instead.

## Step 5: Cut Over

```bash
#!/bin/bash
# cutover-from-kyverno.sh

KYVERNO_POLICY="$1"
KUBEWARDEN_POLICY_NAME="$2"

# Enable Kubewarden policy enforcement
kubectl patch clusteradmissionpolicy "${KUBEWARDEN_POLICY_NAME}" \
  --type=merge \
  -p '{"spec":{"mode":"protect"}}'

echo "Kubewarden policy ${KUBEWARDEN_POLICY_NAME} is now enforcing"

# If you want a grace period before removal, update the Kyverno manifest so each
# validate rule uses failureAction: Audit, then re-apply it.
# kubectl apply -f kyverno-policy-audit.yaml

# After validation period, delete the Kyverno policy
# kubectl delete clusterpolicy.kyverno.io "${KYVERNO_POLICY}"
```

## Step 6: Final Kyverno Removal

After all policies are migrated:

```bash
# Remove all Kyverno policies
kubectl delete clusterpolicies.kyverno.io --all
kubectl delete policies.kyverno.io -A --all

# Uninstall Kyverno
helm uninstall <kyverno-release-name> -n <kyverno-namespace>
kubectl delete namespace <kyverno-namespace>

echo "Kyverno removed. Migration to Kubewarden complete."
```

## Conclusion

Migrating from Kyverno to Kubewarden is straightforward for validation policies where direct hub equivalents exist, and more involved for custom mutation policies that require Wasm development. The side-by-side approach - running both systems simultaneously with Kubewarden in monitor mode - is the safest migration path. Kyverno's `Generate` rules (for creating Kubernetes resources based on events) have no equivalent in Kubewarden and should be handled separately through other mechanisms such as operators or GitOps controllers.
