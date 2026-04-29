# Validation Summary: How to Install K3s in an Air-Gapped Environment - Install

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes
- Air-gapped Linux installation
- Private container registries
- `systemd`

## Sources Consulted
- K3s Air-Gap Install: https://docs.k3s.io/installation/airgap
- K3s Private Registry Configuration: https://docs.k3s.io/installation/private-registry
- K3s Environment Variables: https://docs.k3s.io/reference/env-variables
- K3s Quick-Start Guide: https://docs.k3s.io/quick-start
- K3s Token CLI Reference: https://docs.k3s.io/cli/token
- K3s Import Images: https://docs.k3s.io/add-ons/import-images
- K3s Releases: https://github.com/k3s-io/k3s/releases
- K3s release `v1.34.7+k3s1`: https://github.com/k3s-io/k3s/releases/tag/v1.34.7%2Bk3s1
- K3s release `v1.30.2+k3s1`: https://github.com/k3s-io/k3s/releases/tag/v1.30.2%2Bk3s1

## Issues Found
- The original post started K3s before `registries.yaml` existed, even though K3s reads that file at startup. I changed the server install command to use `INSTALL_K3S_SKIP_START=true` and moved service startup until after the registry configuration step.
- The original registry guidance implied that K3s would stay confined to the internal registry, but containerd still falls back to default registry endpoints unless `--disable-default-registry-endpoint` is set. I added that flag to both the server and agent install commands.
- The original post only configured `registries.yaml` on the server. K3s requires private registry configuration on every node that will pull images, so I clarified that the same file must be present on each agent before installation.
- The example pinned `K3S_VERSION` to `v1.30.2+k3s1`, which is an older release. I updated it to `v1.34.7+k3s1`, the latest stable release verified during this review on April 29, 2026.
- The original server instructions omitted the SELinux caveat documented by K3s for air-gapped nodes with SELinux enabled. I added a note so the install sequence does not imply that all distributions can skip that prerequisite.

## Review Notes
- The post still uses the `.tar.gz` air-gap image archive. Current K3s docs commonly show `.tar.zst`, but `.tar.gz` remains valid because K3s can decompress supported image tarballs automatically.
- If workloads pull from registries other than `docker.io`, `registry.k8s.io`, or `ghcr.io`, matching mirror entries should be added to `registries.yaml`; `--disable-default-registry-endpoint` only applies to registries explicitly configured there.
