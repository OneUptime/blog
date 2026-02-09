# How to Write OPA Rego Policies for Custom Kubernetes Admission Control

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, OPA

Description: Learn how to write Open Policy Agent (OPA) Rego policies for custom Kubernetes admission control to enforce organization-specific security and compliance requirements.

---

Open Policy Agent (OPA) with its Rego policy language provides powerful, flexible admission control for Kubernetes. Unlike built-in policies or simpler validation tools, Rego allows you to express complex business logic, implement custom security requirements, and enforce compliance policies that match your organization's specific needs.

This guide demonstrates how to write effective Rego policies for Kubernetes admission control.

## Understanding OPA and Rego

OPA is a general-purpose policy engine that separates policy decision-making from policy enforcement. In Kubernetes, OPA Gatekeeper uses OPA to validate admission requests using policies written in Rego, a declarative query language designed for policy evaluation.

Key Rego concepts:

- **Rules**: Logic that evaluates to true or false
- **Data**: Input from Kubernetes API (the resource being evaluated)
- **Variables**: Store intermediate values
- **Functions**: Reusable logic blocks
- **Comprehensions**: Iterate over collections

## Prerequisites

Ensure you have:

- Kubernetes cluster (1.24+)
- kubectl with cluster admin access
- Gatekeeper installed
- Basic understanding of policy requirements

## Installing Gatekeeper

Deploy OPA Gatekeeper:

```bash
kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper/master/deploy/gatekeeper.yaml

# Verify installation
kubectl get pods -n gatekeeper-system
```

## Writing Your First Rego Policy

Create a ConstraintTemplate that defines the policy logic:

```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8srequiredlabels
spec:
  crd:
    spec:
      names:
        kind: K8sRequiredLabels
      validation:
        openAPIV3Schema:
          type: object
          properties:
            labels:
              type: array
              items:
                type: string
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8srequiredlabels

        violation[{"msg": msg, "details": {"missing_labels": missing}}] {
          provided := {label | input.review.object.metadata.labels[label]}
          required := {label | label := input.parameters.labels[_]}
          missing := required - provided
          count(missing) > 0
          msg := sprintf("Required labels are missing: %v", [missing])
        }
```

This template defines a reusable policy that checks for required labels.

Create a Constraint that uses the template:

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredLabels
metadata:
  name: ns-must-have-labels
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Namespace"]
  parameters:
    labels: ["owner", "environment", "cost-center"]
```

Test the policy:

```bash
# This should fail (missing required labels)
kubectl create namespace test-ns

# This should succeed
kubectl create namespace test-ns --labels=owner=team-a,environment=dev,cost-center=eng
```

## Blocking Privileged Containers

Write a policy to prevent privileged containers:

```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8sblockprivileged
spec:
  crd:
    spec:
      names:
        kind: K8sBlockPrivileged
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8sblockprivileged

        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          container.securityContext.privileged
          msg := sprintf("Privileged container is not allowed: %v", [container.name])
        }

        violation[{"msg": msg}] {
          container := input.review.object.spec.initContainers[_]
          container.securityContext.privileged
          msg := sprintf("Privileged init container is not allowed: %v", [container.name])
        }
---
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sBlockPrivileged
metadata:
  name: block-privileged-containers
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
  enforcementAction: deny
```

## Enforcing Resource Requirements

Require resource limits and requests:

```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8srequireresources
spec:
  crd:
    spec:
      names:
        kind: K8sRequireResources
      validation:
        openAPIV3Schema:
          type: object
          properties:
            limits:
              type: array
              items:
                type: string
            requests:
              type: array
              items:
                type: string
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8srequireresources

        violation[{"msg": msg}] {
          container := input_containers[_]
          not container.resources.limits
          msg := sprintf("Container %v must have resource limits", [container.name])
        }

        violation[{"msg": msg}] {
          container := input_containers[_]
          not container.resources.requests
          msg := sprintf("Container %v must have resource requests", [container.name])
        }

        violation[{"msg": msg}] {
          container := input_containers[_]
          provided_limits := {resource | container.resources.limits[resource]}
          required_limits := {resource | resource := input.parameters.limits[_]}
          missing_limits := required_limits - provided_limits
          count(missing_limits) > 0
          msg := sprintf("Container %v missing required limits: %v", [container.name, missing_limits])
        }

        input_containers[c] {
          c := input.review.object.spec.containers[_]
        }

        input_containers[c] {
          c := input.review.object.spec.initContainers[_]
        }
---
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequireResources
metadata:
  name: require-resources
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
  parameters:
    limits: ["memory", "cpu"]
    requests: ["memory", "cpu"]
```

## Validating Image Registry Sources

Ensure images come from approved registries:

```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8sallowedregistries
spec:
  crd:
    spec:
      names:
        kind: K8sAllowedRegistries
      validation:
        openAPIV3Schema:
          type: object
          properties:
            registries:
              type: array
              items:
                type: string
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8sallowedregistries

        violation[{"msg": msg}] {
          container := input_containers[_]
          not registry_allowed(container.image, input.parameters.registries)
          msg := sprintf("Image %v from unauthorized registry", [container.image])
        }

        registry_allowed(image, registries) {
          registry := registries[_]
          startswith(image, registry)
        }

        input_containers[c] {
          c := input.review.object.spec.containers[_]
        }

        input_containers[c] {
          c := input.review.object.spec.initContainers[_]
        }
---
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sAllowedRegistries
metadata:
  name: allowed-registries
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
  parameters:
    registries:
      - "myregistry.azurecr.io/"
      - "gcr.io/my-project/"
```

## Complex Logic with Helper Functions

Use helper functions for complex validation:

```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8spodnetworkpolicy
spec:
  crd:
    spec:
      names:
        kind: K8sPodNetworkPolicy
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8spodnetworkpolicy

        violation[{"msg": msg}] {
          is_pod
          not has_network_policy
          msg := "Pods in this namespace must have a NetworkPolicy"
        }

        is_pod {
          input.review.kind.kind == "Pod"
        }

        has_network_policy {
          netpol := data.inventory.cluster["networking.k8s.io/v1"]["NetworkPolicy"][_]
          netpol.metadata.namespace == input.review.object.metadata.namespace
          podSelector := object.get(netpol.spec, "podSelector", {})
          matches_labels(podSelector.matchLabels, input.review.object.metadata.labels)
        }

        matches_labels(selector, labels) {
          selector == {}
        }

        matches_labels(selector, labels) {
          selector
          selector != {}
          matches := {k |
            selector[k] == labels[k]
          }
          count(matches) == count(selector)
        }
```

## Testing Rego Policies

Test policies before deployment using OPA CLI:

```bash
# Install OPA CLI
curl -L -o opa https://openpolicyagent.org/downloads/latest/opa_linux_amd64
chmod +x opa
sudo mv opa /usr/local/bin/

# Create test input
cat > input.json <<EOF
{
  "review": {
    "object": {
      "metadata": {
        "labels": {"owner": "team-a"}
      }
    }
  },
  "parameters": {
    "labels": ["owner", "environment"]
  }
}
EOF

# Test policy
opa eval --data policy.rego --input input.json "data.k8srequiredlabels.violation"
```

## Debugging Policies

Add logging to understand policy evaluation:

```rego
package k8sdebug

violation[{"msg": msg}] {
  trace(sprintf("Evaluating object: %v", [input.review.object.metadata.name]))
  container := input.review.object.spec.containers[_]
  trace(sprintf("Checking container: %v", [container.name]))
  container.securityContext.privileged
  msg := sprintf("Found privileged container: %v", [container.name])
}
```

View traces in Gatekeeper logs:

```bash
kubectl logs -n gatekeeper-system -l control-plane=controller-manager --tail=100
```

## Conclusion

OPA Rego policies provide flexible, powerful admission control for Kubernetes. By writing custom policies that encode your organization's security and compliance requirements, you can enforce consistency across clusters while maintaining the flexibility to handle complex business logic.

Start with simple policies for common requirements, build helper functions for reusable logic, and test policies thoroughly before deployment. Monitor policy violations with OneUptime to ensure compliance and identify areas where policies may need adjustment.
