# How to Ignore Server-Side Fields in ArgoCD Comparison

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Server-Side Apply

Description: Learn how to configure ArgoCD to ignore server-side fields injected by Kubernetes controllers, admission webhooks, and operators to prevent false OutOfSync status in your GitOps workflow.

---

One of the most common frustrations with ArgoCD is seeing applications perpetually stuck in "OutOfSync" status even though you have not changed anything in Git. The culprit is almost always server-side fields - metadata, annotations, labels, and spec values that Kubernetes controllers, admission webhooks, or operators inject into resources after they are applied. This guide walks through how to identify these fields and configure ArgoCD to ignore them.

## Where Server-Side Fields Come From

Kubernetes is not a static system. After you apply a resource, multiple components can modify it:

- **Kubernetes controllers** add fields like `metadata.managedFields`, status subresources, and `metadata.generation`
- **Admission webhooks** inject sidecar containers (Istio, Linkerd), add annotations, or modify resource specs
- **Operators** update fields on custom resources they manage
- **Server-side apply** tracks field ownership through `managedFields` entries
- **Default values** that Kubernetes fills in when you omit optional fields

ArgoCD compares your Git manifests against the live cluster state. When the live state has fields that Git does not, ArgoCD flags the resource as out of sync.

## Identifying Problematic Server-Side Fields

Before configuring ignore rules, you need to identify which fields are causing the drift. Use the ArgoCD CLI or UI to inspect the diff:

```bash
# Show the raw diff for an application
argocd app diff my-app

# Show detailed diff with more context
argocd app diff my-app --local /path/to/manifests
```

You can also use `kubectl` to compare directly:

```bash
# Get the live resource and review fields not in your manifests
kubectl get deployment my-app -n production -o yaml | less

# Check which field managers own which fields
kubectl get deployment my-app -n production -o json | \
  jq '.metadata.managedFields[] | {manager: .manager, fields: .fieldsV1}'
```

Look for patterns in the diff output. Common server-side additions include:

- `metadata.annotations["kubectl.kubernetes.io/last-applied-configuration"]`
- `metadata.annotations["deployment.kubernetes.io/revision"]`
- `metadata.managedFields`
- `spec.template.metadata.annotations` added by webhooks
- `status` fields on CRDs

## System-Level Configuration for Common Fields

For fields that affect all resources across your ArgoCD instance, configure system-level ignore rules in the `argocd-cm` ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Ignore specific fields on all resources of a kind
  resource.customizations.ignoreDifferences.all: |
    managedFieldsManagers:
      - kube-controller-manager
      - kube-scheduler
    jsonPointers:
      - /metadata/managedFields

  # Ignore fields on specific resource types
  resource.customizations.ignoreDifferences.apps_Deployment: |
    jsonPointers:
      - /spec/replicas
    jqPathExpressions:
      - .metadata.annotations["deployment.kubernetes.io/revision"]

  resource.customizations.ignoreDifferences.admissionregistration.k8s.io_MutatingWebhookConfiguration: |
    jqPathExpressions:
      - .webhooks[]?.clientConfig.caBundle
```

The key format is `resource.customizations.ignoreDifferences.<group>_<kind>`. For core API group resources (like ConfigMap, Service), use an empty group: `_ConfigMap`.

## Ignoring Fields by Field Manager

Server-side apply introduced field ownership tracking. ArgoCD can leverage this to ignore fields owned by specific managers. This is the cleanest approach because it adapts automatically as controllers change which fields they manage:

```yaml
# argocd-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.customizations.ignoreDifferences.all: |
    managedFieldsManagers:
      # Kubernetes built-in controllers
      - kube-controller-manager
      # Istio sidecar injector
      - istio-sidecar-injector
      # Cert-manager
      - cert-manager-certificates
      # Custom operators
      - my-custom-operator
```

You can also set this per application:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/my-org/apps.git
    targetRevision: main
    path: my-app
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  ignoreDifferences:
    - group: apps
      kind: Deployment
      managedFieldsManagers:
        - kube-controller-manager
```

## Handling Webhook-Injected Fields

Mutating admission webhooks are one of the biggest sources of server-side field injection. Here are patterns for common webhooks:

### Istio Sidecar Injection

```yaml
ignoreDifferences:
  - group: apps
    kind: Deployment
    jqPathExpressions:
      - .spec.template.metadata.labels["security.istio.io/tlsMode"]
      - .spec.template.metadata.annotations["sidecar.istio.io/status"]
      - .spec.template.metadata.annotations["prometheus.io/path"]
      - .spec.template.metadata.annotations["prometheus.io/port"]
      - .spec.template.metadata.annotations["prometheus.io/scrape"]
```

### AWS Load Balancer Controller

```yaml
ignoreDifferences:
  - group: ""
    kind: Service
    jqPathExpressions:
      - .metadata.annotations["service.beta.kubernetes.io/aws-load-balancer-internal"]
  - group: networking.k8s.io
    kind: Ingress
    jqPathExpressions:
      - .metadata.annotations | to_entries[] | select(.key | startswith("alb.ingress.kubernetes.io"))
```

### Cert-Manager

```yaml
ignoreDifferences:
  - group: cert-manager.io
    kind: Certificate
    jsonPointers:
      - /status
  - group: ""
    kind: Secret
    jqPathExpressions:
      - select(.metadata.annotations["cert-manager.io/certificate-name"] != null) | .data
```

## Using Server-Side Diff Mode

ArgoCD 2.5 and later offers a server-side diff mode that delegates comparison to the Kubernetes API server itself. This automatically handles many server-side field issues because the API server understands field ownership natively:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Enable server-side diff globally
  controller.diff.server.side: "true"
```

Or per application:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
  annotations:
    # Enable server-side diff for this application only
    argocd.argoproj.io/compare-options: ServerSideDiff=true
spec:
  # ... rest of spec
```

Server-side diff mode has trade-offs. It is more accurate for field ownership but can be slower because it makes API calls for each comparison. It also requires ArgoCD to have dry-run permissions.

## Debugging Server-Side Field Issues

When your ignore rules do not seem to work, follow this debugging workflow:

```bash
# Step 1: Check what ArgoCD sees as the diff
argocd app diff my-app 2>&1 | head -50

# Step 2: Hard refresh to clear cache
argocd app get my-app --hard-refresh

# Step 3: Check the application spec to verify ignore rules are applied
argocd app get my-app -o yaml | grep -A 20 ignoreDifferences

# Step 4: Check ArgoCD controller logs for comparison errors
kubectl logs -n argocd deployment/argocd-application-controller | \
  grep -i "comparison\|diff\|ignore" | tail -20
```

Common pitfalls:

- **Wrong group name**: Use `apps` not `apps/v1` for the group. The version is not included.
- **JSON pointer escaping**: Slashes in keys must be escaped as `~1`, tildes as `~0`.
- **JQ syntax errors**: Test your JQ expressions locally with `echo '{}' | jq 'your_expression'` before applying.
- **Cache staleness**: ArgoCD caches comparison results. Use `--hard-refresh` after changing ignore rules.

## Best Practices for Managing Server-Side Fields

1. **Prefer managedFieldsManagers over jsonPointers** when the field injection comes from a known controller.
2. **Consider server-side diff mode** if you are running ArgoCD 2.5+ and have many server-side field issues.
3. **Document every ignore rule** - six months from now, someone will wonder why certain drift is being suppressed.
4. **Audit ignore rules quarterly** - remove rules for controllers or webhooks that are no longer in use.
5. **Use system-level rules for cluster-wide patterns** and per-application rules for app-specific exceptions.

Ignoring server-side fields is a necessary part of running ArgoCD in production. The key is to be deliberate about what you ignore and why, so you maintain the integrity of your GitOps workflow while keeping your sync status meaningful. For related configuration, check out [How to Configure Compare Options per Application](https://oneuptime.com/blog/post/2026-02-26-argocd-compare-options-per-application/view).
