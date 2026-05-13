# Validation Summary: How to Migrate Existing Workloads to Calico on Bare Metal with Binaries

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Calico
- Kubernetes
- Kubernetes CNI
- Calico IPPool resources
- Calico CNI plugin
- systemd
- Docker
- kubectl
- calicoctl

## Sources Consulted
- Calico documentation: Binary install without package manager, https://docs.tigera.io/calico/latest/getting-started/bare-metal/installation/binary
- Calico documentation: Install CNI plugin, https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-cni-plugin
- Calico documentation: Configure the Calico CNI plugins, https://docs.tigera.io/calico/latest/reference/configure-cni-plugins
- Calico documentation: IPPool resource reference, https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: Install calico/node, https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-node
- Kubernetes kubectl reference: drain, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Project Calico v3.27.0 GitHub release assets, https://github.com/projectcalico/calico/releases/tag/v3.27.0

## Issues Found
- The original binary download URLs for `calico-node-amd64`, `calico-cni-amd64`, and `calico-ipam-amd64` under the `projectcalico/calico` v3.27.0 release do not exist. The install commands now extract `calico-node` from the `calico/node:v3.27.0` image and the CNI binaries from the `calico/cni:v3.27.0` image, matching Tigera's documented binary extraction pattern.
- The post enabled `calico-node.service` without creating a unit file. It now creates a systemd unit and environment file before enabling the service.
- The prerequisites omitted `calicoctl` even though the guide uses `calicoctl apply`. It is now listed as a prerequisite.
- The IPPool example used `encapsulation: None`, which is not an IPPool field. It now uses `ipipMode: Never` and `vxlanMode: Never`, which are the IPPool fields for disabling IP-in-IP and VXLAN encapsulation.
- The IPPool CIDR was presented as a fixed value. It now notes that the CIDR must be replaced with the cluster Pod CIDR.
- The CNI configuration placeholder `{...calico CNI config...}` was not valid JSON and could not be applied. It was replaced with a valid Calico conflist based on the documented Kubernetes hard-way CNI configuration.
- The old CNI cleanup command only removed one Flannel filename. It now removes common Flannel and Canal CNI config filenames.
- The backup step only captured Kubernetes NetworkPolicy resources. It now also captures Calico IPPool state because the migration changes Calico IPAM configuration.

## Review Notes
The reviewed post is still a high-level migration guide. A real production migration also needs a correctly scoped Calico CNI kubeconfig at `/etc/cni/net.d/calico-kubeconfig` and a Calico node kubeconfig at `/etc/calico/calico-kubeconfig`, with RBAC equivalent to the Calico CNI plugin and Calico node permissions documented by Tigera. Tigera's current Kubernetes installation guidance generally runs `calico/node` as a DaemonSet; operating Felix as a host systemd service should be tested carefully against the target Calico mode before production use.
