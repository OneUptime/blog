# Validation Summary: How to Set Up a Production Kubernetes Cluster on Bare Metal

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubeadm, kubelet, and kubectl
- containerd
- HAProxy and Keepalived
- Calico
- MetalLB
- Longhorn
- Helm
- Prometheus and Grafana via kube-prometheus-stack

## Sources Consulted
- Kubernetes kubeadm installation documentation: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/
- Kubernetes highly available kubeadm cluster documentation: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/high-availability/
- Kubernetes ports and protocols reference: https://kubernetes.io/docs/reference/networking/ports-and-protocols/
- Kubernetes container runtimes documentation: https://kubernetes.io/docs/setup/production-environment/container-runtimes/
- Kubernetes 1.30 release page: https://kubernetes.io/releases/1.30/
- Kubernetes releases page: https://kubernetes.io/releases/
- Calico installation and customization documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/config-options
- MetalLB installation documentation: https://metallb.io/installation/
- MetalLB configuration documentation: https://metallb.io/configuration/
- Longhorn Helm/default settings documentation: https://longhorn.io/docs/latest/advanced-resources/deploy/customizing-default-settings/
- Longhorn StorageClass parameters reference: https://longhorn.io/docs/latest/references/storage-class-parameters/
- Helm install command reference: https://helm.sh/docs/helm/helm_install/
- HAProxy configuration manual: https://docs.haproxy.org/

## Issues Found
- The Kubernetes apt repository was pinned to `v1.30`, which reached end of life on 2025-07-15. Updated the repository URLs to `v1.36`, the current Kubernetes documentation version on 2026-05-27.
- The kubeadm package installation commands used `/etc/apt/keyrings` and `gpg` without ensuring both were available. Added `gpg` to the package install list and created `/etc/apt/keyrings` before downloading the repository signing key.
- The Calico manifest was pinned to an older version and was applied without configuring `CALICO_IPV4POOL_CIDR`, while `kubeadm init` used `--pod-network-cidr "10.244.0.0/16"`. Updated the manifest version to `v3.32.0` and added a `sed` command to set Calico's default IPv4 pool to `10.244.0.0/16`.
- The network topology diagram labelled the Calico overlay as VXLAN, but the raw Calico manifest defaults to IP-in-IP enabled and VXLAN disabled. Updated the diagram labels to `IP-in-IP`.
- The MetalLB Helm install created the namespace without Pod Security Admission labels. Added namespace creation and the privileged pod security labels recommended by MetalLB before installing the chart.

## Review Notes
- The HAProxy TCP load balancer configuration, kubeadm high availability flags, MetalLB `IPAddressPool` and `L2Advertisement` resources, Longhorn StorageClass parameters, Helm install commands, and Kubernetes control plane port list match the consulted documentation.
- For a real production cluster, the article could later be expanded with explicit etcd backup commands, firewall rules for the selected CNI, upgrade procedures, and Longhorn node prerequisites, but those are operational completeness improvements rather than corrections to the existing snippets.
