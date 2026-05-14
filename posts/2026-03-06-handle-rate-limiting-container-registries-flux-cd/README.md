# How to Handle Rate Limiting from Container Registries in Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Rate Limiting, Container Registries, Docker Hub, Performance, Image Automation

Description: A practical guide to managing container registry rate limits in Flux CD, covering authentication, caching, and optimization strategies.

---

## Introduction

Flux CD's image automation controllers continuously scan container registries for new image tags. At scale, this can quickly exhaust rate limits, especially with Docker Hub's restrictive policies. This guide provides practical strategies to handle rate limiting from container registries in Flux CD.

## Understanding Container Registry Rate Limits

Different registries enforce different limits:

- **Docker Hub (anonymous)**: 100 pulls per 6 hours per IP
- **Docker Hub (authenticated)**: 200 pulls per 6 hours per user
- **Docker Hub (paid)**: Unlimited pulls for Pro, Team, and Business accounts, subject to fair use
- **GitHub Container Registry**: Public container image storage and bandwidth are currently free; GitHub still applies service rate and abuse limits
- **AWS ECR**: No hard pull limit, but API rate limits apply
- **Google Artifact Registry**: Quota-based, configurable per project

## Identifying Rate Limit Issues

### Check Image Repository Status

```bash
# Check all ImageRepository objects for errors

kubectl get imagerepositories -A

# Get detailed status with conditions
kubectl get imagerepositories -A -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name}: {.status.conditions[0].message}{"\n"}{end}'

# Check image-reflector-controller logs for rate limit errors
kubectl logs -n flux-system deploy/image-reflector-controller | grep -i "rate\|429\|too many"
```

### Identify the Source of Excessive Pulls

```bash
# Count the number of ImageRepository objects per registry
kubectl get imagerepositories -A -o jsonpath='{range .items[*]}{.spec.image}{"\n"}{end}' | \
  awk -F'/' '{print $1}' | sort | uniq -c | sort -rn

# Check scan intervals across all ImageRepository objects
kubectl get imagerepositories -A -o jsonpath='{range .items[*]}{.metadata.name}: {.spec.interval}{"\n"}{end}'
```

## Configuring Registry Authentication

Always authenticate to get higher rate limits.

### Docker Hub Authentication

```yaml
# dockerhub-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: dockerhub-credentials
  namespace: flux-system
type: kubernetes.io/dockerconfigjson
stringData:
  # Docker Hub credentials for higher rate limits
  # Authenticated users get 200 pulls/6hr vs 100 for anonymous
  .dockerconfigjson: |
    {
      "auths": {
        "https://index.docker.io/v1/": {
          "username": "your-dockerhub-username",
          "password": "your-dockerhub-token",
          "auth": "base64-encoded-username:token"
        }
      }
    }
```

### AWS ECR Authentication with IRSA

```yaml
# ecr-auth.yaml
# Use IAM Roles for Service Accounts to authenticate with ECR
apiVersion: v1
kind: ServiceAccount
metadata:
  name: image-reflector-controller
  namespace: flux-system
  annotations:
    # Associate with an IAM role that has ECR read access
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/flux-ecr-reader
---
# ECR credentials are auto-refreshed when using IRSA
# No manual secret rotation needed
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app
  interval: 5m
  provider: aws
```

### Google Artifact Registry Authentication

```yaml
# gar-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: gar-credentials
  namespace: flux-system
type: kubernetes.io/dockerconfigjson
stringData:
  .dockerconfigjson: |
    {
      "auths": {
        "us-docker.pkg.dev": {
          "username": "_json_key",
          "password": "{\"type\":\"service_account\",\"project_id\":\"my-project\",...}"
        }
      }
    }
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: us-docker.pkg.dev/my-project/my-repo/my-app
  interval: 5m
  secretRef:
    name: gar-credentials
```

## Optimizing Image Scan Intervals

### Increase Scan Intervals for Stable Images

```yaml
# image-repository-optimized.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: docker.io/myorg/my-app
  # Increase the scan interval to reduce registry API calls
  # Production images typically update infrequently
  interval: 10m
  secretRef:
    name: dockerhub-credentials
  # Limit tag scanning to reduce API calls
  # Only scan tags matching a specific pattern
  exclusionList:
    # Exclude tags that are not deployment candidates
    - "^sha-"
    - "^test-"
    - "^dev-"
```

### Use Tag Filtering to Reduce Policy Scope

```yaml
# image-policy-filtered.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  # Only consider semver tags when selecting the latest deployable image
  policy:
    semver:
      # Only match stable release tags
      range: ">=1.0.0"
  filterTags:
    # Further filter to only scan production-ready tags
    pattern: "^v?(?P<version>[0-9]+\\.[0-9]+\\.[0-9]+)$"
    extract: "$version"
```

## Setting Up a Registry Mirror or Cache

### Deploy a Pull-Through Cache with Harbor

```text
# Harbor proxy cache setup
# 1. Deploy Harbor using its supported installer or Helm chart.
# 2. In Harbor, create a registry endpoint for https://registry-1.docker.io.
# 3. Create a project, enable Proxy Cache, and select the Docker Hub endpoint.
# 4. Pull cached images by prefixing them with the Harbor host and proxy project:
#
#    harbor.example.com/dockerhub-cache/myorg/my-app:tag
```

### Point Flux ImageRepository to the Cache

```yaml
# image-repository-cached.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  # Point to your internal cache instead of Docker Hub directly
  image: harbor.example.com/dockerhub-cache/myorg/my-app
  interval: 5m
  # Use cert for the internal registry
  certSecretRef:
    name: harbor-ca-cert
```

## Configuring HelmRepository Rate Limit Handling

### OCI Helm Registry Configuration

```yaml
# helm-oci-optimized.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: my-charts
  namespace: flux-system
spec:
  type: oci
  url: oci://registry-1.docker.io/myorg
  # interval is required by the API, but is ineffectual for OCI Helm repositories
  interval: 10m
  secretRef:
    name: dockerhub-credentials
---
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
      version: ">=1.0.0 <2.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-charts
        namespace: flux-system
      # Reconcile chart less frequently
      interval: 10m
```

### Traditional Helm Repository

```yaml
# helm-repo-optimized.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: bitnami
  namespace: flux-system
spec:
  url: https://charts.bitnami.com/bitnami
  # Helm index files can be large; reduce fetch frequency
  interval: 30m
  # Set timeout for slow registries
  timeout: 2m
```

## Monitoring Registry Rate Limit Consumption

### Prometheus Metrics and Alerts

```yaml
# registry-rate-limit-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flux-registry-rate-limits
  namespace: flux-system
spec:
  groups:
    - name: flux-registry-rate-limits
      rules:
        # Alert when image scan failures increase
        - alert: FluxImageScanFailures
          expr: |
            max_over_time(gotk_reconcile_condition{
              type="Ready",
              status="False",
              kind="ImageRepository"
            }[15m]) > 0
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "Flux image scanning failures detected"
            description: "ImageRepository {{ $labels.name }} is failing scans, possibly due to rate limiting."
        # Alert on scan duration increases (sign of throttling)
        - alert: FluxImageScanSlow
          expr: |
            histogram_quantile(0.95,
              sum by (le, name, namespace) (
                rate(gotk_reconcile_duration_seconds_bucket{kind="ImageRepository"}[5m])
              )
            ) > 30
          for: 10m
          labels:
            severity: info
          annotations:
            summary: "Image scanning is slow"
            description: "ImageRepository {{ $labels.name }} scan is taking over 30 seconds."
```

### Grafana Dashboard Query

```yaml
# grafana-dashboard-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: flux-registry-dashboard
  namespace: monitoring
  labels:
    grafana_dashboard: "true"
data:
  flux-registry.json: |
    {
      "panels": [
        {
          "title": "Image Repository Scan Duration",
          "targets": [
            {
              "expr": "histogram_quantile(0.95, sum by (le, name, namespace) (rate(gotk_reconcile_duration_seconds_bucket{kind=\"ImageRepository\"}[5m])))"
            }
          ]
        },
        {
          "title": "Image Repository Failures",
          "targets": [
            {
              "expr": "sum by (name, namespace) (max_over_time(gotk_reconcile_condition{kind=\"ImageRepository\",status=\"False\"}[5m]))"
            }
          ]
        }
      ]
    }
```

## Emergency Rate Limit Recovery

### Suspend All Image Scanning

```bash
# Immediately stop all image scanning to recover from rate limiting
kubectl patch imagerepositories.image.toolkit.fluxcd.io -A \
  --type=merge \
  -p '{"spec":{"suspend":true}}'

# Resume one at a time with staggered timing
flux get images repository -A --no-header | awk '{print $1, $2}' | \
while read -r namespace repo; do
  flux resume image repository "$repo" -n "$namespace"
  # Wait between resuming each repository
  sleep 60
done
```

### Suspend via Kubernetes Patch

```yaml
# suspend-all-image-repos.yaml
# Add your ImageRepository manifests under resources, then apply this
# Kustomization to suspend them declaratively.
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ./image-repositories
patches:
  - target:
      group: image.toolkit.fluxcd.io
      version: v1
      kind: ImageRepository
    patch: |
      - op: add
        path: /spec/suspend
        value: true
```

## Best Practices Summary

1. **Always authenticate** - Anonymous pulls have the lowest rate limits
2. **Use a registry mirror** - Pull-through caches dramatically reduce upstream calls
3. **Increase scan intervals** - 5-10 minutes is sufficient for most workloads
4. **Filter tags aggressively** - Only scan tags that match your deployment patterns
5. **Use exclusion lists** - Skip dev, test, and SHA-based tags
6. **Monitor scan failures** - Set up alerts before rate limits impact deployments
7. **Consider paid tiers** - Docker Hub Pro/Team plans have much higher limits
8. **Use cloud-native registries** - ECR, GCR, and ACR have more generous limits

## Conclusion

Container registry rate limiting is one of the most common operational challenges when running Flux CD at scale. By authenticating all registry access, deploying pull-through caches, optimizing scan intervals, and filtering tags, you can maintain reliable image automation without exhausting rate limits. Proactive monitoring ensures you detect and address rate limit issues before they impact your deployment pipeline.
