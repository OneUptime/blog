# How to Organize CRD Installation as First Dependency in Flux Repository

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, CRD, Repository Structure, Dependencies

Description: Learn how to organize Custom Resource Definition installation as the first dependency in your Flux repository to prevent reconciliation failures.

---

Custom Resource Definitions must be installed before any custom resources that use them. In a Flux GitOps repository, this means CRDs need to be the first thing deployed, before controllers, configurations, and applications. Getting this ordering wrong leads to reconciliation failures where Flux tries to apply custom resources before the cluster knows about them.

This guide explains how to organize CRD installation as a first-class dependency in your Flux repository.

## The Problem

Consider deploying cert-manager. The HelmRelease for cert-manager installs both the controller and its CRDs. But if you also have ClusterIssuer resources in your infrastructure configuration, those resources will fail to apply if they reconcile before cert-manager is ready.

The same issue applies to any controller that introduces CRDs: Prometheus Operator (ServiceMonitor, PodMonitor), Istio (VirtualService, Gateway), and many others.

## CRDs-First Strategy

The recommended approach is to install CRDs in a separate Kustomization that runs before everything else.

## Directory Structure

```text
fleet-repo/
  clusters/
    production/
      flux-system/
      crds.yaml
      infrastructure.yaml
      configs.yaml
      apps.yaml
  crds/
    cert-manager/
      kustomization.yaml
    prometheus-operator/
      kustomization.yaml
    kustomization.yaml
  infrastructure/
    controllers/
      cert-manager/
      kube-prometheus-stack/
      kustomization.yaml
    sources/
      kustomization.yaml
    kustomization.yaml
  configs/
    cluster-issuers/
    service-monitors/
    kustomization.yaml
  apps/
    kustomization.yaml
```

## CRDs Kustomization

Create a dedicated Kustomization for CRDs:

```yaml
# clusters/production/crds.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: crds
  namespace: flux-system
spec:
  interval: 30m
  path: ./crds
  prune: false
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
  timeout: 5m
```

Important settings:

- `prune: false` prevents Flux from deleting CRDs. Deleting a CRD deletes all custom resources of that type, which can be catastrophic.
- `wait: true` ensures CRDs are fully established before dependents start.

## Dependency Chain

Set up the dependency chain in your cluster entry points:

```yaml
# clusters/production/infrastructure.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 30m
  path: ./infrastructure
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: crds
  wait: true
```

```yaml
# clusters/production/configs.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: configs
  namespace: flux-system
spec:
  interval: 30m
  path: ./configs
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: infrastructure
```

```yaml
# clusters/production/apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: configs
```

The chain is: CRDs then infrastructure then configs then apps.

## Installing CRDs from Helm Charts

Many projects distribute CRDs as part of their Helm charts. You can extract and install CRDs separately:

```yaml
# crds/cert-manager/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.crds.yaml
```

For projects that provide CRDs as a separate download, reference them directly.

## Installing CRDs from OCI Artifacts

Some projects publish CRDs as OCI artifacts:

```yaml
# crds/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - cert-manager
  - prometheus-operator
```

## Installing CRDs from Git Repositories

For CRDs hosted in Git repositories:

```yaml
# crds/prometheus-operator/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - https://raw.githubusercontent.com/prometheus-operator/prometheus-operator/v0.72.0/example/prometheus-operator-crd/monitoring.coreos.com_servicemonitors.yaml
  - https://raw.githubusercontent.com/prometheus-operator/prometheus-operator/v0.72.0/example/prometheus-operator-crd/monitoring.coreos.com_podmonitors.yaml
  - https://raw.githubusercontent.com/prometheus-operator/prometheus-operator/v0.72.0/example/prometheus-operator-crd/monitoring.coreos.com_prometheusrules.yaml
```

## Handling CRD Updates

When updating CRDs, be careful about breaking changes. A recommended workflow:

1. Check the CRD changelog for breaking changes
2. Update the CRD version in the `crds/` directory
3. Test in a staging cluster first
4. Monitor reconciliation after the update

Since CRDs have `prune: false`, old CRD versions will not be automatically removed. If you need to clean up old CRD versions, do it manually:

```bash
kubectl delete crd old-resource.example.com
```

## Avoiding CRD Conflicts with Helm

When a Helm chart installs CRDs and you also install them separately, configure the HelmRelease to skip CRD installation:

```yaml
# infrastructure/controllers/cert-manager/helmrelease.yaml
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
  install:
    crds: Skip
  upgrade:
    crds: Skip
  values:
    installCRDs: false
```

Setting `crds: Skip` and `installCRDs: false` ensures Helm does not manage CRDs, leaving that responsibility to the dedicated CRDs Kustomization.

## Verifying CRD Installation

After deploying, verify CRDs are installed:

```bash
kubectl get crds | grep cert-manager
kubectl get crds | grep monitoring.coreos.com
```

Check that the CRDs Kustomization is ready:

```bash
flux get kustomization crds -n flux-system
```

## Conclusion

Organizing CRD installation as the first dependency in your Flux repository prevents reconciliation failures caused by custom resources being applied before their definitions exist. By using a dedicated CRDs Kustomization with `prune: false` and `wait: true`, you create a reliable foundation that the rest of your GitOps pipeline builds upon. This pattern is especially important as your cluster grows and more controllers introduce their own custom resource types.
