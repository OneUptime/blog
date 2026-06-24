# How to Use Flux 2.8 Web UI for HelmRelease Monitoring

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Fluxcd, Helm, HelmRelease, Web-Ui, Monitoring, GitOps, Kubernetes

Description: Learn how to monitor HelmRelease resources using the Flux 2.8 Web UI dashboard for real-time visibility into your Helm deployments.

---

## Introduction

Flux 2.8, together with the Flux Operator Web UI, offers real-time visibility into your GitOps resources. One of its most valuable features is HelmRelease monitoring, which lets you track the status, revision history, and health of your Helm-based deployments without relying solely on CLI commands. This post walks through setting up and using the Flux Web UI specifically for monitoring HelmRelease resources.

## Prerequisites

- A Kubernetes cluster (v1.28 or later recommended)
- Flux 2.8 installed on your cluster
- kubectl configured to access your cluster
- A working HelmRelease deployed via Flux

## Installing the Flux Web UI

The Flux Web UI is provided by the Flux Operator, not as a core Flux component. Install the Flux Operator to get access to the embedded Web UI:

```bash
helm install flux-operator oci://ghcr.io/controlplaneio-fluxcd/charts/flux-operator \
  --namespace flux-system \
  --create-namespace
```

## Accessing the Web UI

Once the Flux Operator is running, access the Web UI via port-forwarding:

```bash
kubectl -n flux-system port-forward svc/flux-operator 9080:9080
```

Then open your browser at `http://localhost:9080`. You will see the Flux dashboard with tabs for different resource types.

## Navigating to HelmRelease Monitoring

The Flux Web UI organizes resources by type. To monitor HelmReleases, open the resources view and filter or search for `HelmRelease` resources. This view displays HelmRelease resources across the namespaces visible to the Web UI service account.

Each HelmRelease entry shows:

- **Name and namespace** of the HelmRelease
- **Current status** (Ready, Failed, Progressing, Suspended, Unknown)
- **Last reconciled time** and status message
- **Chart version and revision history** in the HelmRelease details
- **Source reference** (for example, the HelmRepository, HelmChart, OCIRepository, or ExternalArtifact providing the chart)

## Understanding HelmRelease Status Indicators

The web UI uses color-coded status indicators for quick assessment:

- **Green**: The HelmRelease is reconciled and the release is healthy.
- **Blue**: The HelmRelease is currently being reconciled or is progressing.
- **Red**: The HelmRelease has failed reconciliation or the release is in a degraded state.
- **Yellow**: The HelmRelease is suspended and will not be reconciled.
- **Grey**: The HelmRelease status is unknown.

## Inspecting a Specific HelmRelease

Click on any HelmRelease to see its detailed view. The detail page includes several sections:

### Conditions

The conditions section mirrors the Kubernetes conditions on the HelmRelease object. A typical healthy HelmRelease shows:

```yaml
conditions:
  - type: Ready
    status: "True"
    reason: InstallSucceeded
    message: "Helm install succeeded for release default/podinfo.v1 with chart podinfo@6.7.1"
  - type: Released
    status: "True"
    reason: InstallSucceeded
    message: "Helm install succeeded for release default/podinfo.v1 with chart podinfo@6.7.1"
```

### Revision History

The revision history panel shows the Helm release history recorded in `.status.history`, including chart versions and release revisions retained for this HelmRelease. This is particularly useful for tracking upgrades and rollbacks.

### Events

The events section shows Kubernetes events related to the HelmRelease, including reconciliation attempts, upgrades, and errors.

## Setting Up a Sample HelmRelease for Monitoring

If you want to test the monitoring capabilities, deploy a sample HelmRelease:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: podinfo
  namespace: flux-system
spec:
  interval: 1h
  url: https://stefanprodan.github.io/podinfo
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: podinfo
  namespace: default
spec:
  interval: 5m
  chart:
    spec:
      chart: podinfo
      version: "6.7.x"
      sourceRef:
        kind: HelmRepository
        name: podinfo
        namespace: flux-system
  values:
    replicaCount: 2
    ui:
      message: "Hello from Flux Web UI demo"
```

Apply this manifest and filter the resources view for HelmReleases in the web UI. You should see the `podinfo` HelmRelease appear and transition through Progressing to Ready status.

## Filtering and Searching HelmReleases

The web UI provides filtering options to narrow down HelmReleases:

- **Namespace filter**: Show only HelmReleases from a specific namespace
- **Status filter**: Show only HelmReleases in a particular state (Ready, Failed, Progressing, Suspended, Unknown)
- **Search**: Free-text search across HelmRelease names

This is especially useful in clusters with dozens or hundreds of HelmReleases across multiple namespaces.

## Monitoring HelmRelease Reconciliation Failures

When a HelmRelease fails, the web UI highlights it in red. Clicking the failed release shows the failure reason. Common failure scenarios include:

- Chart version not found in the HelmRepository
- Values schema validation errors
- Helm install or upgrade timeouts
- Dependency resolution failures

The error messages in the UI match what you would see from `flux get helmreleases` but presented in a more readable format with timestamps.

## Configuring Auto-Refresh

The Flux Web UI polls for resource status updates. By default, it refreshes every 30 seconds; after a user action such as reconcile, suspend, or resume, the resource dashboard uses a faster 5-second polling interval for a short period.

For large clusters, use the Flux Web UI configuration options such as cached search results to reduce repeated Kubernetes API queries where appropriate.

## Conclusion

The Flux Operator Web UI provides a user-friendly way to monitor HelmRelease resources without constantly running CLI commands. It gives you quick visibility into deployment status, revision history, and reconciliation events. By integrating the web UI into your workflow, you can catch failed deployments faster and track the state of your Helm-based applications across your cluster. For production environments, consider setting up an Ingress with authentication to make the web UI accessible to your team securely.
