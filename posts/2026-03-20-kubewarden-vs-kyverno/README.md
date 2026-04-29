# Kubewarden vs Kyverno: Policy Engine Comparison

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubewarden, Kyverno, Policy-engine, Kubernetes, Comparison

Description: A detailed comparison of Kubewarden and Kyverno for Kubernetes policy management, covering policy authoring, mutation, validation, and ease of use.

## Overview

Kyverno and Kubewarden are modern Kubernetes policy engines that take different approaches to policy authoring. Kyverno defines policies as Kubernetes-style YAML resources and now includes CEL-based policy types. Kubewarden uses WebAssembly modules that can be written in languages that compile to Wasm. This comparison helps teams choose the right policy engine for their Kubernetes governance needs.

## What Is Kyverno?

Kyverno is a CNCF-graduated Kubernetes-native policy engine that defines policies as Kubernetes resources. It supports validation, mutation, generation, and cleanup of Kubernetes resources. Its policies can be applied directly with kubectl.

## What Is Kubewarden?

Kubewarden is a CNCF Sandbox policy engine from SUSE Rancher that uses WebAssembly modules for policy enforcement. It provides flexibility in policy authoring language and distributes policies via OCI registries.

## Feature Comparison

| Feature | Kubewarden | Kyverno |
|---|---|---|
| Policy Language | Languages that compile to Wasm | YAML + CEL |
| Validation Policies | Yes | Yes |
| Mutation Policies | Yes | Yes |
| Generate Policies | No | Yes |
| Cleanup Policies | No | Yes |
| CEL Support | Yes (via `cel-policy`) | Yes (v1.11+; CEL-based policy types stable in v1.17) |
| Context-Aware | Yes | Yes |
| Policy Testing | kwctl | kyverno test |
| Policy Library | Official policy library / ArtifactHub | kyverno.io/policies |
| CNCF Status | Sandbox | Graduated |
| Rancher Integration | Native | Via kubectl |
| Learning Curve | Medium (Wasm toolchain) | Low to Medium (YAML/CEL) |
| Community | Growing | Large |
| Background Scans | Yes | Yes |

## Policy Examples

### Kyverno Validation Policy

```yaml
# Kyverno: Require resource limits on all Pod containers

apiVersion: policies.kyverno.io/v1
kind: ValidatingPolicy
metadata:
  name: require-limits
spec:
  validationActions:
    - Deny
  matchConstraints:
    resourceRules:
      - apiGroups: [""]
        apiVersions: ["v1"]
        operations: ["CREATE", "UPDATE"]
        resources: ["pods"]
  validations:
    - expression: >-
        object.spec.containers.all(container,
          has(container.resources) &&
          has(container.resources.limits) &&
          has(container.resources.limits.cpu) &&
          has(container.resources.limits.memory)
        )
      message: Resource limits are required for all Pod containers.
```

### Kubewarden Equivalent (using pre-built policy)

```yaml
# Kubewarden: Require resource limits using the official container-resources policy
apiVersion: policies.kubewarden.io/v1
kind: ClusterAdmissionPolicy
metadata:
  name: require-resource-limits
spec:
  module: registry://ghcr.io/kubewarden/policies/container-resources:latest
  rules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      resources: ["pods"]
      operations: ["CREATE", "UPDATE"]
  mutating: false
  settings:
    cpu:
      defaultLimit: "500m"
    memory:
      defaultLimit: "256Mi"
```

## Mutation Policies

### Kyverno Mutation

```yaml
# Kyverno: Auto-add resource limits if missing
apiVersion: policies.kyverno.io/v1
kind: MutatingPolicy
metadata:
  name: add-default-limits
spec:
  matchConstraints:
    resourceRules:
      - apiGroups: [""]
        apiVersions: ["v1"]
        operations: ["CREATE"]
        resources: ["pods"]
  mutations:
    - patchType: ApplyConfiguration
      applyConfiguration:
        expression: >
          Object{
            spec: Object.spec{
              containers: object.spec.containers.map(container, Object.spec.containers{
                name: container.name,
                resources: Object.spec.containers.resources{
                  limits: Object.spec.containers.resources.limits{
                    memory: has(container.resources) &&
                            has(container.resources.limits) &&
                            has(container.resources.limits.memory) ?
                            container.resources.limits.memory :
                            "256Mi",
                    cpu: has(container.resources) &&
                         has(container.resources.limits) &&
                         has(container.resources.limits.cpu) ?
                         container.resources.limits.cpu :
                         "500m"
                  }
                }
              })
            }
          }
```

### Kubewarden Mutation

```yaml
# Kubewarden mutation policy
apiVersion: policies.kubewarden.io/v1
kind: ClusterAdmissionPolicy
metadata:
  name: add-default-limits
spec:
  module: registry://ghcr.io/kubewarden/policies/container-resources:latest
  rules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      resources: ["pods"]
      operations: ["CREATE"]
  mutating: true
  settings:
    cpu:
      defaultLimit: "500m"
    memory:
      defaultLimit: "256Mi"
```

Resource Generation (Kyverno Exclusive)

Kyverno can generate new Kubernetes resources in response to events. This is a unique capability not available in Kubewarden:

```yaml
# Kyverno: Auto-create NetworkPolicy when a Namespace is created
apiVersion: policies.kyverno.io/v1
kind: GeneratingPolicy
metadata:
  name: generate-networkpolicy
spec:
  matchConstraints:
    resourceRules:
      - apiGroups: [""]
        apiVersions: ["v1"]
        operations: ["CREATE"]
        resources: ["namespaces"]
  variables:
    - name: targetNs
      expression: "object.metadata.name"
    - name: downstream
      expression: >-
        [
          {
            "kind": dyn("NetworkPolicy"),
            "apiVersion": dyn("networking.k8s.io/v1"),
            "metadata": dyn({
              "name": "default-deny-all"
            }),
            "spec": dyn({
              "podSelector": dyn({}),
              "policyTypes": dyn(["Ingress", "Egress"])
            })
          }
        ]
  generate:
    - expression: generator.Apply(variables.targetNs, variables.downstream)
```

## Policy Testing

### Kyverno Test

```bash
# Test Kyverno policies locally
kyverno test .

# Test with a specific resource
kyverno apply require-limits.yaml \
  --resource test-pod.yaml

# Output shows PASS/FAIL for each rule
```

### Kubewarden kwctl

```bash
# Test Kubewarden policies against an AdmissionReview request JSON
kwctl run registry://ghcr.io/kubewarden/policies/container-resources:latest \
  --settings-json '{"cpu":{"defaultLimit":"500m"},"memory":{"defaultLimit":"256Mi"}}' \
  --request-path test-request.json

# Scaffold a new policy
kwctl scaffold manifest \
  --type ClusterAdmissionPolicy \
  registry://ghcr.io/kubewarden/policies/container-resources:latest
```

## When to Choose Kyverno

- Your team wants policies defined as Kubernetes resources rather than a Wasm toolchain
- Policy generation (creating new resources) is needed
- CEL expressions for policy logic are preferred
- You want a CNCF-graduated tool with a large community
- Cleanup policies for stale resources are needed

## When to Choose Kubewarden

- Your team wants to write or reuse policies in Go, Rust, Rego, CEL, or another Wasm-capable option
- Policy distribution via OCI registries is preferred
- Native Rancher UI integration is important
- You want Wasm-based policy distribution and execution

## Conclusion

Kyverno and Kubewarden both provide excellent Kubernetes policy enforcement. Kyverno's key advantage is its lower barrier to entry - policies are defined as Kubernetes resources and do not require a Wasm toolchain. Kubewarden's key advantage is flexibility - policies are packaged as Wasm modules and can be authored or reused across multiple languages and policy styles. Teams new to policy management should start with Kyverno for its simplicity. Teams with experienced engineers who want language flexibility should consider Kubewarden, especially in Rancher environments.
