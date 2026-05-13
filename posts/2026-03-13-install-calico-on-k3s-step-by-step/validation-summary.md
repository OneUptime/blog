# Validation Summary: How to Install Calico on K3s Step by Step

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- K3s
- Kubernetes
- Calico
- Flannel
- Kubernetes CNI
- Kubernetes NetworkPolicy
- calicoctl

## Sources Consulted
- K3s Basic Network Options: https://docs.k3s.io/networking/basic-network-options
- K3s Networking Services: https://docs.k3s.io/networking/networking-services
- K3s Server CLI Reference: https://docs.k3s.io/cli/server
- Calico K3s multi-node install guide: https://docs.tigera.io/calico/latest/getting-started/kubernetes/k3s/multi-node-install
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico v3.32.0 manifest URL: https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/manifests/calico.yaml
- Calico v3.32.0 calicoctl release asset: https://github.com/projectcalico/calico/releases/download/v3.32.0/calicoctl-linux-amd64

## Issues Found
- The introduction stated that K3s's default Flannel setup does not support Kubernetes NetworkPolicy enforcement. K3s documentation states that K3s includes an embedded kube-router-based network policy controller by default, while K3s recommends disabling that controller when installing a custom CNI with its own policy engine. I changed the wording to say K3s uses Flannel and includes the embedded network policy controller by default, and that Calico provides Kubernetes NetworkPolicy and Calico GlobalNetworkPolicy support.
- The post said the process "covers" multi-node setups, but it does not include node-join commands. I changed this to say the process "works for" single-node and multi-node setups.
- The Calico install and calicoctl commands were pinned to v3.27.0, while the current official Calico K3s guide uses v3.32.0. I updated both URLs to v3.32.0 and verified that the manifest and binary asset URLs resolve.
- The calicoctl installation commands wrote to `/usr/local/bin` without `sudo`, which fails for a normal non-root user. I added `sudo` to the `curl` and `chmod` commands and changed `calicoctl node status` to `sudo calicoctl node status`, matching the official command example.

## Review Notes
The direct manifest install path remains valid in the official Calico K3s documentation. The Calico docs also document an operator-based install path; this post uses the manifest path, which is acceptable for the guide's current scope.
