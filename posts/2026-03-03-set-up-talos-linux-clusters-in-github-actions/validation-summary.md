# Validation Summary: How to Set Up Talos Linux Clusters in GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- talosctl
- GitHub Actions
- actions/cache
- Kubernetes
- kubectl
- Docker

## Sources Consulted
- Talos Linux talosctl CLI reference: https://docs.siderolabs.com/talos/latest/reference/cli
- Talos Linux Docker local platform guide: https://docs.siderolabs.com/talos/v1.13/platform-specific-installations/local-platforms/docker
- Talos Linux support matrix: https://docs.siderolabs.com/talos/v1.13/getting-started/support-matrix
- Talos Linux talosctl install guide: https://www.talos.dev/latest/talos-guides/install/talosctl/
- Talos Linux GitHub releases: https://github.com/siderolabs/talos/releases
- GitHub Actions reusable workflows documentation: https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows
- GitHub Actions runner documentation: https://docs.github.com/actions/using-jobs/choosing-the-runner-for-a-job
- actions/cache documentation: https://github.com/actions/cache
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run

## Issues Found
- The Talos cluster creation examples used the older `talosctl cluster create --provisioner docker` form, plus Docker-incompatible flags such as `--controlplanes` and `--wait-timeout`. Updated the examples to use the current `talosctl cluster create docker` subcommand and only Docker-supported flags.
- The multiple-cluster troubleshooting example used `--cidr`, but the current Docker subcommand uses `--subnet`. Updated both commands accordingly.
- The caching example referenced Talos `v1.7.0`, which is outdated for a 2026 post. Updated the pinned Talos version, cache keys, download URL, and Docker image tag to `v1.13.0`, the current stable release checked during validation.
- The image-cache conditional referenced `steps.cache-talos.outputs.cache-hit` without defining a matching step ID. Added the cache step ID and fixed the conditional to use `steps.cache-talos-images.outputs.cache-hit`.
- The Kubernetes version matrix used older Kubernetes versions that are no longer the best fit for current Talos. Updated the matrix to `1.34.0`, `1.35.0`, and `1.36.0`, which are supported by Talos 1.13.
- The reusable workflow example created a Talos cluster in one job and attempted to use its kubeconfig path from a separate caller job. GitHub-hosted jobs run on fresh runner instances, so the live Docker cluster and `/tmp` kubeconfig would not be available. Updated the reusable workflow to create the cluster, export kubeconfig, run the caller-provided test command, and destroy the cluster in the same job.
- The deployment example wrote the Talos config secret with `echo`, which is less reliable for multi-line config values. Updated it to use `printf '%s'`.
- The smoke-test command used `kubectl run ... -it`, which can fail in non-interactive CI environments. Removed the interactive TTY flags while preserving `--rm` and `--restart=Never`.

## Review Notes
- The Talos Docker provider is documented as intended for CI pipelines and local testing, and it automatically configures Talos and Kubernetes client configuration for the created local cluster.
- `actions/cache@v4` is still usable, although the actions/cache project currently documents newer major versions as well. A future refresh could update examples to the latest action major version if the repository standard allows it.
