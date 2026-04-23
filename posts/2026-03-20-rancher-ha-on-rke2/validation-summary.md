# Validation Summary: How to Set Up Rancher HA on RKE2

## Status
validated

## Post Type
Technical guide / Tutorial

## Technologies Covered
- Rancher Manager
- RKE2
- Kubernetes high availability with embedded etcd
- Helm
- cert-manager
- External load balancers and TLS SANs

## Sources Consulted
- RKE2 High Availability: https://docs.rke2.io/install/ha
- RKE2 Cluster Access: https://docs.rke2.io/cluster_access
- RKE2 CLI Tools: https://docs.rke2.io/reference/cli_tools
- Rancher: Setting up a High-availability RKE2 Kubernetes Cluster for Rancher: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-cluster-setup/rke2-for-rancher
- Rancher: Install/Upgrade Rancher on a Kubernetes Cluster: https://ranchermanager.docs.rancher.com/v2.13/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster
- Rancher Helm Chart Options: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- Rancher Port Requirements: https://ranchermanager.docs.rancher.com/v2.13/getting-started/installation-and-upgrade/installation-requirements/port-requirements
- cert-manager Helm installation docs: https://cert-manager.io/docs/installation/helm/

## Issues Found
- The post treated the external load balancer as a `:443` endpoint only, but RKE2 HA uses a fixed registration address with TCP/9345 for node registration and TCP/6443 for the Kubernetes API. I updated the prerequisites, architecture diagram, and additional-server join example to use the LB or VIP correctly.
- The RKE2 config examples wrote `/etc/rancher/rke2/config.yaml` without ensuring `/etc/rancher/rke2` existed. I added `mkdir -p /etc/rancher/rke2` before writing the config on each server.
- The post tainted all three server nodes with `CriticalAddonsOnly=true:NoExecute` while also describing a three-server-only Rancher deployment. Per RKE2 HA guidance, tainting all server nodes this way prevents packaged components such as ingress and metrics server from deploying until untainted agent nodes exist. I removed the taints and adjusted the conclusion so the documented install path actually schedules Rancher and ingress components.
- The `kubectl` step assumed `kubectl` was already on `PATH`. RKE2 installs bundled CLI tools under `/var/lib/rancher/rke2/bin`, so I updated the verification and rollout commands to use the RKE2-provided `kubectl`.
- The cert-manager install used the older `installCRDs=true` Helm value. I updated it to the current `crds.enabled=true` setting and added `helm repo update` to match current installation guidance.
- The prerequisites omitted Helm even though the guide installs both cert-manager and Rancher with Helm. I added Helm 3 as an explicit prerequisite.
- The introduction described RKE2 as generically "FIPS-compliant." I reworded that to the more precise claim that RKE2 supports FIPS 140-2 compliant deployments.

## Review Notes
- The commands are valid against the current official docs as of 2026-04-23, but the guide does not pin explicit RKE2, Rancher, or cert-manager versions. Pinning versions would reduce future drift.
- This guide uses Rancher-generated certificates. If it is later revised to use Let's Encrypt, the load balancer will also need TCP/80 exposed for HTTP-01 validation.
