# How to Use the dapr upgrade Command

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, CLI, Upgrade, Kubernetes, Version Management

Description: Learn how to use the dapr upgrade command to upgrade the Dapr runtime on Kubernetes or in self-hosted mode to a newer version.

---

## Overview

The `dapr upgrade` command upgrades the Dapr control plane components on a Kubernetes cluster. It uses Helm under the hood to upgrade the control plane pods while preserving your component and configuration resources. Note that `dapr upgrade` is Kubernetes-only; for self-hosted upgrades, use `dapr uninstall --all` followed by installing the new CLI and running `dapr init`.

## Upgrading Dapr on Kubernetes

Upgrade to the latest stable version:

```bash
dapr upgrade --kubernetes
```

Upgrade to a specific version:

```bash
dapr upgrade --kubernetes --runtime-version 1.14.0
```

## Setting a Timeout for the Upgrade

Use `--timeout` to control how long the CLI waits for the upgrade to complete (default is 300 seconds):

```bash
dapr upgrade --kubernetes --runtime-version 1.14.0 --timeout 600
```

## Upgrading in Self-Hosted Mode

The `dapr upgrade` command does not support self-hosted mode. To upgrade a self-hosted Dapr installation:

1. Uninstall the current version:

```bash
dapr uninstall --all
```

2. Download and install the new Dapr CLI version from https://github.com/dapr/cli/releases

3. Re-initialize Dapr:

```bash
dapr init --runtime-version 1.14.0
```

Restart your applications to pick up the new version.

## Pre-Upgrade Checklist

Before running the upgrade:

1. Check current version:

```bash
dapr status --kubernetes
```

2. Review the changelog for breaking changes at https://github.com/dapr/dapr/releases

3. Test the upgrade in a staging environment first

4. Back up your component and configuration resources:

```bash
kubectl get components -n default -o yaml > components-backup.yaml
kubectl get configurations -n default -o yaml > configs-backup.yaml
```

## Upgrading with a Custom Image Registry

For air-gapped environments:

```bash
dapr upgrade --kubernetes \
             --runtime-version 1.14.0 \
             --image-registry myregistry.example.com/dapr
```

## Verifying the Upgrade

After the upgrade completes, confirm all components are on the new version:

```bash
dapr status --kubernetes
```

Expected output:

```text
  NAME                   NAMESPACE    HEALTHY  STATUS   REPLICAS  VERSION  AGE  CREATED
  dapr-operator          dapr-system  True     Running  1         1.14.0   1m   2024-01-01 00:00.00
  dapr-placement-server  dapr-system  True     Running  1         1.14.0   1m   2024-01-01 00:00.00
  dapr-sentry            dapr-system  True     Running  1         1.14.0   1m   2024-01-01 00:00.00
  dapr-sidecar-injector  dapr-system  True     Running  1         1.14.0   1m   2024-01-01 00:00.00
```

## Rolling Back if Needed

If the upgrade causes issues, downgrade by specifying the previous version:

```bash
dapr upgrade --kubernetes --runtime-version 1.13.0
```

## Summary

`dapr upgrade` handles the complexity of upgrading the Dapr control plane on Kubernetes with a single command. Use `--timeout` to control how long the CLI waits for the upgrade to complete in automated pipelines. Test upgrades in staging first and keep the previous version number handy for quick rollbacks.
