# Validation Summary: How to Set Up K3s on Ubuntu for Edge Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu Linux
- K3s
- Kubernetes
- containerd
- Flannel
- Traefik
- local-path-provisioner
- etcd
- SQLite
- MySQL/MariaDB
- PostgreSQL
- UFW

## Sources Consulted
- K3s Requirements: https://docs.k3s.io/installation/requirements
- K3s Configuration Options: https://docs.k3s.io/installation/configuration
- K3s Server CLI Reference: https://docs.k3s.io/cli/server
- K3s Cluster Datastore: https://docs.k3s.io/datastore
- K3s Air-Gap Install: https://docs.k3s.io/installation/airgap
- K3s Private Registry Configuration: https://docs.k3s.io/installation/private-registry
- K3s Managing Packaged Components: https://docs.k3s.io/installation/packaged-components
- K3s Import Images: https://docs.k3s.io/add-ons/import-images
- K3s FAQ / Logging: https://docs.k3s.io/faq
- K3s v1.34/v1.35 release notes and GitHub releases: https://docs.k3s.io/release-notes/v1.34.X and https://github.com/k3s-io/k3s/releases
- Kubernetes API health endpoints: https://kubernetes.io/docs/reference/using-api/health-checks/
- Kubernetes resource metrics pipeline: https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-metrics-pipeline/
- Kubernetes kubectl top reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/
- Traefik Kubernetes Ingress annotations: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/ingress/
- Traefik Helm chart examples/values: https://github.com/traefik/traefik-helm-chart
- Rancher local-path-provisioner documentation: https://github.com/rancher/local-path-provisioner

## Issues Found
- Updated K3s hardware requirements. The post listed outdated 512MB server RAM and 1 CPU core guidance; current K3s documentation lists 2 CPU cores and 2GB RAM for server nodes, and 1 CPU core and 512MB RAM for agent nodes.
- Scoped UFW examples to trusted node/server CIDRs and added default pod/service CIDR rules. The original firewall examples opened VXLAN, kubelet, and etcd ports broadly, while K3s documentation warns that VXLAN should not be exposed publicly and documents pod/service CIDR allowances for UFW.
- Clarified WireGuard port usage. Port 51821 is only required for IPv6 WireGuard traffic.
- Updated pinned K3s version examples from v1.28.4+k3s2 to v1.35.5+k3s1 because v1.28 is obsolete for a 2026 guide.
- Removed `--cluster-init` from the basic first-server multi-node example. That flag initializes embedded etcd and is only needed for embedded-etcd HA, not for a default single-server cluster with agents.
- Corrected the embedded etcd example that described `k3s etcd-snapshot list` as viewing etcd members. The command lists snapshots, not etcd members.
- Updated Traefik dashboard Helm values to use `ingressRoute.dashboard.enabled`, matching the current Traefik Helm chart values.
- Corrected local-path-provisioner customization wording so the `nodePath` parameter is described as requiring a matching path in the provisioner's `nodePathMap`.
- Updated air-gap image archive examples from `.tar.gz` to `.tar.zst`, matching current K3s air-gap documentation and release artifacts.
- Replaced deprecated `kubectl get componentstatuses` with `kubectl get --raw='/readyz?verbose'`, matching Kubernetes API health endpoint guidance.
- Corrected K3s containerd troubleshooting commands. K3s logs embedded containerd to `/var/lib/rancher/k3s/agent/containerd/containerd.log`, and a plain `systemctl status containerd` is not generally valid for K3s-managed containerd.
- Corrected the direct `ctr` import example to use the K3s containerd socket at `/run/k3s/containerd/containerd.sock`.
- Replaced `kubectl version --short` with `kubectl version` for compatibility with modern kubectl.
- Clarified that K3s installs metrics-server by default instead of instructing readers to install the upstream metrics-server manifest over the packaged component.
- Updated the outdated Rancher K3s docs link to current SUSE K3s documentation.

## Review Notes
- The guide is technically relevant and remains useful after the corrections.
- The examples still use placeholder network ranges, hostnames, and credentials; readers must replace these with environment-specific values.
- The local-path-provisioner custom path example intentionally remains concise, but production deployments should manage node path permissions more tightly than `chmod 777`.
