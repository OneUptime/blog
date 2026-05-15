# Validation Summary: How to Use Talos Linux Docker Provider for Local Development

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- talosctl
- Talos Docker local cluster provider
- Docker
- Kubernetes
- kubectl
- Ingress
- PersistentVolumeClaims and StorageClasses
- Tilt / Skaffold workflow concepts
- Makefile automation

## Sources Consulted
- Talos Docker local platform documentation: https://docs.siderolabs.com/talos/v1.13/platform-specific-installations/local-platforms/docker
- Talos talosctl CLI reference: https://docs.siderolabs.com/talos/v1.13/reference/cli
- Talos configuration patching documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/patching
- Talos pull-through cache / registry mirror documentation: https://docs.siderolabs.com/talos/v1.13/configure-your-talos-cluster/images-container-runtime/pull-through-cache
- Talos image cache documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/images-container-runtime/image-cache
- Kubernetes container image documentation: https://kubernetes.io/docs/concepts/containers/images/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes PersistentVolume documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/

## Issues Found
- The introduction said Docker-provider clusters have the same upgrade mechanisms as production Talos. Talos documentation notes that APIs such as `upgrade` and `reset` do not apply in container mode, so this was changed to describe the cluster as similar to production while keeping the Talos API and immutable OS behavior.
- The Talos cluster creation examples used `talosctl cluster create --provisioner docker`. Current Talos documentation uses the explicit `talosctl cluster create docker` subcommand, so the examples and Makefile were updated.
- The resource-limit example used non-Docker flags `--cpus` and `--memory`. The Docker provider uses `--cpus-controlplanes`, `--cpus-workers`, `--memory-controlplanes`, and `--memory-workers`, so the command was corrected.
- The Kubernetes version example used `1.28.0`, which is old for current Talos examples. It was updated to `1.36.0`, matching the current documented default in the Talos CLI reference.
- The multiple-cluster examples reused the default Docker subnet. Talos documentation notes that multiple clusters need unique network CIDRs, so unique `--subnet` values were added.
- The service-access section claimed NodePorts are automatically mapped to the host. The Docker provider exposes ports through `--exposed-ports`, so the example was changed to use that flag.
- The local-image workflow claimed Talos Docker containers share the host Docker daemon/socket. Talos runs its own container runtime, so the workflow was changed to build, push, and deploy an image from a registry reachable by the cluster.
- The Makefile deploy target only built a local Docker image, which would not make it available to the Talos cluster. It now tags and pushes a registry image before applying manifests and updating the deployment image.
- The debugging section used `talosctl services`, but the current command is `talosctl service`; this was corrected.
- The `kubectl top` commands were presented without noting the metrics API requirement. The text now clarifies that they work when metrics-server is installed.

## Review Notes
The Ingress API remains stable, but Kubernetes recommends Gateway API for new feature development. The existing Ingress example is still valid for an nginx-ingress local development workflow.
