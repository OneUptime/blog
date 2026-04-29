# How to Migrate from OPA Gatekeeper to Kubewarden - Gatekeeper

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubewarden, Kubernetes, OPA, Gatekeeper, Migration

Description: A step-by-step guide to migrating your Kubernetes admission control policies from OPA Gatekeeper to Kubewarden, covering policy translation and side-by-side migration strategies.

## Introduction

OPA Gatekeeper and Kubewarden both provide Kubernetes admission control, but they take different approaches: Gatekeeper uses Rego policies and the Open Policy Agent engine, while Kubewarden uses WebAssembly policies that can be written in any language. Organizations migrating to Kubewarden benefit from language flexibility, WebAssembly-based policy distribution, and the ability to reuse existing Gatekeeper Rego policies or adopt SDK-based policies.

This guide covers migrating from Gatekeeper to Kubewarden with minimal disruption.

## Prerequisites

- Existing OPA Gatekeeper installation
- Kubewarden installed (can run alongside Gatekeeper initially)
- `kubectl` with cluster-admin access
- Inventory of existing Gatekeeper policies

## Understanding the Differences

| Feature | OPA Gatekeeper | Kubewarden |
|---------|----------------|------------|
| Policy language | Rego | Any language that compiles to WebAssembly |
| Policy format | ConstraintTemplate + Constraint CRDs | WebAssembly modules distributed as OCI artifacts |
| Mutation support | Mutation CRDs | Mutating policies |
| Testing | gator / OPA tooling | kwctl |
| Context-aware | Via replicated data (`sync`) | Via context-aware policy capabilities |
| Execution model | Rego evaluation in the admission controller | Wasm evaluation in the policy-server |

## Step 1: Inventory Your Gatekeeper Policies

```bash
# List all Gatekeeper constraint templates

kubectl get constrainttemplates

# List all Gatekeeper constraints (instances)
kubectl get constraints

# Export all constraint templates
kubectl get constrainttemplates -o yaml > gatekeeper-templates.yaml

# Export all constraints
kubectl get constraints -o yaml > gatekeeper-constraints.yaml
```

## Step 2: Map Gatekeeper Policies to Kubewarden Equivalents

Many common Gatekeeper policies have direct Kubewarden equivalents:

### Privileged Containers

**Gatekeeper version:**
```yaml
# K8sPSPPrivilegedContainer (Gatekeeper)
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sPSPPrivilegedContainer
metadata:
  name: psp-privileged-container
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
```

**Kubewarden equivalent:**
```yaml
# pod-privileged (Kubewarden)
apiVersion: policies.kubewarden.io/v1
kind: ClusterAdmissionPolicy
metadata:
  name: no-privileged-containers
spec:
  module: registry://ghcr.io/kubewarden/policies/pod-privileged:latest
  settings: {}
  rules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      resources: ["pods"]
      operations: ["CREATE", "UPDATE"]
  mutating: false
  mode: protect
```

### Allowed Repositories

**Gatekeeper version:**
```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sAllowedRepos
metadata:
  name: repo-is-allowed
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
  parameters:
    repos:
      - "registry.internal.example.com/"
      - "gcr.io/my-project/"
```

**Kubewarden equivalent:**
```yaml
apiVersion: policies.kubewarden.io/v1
kind: ClusterAdmissionPolicy
metadata:
  name: allowed-repositories
spec:
  module: registry://ghcr.io/kubewarden/policies/trusted-repos-policy:latest
  settings:
    images:
      allow:
        - "registry.internal.example.com/"
        - "gcr.io/my-project/"
  rules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      resources: ["pods"]
      operations: ["CREATE", "UPDATE"]
  mutating: false
  mode: protect
```

### Required Labels

**Gatekeeper version:**
```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredLabels
metadata:
  name: require-team-label
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Namespace"]
  parameters:
    labels:
      - key: "team"
```

**Kubewarden equivalent:**
```yaml
apiVersion: policies.kubewarden.io/v1
kind: ClusterAdmissionPolicy
metadata:
  name: require-team-label
spec:
  module: registry://ghcr.io/kubewarden/policies/safe-labels:latest
  settings:
    mandatory_labels:
      - team
  rules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      resources: ["namespaces"]
      operations: ["CREATE", "UPDATE"]
  mutating: false
  mode: protect
```

## Step 3: Implement Side-by-Side Migration

Run Kubewarden in monitor mode alongside Gatekeeper:

```bash
# Phase 1: Deploy Kubewarden policies in MONITOR mode
# while Gatekeeper remains in ENFORCE mode

for policy_file in kubewarden-policies/*.yaml; do
  # Ensure all policies are in monitor mode
  sed 's/mode: protect/mode: monitor/' "$policy_file" | \
    kubectl apply -f -
done

# Phase 2: Compare Gatekeeper audit output with Kubewarden audit data
echo "=== Gatekeeper constraint status ==="
kubectl get constraints -o yaml

echo "=== Kubewarden audit reports (if audit scanner is enabled) ==="
kubectl get report -A
kubectl get clusterreport
```

## Step 4: Gradual Transition

```bash
#!/bin/bash
# transition-policy.sh - Transition one policy at a time

POLICY_NAME="$1"
GATEKEEPER_CONSTRAINT="$2"

echo "Transitioning: ${GATEKEEPER_CONSTRAINT} -> ${POLICY_NAME}"

# Step 1: Enable Kubewarden policy in protect mode
kubectl patch clusteradmissionpolicies "${POLICY_NAME}" \
  --type=merge \
  -p '{"spec":{"mode":"protect"}}'

echo "Kubewarden policy ${POLICY_NAME} now in PROTECT mode"

# Step 2: Test that the Kubewarden policy works
# (run your workload tests here)

# Step 3: Move the Gatekeeper constraint to DRYRUN mode
# Example value for GATEKEEPER_CONSTRAINT:
# k8sallowedrepos.constraints.gatekeeper.sh/repo-is-allowed
kubectl patch "${GATEKEEPER_CONSTRAINT}" \
  --type=merge \
  -p '{"spec":{"enforcementAction":"dryrun"}}'

echo "Gatekeeper constraint ${GATEKEEPER_CONSTRAINT} now in DRYRUN mode"
echo "Transition complete. Monitor for 24h before removing the Gatekeeper constraint"
```

## Step 5: Remove Gatekeeper

After all policies are migrated and validated:

```bash
# Remove all Gatekeeper constraints
kubectl delete constraints --all 2>/dev/null || true

# Remove all constraint templates
kubectl delete constrainttemplates --all

# Uninstall Gatekeeper
helm uninstall gatekeeper -n gatekeeper-system

# Remove Gatekeeper namespace
kubectl delete namespace gatekeeper-system

echo "Gatekeeper removed. Kubewarden is now your sole admission controller."
```

## Handling Custom Rego Policies

For custom Gatekeeper validation policies without Kubewarden library equivalents, you can usually port the existing Rego directly to Kubewarden. Gatekeeper mutators still need to be reimplemented as Kubewarden mutating policies. Use this approach:

```bash
# Export the Rego policy for reference
kubectl get constrainttemplate my-custom-policy \
  -o jsonpath='{.spec.targets[0].rego}'

# Create a new Kubewarden policy project from the Gatekeeper template
git clone https://github.com/kubewarden/gatekeeper-policy-template my-custom-policy
cd my-custom-policy

# Copy the exported Rego into policy.rego, update the package name to `policy`,
# then build the Wasm module. For older Gatekeeper policies using Rego v0 syntax:
OPA_V0_COMPATIBLE=true make
```

## Validating the Migration

```bash
# Run your full test suite against the cluster
# with only Kubewarden active

# Check recent Kubernetes events for any unexpected denials
kubectl get events -A \
  --sort-by='.metadata.creationTimestamp' \
  | tail -50

# Verify all workloads are running
kubectl get pods -A | grep -v Running | grep -v Completed
```

## Conclusion

Migrating from OPA Gatekeeper to Kubewarden requires careful planning but the benefits - language flexibility, WebAssembly-based distribution, and a broad policy ecosystem - are significant. The side-by-side migration approach minimizes risk by running both systems simultaneously in monitor vs. enforce mode, giving you confidence in the Kubewarden policies before removing Gatekeeper. For common policies, the Kubewarden Policy Hub provides ready-to-use replacements, while custom Gatekeeper Rego policies can often be ported directly with Kubewarden's Gatekeeper policy template instead of being rewritten from scratch.
