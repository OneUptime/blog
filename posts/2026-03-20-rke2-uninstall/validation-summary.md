# Validation Summary: How to Uninstall RKE2

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- RKE2
- Kubernetes
- kubectl
- systemd
- Linux networking and iptables
- containerd

## Sources Consulted
- RKE2 Uninstall documentation: https://docs.rke2.io/install/uninstall
- RKE2 Installation Methods documentation: https://docs.rke2.io/install/methods
- RKE2 Quick Start documentation: https://docs.rke2.io/install/quickstart
- RKE2 High Availability documentation: https://docs.rke2.io/install/ha
- RKE2 Advanced Options and Configuration documentation: https://docs.rke2.io/advanced
- RKE2 official uninstall script source: https://raw.githubusercontent.com/rancher/rke2/master/bundle/bin/rke2-uninstall.sh
- RKE2 official killall script source: https://raw.githubusercontent.com/rancher/rke2/master/bundle/bin/rke2-killall.sh
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl delete reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/

## Issues Found
- The post described separate server and agent uninstall scripts and used `/usr/local/bin/rke2-agent-uninstall.sh`. Current RKE2 documents a single `rke2-uninstall.sh` script for both server and agent nodes, with `/usr/bin/rke2-uninstall.sh` for RPM installs and `/usr/local/bin/rke2-uninstall.sh` for tarball installs. Updated the uninstall section and complete script accordingly.
- The post implied residual default data directories commonly remain after a successful uninstall. The official uninstall script removes default RKE2 data, config, kubelet, CNI, and pod/container log directories. Updated the wording to make residual cleanup conditional on an incomplete uninstall or custom data path.
- The complete uninstall script only checked `/usr/local/bin` and the non-existent agent uninstall script. Updated it to check the common RPM, tarball, and `/opt/rke2` paths for `rke2-uninstall.sh`.
- The manual fallback removed `kubectl` and `crictl` from `/usr/local/bin`, but RKE2 installs those bundled utilities under `/var/lib/rancher/rke2/bin` by default. Updated the fallback commands to remove common RKE2 binary/script locations and the bundled utilities directory.
- The manual fallback only removed systemd unit files from `/etc/systemd/system`, while RKE2 tarball/RPM installs can place unit files under `/usr/local/lib/systemd/system` or `/usr/lib/systemd/system`. Added those paths.
- The containerd troubleshooting comment said the command removed artifacts, but it only listed containers. Updated the wording to say it inspects artifacts.
- Added an etcd quorum caveat for removing server nodes, matching RKE2 HA guidance.

## Review Notes
- The Kubernetes `kubectl drain`, `kubectl get`, and `kubectl delete node` commands are valid. The post uses placeholder values such as `<NODE_NAME>` and `<interface_name>`; readers must replace those placeholders before running the commands.
- The iptables flush commands remain commented and carry a warning. They are broad operations and should only be used when the operator understands the host-level impact.
