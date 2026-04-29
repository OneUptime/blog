# Validation Summary: How to Install K3s on Fedora - Install

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- K3s
- Kubernetes
- Fedora Linux
- SELinux
- firewalld / `firewall-cmd`
- `kubectl`
- systemd

## Sources Consulted
- K3s Requirements: https://docs.k3s.io/installation/requirements
- K3s Quick-Start Guide: https://docs.k3s.io/quick-start
- K3s Configuration Options: https://docs.k3s.io/installation/configuration
- K3s Advanced Options / Configuration: https://docs.k3s.io/advanced
- K3s Cluster Access: https://docs.k3s.io/cluster-access
- K3s High Availability Embedded etcd: https://docs.k3s.io/datastore/ha-embedded
- K3s install script: https://get.k3s.io
- Fedora package index for `container-selinux`: https://packages.fedoraproject.org/pkgs/container-selinux/container-selinux/
- Fedora package index for `selinux-policy`: https://packages.fedoraproject.org/pkgs/selinux-policy/selinux-policy/
- Fedora package index for `policycoreutils-python-utils`: https://packages.fedoraproject.org/pkgs/policycoreutils/policycoreutils-python-utils/

## Issues Found
- The prerequisites claimed `Fedora 38+ (K3s supports Fedora 36+)`, but current K3s documentation does not publish that Fedora version floor. Updated this to `A recent Fedora release` to avoid an unsupported version-specific claim.
- The post hardcoded an outdated Rancher SELinux RPM URL (`.../centos/8/.../k3s-selinux-1.4.1-1.el8.noarch.rpm`). Removed that command because current K3s documentation says the install script automatically installs the SELinux RPM on compatible systems, and the original RPM path/version was stale.
- The install commands did not enable K3s SELinux support. Updated both server and agent installation commands to pass `--selinux`, matching current K3s SELinux guidance for SELinux-enforcing systems.
- The firewall section opened ports and ranges that are not the documented default firewalld rules for K3s, including blanket NodePort exposure. Replaced that guidance with the current K3s firewalld defaults: allow `6443/tcp` and trust the default pod and service CIDRs (`10.42.0.0/16` and `10.43.0.0/16`).
- The best-practices note recommended trusting the `cni0` interface. Updated it to trust the K3s pod and service CIDRs instead, which matches current K3s firewalld documentation and avoids depending on interface naming.
- The Step 3 comment said the plain install command was for a `single-node or first node in HA`. Corrected this to `single-node` because the first server in an embedded-etcd HA cluster requires `--cluster-init` and additional HA-specific configuration.
- The troubleshooting section used `audit2why` without ensuring the command exists. Added `policycoreutils-python-utils` to the package install step because Fedora ships `audit2why` in that package.

## Review Notes
- Copying `/etc/rancher/k3s/k3s.yaml` to `~/.kube/config` is valid for local access on the K3s server, but copied kubeconfig files do not automatically receive certificate updates when K3s rotates them.
- Multi-node clusters may still need additional node-to-node firewall allowances depending on the network backend and enabled services. K3s documents `8472/udp` for Flannel VXLAN and `10250/tcp` for kubelet metrics/API as inbound rules between nodes.
