# Validation Summary: How to Set Up Flannel Networking on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flannel (CNI plugin)
- Kubernetes (kubeadm, kubelet, kubectl)
- Ubuntu (apt package management)
- VXLAN, host-gw, WireGuard backends
- CNI (Container Network Interface)
- Calico / Canal (for NetworkPolicy)
- iptables, ufw, sysctl (Linux networking)

## Sources Consulted
- Flannel backends documentation: https://github.com/flannel-io/flannel/blob/master/Documentation/backends.md
- Flannel releases / kube-flannel.yml: https://github.com/flannel-io/flannel/releases
- Kubernetes kubeadm install docs: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/
- Kubernetes apt package repository: https://pkgs.k8s.io/
- Project Calico / Tigera docs (Canal manifest): https://docs.tigera.io/calico/latest/getting-started/kubernetes/flannel/install-for-flannel
- Project Calico GitHub manifests: https://github.com/projectcalico/calico/tree/master/manifests

## Issues Found

1. **Missing `/etc/apt/keyrings` directory creation step.** The kubeadm install snippet wrote the apt keyring to `/etc/apt/keyrings/kubernetes-apt-keyring.gpg` without first creating that directory. On a fresh Ubuntu install the directory does not exist by default and `gpg --dearmor` would fail. Added `sudo mkdir -p -m 755 /etc/apt/keyrings` and added `gpg` to the prerequisite package install (required by `gpg --dearmor`), matching the official Kubernetes documentation.

2. **Outdated Canal manifest URL.** The post referenced `https://docs.projectcalico.org/manifests/canal.yaml`. The `docs.projectcalico.org` domain is deprecated; Calico documentation has moved to `docs.tigera.io`, and the official install procedure now uses a pinned raw GitHub URL. Updated the URL to `https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/canal.yaml`.

## Review Notes

- The post uses Kubernetes v1.29 in the apt repository URL. v1.29 packages are still available at `pkgs.k8s.io`, but as of mid-2026 this is several minor versions behind the current Kubernetes release. Readers may want to substitute a more current version (e.g. `v1.30`, `v1.31`).
- The Flannel backend list is accurate. The `udp` backend is correctly described as "for debugging only" — official Flannel docs recommend it only for old kernels lacking VXLAN/host-gw support.
- VXLAN port 8472 is correct — this is Flannel's non-standard default (vs. the IANA-assigned 4789).
- The `flannel.1` interface name, `kube-flannel` namespace, `kube-flannel-cfg` ConfigMap, and `kube-flannel-ds` DaemonSet names all match the official `kube-flannel.yml` manifest.
- The `/opt/cni/bin/flannel` path is correct — the kube-flannel image installs the CNI binary there via an initContainer.
- Note that Canal itself is officially deprecated as of Calico v3.21+; the manifest is still maintained in the Calico repo but Tigera recommends using Calico directly for both networking and policy. The post's wording ("Add Calico's network policy engine on top of Flannel") is accurate, and Canal is still installable.
- The `kubectl run ... --restart=Never --rm -it` syntax used in the test section still works but relies on a legacy generator behavior; future kubectl releases may require switching to explicit Pod manifests.
