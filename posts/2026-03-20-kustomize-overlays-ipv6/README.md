# How to Configure Kustomize Overlays for IPv6 Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Kustomize, Kubernetes, GitOps, Overlay, Configuration Management

Description: Use Kustomize overlays to manage IPv6-specific Kubernetes configuration across environments, including service IP family patches, environment-specific IPv6 addresses, and strategic merge patches...

## Introduction

Kustomize enables environment-specific Kubernetes configuration through overlays, making it ideal for managing IPv6 differences between development, staging, and production environments. IPv6 environments may use different service IP families, different backend addresses, and different network CIDRs. Kustomize patches apply these differences cleanly without duplicating base manifests.

## Directory Structure

```text
kubernetes/
├── base/
│   ├── kustomization.yaml
│   ├── deployment.yaml
│   ├── service.yaml
│   └── configmap.yaml
└── overlays/
    ├── development/         # Dual-stack (IPv4 + IPv6)
    │   └── kustomization.yaml
    ├── staging/             # IPv6-only
    │   ├── kustomization.yaml
    │   ├── cluster-info.yaml
    │   └── patches/
    │       ├── service-ipv6-only.yaml
    │       └── config-ipv6-addrs.yaml
    └── production/          # IPv6 with public addressing
        ├── kustomization.yaml
        └── patches/
```

## Base Configuration

```yaml
# kubernetes/base/kustomization.yaml

apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - deployment.yaml
  - service.yaml
  - configmap.yaml
```

```yaml
# kubernetes/base/service.yaml - Default single-stack service in base
apiVersion: v1
kind: Service
metadata:
  name: myapp
spec:
  selector:
    app: myapp
  ports:
    - port: 8080
      targetPort: 8080
  # No ipFamilyPolicy - defaults to SingleStack in the cluster's primary service family
```

## IPv6-Only Overlay

```yaml
# kubernetes/overlays/staging/kustomization.yaml

apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base

# Apply patches for IPv6-only environment
patches:
  # Patch service to IPv6 only
  - path: patches/service-ipv6-only.yaml
    target:
      kind: Service
      name: myapp

  # Patch config for IPv6 addresses
  - path: patches/config-ipv6-addrs.yaml
    target:
      kind: ConfigMap
      name: myapp-config

  # Inline patch for deployment IPv6 environment variable
  - patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: myapp
      spec:
        template:
          spec:
            containers:
              - name: myapp
                env:
                  - name: LISTEN_ADDR
                    value: "[::]:8080"
                  - name: IPV6_ONLY_MODE
                    value: "true"
    target:
      kind: Deployment
      name: myapp

# Labels for this environment
labels:
  - pairs:
      environment: staging
      network: ipv6-only
    includeSelectors: true

# Namespace
namespace: staging
```

```yaml
# kubernetes/overlays/staging/patches/service-ipv6-only.yaml

apiVersion: v1
kind: Service
metadata:
  name: myapp
spec:
  # IPv6-only service
  ipFamilyPolicy: SingleStack
  ipFamilies:
    - IPv6
```

```yaml
# kubernetes/overlays/staging/patches/config-ipv6-addrs.yaml

apiVersion: v1
kind: ConfigMap
metadata:
  name: myapp-config
data:
  DATABASE_HOST: "[2001:db8:100::10]:5432"
  REDIS_URL: "redis://[2001:db8:100::20]:6379"
  DNS_SERVER: "2001:db8::53"
  TRUSTED_CIDRS: "2001:db8:100::/48"
```

## Dual-Stack Overlay

```yaml
# kubernetes/overlays/development/kustomization.yaml

apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base

patches:
  # Patch service to dual-stack
  - patch: |
      apiVersion: v1
      kind: Service
      metadata:
        name: myapp
      spec:
        ipFamilyPolicy: PreferDualStack
        ipFamilies:
          - IPv4
          - IPv6
    target:
      kind: Service
      name: myapp

namespace: development
```

## Production Overlay with LoadBalancer IPv6

```yaml
# kubernetes/overlays/production/kustomization.yaml

apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base
  # Additional resources only in production
  - hpa.yaml
  - pdb.yaml

patches:
  # Production service: dual-stack with LoadBalancer
  - patch: |
      apiVersion: v1
      kind: Service
      metadata:
        name: myapp
        annotations:
          # AWS-specific: requires a dual-stack-capable LoadBalancer implementation
          service.beta.kubernetes.io/aws-load-balancer-ip-address-type: "dualstack"
      spec:
        type: LoadBalancer
        ipFamilyPolicy: RequireDualStack
        ipFamilies:
          - IPv4
          - IPv6
    target:
      kind: Service
      name: myapp

  # Production environment variables
  - patch: |
      apiVersion: v1
      kind: ConfigMap
      metadata:
        name: myapp-config
      data:
        DATABASE_HOST: "[2001:db8:200::10]:5432"
        REDIS_URL: "redis://[2001:db8:200::20]:6379"
        TRUSTED_CIDRS: "2001:db8:200::/48,10.0.0.0/8"
    target:
      kind: ConfigMap
      name: myapp-config

  # Scale replicas for production
  - patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: myapp
      spec:
        replicas: 6
    target:
      kind: Deployment
      name: myapp

namespace: production
```

## Kustomize Variable Substitution for IPv6

```yaml
# kubernetes/overlays/staging/kustomization.yaml (excerpt using replacements)

apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base
  - cluster-info.yaml

# Structured value replacement
# Note: use Flux postBuild.substitute for arbitrary string templating
replacements:
  - source:
      kind: ConfigMap
      name: cluster-info
      fieldPath: data.trustedCidrs
    targets:
      - select:
          kind: ConfigMap
          name: myapp-config
        fieldPaths:
          - data.TRUSTED_CIDRS
```

## Build and Verify Overlays

```bash
# Preview the rendered output for staging (IPv6-only)
kustomize build kubernetes/overlays/staging | grep -A10 "ipFamilyPolicy"
# Expected: ipFamilyPolicy: SingleStack with ipFamilies containing IPv6

# Preview production (dual-stack)
kustomize build kubernetes/overlays/production | grep -A10 "ipFamilyPolicy"
# Expected: ipFamilyPolicy: RequireDualStack with ipFamilies containing IPv4 then IPv6

# Apply staging overlay
kubectl apply -k kubernetes/overlays/staging

# Diff: what would change
kubectl diff -k kubernetes/overlays/staging

# Verify the service family and assigned cluster IPs
kubectl get svc myapp -n staging -o yaml | grep -A6 "clusterIPs:"
# Verify: spec.ipFamilies contains IPv6 and spec.clusterIPs contains a single IPv6 address

kubectl get svc myapp -n production -o yaml | grep -A8 "clusterIPs:"
# Verify: spec.ipFamilies contains IPv4 and IPv6, and spec.clusterIPs contains one address from each family
```

## Conclusion

Kustomize overlays provide a clean way to manage IPv6 configuration differences between environments without duplicating manifests. Base manifests define single-stack services, and overlays apply patches to change `ipFamilyPolicy` and `ipFamilies` per environment. ConfigMap patches update environment-specific IPv6 addresses for backends. Inline patches in the `kustomization.yaml` are useful for simple changes like updating `LISTEN_ADDR` to `[::]`. Use `kustomize build` to preview rendered output and verify IPv6 settings before applying. In GitOps workflows, ArgoCD or Flux reconcile the appropriate overlay path for each environment, ensuring consistent IPv6 configuration across the cluster lifecycle.
