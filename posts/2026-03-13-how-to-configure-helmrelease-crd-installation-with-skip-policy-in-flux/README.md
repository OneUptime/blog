# How to Configure HelmRelease CRD Installation with Skip Policy in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, HelmRelease, CRD, Kubernetes, GitOps, Helm

Description: Learn how to configure the Skip CRD installation policy in Flux HelmRelease to prevent Helm from managing CRDs and handle them separately.

---

## Introduction

In many Kubernetes environments, Custom Resource Definitions (CRDs) are managed independently from the Helm charts that use them. This separation is a best practice because CRDs are cluster-scoped resources that affect all namespaces and all users. Flux CD provides the `Skip` CRD policy in HelmRelease to tell Flux not to install or update CRDs as part of the Helm chart lifecycle. Instead, you manage CRDs through a separate Kustomization or dedicated HelmRelease.

In this post, you will learn how to configure the `Skip` CRD policy, why it is useful, and how to manage CRDs independently using Flux Kustomizations.

## Prerequisites

- A Kubernetes cluster (v1.25 or later)
- Flux CD installed and bootstrapped on the cluster
- A Git repository connected to Flux
- kubectl configured to access the cluster
- Basic understanding of Helm charts and CRDs

## Why Skip CRD Installation in Helm

Helm has a well-known limitation with CRDs: it installs them during `helm install` but never updates or deletes them during `helm upgrade` or `helm uninstall`. This behavior can lead to confusion and inconsistency. By using the `Skip` policy in Flux, you take explicit control over CRDs and manage them through a more predictable mechanism.

Common reasons to skip CRD installation include:

- Multiple Helm charts share the same CRDs and you want a single source of truth.
- You need to apply CRDs before the HelmRelease is reconciled due to ordering dependencies.
- You want to version-control CRD changes separately for tighter change management.
- You need to apply CRD updates that Helm would otherwise ignore.

## Configuring the HelmRelease with Skip Policy

Here is a HelmRelease manifest that uses the `Skip` policy for both install and upgrade:

```yaml
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
      interval: 12h
  install:
    crds: Skip
    remediation:
      retries: 3
  upgrade:
    crds: Skip
    remediation:
      retries: 3
  values:
    installCRDs: false
```

With this configuration, Flux will not attempt to install or update any CRDs found in the chart's `crds/` directory. The `installCRDs: false` value is also set to prevent the chart's own templates from creating CRDs through regular manifests.

## Managing CRDs Separately with a Kustomization

When you skip CRD installation in the HelmRelease, you need to install CRDs through another mechanism. A Flux Kustomization is the recommended approach. First, add the CRD manifests to your Git repository:

```
clusters/
  my-cluster/
    cert-manager/
      crds/
        kustomization.yaml
        cert-manager-crds.yaml
      helmrelease.yaml
```

Create a `kustomization.yaml` for the CRDs:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - cert-manager-crds.yaml
```

You can download the CRD manifests from the chart's repository or extract them from the chart package. For cert-manager, the CRDs are available at:

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.crds.yaml --dry-run=client -o yaml > cert-manager-crds.yaml
```

Then create a Flux Kustomization to manage these CRDs:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cert-manager-crds
  namespace: flux-system
spec:
  interval: 1h
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/my-cluster/cert-manager/crds
  prune: false
  wait: true
```

Notice that `prune` is set to `false` for CRDs. This prevents Flux from deleting CRDs if they are removed from Git, which would cascade-delete all custom resources in the cluster.

## Ensuring CRDs Are Applied Before the HelmRelease

Order matters when CRDs are managed separately. The HelmRelease may fail if it tries to install before the CRDs exist. Use the `dependsOn` field to enforce ordering:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cert-manager
  namespace: flux-system
spec:
  interval: 30m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/my-cluster/cert-manager
  prune: true
  dependsOn:
    - name: cert-manager-crds
```

This ensures the CRD Kustomization is fully reconciled before Flux attempts to reconcile the HelmRelease.

## Using a Separate HelmRelease for CRDs

Some charts provide a dedicated CRD sub-chart. In such cases, you can use a separate HelmRelease for CRDs:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: prometheus-operator-crds
  namespace: monitoring
spec:
  interval: 1h
  chart:
    spec:
      chart: prometheus-operator-crds
      version: "12.x"
      sourceRef:
        kind: HelmRepository
        name: prometheus-community
        namespace: flux-system
      interval: 24h
  install:
    crds: CreateReplace
    remediation:
      retries: 3
  upgrade:
    crds: CreateReplace
    remediation:
      retries: 3
```

Then your main HelmRelease can skip CRDs and depend on the CRD HelmRelease:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: kube-prometheus-stack
  namespace: monitoring
spec:
  interval: 1h
  dependsOn:
    - name: prometheus-operator-crds
  chart:
    spec:
      chart: kube-prometheus-stack
      version: "57.x"
      sourceRef:
        kind: HelmRepository
        name: prometheus-community
        namespace: flux-system
      interval: 24h
  install:
    crds: Skip
    remediation:
      retries: 3
  upgrade:
    crds: Skip
    remediation:
      retries: 3
  values:
    prometheusOperator:
      admissionWebhooks:
        certManager:
          enabled: false
```

## Verifying the Configuration

After committing and pushing these manifests, verify the reconciliation:

```bash
kubectl get kustomizations -n flux-system
kubectl get helmreleases -A
```

Check that the CRD Kustomization is ready before the HelmRelease:

```bash
kubectl get kustomization cert-manager-crds -n flux-system -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}'
```

Verify the CRDs are installed:

```bash
kubectl get crds | grep cert-manager
```

## Conclusion

The `Skip` CRD policy in Flux HelmRelease gives you full control over CRD lifecycle management by decoupling CRDs from Helm chart installations. This approach is recommended for production environments where CRDs need careful version management, where multiple charts share CRDs, or where you need guaranteed ordering of CRD creation before chart deployment. By combining the `Skip` policy with Flux Kustomizations or dedicated CRD HelmReleases, you build a more predictable and maintainable GitOps workflow for managing CRDs in your Kubernetes clusters.
