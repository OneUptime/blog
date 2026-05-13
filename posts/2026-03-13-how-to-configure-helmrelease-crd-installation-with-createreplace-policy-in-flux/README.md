# How to Configure HelmRelease CRD Installation with CreateReplace Policy in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, HelmRelease, CRD, Kubernetes, GitOps, Helm

Description: Learn how to configure the CreateReplace CRD installation policy in Flux HelmRelease to manage Custom Resource Definitions during Helm chart installations and upgrades.

---

## Introduction

When deploying Helm charts that include Custom Resource Definitions (CRDs), managing how those CRDs are installed and updated is critical. By default, Helm only installs CRDs from a chart's `crds/` directory during the initial chart installation and never updates them on subsequent upgrades. Flux CD provides the `crds` field in the HelmRelease spec that gives you fine-grained control over CRD lifecycle management for those chart CRDs. The `CreateReplace` policy is one of the most useful options, as it creates CRDs on initial install and replaces them on upgrades.

In this post, you will learn how to configure a HelmRelease with the `CreateReplace` CRD installation policy, understand when to use it, and see practical examples of deploying charts that bundle CRDs.

## Prerequisites

- A Kubernetes cluster (v1.25 or later)
- Flux CD installed and bootstrapped on the cluster
- A Git repository connected to Flux
- kubectl configured to access the cluster
- Basic familiarity with Helm charts and CRDs

## Understanding the CRD Installation Policies in Flux

Flux HelmRelease supports three CRD installation policies through the `spec.install.crds` and `spec.upgrade.crds` fields:

- **Skip**: Do not install or update CRDs at all.
- **Create**: Only create CRDs if they do not already exist (Helm default behavior).
- **CreateReplace**: Create CRDs if they do not exist, and replace them if they do.

The `CreateReplace` policy is particularly useful when a Helm chart bundles CRDs that evolve across versions. Without this policy, CRD updates would be silently skipped during chart upgrades, potentially leaving your cluster with outdated CRD schemas.

## Configuring the HelmRelease with CreateReplace

Here is a complete HelmRelease manifest that uses the `CreateReplace` policy for both install and upgrade operations:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: kube-prometheus-stack
  namespace: flux-system
spec:
  interval: 1h
  releaseName: kube-prometheus-stack
  targetNamespace: monitoring
  chart:
    spec:
      chart: kube-prometheus-stack
      version: "85.x"
      sourceRef:
        kind: HelmRepository
        name: prometheus-community
        namespace: flux-system
      interval: 24h
  install:
    crds: CreateReplace
    createNamespace: true
    remediation:
      retries: 5
  upgrade:
    crds: CreateReplace
    remediation:
      retries: 5
      remediateLastFailure: true
  values:
    crds:
      enabled: true
    prometheus:
      prometheusSpec:
        retention: 7d
```

In this example, Flux handles the chart CRDs through the `CreateReplace` policy. The `crds.enabled` value keeps the Prometheus Operator CRDs included in the chart release, while the Flux `crds` policy controls whether those CRDs are created only or also replaced during install and upgrade actions.

## Setting Up the HelmRepository Source

Before the HelmRelease can work, you need a HelmRepository source defined:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: prometheus-community
  namespace: flux-system
spec:
  interval: 24h
  url: https://prometheus-community.github.io/helm-charts
```

Apply this to your cluster or commit it to your Git repository so Flux can reconcile it.

## How CreateReplace Works Under the Hood

When Flux processes a HelmRelease with `crds: CreateReplace`, it performs the following steps during installation:

1. Flux extracts the CRD manifests from the Helm chart's `crds/` directory.
2. For each CRD, Flux checks if it already exists in the cluster.
3. If the CRD does not exist, Flux creates it.
4. If the CRD already exists, Flux replaces it with the version from the chart.

During an upgrade, the same logic applies when `spec.upgrade.crds` is set to `CreateReplace`. This ensures that CRD schema changes included in newer chart versions are applied to the cluster.

## A Practical Note About cert-manager

The cert-manager chart is another common chart that includes CRDs, but it does not use Helm's standard `crds/` directory lifecycle in the same way as many operator charts. For current cert-manager releases, follow the cert-manager documentation and enable CRD rendering with `crds.enabled: true` so Flux can install and upgrade those resources as part of the rendered release:

```yaml
values:
  crds:
    enabled: true
```

Use `CreateReplace` for charts whose CRDs are managed through Helm's CRD lifecycle. Use chart-specific CRD values when the chart documents a different CRD management approach.

## Verifying CRD Installation

After Flux reconciles the HelmRelease, you can verify that the CRDs were installed correctly:

```bash
kubectl get crds | grep monitoring.coreos.com
```

You should see output similar to:

```text
alertmanagers.monitoring.coreos.com        2026-03-13T10:00:00Z
podmonitors.monitoring.coreos.com          2026-03-13T10:00:00Z
prometheuses.monitoring.coreos.com         2026-03-13T10:00:00Z
prometheusrules.monitoring.coreos.com      2026-03-13T10:00:00Z
servicemonitors.monitoring.coreos.com      2026-03-13T10:00:00Z
thanosrulers.monitoring.coreos.com         2026-03-13T10:00:00Z
```

To check the HelmRelease status:

```bash
kubectl get helmrelease -n flux-system kube-prometheus-stack
```

You can also inspect the detailed status with:

```bash
kubectl describe helmrelease -n flux-system kube-prometheus-stack
```

Look for the `Ready` condition with status `True` and a message indicating a successful install or upgrade.

## When to Use CreateReplace vs Other Policies

Use `CreateReplace` when:

- The Helm chart bundles CRDs that change between versions.
- You want Flux to keep CRDs in sync with the chart version automatically.
- You are comfortable with CRDs being replaced during upgrades, which may briefly affect custom resource validation.

Avoid `CreateReplace` when:

- You manage CRDs separately from the Helm chart (use `Skip` instead).
- You have made manual modifications to CRDs that you do not want overwritten.
- The CRD replacement could cause downtime in a production environment where strict change control is required.

## Handling CRD Replacement Failures

If a CRD replacement fails, Flux will report the error in the HelmRelease status. Common failure reasons include:

- A CRD field that was previously required is now removed, and existing custom resources reference it.
- The new CRD version has a validation schema that conflicts with existing custom resources.

You can check for errors with:

```bash
kubectl get helmrelease -n flux-system kube-prometheus-stack -o jsonpath='{.status.conditions[?(@.type=="Ready")].message}'
```

If you encounter failures, review the CRD changes between chart versions and ensure existing custom resources are compatible before upgrading.

## Conclusion

The `CreateReplace` CRD installation policy in Flux HelmRelease provides a reliable way to keep CRDs in sync with your Helm chart versions. By configuring both `spec.install.crds` and `spec.upgrade.crds` to `CreateReplace`, you ensure that CRD schemas are always up to date when deploying or upgrading charts that bundle CRDs through Helm's CRD lifecycle. This approach is especially valuable for charts like kube-prometheus-stack that actively evolve their CRD definitions across releases. Always test CRD upgrades in a staging environment first to verify compatibility with existing custom resources before rolling changes to production.
