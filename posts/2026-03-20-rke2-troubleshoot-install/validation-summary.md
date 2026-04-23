# Validation Summary: How to Troubleshoot RKE2 Installation Failures - Install

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- RKE2
- Kubernetes
- Linux systemd and journald
- containerd and crictl
- etcd and etcdctl
- Linux networking, firewall, kernel modules, and sysctl
- TLS certificates and RKE2 join tokens

## Sources Consulted
- RKE2 Requirements: https://docs.rke2.io/install/requirements
- RKE2 Quick Start: https://docs.rke2.io/install/quickstart
- RKE2 Installation Methods: https://docs.rke2.io/install/methods
- RKE2 Uninstall: https://docs.rke2.io/install/uninstall
- RKE2 CLI Tools: https://docs.rke2.io/reference/cli_tools
- RKE2 Logging: https://docs.rke2.io/reference/logging
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- RKE2 Agent Configuration Reference: https://docs.rke2.io/reference/linux_agent_config
- RKE2 Token Management: https://docs.rke2.io/security/token
- RKE2 Certificate Management: https://docs.rke2.io/security/certificates
- Kubernetes Swap Memory Management: https://kubernetes.io/docs/concepts/cluster-administration/swap-memory-management/

## Issues Found
- The resource requirement comments were outdated. Updated RAM/CPU guidance from 2GB server and 1GB agent to RKE2's current 4GB RAM and 2 CPU minimum, with 8GB RAM and 4 CPU recommended.
- The disk-space comment claimed a fixed 10GB requirement that is not in current RKE2 requirements. Replaced it with accurate guidance that RKE2 stores etcd data and images on disk and recommends SSD-backed storage.
- The swap comment overstated current Kubernetes behavior. Updated it to note that upstream kubelet fails on Linux swap by default unless configured to tolerate swap.
- The port-conflict check treated UDP CNI ports as TCP and missed the etcd metrics port. Split TCP and UDP checks, added TCP 2381, and checked common CNI UDP ports separately.
- The TLS troubleshooting commands read root-owned files without sudo and used a generic supervisor URL. Added sudo where needed and used `/cacerts`, which is the RKE2 CA bundle endpoint used during token bootstrapping.
- The join-token check only compared `node-token`. Added guidance to also compare `agent-token` when a separate agent token is configured.
- The DNS troubleshooting command performed a reverse lookup of an IP while claiming to test DNS resolution. Changed it to resolve a server hostname.
- The containerd section checked the host `containerd` systemd unit even though RKE2 uses embedded containerd. Updated it to use RKE2 service logs, the RKE2 embedded containerd log, and the documented `/run/k3s/containerd/containerd.sock` socket.
- The etcd diagnostics used host process and journald checks for a component that RKE2 runs as a static pod. Updated the commands to use `crictl` for the container and `kubectl logs` for the static pod logs.
- The reinstall section referenced `rke2-agent-uninstall.sh`, which is not in the current RKE2 uninstall docs. Replaced it with the documented tarball and RPM uninstall script paths.
- The x509 error table recommended regenerating certificates too broadly. Changed the solution to verify server URL, token, and CA before rotating certificates.
- The conclusion overemphasized swap as a common RKE2 install failure. Updated it to emphasize ports, kernel/sysctl settings, network/firewall issues, and token mismatches.

## Review Notes
The guide is now technically aligned with current RKE2 documentation. Future improvements could add separate server and agent reinstall examples, but the current commands are valid for the server-focused flow shown in the post.
