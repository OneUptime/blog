# HelmRelease Install Remediation with Uninstall on Failure in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, GitOps, Kubernetes, HelmRelease, Remediation, Uninstall, Helm

Description: Learn how to configure Flux HelmRelease to automatically uninstall failed Helm releases before retrying installation, ensuring clean recovery from failures.

---

## Introduction

When a Helm chart installation fails, it can leave behind partial resources: some pods running, some ConfigMaps created, but the overall release in a broken state. Retrying the installation on top of these leftover resources often fails again because Kubernetes rejects duplicate resources or the Helm state is inconsistent. Flux HelmRelease install remediation supports automatically uninstalling a failed release between retries, and `remediateLastFailure` can also clean up the final failed attempt when retries are exhausted. This guide covers how to configure this behavior effectively.

## Prerequisites

- A Kubernetes cluster running version 1.25 or later
- Flux v2.3 or later installed on the cluster
- kubectl configured to access the cluster
- A Git repository connected to Flux
- A HelmRepository source configured in Flux

## The Problem with Partial Installations

When a Helm installation fails partway through, the cluster is left in an inconsistent state. Some Deployments may have been created while others failed validation. ConfigMaps and Secrets may exist but the main application Deployment failed due to resource limits. Helm records the release as "failed" in its storage.

Retrying the installation without cleanup can result in "already exists" errors or Helm state conflicts that make recovery difficult.

## Configuring Uninstall on Failure

Use install remediation retries to uninstall failed releases between attempts, and set `remediateLastFailure: true` to also uninstall the failed release when no retries remain:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 30m
  targetNamespace: default
  storageNamespace: default
  chart:
    spec:
      chart: my-app
      version: "2.1.0"
      sourceRef:
        kind: HelmRepository
        name: internal
        namespace: flux-system
  install:
    remediation:
      retries: 3
      remediateLastFailure: true
```

With this configuration, Flux makes the initial installation attempt. If it fails, Flux uninstalls the failed release before each retry. If the third retry also fails, `remediateLastFailure: true` tells Flux to uninstall that final failed release instead of leaving it in place for debugging.

## Using remediateLastFailure with Different Retry Counts

The behavior of `remediateLastFailure` depends on the retry count:

```yaml
# With 1 retry: uninstall before the single retry, and after it if it fails

install:
  remediation:
    retries: 1
    remediateLastFailure: true

# With 3 retries: uninstall between attempts, and after the final failed retry
install:
  remediation:
    retries: 3
    remediateLastFailure: true

# With 0 retries: no retry, but uninstall the failed release after the first failure
install:
  remediation:
    retries: 0
    remediateLastFailure: true
```

For the cleanest recovery, combine `remediateLastFailure: true` with a low retry count:

```yaml
install:
  remediation:
    retries: 1
    remediateLastFailure: true
```

This tries the installation once, and if it fails, uninstalls the failed release and tries one more time. If that retry also fails, Flux uninstalls the final failed release.

## Complete HelmRelease Configuration

Here is a comprehensive HelmRelease with uninstall-on-failure configured:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: monitoring-stack
  namespace: flux-system
spec:
  interval: 30m
  targetNamespace: monitoring
  storageNamespace: monitoring
  chart:
    spec:
      chart: kube-prometheus-stack
      version: "60.x"
      sourceRef:
        kind: HelmRepository
        name: prometheus-community
        namespace: flux-system
  install:
    createNamespace: true
    timeout: 15m
    remediation:
      retries: 3
      remediateLastFailure: true
  values:
    prometheus:
      prometheusSpec:
        retention: 30d
        resources:
          requests:
            cpu: 500m
            memory: 2Gi
    grafana:
      adminPassword: initial-password
      persistence:
        enabled: true
        size: 10Gi
    alertmanager:
      alertmanagerSpec:
        retention: 72h
```

## When to Use Uninstall on Failure

Use `remediateLastFailure: true` for complex charts with many resources. Charts like kube-prometheus-stack create dozens of resources. A partial failure leaves many orphaned resources that interfere with retries.

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: kube-prometheus
  namespace: flux-system
spec:
  interval: 30m
  targetNamespace: monitoring
  storageNamespace: monitoring
  chart:
    spec:
      chart: kube-prometheus-stack
      version: "60.x"
      sourceRef:
        kind: HelmRepository
        name: prometheus-community
        namespace: flux-system
  install:
    timeout: 15m
    remediation:
      retries: 2
      remediateLastFailure: true
```

Also use it for charts with CRD dependencies. When a chart creates CRDs and then creates instances of those CRDs, a partial failure can leave CRDs without their instances:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: cert-manager
  namespace: flux-system
spec:
  interval: 30m
  targetNamespace: cert-manager
  storageNamespace: cert-manager
  chart:
    spec:
      chart: cert-manager
      version: "1.x"
      sourceRef:
        kind: HelmRepository
        name: jetstack
        namespace: flux-system
  install:
    createNamespace: true
    crds: CreateReplace
    timeout: 10m
    remediation:
      retries: 3
      remediateLastFailure: true
  values:
    installCRDs: true
```

Charts with persistent storage can also benefit in non-production or disposable-data environments, since failed installations that create PVCs can block retries if the PVCs are not cleaned up:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: elasticsearch
  namespace: flux-system
spec:
  interval: 30m
  targetNamespace: default
  storageNamespace: default
  chart:
    spec:
      chart: elasticsearch
      version: "8.x"
      sourceRef:
        kind: HelmRepository
        name: elastic
        namespace: flux-system
  install:
    timeout: 20m
    remediation:
      retries: 2
      remediateLastFailure: true
  values:
    replicas: 3
    volumeClaimTemplate:
      resources:
        requests:
          storage: 100Gi
```

## When Not to Use Uninstall on Failure

Avoid `remediateLastFailure: true` when the chart creates PersistentVolumeClaims with valuable data that you do not want to risk deleting, when the chart manages resources that take a long time to provision, or when uninstalling would cause service disruption to other running applications.

In these cases, keep `remediateLastFailure: false` (the default) and investigate failures manually.

## Combining with Upgrade Remediation

Configure both install and upgrade remediation for comprehensive failure handling:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 30m
  targetNamespace: default
  storageNamespace: default
  chart:
    spec:
      chart: my-app
      version: "2.1.0"
      sourceRef:
        kind: HelmRepository
        name: internal
        namespace: flux-system
  install:
    timeout: 10m
    remediation:
      retries: 3
      remediateLastFailure: true
  upgrade:
    timeout: 10m
    cleanupOnFail: true
    remediation:
      retries: 3
      remediateLastFailure: true
      strategy: rollback
```

For installs, remediation uninstalls between retries, and `remediateLastFailure` uninstalls after the final failed attempt. For upgrades, remediation uses the configured strategy between retries, and `remediateLastFailure` with `strategy: rollback` rolls back after the final failed attempt.

## Monitoring Uninstall and Retry Behavior

Track what Flux is doing during remediation:

```bash
# Check HelmRelease status
flux get helmrelease my-app

# Check install failure count
kubectl get helmrelease my-app -n flux-system -o jsonpath='{.status.installFailures}'

# Check conditions for failure details
kubectl get helmrelease my-app -n flux-system -o jsonpath='{.status.conditions}' | jq .

# Watch events
kubectl get events -n flux-system --field-selector involvedObject.name=my-app --watch

# Check Helm release history
helm history my-app -n default 2>/dev/null || echo "No release history (uninstalled)"
```

## Resetting After Exhausted Retries

If all retries are exhausted:

```bash
# Suspend the HelmRelease to stop retry attempts
flux suspend helmrelease my-app

# Manually clean up any remaining resources
helm uninstall my-app -n default 2>/dev/null

# Fix the underlying issue (update values, fix chart, etc.)
# Then resume
flux resume helmrelease my-app
```

## Debugging Failed Installations

When the uninstall-and-retry cycle fails:

```bash
# Check what resources the chart tries to create
helm template my-app bitnami/my-app --values values.yaml | kubectl apply --dry-run=client -f -

# Check for resource conflicts
kubectl get all -n default -l app.kubernetes.io/instance=my-app

# Check Helm storage for failed releases
kubectl get secrets -n default -l owner=helm,name=my-app
```

Common reasons why uninstall-and-retry still fails include fundamentally incorrect chart values, missing required CRDs, insufficient cluster resources, network policies blocking required communications, and missing image pull secrets.

## Conclusion

Configuring HelmRelease install remediation with uninstall on failure in Flux gives you automatic recovery from the messiest type of Helm failure: partial installations. By setting install remediation retries, Flux cleans up failed installations between retry attempts. By setting `remediateLastFailure: true`, Flux also cleans up resources from the final failed installation after retries are exhausted. This is especially valuable for complex charts that create many interdependent resources. Combine this with appropriate retry counts and timeouts to build a resilient installation pipeline that handles transient failures without manual intervention.
