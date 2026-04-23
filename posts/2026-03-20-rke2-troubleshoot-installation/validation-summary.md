# Validation Summary: How to Troubleshoot RKE2 Installation Failures - Part 3

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- RKE2
- Kubernetes
- systemd and journald
- etcd
- CNI plugins including Canal, Calico, Cilium, and Flannel
- firewalld and iptables
- Linux kernel modules and sysctl settings

## Sources Consulted
- RKE2 Logging documentation: https://docs.rke2.io/reference/logging
- RKE2 Requirements documentation: https://docs.rke2.io/install/requirements
- RKE2 Backup and Restore documentation: https://docs.rke2.io/datastore/backup_restore
- RKE2 Quick Start documentation: https://docs.rke2.io/install/quickstart
- RKE2 Token Management documentation: https://docs.rke2.io/security/token
- RKE2 Configuration Options documentation: https://docs.rke2.io/install/configuration
- RKE2 Network Options documentation: https://docs.rke2.io/networking/basic_network_options
- RKE2 Known Issues documentation: https://docs.rke2.io/known_issues
- Kubernetes Linux Node Swap Behaviors documentation: https://kubernetes.io/docs/reference/node/swap-behavior/
- Kubernetes Container Runtimes documentation: https://kubernetes.io/docs/setup/production-environment/container-runtimes/

## Issues Found
- The post referenced `/var/lib/rancher/rke2/agent/logs/rke2.log` and `/var/lib/rancher/rke2/server/logs/`, which are not the current documented RKE2 log locations. Updated the commands to use journald-oriented context plus documented containerd, kubelet, control-plane pod, and `/var/log/pods` log locations.
- The port conflict check included legacy Kubernetes ports `10251` and `10252` and omitted current RKE2/CNI-related ports. Updated the check and required-port list to reflect RKE2 requirements including `2381`, default Canal VXLAN `8472/udp`, and NodePort caveats.
- The firewall example did not include the added RKE2/CNI ports. Added `2381/tcp` and `8472/udp` to the firewalld example.
- The etcd recovery example deleted the active etcd data directory directly. Replaced it with RKE2's documented `rke2 server --cluster-reset --cluster-reset-restore-path=<PATH-TO-SNAPSHOT>` restore flow and noted the cluster-membership reset command.
- The resource comments stated a hard 20GB disk requirement and understated current RKE2 CPU/RAM recommendations. Updated the comments to match RKE2's documented 4GB RAM minimum, 8GB recommended, 2 CPU minimum, 4 CPU recommended, and SSD/workload-dependent disk guidance.
- The swap note said swap must be disabled for Kubernetes. Updated the wording to reflect current upstream behavior: Linux kubelet fails on swap by default unless configured to tolerate it.
- The uninstall command assumed only `/usr/local/bin/rke2-uninstall.sh`. Added the documented `/opt/rke2/bin/rke2-uninstall.sh` alternate install location.

## Review Notes
RKE2 documentation notes that firewalld can conflict with the default Canal networking stack; opening ports may not be sufficient in every default-Canal environment. The guide remains valid as a troubleshooting checklist, but a future revision could expand the firewall section with NetworkManager and firewalld-specific RKE2 known-issue handling.
