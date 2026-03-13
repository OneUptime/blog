# How to Structure a Flux Repository for Multi-Cloud Deployments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Repository Structure, Multi-Cloud, AWS, GCP, Azure

Description: Learn how to organize a Flux repository for managing Kubernetes clusters across multiple cloud providers.

---

Running Kubernetes clusters across multiple cloud providers adds another layer of complexity to your GitOps workflow. Each cloud provider has different storage classes, load balancer configurations, IAM integrations, and networking models. A well-structured Flux repository handles these differences while keeping application configurations consistent.

This guide shows how to structure your Flux repository for multi-cloud deployments.

## When to Use This Pattern

This pattern is suitable when you have:

- Kubernetes clusters on two or more cloud providers (AWS, GCP, Azure, on-premises)
- Cloud-specific infrastructure components like CSI drivers, load balancer controllers, or identity integrations
- Applications that should be deployed consistently across all clouds
- A need to avoid vendor lock-in while maintaining a single GitOps workflow

## Recommended Directory Structure

```text
fleet-repo/
  clusters/
    aws-us-east-1/
      production/
        flux-system/
        infrastructure.yaml
        apps.yaml
    gcp-us-central1/
      production/
        flux-system/
        infrastructure.yaml
        apps.yaml
    azure-eastus/
      production/
        flux-system/
        infrastructure.yaml
        apps.yaml
  infrastructure/
    base/
      common/
        cert-manager/
        monitoring/
        kustomization.yaml
      kustomization.yaml
    cloud-specific/
      aws/
        ebs-csi-driver/
        aws-load-balancer-controller/
        kustomization.yaml
      gcp/
        gce-pd-csi-driver/
        kustomization.yaml
      azure/
        azure-disk-csi-driver/
        kustomization.yaml
    overlays/
      aws/
        kustomization.yaml
      gcp/
        kustomization.yaml
      azure/
        kustomization.yaml
  apps/
    base/
      app-one/
      app-two/
      kustomization.yaml
    overlays/
      aws-production/
        kustomization.yaml
      gcp-production/
        kustomization.yaml
      azure-production/
        kustomization.yaml
```

## Separating Common and Cloud-Specific Infrastructure

The key insight is separating infrastructure into common components (same on every cloud) and cloud-specific components:

```yaml
# infrastructure/base/common/cert-manager/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: cert-manager
  namespace: cert-manager
spec:
  interval: 30m
  chart:
    spec:
      chart: cert-manager
      version: "1.14.x"
      sourceRef:
        kind: HelmRepository
        name: jetstack
        namespace: flux-system
  values:
    installCRDs: true
```

This is cloud-agnostic and deployed everywhere.

## Cloud-Specific Infrastructure

Each cloud provider has its own infrastructure components:

```yaml
# infrastructure/cloud-specific/aws/aws-load-balancer-controller/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: aws-load-balancer-controller
  namespace: kube-system
spec:
  interval: 30m
  chart:
    spec:
      chart: aws-load-balancer-controller
      version: "1.7.x"
      sourceRef:
        kind: HelmRepository
        name: eks-charts
        namespace: flux-system
  values:
    clusterName: ${CLUSTER_NAME}
    serviceAccount:
      annotations:
        eks.amazonaws.com/role-arn: ${LB_CONTROLLER_ROLE_ARN}
```

## Infrastructure Overlays

Combine common and cloud-specific infrastructure in overlays:

```yaml
# infrastructure/overlays/aws/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base/common
  - ../../cloud-specific/aws
```

```yaml
# infrastructure/overlays/gcp/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base/common
  - ../../cloud-specific/gcp
```

```yaml
# infrastructure/overlays/azure/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base/common
  - ../../cloud-specific/azure
```

## Cluster Entry Points

Each cluster points to its cloud-specific overlay:

```yaml
# clusters/aws-us-east-1/production/infrastructure.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/overlays/aws
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
  postBuild:
    substitute:
      CLOUD_PROVIDER: aws
      CLUSTER_NAME: aws-us-east-1-prod
      REGION: us-east-1
    substituteFrom:
      - kind: Secret
        name: cloud-credentials
```

```yaml
# clusters/gcp-us-central1/production/infrastructure.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/overlays/gcp
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
  postBuild:
    substitute:
      CLOUD_PROVIDER: gcp
      CLUSTER_NAME: gcp-us-central1-prod
      REGION: us-central1
```

## Cloud-Agnostic Application Configuration

Applications should be cloud-agnostic in their base configuration:

```yaml
# apps/base/app-one/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-one
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: app-one
  template:
    metadata:
      labels:
        app: app-one
    spec:
      containers:
        - name: app-one
          image: app-one:1.0.0
          env:
            - name: CLOUD_PROVIDER
              value: ${CLOUD_PROVIDER}
            - name: REGION
              value: ${REGION}
```

## Cloud-Specific Application Patches

When applications need cloud-specific settings like storage or ingress annotations:

```yaml
# apps/overlays/aws-production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
patches:
  - path: patches/ingress-aws.yaml
  - path: patches/storage-aws.yaml
```

```yaml
# apps/overlays/aws-production/patches/ingress-aws.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-one
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
```

```yaml
# apps/overlays/gcp-production/patches/ingress-gcp.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-one
  annotations:
    kubernetes.io/ingress.class: gce
    networking.gke.io/managed-certificates: app-one-cert
```

## Bootstrapping

Bootstrap each cloud cluster:

```bash
# AWS cluster
flux bootstrap github \
  --owner=your-org \
  --repository=fleet-repo \
  --branch=main \
  --path=./clusters/aws-us-east-1/production \
  --context=aws-prod

# GCP cluster
flux bootstrap github \
  --owner=your-org \
  --repository=fleet-repo \
  --branch=main \
  --path=./clusters/gcp-us-central1/production \
  --context=gcp-prod
```

## Conclusion

A multi-cloud Flux repository structure requires a clear separation between cloud-agnostic and cloud-specific components. By layering common infrastructure, cloud-specific infrastructure, and application overlays, you maintain consistency where it matters while accommodating the differences between cloud providers. This approach lets you manage a fleet of clusters across AWS, GCP, Azure, or on-premises from a single repository with confidence.
