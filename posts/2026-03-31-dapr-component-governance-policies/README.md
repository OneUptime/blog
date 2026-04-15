# How to Implement Dapr Component Governance Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Governance, Policy, Kubernetes, Security

Description: Learn how to enforce Dapr component governance using OPA, Kyverno, and namespace scoping to control which services can access which components.

---

## Why Component Governance Matters

In multi-team Kubernetes environments, ungoverned Dapr component access creates security and compliance risks. Without governance, any service can potentially use any component in the cluster. Governance policies enforce the principle of least privilege across your Dapr components.

## Scoping Components to Specific Applications

Dapr's built-in scoping limits which app IDs can use a component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: payments-statestore
  namespace: production
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis-payments:6379"
  - name: redisPassword
    secretKeyRef:
      name: redis-secret
      key: password
scopes:
- payment-service
- payment-processor
```

Any service with an app ID other than `payment-service` or `payment-processor` will receive an error when trying to access this component.

## Enforcing Governance with Kyverno

Install Kyverno and create a policy that requires all Dapr components to have scopes defined:

```bash
helm repo add kyverno https://kyverno.github.io/kyverno/
helm install kyverno kyverno/kyverno -n kyverno --create-namespace
```

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-dapr-component-scopes
spec:
  validationFailureAction: Enforce
  rules:
  - name: require-scopes
    match:
      resources:
        kinds:
        - dapr.io/v1alpha1/Component
    validate:
      message: "Dapr components must define scopes to limit access."
      pattern:
        scopes: "?*"
  - name: require-cost-center-label
    match:
      resources:
        kinds:
        - dapr.io/v1alpha1/Component
    validate:
      message: "Components must have a cost-center label."
      pattern:
        metadata:
          labels:
            cost-center: "?*"
```

## Using OPA Gatekeeper for Component Policies

Alternative approach using OPA Gatekeeper:

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: DaprComponentScopeRequired
metadata:
  name: dapr-component-scope-required
spec:
  match:
    kinds:
    - apiGroups: ["dapr.io"]
      kinds: ["Component"]
  parameters:
    requiredLabels: ["cost-center", "team", "environment"]
```

```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: daprcomponentscoperequired
spec:
  crd:
    spec:
      names:
        kind: DaprComponentScopeRequired
      validation:
        openAPIV3Schema:
          type: object
          properties:
            requiredLabels:
              type: array
              items:
                type: string
  targets:
  - target: admission.k8s.gatekeeper.sh
    rego: |
      package daprcomponent
      violation[{"msg": msg}] {
        input.review.object.kind == "Component"
        not input.review.object.scopes
        msg := "Dapr component must define scopes"
      }
      violation[{"msg": msg}] {
        input.review.object.kind == "Component"
        required := input.parameters.requiredLabels[_]
        not input.review.object.metadata.labels[required]
        msg := sprintf("Missing required label: %s", [required])
      }
```

## Namespace-Based Isolation

Enforce namespace isolation by deploying components only in the appropriate namespace:

```bash
# Verify components are not leaking across namespaces
kubectl get components --all-namespaces -o wide

# Check which app IDs have access to a component
kubectl get component payments-statestore -n production -o jsonpath='{.scopes}'
```

## Auditing Component Access

Set up regular audits of component scope assignments:

```bash
#!/bin/bash
# governance-audit.sh
echo "=== Dapr Components Without Scopes ==="
kubectl get components --all-namespaces -o json | \
  jq '.items[] | select(.scopes == null or (.scopes | length) == 0) |
  {name: .metadata.name, namespace: .metadata.namespace, type: .spec.type}'
```

## Summary

Dapr component governance ensures only authorized services can access sensitive backends like state stores and secret stores. Use Dapr's native `scopes` field as your first line of defense, and layer in Kyverno or OPA Gatekeeper policies to enforce that all components have scopes and required metadata labels. Regular audit scripts catch components that drift from governance requirements over time.
