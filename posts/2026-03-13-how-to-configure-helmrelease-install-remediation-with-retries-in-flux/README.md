# How to Configure HelmRelease Install Remediation with Retries in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, GitOps, Kubernetes, HelmRelease, Remediation, Retries, Helm

Description: Learn how to configure install remediation with retries for Flux HelmRelease resources to handle transient failures during initial Helm chart installations.

---

## Introduction

When Flux installs a Helm chart for the first time, the installation can fail due to transient issues like network problems, temporary resource unavailability, or timing issues with dependencies. Rather than requiring manual intervention, Flux HelmRelease supports install remediation with configurable retries. This allows Flux to automatically retry failed installations, increasing the reliability of your GitOps deployments.

## Prerequisites

- A Kubernetes cluster running version 1.25 or later
- Flux v2.3 or later installed on the cluster
- kubectl configured to access the cluster
- A Git repository connected to Flux
- A HelmRepository source configured in Flux

## Understanding Install Remediation

Install remediation controls what Flux does when a Helm chart installation fails. The `spec.install.remediation` field in a HelmRelease lets you specify how many times to retry the installation, whether to uninstall a failed release before retrying, and whether to keep retrying indefinitely. Without remediation configured, a failed installation stays in a failed state until the next reconciliation interval.

## Basic Retry Configuration

Configure a HelmRelease with install retries:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: nginx
  namespace: flux-system
spec:
  interval: 30m
  chart:
    spec:
      chart: nginx
      version: "18.x"
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
  install:
    remediation:
      retries: 3
```

With `retries: 3`, Flux attempts the installation up to 3 additional times after the initial failure, for a total of 4 attempts.

## Retry with Cleanup

By default, Flux does not uninstall a failed release before retrying. This can cause issues if the failed installation left partial resources. Configure `remediateLastFailure` to clean up before the final retry:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 30m
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

With `remediateLastFailure: true`, on the last retry Flux uninstalls the failed release before attempting the installation again. This gives the final attempt a clean slate.

## Unlimited Retries

For critical infrastructure that must eventually install successfully, use negative retries for unlimited attempts:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: ingress-nginx
  namespace: flux-system
spec:
  interval: 15m
  chart:
    spec:
      chart: ingress-nginx
      version: "4.x"
      sourceRef:
        kind: HelmRepository
        name: ingress-nginx
        namespace: flux-system
  install:
    remediation:
      retries: -1
```

With `retries: -1`, Flux retries the installation indefinitely until it succeeds. Use this carefully, as a permanently failing chart will create an infinite retry loop.

## Combining Install Configuration with Remediation

The `install` section supports additional fields alongside remediation:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 30m
  chart:
    spec:
      chart: my-app
      version: "2.1.0"
      sourceRef:
        kind: HelmRepository
        name: internal
        namespace: flux-system
  install:
    createNamespace: true
    timeout: 10m
    remediation:
      retries: 5
      remediateLastFailure: true
```

The `timeout` field sets how long each installation attempt can take before it is considered failed. The `createNamespace` field tells Helm to create the target namespace if it does not exist.

## Practical Example: Database Chart

Database Helm charts often fail on first install due to PVC provisioning delays or init script issues:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: postgresql
  namespace: flux-system
spec:
  interval: 30m
  chart:
    spec:
      chart: postgresql
      version: "15.x"
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
  install:
    timeout: 15m
    remediation:
      retries: 3
      remediateLastFailure: true
  values:
    primary:
      persistence:
        size: 50Gi
      resources:
        requests:
          cpu: 500m
          memory: 512Mi
    auth:
      postgresPassword: initial-password
      database: myapp
```

With 3 retries and a 15-minute timeout per attempt, the database has ample opportunity to install even if PVC provisioning is slow.

## Monitoring Installation Retries

Track the status of installation attempts:

```bash
# Check HelmRelease status
flux get helmrelease my-app

# Check detailed status including retry count
kubectl get helmrelease my-app -n flux-system -o yaml

# Check Helm release history
helm history my-app -n default

# Check events for the HelmRelease
kubectl get events -n flux-system --field-selector involvedObject.name=my-app
```

The HelmRelease status shows the current attempt number and failure reasons:

```bash
kubectl get helmrelease my-app -n flux-system -o jsonpath='{.status.installFailures}'
```

## Setting Retry Counts by Chart Type

Different charts have different reliability profiles. Here are guidelines:

```yaml
# Simple stateless applications: 2-3 retries
install:
  remediation:
    retries: 3

# Database and stateful charts: 3-5 retries
install:
  timeout: 15m
  remediation:
    retries: 5
    remediateLastFailure: true

# Infrastructure charts (ingress, cert-manager): unlimited
install:
  remediation:
    retries: -1

# Charts with external dependencies: 3-5 retries
install:
  timeout: 10m
  remediation:
    retries: 5
```

## HelmRelease with Both Install and Upgrade Remediation

Configure remediation for both installation and upgrades:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 30m
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
    remediation:
      retries: 3
      remediateLastFailure: true
      strategy: rollback
```

The `install.remediation` handles first-time installation failures, while `upgrade.remediation` handles failures when upgrading an existing release.

## Debugging Installation Failures

When installation retries are exhausted:

```bash
# Check the HelmRelease conditions
kubectl get helmrelease my-app -n flux-system -o jsonpath='{.status.conditions}' | jq .

# Check Helm release status
helm status my-app -n default

# Check for failed pods
kubectl get pods -n default -l app.kubernetes.io/instance=my-app

# Check pod logs
kubectl logs -n default -l app.kubernetes.io/instance=my-app --tail=50

# Check events
kubectl get events -n default --sort-by=.lastTimestamp | tail -20
```

Common installation failure causes include chart values referencing non-existent Secrets or ConfigMaps, insufficient cluster resources, PVC provisioning failures, image pull errors, missing CRDs that the chart depends on, and network policies blocking required communication.

## Resetting After Failed Retries

If all retries are exhausted and the installation has permanently failed, you can reset the failure count by suspending and resuming the HelmRelease:

```bash
flux suspend helmrelease my-app
flux resume helmrelease my-app
```

This resets the retry counter and triggers a fresh installation attempt.

## Conclusion

Install remediation with retries in Flux HelmRelease provides automatic recovery from transient installation failures. By configuring appropriate retry counts, timeouts, and cleanup behavior, you ensure that Helm chart installations succeed even when faced with temporary issues like slow storage provisioning or brief network problems. Use generous retry counts for infrastructure charts, moderate retries for application charts, and always set `remediateLastFailure: true` to clean up partial installations before the final retry attempt.
