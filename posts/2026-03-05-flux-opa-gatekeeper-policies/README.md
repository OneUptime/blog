# How to Configure Flux with OPA Gatekeeper Policies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Security, OPA, Gatekeeper, Policy Engine

Description: Learn how to integrate Flux CD with OPA Gatekeeper to enforce admission policies on resources deployed through GitOps workflows.

---

OPA Gatekeeper is a policy engine for Kubernetes that enforces custom admission policies. When combined with Flux CD, Gatekeeper ensures that every resource deployed through GitOps complies with your organization's security and operational policies. This guide shows you how to deploy Gatekeeper with Flux and create policies that validate Flux-managed resources.

## How Flux and Gatekeeper Work Together

Flux applies resources to the Kubernetes API server using server-side apply. Gatekeeper intercepts these requests through admission webhooks and validates them against your policies. If a resource violates a policy, the API server rejects it, and the Flux Kustomization or HelmRelease reports a reconciliation failure.

## Step 1: Deploy OPA Gatekeeper with Flux

Create a Flux HelmRelease to deploy Gatekeeper:

```yaml
# gatekeeper-helmrelease.yaml
# Deploy OPA Gatekeeper via Flux HelmRelease
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: gatekeeper
  namespace: flux-system
spec:
  interval: 1h
  url: https://open-policy-agent.github.io/gatekeeper/charts
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: gatekeeper
  namespace: gatekeeper-system
spec:
  interval: 30m
  chart:
    spec:
      chart: gatekeeper
      version: "3.x"
      sourceRef:
        kind: HelmRepository
        name: gatekeeper
        namespace: flux-system
  install:
    createNamespace: true
  values:
    replicas: 3
    audit:
      replicas: 1
    # Exempt the flux-system namespace from Gatekeeper
    controllerManager:
      exemptNamespaces:
        - flux-system
```

## Step 2: Create a ConstraintTemplate for Required Labels

Define a policy template that requires specific labels on all resources:

```yaml
# template-required-labels.yaml
# ConstraintTemplate: Require specific labels on Kubernetes resources
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
          msg := sprintf("Resource %v is missing required labels: %v", [input.review.object.metadata.name, missing])
        }
```

## Step 3: Create a Constraint to Enforce Required Labels

Apply the constraint to specific resource types:

```yaml
# constraint-required-labels.yaml
# Enforce required labels on Deployments and Services
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredLabels
metadata:
  name: require-team-label
spec:
  enforcementAction: deny
  match:
    kinds:
      - apiGroups: ["apps"]
        kinds: ["Deployment"]
      - apiGroups: [""]
        kinds: ["Service"]
    # Exclude system namespaces
    excludedNamespaces:
      - kube-system
      - flux-system
      - gatekeeper-system
  parameters:
    labels:
      - "app.kubernetes.io/name"
      - "app.kubernetes.io/managed-by"
```

## Step 4: Create a Policy to Block Privileged Containers

```yaml
# template-no-privileged.yaml
# ConstraintTemplate: Block privileged containers
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8snoprivilegedcontainers
spec:
  crd:
    spec:
      names:
        kind: K8sNoPrivilegedContainers
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8snoprivilegedcontainers

        violation[{"msg": msg}] {
          container := input.review.object.spec.template.spec.containers[_]
          container.securityContext.privileged == true
          msg := sprintf("Privileged container %v is not allowed in %v", [container.name, input.review.object.metadata.name])
        }

        violation[{"msg": msg}] {
          container := input.review.object.spec.template.spec.initContainers[_]
          container.securityContext.privileged == true
          msg := sprintf("Privileged init container %v is not allowed in %v", [container.name, input.review.object.metadata.name])
        }
---
# constraint-no-privileged.yaml
# Enforce no privileged containers across all namespaces
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sNoPrivilegedContainers
metadata:
  name: no-privileged-containers
spec:
  enforcementAction: deny
  match:
    kinds:
      - apiGroups: ["apps"]
        kinds: ["Deployment", "StatefulSet", "DaemonSet"]
    excludedNamespaces:
      - kube-system
```

## Step 5: Create a Policy for Container Image Restrictions

```yaml
# template-allowed-repos.yaml
# ConstraintTemplate: Restrict container images to allowed registries
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8sallowedrepos
spec:
  crd:
    spec:
      names:
        kind: K8sAllowedRepos
      validation:
        openAPIV3Schema:
          type: object
          properties:
            repos:
              type: array
              items:
                type: string
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8sallowedrepos

        violation[{"msg": msg}] {
          container := input.review.object.spec.template.spec.containers[_]
          not startswith_any(container.image, input.parameters.repos)
          msg := sprintf("Container image %v is not from an allowed registry", [container.image])
        }

        startswith_any(str, prefixes) {
          prefix := prefixes[_]
          startswith(str, prefix)
        }
---
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sAllowedRepos
metadata:
  name: allowed-registries
spec:
  enforcementAction: deny
  match:
    kinds:
      - apiGroups: ["apps"]
        kinds: ["Deployment", "StatefulSet", "DaemonSet"]
    excludedNamespaces:
      - kube-system
      - flux-system
  parameters:
    repos:
      - "ghcr.io/myorg/"
      - "registry.mycompany.com/"
```

## Step 6: Deploy Policies with Flux

Manage all Gatekeeper policies through Flux for GitOps-driven policy management:

```yaml
# kustomization-gatekeeper-policies.yaml
# Flux Kustomization to deploy all Gatekeeper policies
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: gatekeeper-policies
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./policies/gatekeeper
  prune: true
  dependsOn:
    - name: gatekeeper  # Wait for Gatekeeper to be ready
  healthChecks:
    - apiVersion: templates.gatekeeper.sh/v1
      kind: ConstraintTemplate
      name: k8srequiredlabels
```

## Step 7: Handle Policy Violations in Flux

When a Flux-managed resource violates a Gatekeeper policy, the Kustomization or HelmRelease will report an error:

```bash
# Check for Gatekeeper-related reconciliation failures
flux get kustomizations -A

# View detailed error messages
kubectl describe kustomization my-app -n flux-system | grep -A5 "Message"

# Check Gatekeeper audit results
kubectl get k8srequiredlabels require-team-label -o yaml | grep -A20 "status"

# List all violations found by Gatekeeper audit
kubectl get constraints -o json | jq '.items[].status.violations'
```

## Best Practices

1. **Start with audit mode**: Set `enforcementAction: dryrun` first to identify violations without blocking deployments.
2. **Exempt Flux system namespace**: Always exclude `flux-system` from constraints to prevent breaking Flux itself.
3. **Deploy policies with Flux**: Manage Gatekeeper policies through GitOps for versioning and audit trails.
4. **Use dependsOn**: Ensure Gatekeeper is fully deployed before applying constraints.
5. **Monitor constraint violations**: Set up alerting for Gatekeeper audit findings.

Integrating Flux CD with OPA Gatekeeper creates a powerful policy-enforced GitOps pipeline where every resource must comply with your organizational policies before it can be deployed.
