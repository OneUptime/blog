# Validation Summary: How to Install and Configure Rancher for Kubernetes Management on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Rancher Manager
- Kubernetes
- K3s
- cert-manager
- Helm
- firewalld
- Rancher CLI
- Prometheus and Grafana monitoring through Rancher

## Sources Consulted
- Rancher Manager documentation: Install/Upgrade Rancher on a Kubernetes Cluster: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster
- Rancher Manager documentation: Helm Chart Options: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- Rancher Manager documentation: Port Requirements: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-requirements/port-requirements
- Rancher Manager documentation: Rancher CLI: https://ranchermanager.docs.rancher.com/v2.8/reference-guides/cli-with-rancher/rancher-cli
- Rancher CLI GitHub releases: https://github.com/rancher/cli/releases
- K3s documentation: Quick-Start Guide: https://docs.k3s.io/quick-start
- K3s documentation: Requirements: https://docs.k3s.io/installation/requirements
- cert-manager documentation: kubectl apply installation: https://cert-manager.io/docs/installation/kubectl/
- cert-manager documentation: Supported Releases: https://cert-manager.io/docs/releases/

## Issues Found
- The cert-manager installation command used v1.14.0. The official cert-manager release page lists 1.14 as end-of-life as of October 3, 2024, so I updated the static manifest URL to v1.20.2, which is the current documented kubectl-install example.
- The post said Rancher requires cert-manager for TLS certificate management without qualification. Rancher requires cert-manager for the default Rancher-generated certificate path, while other certificate options exist, so I narrowed the wording to the default certificate flow used by the post.
- The firewalld example opened TCP 80, 443, and 6443 but omitted the default K3s pod and service CIDR trust rules documented for RHEL firewalld environments. I added trusted-zone rules for 10.42.0.0/16 and 10.43.0.0/16.
- The Rancher CLI example pinned v2.8.0, which is outdated relative to the unpinned current Rancher Helm install. I updated the CLI download and extracted directory to v2.14.1, the latest stable release shown on the Rancher CLI releases page at review time.

## Review Notes
The tutorial remains a quick single-node setup. For production, Rancher documentation recommends a real DNS name and a highly available Kubernetes cluster rather than a single K3s node with one Rancher replica.
