# How to Ignore Operator-Managed Fields in ArgoCD Diff

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Operator, Diff Customization

Description: Learn how to configure ArgoCD to ignore fields managed by Kubernetes operators to prevent false OutOfSync status and reconciliation conflicts.

---

Kubernetes operators are controllers that manage the lifecycle of custom resources and often modify standard resources too. When an operator updates fields on a resource that ArgoCD also manages, you get a conflict. ArgoCD sees the operator's changes as drift from the desired Git state and reports OutOfSync. The operator then sees ArgoCD's reverts as unwanted changes and writes its values back. This creates an endless reconciliation loop.

This guide explains how to identify operator-managed fields and configure ArgoCD to leave them alone.

## The Operator Conflict Problem

Many operators modify resources they do not own. For example:

- **HPA controller** sets `spec.replicas` on Deployments
- **VPA controller** updates `spec.containers[].resources` on Pods
- **Cert-manager** modifies Ingress annotations and TLS secrets
- **External DNS** adds annotations to Services and Ingresses
- **Kyverno/OPA** may mutate resources during admission

```mermaid
flowchart LR
    Git[Git Repository] -->|Desired State| ArgoCD
    ArgoCD -->|Apply| K8s[Kubernetes Resource]
    Operator[Operator Controller] -->|Modify Fields| K8s
    K8s -->|Live State| ArgoCD
    ArgoCD -->|Detects Drift| OutOfSync[OutOfSync!]
    OutOfSync -->|Self Heal| ArgoCD
    ArgoCD -->|Revert| K8s
    Operator -->|Modify Again| K8s
    Note over ArgoCD,Operator: Reconciliation Loop
```

## Identifying Operator-Managed Fields

### Check ManagedFields

Kubernetes tracks which controller manages which fields through the `metadata.managedFields` array. This is the most reliable way to identify what an operator touches:

```bash
# See which managers own which fields on a Deployment
kubectl get deployment my-app -o jsonpath='{.metadata.managedFields}' | jq '.'

# Filter for a specific manager
kubectl get deployment my-app -o jsonpath='{.metadata.managedFields}' | \
  jq '.[] | select(.manager | contains("kube-controller-manager"))'
```

The output shows the field paths and the manager name. If you see a manager like `kube-controller-manager` owning `spec.replicas`, that is the HPA modifying your replica count.

### Check the ArgoCD Diff

```bash
# View what ArgoCD thinks is different
argocd app diff my-app

# Look at a specific resource
argocd app get my-app --resource-name my-deployment
```

## Ignoring HPA-Managed Replica Count

The most common operator conflict is between ArgoCD and the Horizontal Pod Autoscaler. You define `spec.replicas: 3` in Git, but HPA scales it to 7, and ArgoCD tries to set it back to 3.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
spec:
  source:
    repoURL: https://github.com/myorg/my-app.git
    targetRevision: main
    path: k8s
  destination:
    server: https://kubernetes.default.svc
    namespace: my-app
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas
```

If you want this to apply only to a specific Deployment:

```yaml
ignoreDifferences:
  - group: apps
    kind: Deployment
    name: my-app-api  # Only this specific Deployment
    jsonPointers:
      - /spec/replicas
```

## Ignoring VPA-Managed Resource Requests

The Vertical Pod Autoscaler modifies container resource requests and limits:

```yaml
ignoreDifferences:
  - group: apps
    kind: Deployment
    jqPathExpressions:
      # Ignore resource requests/limits managed by VPA
      - .spec.template.spec.containers[].resources
```

If you want to be more granular and only ignore requests but not limits:

```yaml
ignoreDifferences:
  - group: apps
    kind: Deployment
    jqPathExpressions:
      - .spec.template.spec.containers[].resources.requests
```

## Ignoring Cert-Manager Managed Fields

Cert-manager modifies Ingress resources by adding annotations and sometimes modifying TLS configuration:

```yaml
ignoreDifferences:
  - group: networking.k8s.io
    kind: Ingress
    jsonPointers:
      - /metadata/annotations/acme.cert-manager.io~1http01-edit-in-place
      - /metadata/annotations/cert-manager.io~1issuer-kind
      - /metadata/annotations/cert-manager.io~1issuer-name
  - group: ""
    kind: Secret
    name: my-tls-cert
    jsonPointers:
      - /data
      - /metadata/annotations
```

## Ignoring External DNS Annotations

External DNS adds annotations to Services and Ingresses to track DNS record ownership:

```yaml
ignoreDifferences:
  - group: ""
    kind: Service
    jsonPointers:
      - /metadata/annotations/external-dns.alpha.kubernetes.io~1hostname
  - group: networking.k8s.io
    kind: Ingress
    jsonPointers:
      - /metadata/annotations/external-dns.alpha.kubernetes.io~1target
```

## Ignoring Kyverno Policy-Injected Labels

Kyverno policies can mutate resources to add labels, annotations, or default values:

```yaml
ignoreDifferences:
  - group: apps
    kind: Deployment
    jsonPointers:
      - /metadata/labels/policies.kyverno.io~1managed
      - /metadata/annotations/policies.kyverno.io~1last-applied
    jqPathExpressions:
      - .spec.template.metadata.labels | to_entries[] | select(.key | startswith("policies.kyverno.io"))
```

## System-Level Configuration for Operator Fields

When an operator affects many applications, configure the rules globally in the `argocd-cm` ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Ignore HPA-managed replicas across all Deployments
  resource.customizations.ignoreDifferences.apps_Deployment: |
    jsonPointers:
      - /spec/replicas
  # Ignore cert-manager annotations on all Ingresses
  resource.customizations.ignoreDifferences.networking.k8s.io_Ingress: |
    jsonPointers:
      - /metadata/annotations/cert-manager.io~1issuer-name
      - /metadata/annotations/cert-manager.io~1issuer-kind
```

## Using ManagedFields Manager for Diff

ArgoCD can use Kubernetes managed fields metadata to automatically ignore fields owned by other managers:

```yaml
ignoreDifferences:
  - group: apps
    kind: Deployment
    managedFieldsManagers:
      - kube-controller-manager  # HPA manager
      - vpa-recommender          # VPA manager
```

This tells ArgoCD to ignore any field owned by these managers. It is more future-proof than listing specific JSON pointers because it automatically adapts when the operator starts managing new fields.

## Using Server-Side Diff

Server-side diff with server-side apply helps resolve operator conflicts by using field ownership properly:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  annotations:
    argocd.argoproj.io/compare-options: ServerSideDiff=true
spec:
  syncPolicy:
    syncOptions:
      - ServerSideApply=true
```

With server-side apply, Kubernetes tracks field ownership per manager. ArgoCD only owns the fields it applies, and operators own the fields they set. This eliminates most conflict scenarios.

## The RespectIgnoreDifferences Flag

When using auto-sync with self-heal, ArgoCD may still try to revert operator changes even with `ignoreDifferences` configured. Enable `RespectIgnoreDifferences` to prevent this:

```yaml
syncPolicy:
  automated:
    selfHeal: true
    prune: true
  syncOptions:
    - RespectIgnoreDifferences=true
```

## Handling Multiple Operators on the Same Resource

Sometimes multiple operators modify the same resource. Combine their ignore rules:

```yaml
ignoreDifferences:
  - group: apps
    kind: Deployment
    jsonPointers:
      - /spec/replicas                    # HPA
    jqPathExpressions:
      - .spec.template.spec.containers[].resources  # VPA
    managedFieldsManagers:
      - kube-controller-manager           # HPA
      - vpa-recommender                   # VPA
      - istio-sidecar-injector            # Istio
```

## Debugging Operator Conflicts

When operator ignore rules are not working:

```bash
# Check who manages what fields
kubectl get deployment my-app -o json | jq '.metadata.managedFields[] | {manager, fieldsV1}'

# Verify ArgoCD sees the ignore rules
argocd app get my-app -o yaml | grep -A30 ignoreDifferences

# Force refresh and check diff
argocd app get my-app --hard-refresh
argocd app diff my-app
```

## Best Practices

1. **Use managedFieldsManagers when possible** - It automatically adapts to operator changes
2. **Combine with server-side diff** - The most robust solution for operator conflicts
3. **Remove the field from Git** - If HPA manages replicas, consider removing `spec.replicas` from your manifests entirely
4. **Scope rules to specific resources** - Use the `name` field to target only resources actually affected
5. **Review after operator upgrades** - Operators may change which fields they manage between versions

For more on diff customization techniques, see [How to Customize Diffs in ArgoCD](https://oneuptime.com/blog/post/2026-01-25-customize-diffs-argocd/view) and [How to Use JSONPointers for Diff Customization](https://oneuptime.com/blog/post/2026-02-26-argocd-jsonpointers-diff-customization/view).
