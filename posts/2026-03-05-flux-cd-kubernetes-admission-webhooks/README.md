# How to Use Flux CD with Kubernetes Admission Webhooks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Admission Webhooks, Policy, Kyverno, OPA Gatekeeper

Description: Learn how to integrate Flux CD with Kubernetes admission webhooks to enforce policies on resources deployed through GitOps reconciliation.

---

Kubernetes admission webhooks intercept API requests before resources are persisted, allowing you to validate or mutate resources based on organizational policies. When Flux CD reconciles resources from Git, those resources pass through admission webhooks just like manually applied resources. This guide covers how to deploy policy engines with Flux, handle webhook interactions during reconciliation, and troubleshoot common issues.

## How Flux Interacts with Admission Webhooks

When the kustomize-controller or helm-controller applies a resource to the Kubernetes API, the request passes through the admission webhook chain. If a validating webhook rejects the resource, Flux reports the rejection as a reconciliation error. If a mutating webhook modifies the resource, Flux may detect drift on subsequent reconciliations.

Understanding this flow is essential for avoiding conflicts between your GitOps desired state and webhook-enforced policies.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- kubectl configured with cluster-admin access
- Familiarity with Kubernetes admission webhook concepts

## Step 1: Deploy a Policy Engine with Flux

### Kyverno

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: kyverno
  namespace: flux-system
spec:
  interval: 1h
  url: https://kyverno.github.io/kyverno
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
    resources:
      limits:
        memory: 384Mi
```

### OPA Gatekeeper

```yaml
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
```

## Step 2: Create Validation Policies

### Kyverno: Require Resource Limits

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-resource-limits
spec:
  validationFailureAction: Enforce
  rules:
    - name: require-limits
      match:
        any:
          - resources:
              kinds:
                - Deployment
                - StatefulSet
                - DaemonSet
      validate:
        message: "All containers must have CPU and memory limits defined."
        pattern:
          spec:
            template:
              spec:
                containers:
                  - resources:
                      limits:
                        memory: "?*"
                        cpu: "?*"
```

### Kyverno: Require Labels

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-labels
spec:
  validationFailureAction: Enforce
  rules:
    - name: require-team-label
      match:
        any:
          - resources:
              kinds:
                - Deployment
                - Service
      validate:
        message: "The label 'team' is required."
        pattern:
          metadata:
            labels:
              team: "?*"
```

### OPA Gatekeeper: Disallow Privileged Containers

```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8sdisallowprivileged
spec:
  crd:
    spec:
      names:
        kind: K8sDisallowPrivileged
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8sdisallowprivileged
        violation[{"msg": msg}] {
          container := input.review.object.spec.template.spec.containers[_]
          container.securityContext.privileged == true
          msg := sprintf("Privileged container not allowed: %v", [container.name])
        }
---
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sDisallowPrivileged
metadata:
  name: no-privileged-containers
spec:
  match:
    kinds:
      - apiGroups: ["apps"]
        kinds: ["Deployment", "StatefulSet"]
```

## Step 3: Handle Policy Violations in Flux

When a webhook rejects a resource, Flux reports it in the Kustomization or HelmRelease status:

```bash
# Check for policy violations
flux get kustomizations

# Detailed error messages
kubectl describe kustomization my-app -n flux-system | grep -A 10 "Message"
```

A typical error looks like:

```
Message: apply failed: admission webhook "validate.kyverno.svc" denied the request:
resource Deployment/default/my-app was blocked due to the following policies:
require-resource-limits: require-limits: All containers must have CPU and memory limits defined.
```

To fix the violation, update the manifests in Git to comply with the policy:

```yaml
# Fix: Add resource limits to the deployment
spec:
  template:
    spec:
      containers:
        - name: my-app
          resources:
            limits:
              cpu: 500m
              memory: 256Mi
            requests:
              cpu: 100m
              memory: 128Mi
```

## Step 4: Handle Mutating Webhooks and Drift

Mutating webhooks modify resources during admission. For example, a webhook might inject sidecar containers or add default labels. This creates a discrepancy between the Git state and the cluster state, which Flux may interpret as drift.

To handle this, configure Flux to use server-side apply with force conflicts:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/my-app
  sourceRef:
    kind: GitRepository
    name: flux-system
  force: true
```

For HelmReleases, Helm's three-way merge handles most mutation drift automatically.

## Step 5: Exclude Flux Resources from Webhooks

Webhook failures can prevent Flux from reconciling critical infrastructure. Exclude Flux's own namespace from validating webhooks:

```yaml
# For Kyverno - exclude flux-system namespace
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-resource-limits
spec:
  validationFailureAction: Enforce
  rules:
    - name: require-limits
      match:
        any:
          - resources:
              kinds:
                - Deployment
      exclude:
        any:
          - resources:
              namespaces:
                - flux-system
                - kyverno
```

For Gatekeeper, use `excludedNamespaces` in the constraint:

```yaml
spec:
  match:
    excludedNamespaces:
      - flux-system
      - gatekeeper-system
```

## Step 6: Order Dependencies Correctly

The policy engine must be running before Flux tries to apply resources that the webhooks validate. Use Flux dependencies to enforce ordering:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: policy-engine
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/kyverno
  sourceRef:
    kind: GitRepository
    name: flux-system
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: policies
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/policies
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: policy-engine
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: applications
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: policies
```

## Troubleshooting

```bash
# Check webhook configurations
kubectl get validatingwebhookconfigurations
kubectl get mutatingwebhookconfigurations

# Check if a webhook is blocking Flux
kubectl logs -n flux-system deployment/kustomize-controller | grep "admission webhook"

# Test a resource against webhooks manually
kubectl apply --dry-run=server -f my-resource.yaml

# Check Kyverno policy reports
kubectl get policyreport -A
kubectl get clusterpolicyreport
```

## Summary

Kubernetes admission webhooks work naturally with Flux CD since all resources pass through the admission chain during reconciliation. Deploy policy engines like Kyverno or OPA Gatekeeper through Flux, create policies that enforce your organization's standards, and fix violations by updating manifests in Git. Handle mutating webhook drift carefully, exclude Flux's own namespace from validation where appropriate, and use dependency ordering to ensure policy engines are ready before application resources are applied.
