# Validation Summary: How to Configure Kubernetes Networking with Flannel on Ubuntu

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Ubuntu
- Kubernetes
- kubeadm
- kubectl
- Flannel
- CNI
- UFW

## Sources Consulted
- Kubernetes Network Plugins documentation: https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/
- Kubernetes kubeadm init reference: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Flannel README and Kubernetes deployment instructions: https://github.com/flannel-io/flannel
- Flannel backend documentation: https://github.com/flannel-io/flannel/blob/master/Documentation/backends.md
- Flannel configuration documentation: https://github.com/flannel-io/flannel/blob/master/Documentation/configuration.md
- Flannel v0.24.0 release manifest: https://github.com/flannel-io/flannel/releases/download/v0.24.0/kube-flannel.yml
- Current Flannel release manifest: https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml
- Ubuntu UFW documentation: https://ubuntu.com/server/docs/how-to/security/firewalls/
- Canonical Kubernetes UFW route example: https://documentation.ubuntu.com/canonical-kubernetes/main/snap/howto/networking/ufw/

## Issues Found
- The introduction described Flannel as always creating an overlay network. This was changed to "a layer 3 pod network, often using an overlay" because host-gw uses routes rather than an overlay.
- The backend overview said cross-node traffic is always encapsulated. This was changed to "encapsulated or routed" because VXLAN and WireGuard encapsulate traffic, while host-gw routes it directly.
- The prerequisites said Flannel requires `--pod-network-cidr=10.244.0.0/16`. This was changed to clarify that the default manifest expects that CIDR, while custom pod CIDRs are supported if the manifest is adjusted.
- The backend configuration section implied changing backends is a normal runtime operation. This was adjusted to note that Flannel recommends choosing the backend during setup and that changing it later requires restarting Flannel pods.
- The UFW section incorrectly described UDP 8285 as a Flannel health check port. Flannel documents UDP 8285 as the older UDP backend port; the health endpoint is disabled by default unless configured separately. The command was changed to an optional commented command for the UDP backend.
- The UFW pod CIDR command used `ufw allow from 10.244.0.0/16`, which applies to incoming traffic rather than routed forwarding. It was changed to `ufw route allow from 10.244.0.0/16`.
- The IP exhaustion section said a /24 supports 254 pods per node. This was clarified to say it provides up to 254 pod IPs at the Flannel subnet level, while Kubernetes node pod limits may be lower.

## Review Notes
The current Flannel latest manifest uses the `kube-flannel` namespace, `kube-flannel-cfg` ConfigMap, `kube-flannel-ds` DaemonSet, and `app=flannel` label used by the post's commands. The pinned v0.24.0 manifest URL is valid, but it is an older release than the current upstream release.
