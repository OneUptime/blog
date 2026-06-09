# Validation Summary: How to Configure K3s for Raspberry Pi

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- K3s (lightweight Kubernetes distribution by Rancher/SUSE)
- Kubernetes (kubectl, Deployments, Services, NodePort, ConfigMaps)
- Raspberry Pi OS (Lite, 64-bit)
- systemd (k3s, k3s-agent services)
- cgroups v1/v2 kernel parameters
- dphys-swapfile (Raspberry Pi swap manager)
- Flannel (CNI plugin)
- CoreDNS (Kubernetes DNS)
- metrics-server
- SQLite (default K3s datastore)
- Bash / shell scripting

## Sources Consulted
- K3s official documentation: https://docs.k3s.io/
- K3s quick start guide: https://docs.k3s.io/quick-start
- K3s installation options: https://docs.k3s.io/installation/configuration
- Raspberry Pi OS documentation (cmdline.txt location): https://www.raspberrypi.com/documentation/computers/configuration.html
- Kubernetes Service documentation (NodePort range): https://kubernetes.io/docs/concepts/services-networking/service/
- metrics-server GitHub repository: https://github.com/kubernetes-sigs/metrics-server
- K3s networking docs (Flannel default, 10.42.0.0/16 pod CIDR): https://docs.k3s.io/networking
- K3s CoreDNS customization (coredns-custom ConfigMap): https://docs.k3s.io/networking/networking-services

## Issues Found
No technical issues found.

All commands, flags, configuration paths, and technical claims were verified against current K3s and Raspberry Pi documentation:
- `/boot/firmware/cmdline.txt` is the correct path on modern Raspberry Pi OS (Bookworm/Bullseye recent releases).
- `cgroup_memory=1 cgroup_enable=memory` are the correct kernel parameters required for K3s/Kubernetes on Raspberry Pi.
- The `dphys-swapfile swapoff` / `uninstall` / `systemctl disable` sequence is the standard way to permanently disable swap on Raspberry Pi OS.
- K3s install script URL (`https://get.k3s.io`), CLI flags (`--write-kubeconfig-mode`, `--disable servicelb/traefik/local-storage`, `--kube-controller-manager-arg`), env vars (`K3S_URL`, `K3S_TOKEN`, `INSTALL_K3S_VERSION`), and paths (`/var/lib/rancher/k3s/server/node-token`, `/etc/rancher/k3s/k3s.yaml`) are all accurate.
- API server port 6443, default pod CIDR 10.42.0.0/16 (each node /24), and NodePort range 30000-32767 are correct.
- K3s service names (`k3s` for server, `k3s-agent` for worker) are correct.
- K3s v1.28.5+k3s1 is a real, released version.
- The CoreDNS custom ConfigMap mechanism (`coredns-custom` in `kube-system` namespace with `<name>.server` keys) is the documented K3s approach.
- The metrics-server install URL and `--kubelet-insecure-tls` flag are correct.
- Kubernetes Deployment and Service YAML manifests are syntactically valid (apps/v1, NodePort 30080 in range).

## Review Notes
- The post mentions K3s v1.28.5+k3s1 as the example version. K3s has continued to release newer versions (1.29.x, 1.30.x, etc.); the example will become more dated over time but the install commands remain accurate for upgrading.
- The post correctly notes that K3s uses SQLite by default but doesn't elaborate on the embedded etcd option for HA — fine for the scope of a single-master tutorial.
- The mermaid pie chart memory figures (500MB K3s, 300MB system, 2700MB workloads, 500MB buffer = 4000MB) are reasonable approximations for a Pi 4 4GB; actual usable RAM is closer to 3.7-3.8GB, but the breakdown is illustrative and reasonable.
- The note that Raspberry Pi OS Lite 64-bit is recommended for Pi 4 is correct; the 64-bit variant is required for Pi 4 to address memory above 4GB and is generally preferred for K3s.
- The CoreDNS custom ConfigMap example only shows the structure; users would need to also restart/reload CoreDNS for changes to take effect in some scenarios, though K3s's auto-merging typically handles this.
