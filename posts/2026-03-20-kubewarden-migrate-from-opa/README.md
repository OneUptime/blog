# How to Migrate from OPA Gatekeeper to Kubewarden

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubewarden, OPA, Gatekeeper, Migration, Policy as Code, Kubernetes, Admission Control, SUSE Rancher

Description: Learn how to migrate Kubernetes admission policies from OPA Gatekeeper to Kubewarden, including mapping ConstraintTemplates to ClusterAdmissionPolicies and translating Rego logic to supported...

---

Migrating from OPA Gatekeeper to Kubewarden involves three main steps: understanding the policy mapping, deciding whether to reuse existing Gatekeeper Rego or rewrite it for Kubewarden, and deploying the new policies while removing old ones safely.

---

## Architecture Comparison

| Concept | OPA Gatekeeper | Kubewarden |
|---|---|---|
| Policy language | Rego | Rego, CEL, Go, Rust, ... |
| Policy packaging | ConstraintTemplate CRD | OCI-packaged WASM module or embedded CEL |
| Policy instance | Constraint custom resource | ClusterAdmissionPolicy / AdmissionPolicy |
| Policy distribution | In-cluster | OCI registry or embedded in the policy CR (CEL) |
| Testing tool | gator | kwctl |

---

## Step 1: Inventory Existing Gatekeeper Policies

```bash
# List all ConstraintTemplates
kubectl get constrainttemplates.templates.gatekeeper.sh

# List all Constraint instances
kubectl api-resources --api-group=constraints.gatekeeper.sh -o name | \
  xargs -r -n 1 kubectl get

# Export all ConstraintTemplates for review
kubectl get constrainttemplates.templates.gatekeeper.sh -o yaml > gatekeeper-templates.yaml

# Export all Constraint instances for review
kubectl api-resources --api-group=constraints.gatekeeper.sh -o name | \
  while read -r resource; do
    kubectl get "$resource" -o yaml
    echo "---"
  done > gatekeeper-constraints.yaml
```

---

## Step 2: Map Rego Logic to a Kubewarden Policy

Take a simple Gatekeeper ConstraintTemplate that requires resource limits and package the same Rego policy for Kubewarden:

**OPA Gatekeeper (Rego):**

```rego
package k8srequiredlimits

violation[{"msg": msg}] {
  container := input.review.object.spec.containers[_]
  not container.resources.limits.cpu
  msg := sprintf("Container '%v' is missing CPU limit", [container.name])
}
```

**Kubewarden equivalent (reuse the Gatekeeper Rego as a Wasm policy):**

```yaml
# metadata.yaml
rules:
  - apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["pods"]
    operations: ["CREATE", "UPDATE"]
mutating: false
contextAware: false
executionMode: gatekeeper
annotations:
  io.kubewarden.policy.title: k8srequiredlimits
  io.kubewarden.policy.version: 0.1.0
  io.kubewarden.policy.description: Reject Pods whose containers are missing CPU limits
  io.kubewarden.policy.author: Your team
  io.kubewarden.policy.license: Apache-2.0
```

```bash
opa build -t wasm -e k8srequiredlimits/violation policy.rego
tar -xf bundle.tar.gz /policy.wasm
kwctl annotate policy.wasm --metadata-path metadata.yaml --output-path annotated-policy.wasm
```

---

## Step 3: Check Artifact Hub First

Before writing custom policies, check Artifact Hub to see if an equivalent policy already exists:

```bash
# Pull and inspect an existing policy
kwctl pull registry://ghcr.io/kubewarden/policies/pod-privileged:v0.1.9
kwctl inspect registry://ghcr.io/kubewarden/policies/pod-privileged:v0.1.9
```

Many common Gatekeeper policies (PSP replacements, label enforcement, image restrictions) already have Kubewarden equivalents published on Artifact Hub.

---

## Step 4: Deploy Kubewarden Policies in Monitor Mode

Before removing Gatekeeper, run Kubewarden policies in monitor mode to verify they behave correctly:

```yaml
# disallow-privileged-kubewarden.yaml
apiVersion: policies.kubewarden.io/v1
kind: ClusterAdmissionPolicy
metadata:
  name: disallow-privileged
spec:
  module: registry://ghcr.io/kubewarden/policies/pod-privileged:v0.1.9
  mode: monitor    # Logs violations without blocking
  rules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      resources: ["pods"]
      operations: ["CREATE", "UPDATE"]
  mutating: false
```

```bash
kubectl apply -f disallow-privileged-kubewarden.yaml

# Check policy logs in monitor mode
kubectl logs -n kubewarden -l kubewarden/policy-server=default --all-containers=true
```

---

## Step 5: Validate Coverage

```bash
# Check Kubewarden audit scan results
kubectl get report -A
kubectl get clusterreport

# Confirm all violations that Gatekeeper was catching
# are now also caught by Kubewarden in monitor mode
kubectl get report -A -o json | \
  jq '.items[].results[] | select(.result == "fail") | .policy'
kubectl get clusterreport -o json | \
  jq '.items[].results[] | select(.result == "fail") | .policy'
```

---

## Step 6: Switch Kubewarden to Enforce Mode

Once monitor mode confirms correct behavior, switch to enforce:

```bash
kubectl patch clusteradmissionpolicy disallow-privileged \
  --type merge \
  -p '{"spec":{"mode":"protect"}}'
```

---

## Step 7: Remove Gatekeeper

```bash
# Delete all Constraints first (remove enforcement)
kubectl api-resources --api-group=constraints.gatekeeper.sh -o name | \
  while read -r resource; do
    kubectl delete "$resource" --all
  done

# Delete all ConstraintTemplates
kubectl delete constrainttemplates.templates.gatekeeper.sh --all

# Uninstall Gatekeeper
helm uninstall gatekeeper -n gatekeeper-system

# Remove Gatekeeper CRDs
kubectl delete crd -l gatekeeper.sh/system=yes

# Remove the namespace
kubectl delete namespace gatekeeper-system
```

---

## Migration Timeline

```text
Week 1: Inventory Gatekeeper policies → identify Artifact Hub equivalents
Week 2: Package existing Gatekeeper Rego or write custom policies for gaps → test with kwctl
Week 3: Deploy Kubewarden in monitor mode alongside Gatekeeper
Week 4: Validate coverage → switch to enforce → remove Gatekeeper
```

---

## Best Practices

- Always run Kubewarden in `monitor` mode before removing Gatekeeper - this ensures no coverage gap.
- Use Artifact Hub to find ready-made replacements for common Gatekeeper policies.
- For validating policies, start by packaging existing Gatekeeper Rego for Kubewarden and rewrite only when you need a Kubewarden-specific policy implementation.
