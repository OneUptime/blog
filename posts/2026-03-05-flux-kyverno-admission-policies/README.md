# How to Configure Flux with Kyverno Admission Policies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Security, Kyverno, Admission Policies, Policy Engine

Description: Learn how to integrate Flux CD with Kyverno to enforce, mutate, and validate Kubernetes resources deployed through GitOps workflows.

---

Kyverno is a Kubernetes-native policy engine that validates, mutates, and generates resources using admission webhooks. Unlike OPA Gatekeeper, Kyverno policies are written in YAML rather than Rego, making them accessible to Kubernetes practitioners. This guide shows how to integrate Kyverno with Flux CD to enforce policies on GitOps-managed resources.

## How Flux and Kyverno Work Together

When Flux applies resources to the cluster, Kyverno's admission webhook intercepts the API requests and evaluates them against defined policies. Kyverno can:

- **Validate**: Block resources that violate policies.
- **Mutate**: Automatically modify resources to comply with policies.
- **Generate**: Create additional resources when certain conditions are met.

## Step 1: Deploy Kyverno with Flux

Deploy Kyverno using a Flux HelmRelease:

```yaml
# kyverno-helmrelease.yaml
# Deploy Kyverno via Flux
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: kyverno
  namespace: flux-system
spec:
  interval: 1h
  url: https://kyverno.github.io/kyverno/
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: kyverno
  namespace: kyverno
spec:
  interval: 30m
  chart:
    spec:
      chart: kyverno
      version: "3.x"
      sourceRef:
        kind: HelmRepository
        name: kyverno
        namespace: flux-system
  install:
    createNamespace: true
  values:
    replicaCount: 3
    # Exclude flux-system from Kyverno policies
    config:
      webhooks:
        - namespaceSelector:
            matchExpressions:
              - key: kubernetes.io/metadata.name
                operator: NotIn
                values:
                  - kyverno
                  - flux-system
```

## Step 2: Create a Validation Policy for Required Labels

Create a Kyverno ClusterPolicy that requires labels on all Deployments:

```yaml
# policy-require-labels.yaml
# Kyverno policy: Require app and team labels on Deployments
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-labels
  annotations:
    policies.kyverno.io/title: Require Labels
    policies.kyverno.io/description: Requires app.kubernetes.io/name and team labels on Deployments
spec:
  validationFailureAction: Enforce
  background: true
  rules:
    - name: require-app-label
      match:
        any:
          - resources:
              kinds:
                - Deployment
              namespaces:
                - "!kube-system"
                - "!flux-system"
      validate:
        message: "The label 'app.kubernetes.io/name' is required on Deployments."
        pattern:
          metadata:
            labels:
              app.kubernetes.io/name: "?*"
    - name: require-team-label
      match:
        any:
          - resources:
              kinds:
                - Deployment
              namespaces:
                - "!kube-system"
                - "!flux-system"
      validate:
        message: "The label 'team' is required on Deployments."
        pattern:
          metadata:
            labels:
              team: "?*"
```

## Step 3: Create a Mutation Policy to Add Default Labels

Kyverno can automatically add labels to resources that are missing them:

```yaml
# policy-add-default-labels.yaml
# Kyverno policy: Add default managed-by label to all Deployments
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: add-default-labels
spec:
  background: false
  rules:
    - name: add-managed-by-label
      match:
        any:
          - resources:
              kinds:
                - Deployment
                - StatefulSet
                - DaemonSet
      mutate:
        patchStrategicMerge:
          metadata:
            labels:
              +(app.kubernetes.io/managed-by): flux
```

## Step 4: Create a Policy to Enforce Resource Limits

Ensure all containers have resource requests and limits defined:

```yaml
# policy-require-resources.yaml
# Kyverno policy: Require resource requests and limits on all containers
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-resource-limits
spec:
  validationFailureAction: Enforce
  background: true
  rules:
    - name: require-requests-and-limits
      match:
        any:
          - resources:
              kinds:
                - Deployment
                - StatefulSet
              namespaces:
                - "!kube-system"
                - "!flux-system"
                - "!kyverno"
      validate:
        message: "All containers must have CPU and memory requests and limits defined."
        pattern:
          spec:
            template:
              spec:
                containers:
                  - resources:
                      requests:
                        memory: "?*"
                        cpu: "?*"
                      limits:
                        memory: "?*"
```

## Step 5: Create a Policy to Restrict Image Registries

Restrict container images to approved registries:

```yaml
# policy-restrict-registries.yaml
# Kyverno policy: Only allow images from approved registries
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: restrict-image-registries
spec:
  validationFailureAction: Enforce
  background: true
  rules:
    - name: validate-registries
      match:
        any:
          - resources:
              kinds:
                - Pod
              namespaces:
                - "!kube-system"
                - "!flux-system"
                - "!kyverno"
      validate:
        message: "Images must be from approved registries (ghcr.io/myorg or registry.mycompany.com)."
        pattern:
          spec:
            containers:
              - image: "ghcr.io/myorg/* | registry.mycompany.com/*"
```

## Step 6: Create a Policy to Block Privileged Pods

```yaml
# policy-disallow-privileged.yaml
# Kyverno policy: Disallow privileged containers
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: disallow-privileged-containers
spec:
  validationFailureAction: Enforce
  background: true
  rules:
    - name: deny-privileged
      match:
        any:
          - resources:
              kinds:
                - Pod
              namespaces:
                - "!kube-system"
      validate:
        message: "Privileged containers are not allowed."
        pattern:
          spec:
            containers:
              - securityContext:
                  privileged: "false"
            =(initContainers):
              - securityContext:
                  privileged: "false"
```

## Step 7: Deploy Policies with Flux

Manage Kyverno policies through Flux GitOps:

```yaml
# kustomization-kyverno-policies.yaml
# Flux Kustomization to deploy Kyverno policies from Git
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kyverno-policies
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./policies/kyverno
  prune: true
  dependsOn:
    - name: kyverno  # Wait for Kyverno to be installed
```

## Handling Policy Violations

When Flux-deployed resources violate Kyverno policies:

```bash
# Check Flux Kustomization status for policy violations
flux get kustomizations -A

# View detailed error from Kyverno
kubectl describe kustomization my-app -n flux-system | grep -A10 "Message"

# List policy reports for violations
kubectl get policyreport -A
kubectl get clusterpolicyreport

# View specific violation details
kubectl get policyreport -n production -o json | jq '.results[] | select(.result=="fail")'
```

## Best Practices

1. **Start with Audit mode**: Set `validationFailureAction: Audit` first to understand the impact before enforcing.
2. **Exclude system namespaces**: Always exclude `flux-system`, `kyverno`, and `kube-system` from policies.
3. **Use background scanning**: Enable `background: true` to audit existing resources, not just new ones.
4. **Manage policies via GitOps**: Deploy Kyverno policies through Flux for version control and review.
5. **Monitor policy reports**: Set up alerting on Kyverno PolicyReport resources for continuous compliance visibility.

Integrating Kyverno with Flux CD gives you a Kubernetes-native policy enforcement layer that validates every resource deployed through your GitOps pipeline using familiar YAML syntax.
