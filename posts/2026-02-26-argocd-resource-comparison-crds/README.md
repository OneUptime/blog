# How to Handle Resource Comparison for CRDs in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Custom Resource

Description: Learn how to handle resource comparison challenges for Custom Resource Definitions in ArgoCD, including status field management, operator-managed fields, and diff normalization for CRDs.

---

Custom Resource Definitions (CRDs) are the backbone of the Kubernetes operator ecosystem. From databases to message queues to service meshes, nearly every production Kubernetes cluster runs CRDs. ArgoCD handles built-in Kubernetes resources well out of the box, but CRDs present unique comparison challenges. Operators constantly update status fields, inject default values, and manage subresources in ways that cause false OutOfSync reports. This guide covers how to configure ArgoCD to handle CRD comparison correctly.

## Why CRDs Are Different

Built-in Kubernetes resources like Deployments and Services follow well-known schemas. ArgoCD has built-in knowledge of which fields are server-managed (like `status`) and which are user-managed (like `spec`). CRDs do not have this luxury. ArgoCD treats CRD fields generically, which means:

- Status fields are compared even though they are managed by the operator
- Default values injected by webhook conversions show up as drift
- Operator-managed spec fields create persistent OutOfSync status
- Version conversions between stored and served API versions cause phantom diffs

## Identifying CRD Comparison Issues

Start by checking which CRD fields are causing problems:

```bash
# Check the diff for a specific application
argocd app diff my-database-app

# Get the live CRD resource to see all fields
kubectl get postgresql my-db -n production -o yaml

# Compare against your Git manifest
diff <(kubectl get postgresql my-db -n production -o yaml) \
     <(cat path/to/git/manifest.yaml)
```

Common patterns you will see in the diff:

- Entire `status` block appearing as a difference
- `.metadata.annotations` added by the operator
- `.spec` fields with defaults filled in that you did not specify
- `.metadata.finalizers` added by the operator
- `.metadata.generation` and `.metadata.resourceVersion` changes

## Ignoring Status Fields on CRDs

The most common CRD comparison issue is the status field. Unlike built-in resources where ArgoCD knows to skip status, CRD status fields are included in the comparison by default.

### Per-Resource Type Configuration

Configure ignore rules in `argocd-cm` for each CRD type:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # PostgreSQL Operator (Zalando)
  resource.customizations.ignoreDifferences.acid.zalan.do_postgresql: |
    jsonPointers:
      - /status
      - /spec/numberOfInstances

  # Strimzi Kafka
  resource.customizations.ignoreDifferences.kafka.strimzi.io_Kafka: |
    jsonPointers:
      - /status
    jqPathExpressions:
      - .metadata.annotations["strimzi.io/generation"]

  # Istio VirtualService
  resource.customizations.ignoreDifferences.networking.istio.io_VirtualService: |
    jsonPointers:
      - /status
    managedFieldsManagers:
      - istio-pilot

  # Cert-Manager Certificate
  resource.customizations.ignoreDifferences.cert-manager.io_Certificate: |
    jsonPointers:
      - /status
```

### Wildcard Configuration for All CRDs

If you have many CRDs with status field issues, you can configure a blanket ignore rule:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Ignore status on ALL resource types
  resource.customizations.ignoreDifferences.all: |
    jsonPointers:
      - /status
```

Be cautious with this approach. Some resources use status fields for meaningful configuration, and ignoring them globally could mask real issues.

## Custom Health Checks for CRDs

ArgoCD does not know how to assess the health of custom resources by default. Without a health check, CRDs show as "Healthy" even when the operator reports errors in the status. Configure custom health checks alongside your comparison rules:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Custom health check for PostgreSQL CRD
  resource.customizations.health.acid.zalan.do_postgresql: |
    hs = {}
    if obj.status ~= nil then
      if obj.status.PostgresClusterStatus == "Running" then
        hs.status = "Healthy"
        hs.message = "PostgreSQL cluster is running"
      elseif obj.status.PostgresClusterStatus == "Creating" or
             obj.status.PostgresClusterStatus == "Updating" then
        hs.status = "Progressing"
        hs.message = "PostgreSQL cluster is " .. obj.status.PostgresClusterStatus
      else
        hs.status = "Degraded"
        hs.message = obj.status.PostgresClusterStatus or "Unknown status"
      end
    else
      hs.status = "Progressing"
      hs.message = "Waiting for operator to update status"
    end
    return hs

  # Custom health check for Kafka CRD
  resource.customizations.health.kafka.strimzi.io_Kafka: |
    hs = {}
    if obj.status ~= nil and obj.status.conditions ~= nil then
      for _, condition in ipairs(obj.status.conditions) do
        if condition.type == "Ready" and condition.status == "True" then
          hs.status = "Healthy"
          hs.message = "Kafka cluster is ready"
          return hs
        end
      end
      hs.status = "Progressing"
      hs.message = "Kafka cluster is not yet ready"
    else
      hs.status = "Progressing"
      hs.message = "Waiting for status"
    end
    return hs
```

## Handling Operator Default Values

Many operators use admission webhooks or controllers to inject default values into CRD specs. For example, a database operator might set default `resources`, `storage`, or `replicas` values that you did not specify in Git.

### Option 1: Explicitly Set All Fields in Git

The cleanest approach is to be explicit in your Git manifests:

```yaml
# Instead of this (relies on operator defaults)
apiVersion: acid.zalan.do/v1
kind: postgresql
metadata:
  name: my-db
spec:
  teamId: myteam
  numberOfInstances: 2

# Do this (specify all fields the operator would default)
apiVersion: acid.zalan.do/v1
kind: postgresql
metadata:
  name: my-db
spec:
  teamId: myteam
  numberOfInstances: 2
  postgresql:
    version: "15"
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: "1"
      memory: 1Gi
  volume:
    size: 10Gi
```

### Option 2: Ignore Defaulted Fields

When you cannot control which defaults the operator sets:

```yaml
ignoreDifferences:
  - group: acid.zalan.do
    kind: postgresql
    jqPathExpressions:
      - .spec.resources
      - .spec.postgresql.parameters
      - .spec.patroni
```

## Handling CRD Version Conversions

Some CRDs serve multiple API versions through webhook conversions. The stored version might differ from the version you declared in Git, causing comparison failures:

```yaml
# Your Git manifest uses v1beta1
apiVersion: cert-manager.io/v1beta1
kind: Certificate
# ...

# But the cluster stores it as v1
apiVersion: cert-manager.io/v1
kind: Certificate
# ...
```

The fix is to update your Git manifests to use the stored (preferred) version:

```bash
# Check which version is stored
kubectl get crd certificates.cert-manager.io -o jsonpath='{.status.storedVersions}'
# Output: ["v1"]

# Update your manifests to use v1
```

## Resource Customization for CRD Comparison

ArgoCD supports a `resource.customizations.knownTypeFields` configuration that tells ArgoCD which fields on a CRD are equivalent to built-in type fields:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Tell ArgoCD that this CRD has a status subresource
  resource.customizations.knownTypeFields.acid.zalan.do_postgresql: |
    - field: spec
      type: Opaque
    - field: status
      type: Opaque
```

## Using Diff Normalization for CRDs

For more advanced scenarios, ArgoCD supports diff normalization through custom Lua scripts. This lets you transform a resource before comparison:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.customizations.ignoreDifferences.acid.zalan.do_postgresql: |
    jqPathExpressions:
      - .status
      - .metadata.annotations["acid.zalan.do/managed-by"]
      - .metadata.finalizers
```

## Putting It All Together

Here is a complete configuration for a cluster running multiple operators:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Global: ignore managedFields everywhere
  resource.customizations.ignoreDifferences.all: |
    managedFieldsManagers:
      - kube-controller-manager

  # PostgreSQL Operator
  resource.customizations.ignoreDifferences.acid.zalan.do_postgresql: |
    jsonPointers:
      - /status
      - /metadata/finalizers
    managedFieldsManagers:
      - postgres-operator

  # Strimzi Kafka
  resource.customizations.ignoreDifferences.kafka.strimzi.io_Kafka: |
    jsonPointers:
      - /status
    managedFieldsManagers:
      - strimzi-cluster-operator

  # Redis Operator
  resource.customizations.ignoreDifferences.redis.redis.opstreelabs.in_Redis: |
    jsonPointers:
      - /status
      - /metadata/finalizers
```

## Best Practices

1. **Always configure health checks alongside ignore rules** for CRDs. Ignoring status in comparison does not mean you should ignore health.
2. **Be explicit in Git manifests** to reduce the number of ignore rules needed.
3. **Use managedFieldsManagers** when the operator supports server-side apply.
4. **Test with `argocd app diff`** after every configuration change.
5. **Document CRD-specific configurations** so your team knows why certain fields are ignored.
6. **Upgrade CRDs and manifests together** to avoid version conversion issues.

Handling CRD comparison correctly is essential for a clean ArgoCD deployment at scale. For more on comparison configuration, see [How to Ignore Server-Side Fields in ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-ignore-server-side-fields/view).
