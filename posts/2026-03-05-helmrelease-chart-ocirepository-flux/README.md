# How to Use HelmRelease with Chart from OCIRepository in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Helm, HelmRelease, OCIRepository, OCI Registry, Chart Source

Description: Learn how to configure a HelmRelease to source Helm charts from an OCI registry using the OCIRepository source and chartRef in Flux CD.

---

OCI (Open Container Initiative) registries have become the standard way to distribute Helm charts. Major registries like Docker Hub, GitHub Container Registry, Amazon ECR, Azure Container Registry, and Google Artifact Registry all support Helm charts as OCI artifacts. Flux CD provides the OCIRepository source type to pull charts from these registries, and you can reference them in your HelmRelease using `spec.chartRef`.

## Why Use OCI for Helm Charts?

OCI registries offer several advantages over traditional Helm repositories:

- **Unified registry** -- Store container images and Helm charts in the same registry
- **Better security** -- Leverage existing registry authentication and authorization
- **Immutable artifacts** -- OCI tags can be made immutable, preventing accidental overwrites
- **Wider ecosystem support** -- Most cloud providers offer managed OCI registries

## Prerequisites

- Kubernetes cluster with Flux CD v2.x or later
- An OCI registry with Helm charts pushed to it
- `kubectl` and `flux` CLI tools
- Registry credentials if the registry is private

## Setting Up the OCIRepository Source

Create an OCIRepository source that points to your OCI-hosted Helm chart:

```yaml
# OCIRepository source for a Helm chart in an OCI registry
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: my-app-chart
  namespace: flux-system
spec:
  interval: 5m
  url: oci://ghcr.io/my-org/charts/my-app
  ref:
    # Pull a specific version tag
    tag: "1.2.0"
```

For private registries, provide authentication:

```yaml
# OCIRepository with authentication
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: my-app-chart
  namespace: flux-system
spec:
  interval: 5m
  url: oci://ghcr.io/my-org/charts/my-app
  ref:
    tag: "1.2.0"
  secretRef:
    name: oci-registry-credentials
---
# Secret with registry credentials
apiVersion: v1
kind: Secret
metadata:
  name: oci-registry-credentials
  namespace: flux-system
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: <base64-encoded-docker-config>
```

## Using spec.chartRef with OCIRepository

The `spec.chartRef` field on HelmRelease allows you to reference an OCIRepository directly. This is the recommended approach for OCI-hosted charts:

```yaml
# HelmRelease using chartRef to reference an OCIRepository
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 10m
  # Reference the OCIRepository as the chart source
  chartRef:
    kind: OCIRepository
    name: my-app-chart
    namespace: flux-system
  values:
    replicaCount: 3
    image:
      repository: my-registry/my-app
      tag: "1.0.0"
```

## Using Semver Ranges

You can configure the OCIRepository to follow a semver range, automatically picking up new patch or minor versions:

```yaml
# OCIRepository with semver range
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: my-app-chart
  namespace: flux-system
spec:
  interval: 5m
  url: oci://ghcr.io/my-org/charts/my-app
  ref:
    # Automatically pick up patch updates within the 1.2.x range
    semver: ">=1.2.0 <1.3.0"
```

## Using the Digest for Immutable References

For maximum reproducibility, pin to a specific digest:

```yaml
# OCIRepository pinned to a specific digest
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: my-app-chart
  namespace: flux-system
spec:
  interval: 5m
  url: oci://ghcr.io/my-org/charts/my-app
  ref:
    digest: sha256:abc123def456...
```

## Complete Example: End-to-End Setup

Here is a complete example that sets up an OCIRepository and a HelmRelease together:

```yaml
# OCIRepository for nginx chart from a public OCI registry
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: nginx-chart
  namespace: flux-system
spec:
  interval: 10m
  url: oci://registry-1.docker.io/bitnamicharts/nginx
  ref:
    semver: "15.x"
---
# HelmRelease referencing the OCIRepository
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: nginx
  namespace: default
spec:
  interval: 10m
  chartRef:
    kind: OCIRepository
    name: nginx-chart
    namespace: flux-system
  values:
    service:
      type: ClusterIP
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
```

## Alternative: Using HelmRepository with OCI

Flux also supports OCI registries through the HelmRepository type with `type: oci`. This is an alternative approach that does not use OCIRepository:

```yaml
# HelmRepository with OCI type (alternative approach)
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: my-oci-repo
  namespace: flux-system
spec:
  type: oci
  interval: 5m
  url: oci://ghcr.io/my-org/charts
---
# HelmRelease using HelmRepository with OCI
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 10m
  chart:
    spec:
      chart: my-app
      version: "1.2.x"
      sourceRef:
        kind: HelmRepository
        name: my-oci-repo
        namespace: flux-system
```

The key difference is that `OCIRepository` with `chartRef` treats the entire OCI artifact as the chart, while `HelmRepository` with `type: oci` treats the OCI URL as a repository prefix and appends the chart name.

## Cloud Provider Authentication

For cloud-managed registries, Flux supports provider-specific authentication:

```yaml
# OCIRepository with AWS ECR authentication
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: my-app-chart
  namespace: flux-system
spec:
  interval: 5m
  url: oci://123456789.dkr.ecr.us-east-1.amazonaws.com/charts/my-app
  ref:
    tag: "1.2.0"
  provider: aws
```

Supported providers include `aws`, `azure`, `gcp`, and `generic`.

## Verifying the Setup

After applying the resources, verify they are working correctly:

```bash
# Check the OCIRepository source status
flux get source oci my-app-chart -n flux-system

# Check the HelmRelease status
flux get helmrelease my-app -n default

# View detailed status of the OCIRepository
kubectl describe ocirepository my-app-chart -n flux-system

# Confirm the Helm release exists
helm list -n default
```

## Troubleshooting

Common issues and how to diagnose them:

```bash
# Authentication errors -- verify credentials
kubectl describe ocirepository my-app-chart -n flux-system | grep -A 5 "Message"

# Chart not found -- verify the OCI URL and tag
flux get source oci my-app-chart -n flux-system

# HelmRelease not reconciling -- check chartRef configuration
kubectl describe helmrelease my-app -n default
```

## Best Practices

1. **Use semver ranges for automated updates.** Let Flux pick up patch versions automatically while controlling major and minor versions.
2. **Use digests for production.** Pin to a specific digest in production for maximum reproducibility.
3. **Use cloud provider authentication.** Leverage `spec.provider` for cloud-managed registries instead of managing credentials manually.
4. **Prefer OCIRepository with chartRef.** This is the newer, more flexible approach for OCI-hosted charts.
5. **Set appropriate intervals.** Use shorter intervals for development and longer intervals for production.

## Conclusion

Using OCIRepository with `spec.chartRef` in Flux provides a clean way to source Helm charts from OCI registries. This approach leverages the OCI ecosystem for chart distribution, supports cloud-native authentication, and integrates seamlessly with the Flux reconciliation model. Whether you use public registries or private cloud-managed registries, OCIRepository gives you full control over chart sourcing and versioning.
