# Validation Summary: How to Set Up a Production-Ready Talos Linux Cluster

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- etcd
- HAProxy
- Cilium CNI
- ingress-nginx
- kube-prometheus-stack
- Kubernetes NetworkPolicy
- Kubernetes Pod Security Admission
- Helm

## Sources Consulted
- Talos Linux v1.13 CLI reference: https://docs.siderolabs.com/talos/v1.13/reference/cli
- Talos Linux v1.13 support matrix: https://docs.siderolabs.com/talos/v1.13/getting-started/support-matrix
- Talos Linux configuration patching guide: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/patching
- Talos Linux disaster recovery guide: https://docs.siderolabs.com/talos/v1.12/build-and-extend-talos/cluster-operations-and-maintenance/disaster-recovery
- Talos Linux Cilium CNI guide: https://docs.siderolabs.com/kubernetes-guides/cni/deploying-cilium
- Talos Linux logging guide: https://www.talos.dev/latest/talos-guides/configuration/logging/
- Kubernetes version skew policy and supported versions: https://kubernetes.io/releases/version-skew-policy
- Kubernetes releases page: https://kubernetes.io/releases/
- Kubernetes Pod Security Admission guide: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-admission-controller
- Cilium Helm installation documentation: https://docs.cilium.io/en/stable/installation/k8s-install-helm/

## Issues Found
- The Talos and Kubernetes versions in the examples were stale for a 2026 production guide. Updated Kubernetes from `1.29.0` to `1.36.0`, Talos installer examples from `v1.9.0` to `v1.13.0`, and the upgrade example to use a `<new-talos-version>` placeholder.
- The `talosctl gen config` command used an invalid `--output-dir` flag. Replaced it with the documented `--output` flag.
- The Cilium section installed Cilium over Talos' default Flannel CNI and omitted Talos-specific Helm values. Added `cluster.network.cni.name: none` to the Talos config patch and added the required Cilium values for Kubernetes IPAM, cgroup handling, and capabilities on Talos.
- The etcd backup CronJob used `/bin/sh` inside `ghcr.io/siderolabs/talosctl`, but that image has `/talosctl` as its entrypoint and no shell. Replaced the shell command with container `args` and a Downward API `POD_NAME` value for unique snapshot filenames.

## Review Notes
- The examples are still intentionally generic and use placeholder IPs, DNS names, image schematic IDs, storage classes, and secrets. Operators should adapt those values to their environment.
- The CronJob approach stores a Talos admin config in a Kubernetes Secret. That can work, but it is highly privileged and should be protected carefully in production.
