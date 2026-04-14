# How to Use the dapr uninstall Command

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, CLI, Uninstall, Kubernetes, Cleanup

Description: Learn how to use the dapr uninstall command to cleanly remove the Dapr runtime from self-hosted mode or from a Kubernetes cluster.

---

## Overview

The `dapr uninstall` command removes the Dapr runtime, its binaries, and supporting containers or Kubernetes resources. It is used when tearing down a development environment, cleaning up after testing, or decommissioning a cluster.

## Uninstalling in Self-Hosted Mode

Remove the Dapr placement container and binaries:

```bash
dapr uninstall
```

To also remove the Docker containers and all Dapr configuration:

```bash
dapr uninstall --all
```

The `--all` flag removes:
- The Redis Docker container
- The Zipkin Docker container
- The Scheduler Docker container
- The `dapr_scheduler` Docker volume
- The entire `~/.dapr/` directory (binaries, components, configuration, and scheduler data)

## Uninstalling from Kubernetes

```bash
dapr uninstall --kubernetes
```

This removes all Dapr control plane components (Helm releases) from the `dapr-system` namespace. The namespace itself is not deleted automatically; remove it manually with `kubectl delete namespace dapr-system` if needed.

## Removing from a Specific Namespace

```bash
dapr uninstall --kubernetes --namespace my-dapr-system
```

## Preserving Component Resources

By default, `dapr uninstall` removes the control plane but leaves your Component and Configuration custom resources in place. This is the safe default when you plan to reinstall later.

To also delete all Dapr custom resource definitions:

```bash
dapr uninstall --kubernetes --all
```

Warning: the `--all` flag will delete all Dapr CRDs and any Component, Configuration, Subscription, Resiliency, and HTTPEndpoint resources in the cluster. This is destructive and irreversible.

## Uninstall and Reinstall Script

Use this pattern for a clean reinstall during development:

```bash
#!/bin/bash
echo "Uninstalling Dapr..."
dapr uninstall --all

echo "Waiting for cleanup..."
sleep 5

echo "Reinstalling Dapr..."
dapr init

echo "Verifying installation..."
dapr version
```

## Verifying Cleanup in Kubernetes

After uninstalling from Kubernetes, confirm no Dapr resources remain:

```bash
kubectl get pods -n dapr-system 2>&1
# Expected: "No resources found" or "namespace not found"

kubectl get crds | grep dapr.io
# Expected: no output if --all was used
```

## Uninstalling the CLI Itself

`dapr uninstall` removes the runtime but not the CLI binary. To remove the CLI:

```bash
# macOS/Linux
sudo rm /usr/local/bin/dapr

# Windows (PowerShell)
Remove-Item "$env:SystemDrive\dapr\dapr.exe"
```

## Summary

`dapr uninstall` provides a clean removal path for both self-hosted and Kubernetes Dapr deployments. Use `--all` with caution as it removes Docker containers, binaries, and Kubernetes CRDs. For most reinstall scenarios, running uninstall without `--all` and then `dapr init` is the safest approach.
