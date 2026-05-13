# Validation Summary: How to Set Up Flux CD on k3s with Embedded etcd

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- k3s
- Kubernetes
- Embedded etcd
- kube-vip
- Flux CD
- GitOps
- GitHub bootstrap workflow

## Sources Consulted
- k3s High Availability Embedded etcd documentation: https://docs.k3s.io/datastore/ha-embedded
- k3s server CLI documentation: https://docs.k3s.io/cli/server
- k3s configuration documentation: https://docs.k3s.io/installation/configuration
- k3s advanced etcdctl documentation: https://docs.k3s.io/advanced
- k3s etcd snapshot documentation: https://docs.k3s.io/cli/etcd-snapshot
- kube-vip K3s usage documentation: https://kube-vip.io/docs/usage/k3s/
- kube-vip DaemonSet installation documentation: https://kube-vip.io/docs/installation/daemonset/
- Flux bootstrap GitHub CLI documentation: https://fluxcd.io/flux/cmd/flux_bootstrap_github/

## Issues Found
- Several k3s install command lines used Bash line continuations followed by inline comments. This would break copy-paste execution because the backslash must be the final character on the continued line. I moved the comments outside the continued commands.
- The additional k3s server join command omitted the explicitly configured `--flannel-backend=vxlan` and `--etcd-expose-metrics=true` settings from the first server. I added them so the example stays consistent across server nodes and exposes etcd metrics from each server.
- The kube-vip section described a static pod while applying a DaemonSet, and used an outdated templated `https://kube-vip.io/manifests/daemonset` pipeline. I updated the text and command to generate a DaemonSet manifest with the kube-vip image, matching the current kube-vip documentation.
- The etcd health check tried to `kubectl exec` into an `etcd-node1` pod, but k3s embedded etcd does not run as a Kubernetes pod. I changed the example to run `etcdctl` on a k3s server node with the K3s-managed etcd client certificate and key paths from the official k3s documentation.
- One best-practice note said the Flux `GitRepository` source uses the control-plane load balancer endpoint. Flux `GitRepository` sources refer to the Git remote, while the Kubernetes API endpoint is relevant for kubeconfig access, bootstrap, and node registration. I corrected the wording.

## Review Notes
- The Flux `bootstrap github` command and Kubernetes `Deployment` manifest are current and technically valid.
- The guide now assumes Docker and `jq` are available on the first node for kube-vip manifest generation; kube-vip also documents `ctr`-based generation for K3s environments where Docker is not installed.
