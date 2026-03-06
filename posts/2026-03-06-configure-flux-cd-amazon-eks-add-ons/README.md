# How to Configure Flux CD with Amazon EKS Add-ons

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, amazon eks, eks add-ons, GitOps, Kubernetes, AWS, vpc-cni, CoreDNS, kube-proxy

Description: Manage Amazon EKS add-ons lifecycle through Flux CD for consistent, version-controlled cluster configuration using GitOps.

---

## Introduction

Amazon EKS add-ons provide operational software for Kubernetes clusters, including networking (VPC CNI), DNS (CoreDNS), and proxy (kube-proxy) components. Managing these add-ons through Flux CD ensures consistent configurations across clusters and enables version-controlled upgrades.

This guide covers managing EKS add-ons through GitOps, including both AWS-managed add-ons via ACK and self-managed add-ons via Helm.

## Prerequisites

Before starting, ensure you have:

- An Amazon EKS cluster running Kubernetes 1.27 or later
- Flux CD installed and bootstrapped on the cluster
- AWS CLI configured with appropriate permissions
- kubectl access to the cluster
- eksctl installed for add-on management

## Step 1: Understand EKS Add-on Types

EKS supports several categories of add-ons:

- **Networking**: Amazon VPC CNI, CoreDNS, kube-proxy
- **Storage**: Amazon EBS CSI Driver, Amazon EFS CSI Driver
- **Observability**: Amazon CloudWatch Observability, ADOT
- **Security**: Amazon GuardDuty Agent, Pod Identity Agent

```bash
# List all available EKS add-ons
aws eks describe-addon-versions \
  --query 'addons[].{Name:addonName,Versions:addonVersions[0].addonVersion}' \
  --output table

# List currently installed add-ons on your cluster
aws eks list-addons --cluster-name my-cluster
```

## Step 2: Manage VPC CNI Add-on via Flux

Deploy the VPC CNI plugin as a self-managed Helm release for full GitOps control.

```yaml
# infrastructure/eks-addons/vpc-cni-repo.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: eks-charts
  namespace: flux-system
spec:
  interval: 1h
  url: https://aws.github.io/eks-charts
```

```yaml
# infrastructure/eks-addons/vpc-cni.yaml
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: aws-vpc-cni
  namespace: kube-system
spec:
  interval: 15m
  chart:
    spec:
      chart: aws-vpc-cni
      version: "1.16.x"
      sourceRef:
        kind: HelmRepository
        name: eks-charts
        namespace: flux-system
  # Use existing CRDs to avoid conflicts
  install:
    crds: Skip
    remediation:
      retries: 3
  upgrade:
    crds: Skip
    remediation:
      retries: 3
  values:
    # Enable prefix delegation for higher pod density
    env:
      ENABLE_PREFIX_DELEGATION: "true"
      WARM_PREFIX_TARGET: "1"
      # Enable network policy support
      ENABLE_NETWORK_POLICY: "true"
    # IRSA configuration for VPC CNI
    serviceAccount:
      create: true
      name: aws-node
      annotations:
        eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/AmazonEKSVPCCNIRole
    # Init container configuration
    init:
      env:
        DISABLE_TCP_EARLY_DEMUX: "true"
```

## Step 3: Manage CoreDNS via Flux

```yaml
# infrastructure/eks-addons/coredns.yaml
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: coredns
  namespace: kube-system
spec:
  interval: 15m
  chart:
    spec:
      chart: coredns
      version: "1.29.x"
      sourceRef:
        kind: HelmRepository
        name: coredns-charts
        namespace: flux-system
  values:
    # Run two replicas for high availability
    replicaCount: 2
    # Resource allocation
    resources:
      requests:
        cpu: 100m
        memory: 70Mi
      limits:
        cpu: 200m
        memory: 170Mi
    # Custom Corefile configuration
    servers:
      - zones:
          - zone: .
        port: 53
        plugins:
          - name: errors
          - name: health
            configBlock: |-
              lameduck 5s
          - name: ready
          - name: kubernetes
            parameters: cluster.local in-addr.arpa ip6.arpa
            configBlock: |-
              pods insecure
              fallthrough in-addr.arpa ip6.arpa
              ttl 30
          - name: prometheus
            parameters: 0.0.0.0:9153
          - name: forward
            parameters: . /etc/resolv.conf
          - name: cache
            parameters: 30
          - name: loop
          - name: reload
          - name: loadbalance
    # Anti-affinity for spreading across nodes
    affinity:
      podAntiAffinity:
        preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                  - key: app.kubernetes.io/name
                    operator: In
                    values:
                      - coredns
              topologyKey: kubernetes.io/hostname
```

```yaml
# infrastructure/eks-addons/coredns-repo.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: coredns-charts
  namespace: flux-system
spec:
  interval: 1h
  url: https://coredns.github.io/helm
```

## Step 4: Deploy the EBS CSI Driver

```yaml
# infrastructure/eks-addons/ebs-csi-driver.yaml
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: aws-ebs-csi-driver
  namespace: kube-system
spec:
  interval: 15m
  chart:
    spec:
      chart: aws-ebs-csi-driver
      version: "2.27.x"
      sourceRef:
        kind: HelmRepository
        name: ebs-csi-charts
        namespace: flux-system
  values:
    controller:
      # IRSA for EBS CSI driver
      serviceAccount:
        create: true
        name: ebs-csi-controller-sa
        annotations:
          eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/AmazonEKS_EBS_CSI_DriverRole
      # Run two replicas for HA
      replicaCount: 2
      resources:
        requests:
          cpu: 10m
          memory: 40Mi
        limits:
          cpu: 100m
          memory: 256Mi
    # Storage classes to create
    storageClasses:
      - name: gp3
        annotations:
          storageclass.kubernetes.io/is-default-class: "true"
        parameters:
          type: gp3
          encrypted: "true"
        reclaimPolicy: Delete
        volumeBindingMode: WaitForFirstConsumer
      - name: io2
        parameters:
          type: io2
          iopsPerGB: "50"
          encrypted: "true"
        reclaimPolicy: Retain
        volumeBindingMode: WaitForFirstConsumer
```

```yaml
# infrastructure/eks-addons/ebs-csi-repo.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: ebs-csi-charts
  namespace: flux-system
spec:
  interval: 1h
  url: https://kubernetes-sigs.github.io/aws-ebs-csi-driver
```

## Step 5: Deploy the EFS CSI Driver

```yaml
# infrastructure/eks-addons/efs-csi-driver.yaml
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: aws-efs-csi-driver
  namespace: kube-system
spec:
  interval: 15m
  chart:
    spec:
      chart: aws-efs-csi-driver
      version: "2.5.x"
      sourceRef:
        kind: HelmRepository
        name: efs-csi-charts
        namespace: flux-system
  values:
    controller:
      serviceAccount:
        create: true
        name: efs-csi-controller-sa
        annotations:
          eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/AmazonEKS_EFS_CSI_DriverRole
    # Storage class for dynamic provisioning
    storageClasses:
      - name: efs-sc
        parameters:
          provisioningMode: efs-ap
          fileSystemId: fs-0123456789abcdef0
          directoryPerms: "700"
          gidRangeStart: "1000"
          gidRangeEnd: "2000"
        reclaimPolicy: Delete
        volumeBindingMode: Immediate
```

```yaml
# infrastructure/eks-addons/efs-csi-repo.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: efs-csi-charts
  namespace: flux-system
spec:
  interval: 1h
  url: https://kubernetes-sigs.github.io/aws-efs-csi-driver
```

## Step 6: Organize Add-ons with Dependencies

Create a Kustomization that ensures add-ons are installed in the correct order.

```yaml
# infrastructure/eks-addons/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - vpc-cni-repo.yaml
  - vpc-cni.yaml
  - coredns-repo.yaml
  - coredns.yaml
  - ebs-csi-repo.yaml
  - ebs-csi-driver.yaml
  - efs-csi-repo.yaml
  - efs-csi-driver.yaml
```

```yaml
# clusters/my-cluster/eks-addons.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: eks-addons
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  path: ./infrastructure/eks-addons
  prune: true
  wait: true
  timeout: 10m
  # Health checks for critical add-ons
  healthChecks:
    - apiVersion: apps/v1
      kind: DaemonSet
      name: aws-node
      namespace: kube-system
    - apiVersion: apps/v1
      kind: Deployment
      name: coredns
      namespace: kube-system
```

## Step 7: Version Pinning Strategy

Pin add-on versions per cluster and manage upgrades through Git.

```yaml
# environments/production/eks-addons-versions.yaml
# Pin specific versions for production stability
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: aws-vpc-cni
  namespace: kube-system
spec:
  chart:
    spec:
      # Pin to exact version in production
      version: "1.16.2"
---
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: aws-ebs-csi-driver
  namespace: kube-system
spec:
  chart:
    spec:
      version: "2.27.1"
```

```yaml
# environments/staging/eks-addons-versions.yaml
# Use semver ranges in staging to test newer versions first
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: aws-vpc-cni
  namespace: kube-system
spec:
  chart:
    spec:
      # Allow minor version updates in staging
      version: ">=1.16.0 <1.17.0"
---
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: aws-ebs-csi-driver
  namespace: kube-system
spec:
  chart:
    spec:
      version: ">=2.27.0 <2.28.0"
```

## Step 8: Configure Add-on Notifications

Set up alerts for add-on upgrade events.

```yaml
# infrastructure/notifications/addon-alerts.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: eks-addon-alerts
  namespace: flux-system
spec:
  # Send alerts on error and info events
  eventSeverity: info
  eventSources:
    - kind: HelmRelease
      name: aws-vpc-cni
      namespace: kube-system
    - kind: HelmRelease
      name: coredns
      namespace: kube-system
    - kind: HelmRelease
      name: aws-ebs-csi-driver
      namespace: kube-system
  providerRef:
    name: slack-provider
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack-provider
  namespace: flux-system
spec:
  type: slack
  channel: eks-addons-alerts
  secretRef:
    name: slack-webhook-url
```

## Step 9: Verify Add-on Deployment

```bash
# Check all HelmRelease statuses
flux get helmreleases -A

# Verify VPC CNI is running
kubectl get daemonset aws-node -n kube-system

# Verify CoreDNS is running
kubectl get deployment coredns -n kube-system

# Verify EBS CSI driver
kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-ebs-csi-driver

# Check storage classes were created
kubectl get storageclass

# Test DNS resolution
kubectl run dns-test --image=busybox:1.36 --rm -it --restart=Never -- nslookup kubernetes.default
```

## Troubleshooting

```bash
# Issue: VPC CNI pods crashing
# Check CNI logs
kubectl logs -n kube-system -l app.kubernetes.io/name=aws-node --tail=50

# Issue: EBS volumes not provisioning
# Check CSI driver controller logs
kubectl logs -n kube-system -l app=ebs-csi-controller --tail=50

# Issue: HelmRelease stuck in "not ready"
# Check the Helm release status in detail
flux get helmrelease aws-vpc-cni -n kube-system
kubectl describe helmrelease aws-vpc-cni -n kube-system

# Issue: Add-on version conflict with EKS managed add-on
# Remove the EKS managed add-on before deploying via Flux
aws eks delete-addon --cluster-name my-cluster --addon-name vpc-cni
```

## Conclusion

Managing EKS add-ons through Flux CD provides consistent, version-controlled configuration across all your clusters. By deploying add-ons as HelmReleases, you gain full control over versions, configuration values, and upgrade timing. The GitOps approach ensures that add-on configurations are auditable, reproducible, and can be promoted through environments following your team's standard change management process.
