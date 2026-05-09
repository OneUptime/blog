# Validation Summary: How to Troubleshoot Installation Issues with Calico on K3s

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- K3s
- Kubernetes
- Calico
- CNI
- Flannel
- containerd / crictl
- systemd journal logs

## Sources Consulted
- K3s Basic Network Options: https://docs.k3s.io/networking/basic-network-options
- K3s Agent CLI documentation: https://docs.k3s.io/cli/agent
- K3s Architecture documentation: https://docs.k3s.io/architecture
- Calico K3s multi-node install documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/k3s/multi-node-install
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool

## Issues Found
- The post said to compare Calico's IP pool CIDR against `.spec.podCIDR` from the first node. That field is a per-node pod CIDR allocation, not the K3s cluster CIDR. I changed the command to check the configured K3s `cluster-cidr`, list node `podCIDR` values separately, and compare the Calico IPPool CIDR against the cluster CIDR.
- The post implied K3s agent logs are always separate from server logs. K3s servers also run the agent components, while agent-only nodes use the `k3s-agent` service. I clarified the explanation and added `journalctl -u k3s` for CNI log checks.
- The post checked only `/etc/systemd/system/k3s.service` for Flannel settings. K3s options may also be stored in `/etc/rancher/k3s/config.yaml`, and agent-only nodes use `k3s-agent.service`. I updated the check to include those common locations.
- The reinstall command was valid in spirit, but I changed it to the `INSTALL_K3S_EXEC` form shown in the Calico K3s documentation and added `sudo` to the uninstall command.

## Review Notes
The Calico IPPool example uses `ipipMode: Always`, which is a valid Calico IPPool setting, though current Calico K3s quickstart examples commonly use VXLAN encapsulation. Future revisions could mention choosing the encapsulation mode intentionally for the environment.
