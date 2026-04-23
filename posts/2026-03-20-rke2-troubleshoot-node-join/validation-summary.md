# Validation Summary: How to Troubleshoot RKE2 Node Join Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- RKE2
- Kubernetes
- Rancher
- Linux systemd
- Linux networking and firewalls
- TLS certificates

## Sources Consulted
- RKE2 Quick Start: https://docs.rke2.io/install/quickstart
- RKE2 Requirements: https://docs.rke2.io/install/requirements
- RKE2 Configuration Options: https://docs.rke2.io/install/configuration
- RKE2 High Availability: https://docs.rke2.io/install/ha
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- RKE2 Linux Agent Configuration Reference: https://docs.rke2.io/reference/linux_agent_config
- RKE2 Token Management: https://docs.rke2.io/security/token
- RKE2 Advanced Options and Configuration: https://docs.rke2.io/advanced

## Issues Found
- The service-status step only covered `rke2-agent`, even though the post discusses both worker and server nodes. Added `rke2-server` status and journal commands for joining server nodes.
- The token/config wording referred only to agent nodes. Updated it to "joining node" where the same `server` and `token` config applies to both agent and additional server joins.
- The network port table incorrectly described all listed ports as server-node ports and omitted important server-to-server and CNI-specific ports. Updated the table with destinations and common RKE2 ports from the official requirements.
- The firewalld example said it opened all required ports while only opening 9345 and 6443. Reworded it as opening the core server join ports.
- The TLS inspection command could hang waiting for stdin. Added `echo |` before `openssl s_client`.
- The system requirements step listed 2 GB RAM as recommended. Updated it to the current RKE2 minimum of 4 GB RAM and recommendation of 8 GB.
- The "node password rejected" fix pointed to `/var/lib/rancher/rke2/agent/node-password.txt`, which is not the documented RKE2 node password location or cleanup flow. Replaced it with deletion of the stale `<NODE_NAME>.node-password.rke2` secret and an agent restart.
- The x509 unknown authority fix suggested manually copying a server CA into the agent data directory or disabling verification. Replaced it with guidance to use the current secure join token and verify the `server` URL, matching RKE2 TLS bootstrapping behavior.

## Review Notes
RKE2 network requirements vary by CNI and topology. The post now covers the common join-related ports, but operators using WireGuard, NodePort services, or less common CNI modes should still compare their firewall rules against the full official requirements.
