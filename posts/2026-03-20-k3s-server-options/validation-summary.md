# Validation Summary: How to Configure K3s Server Options

## Status
validated

## Post Type
Reference guide

## Technologies Covered
- K3s
- Kubernetes
- Flannel networking
- etcd and external datastores
- kube-apiserver, kubelet, and kube-proxy configuration

## Sources Consulted
- K3s Configuration Options: https://docs.k3s.io/installation/configuration
- K3s Server CLI: https://docs.k3s.io/cli/server
- K3s Agent CLI: https://docs.k3s.io/cli/agent
- K3s Basic Network Options: https://docs.k3s.io/networking/basic-network-options
- K3s Cluster Datastore: https://docs.k3s.io/datastore
- K3s Managing Packaged Components: https://docs.k3s.io/installation/packaged-components
- K3s Cluster Access: https://docs.k3s.io/cluster-access
- K3s Secrets Encryption: https://docs.k3s.io/security/secrets-encryption
- Kubernetes kube-apiserver reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes proxy modes reference: https://kubernetes.io/docs/reference/networking/virtual-ips
- Kubernetes taints and tolerations: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/

## Issues Found
- The networking snippet treated `flannel-backend` as a general CNI selector and listed outdated backend options. I corrected it to describe Flannel backend selection accurately, noted that custom CNIs require `flannel-backend: "none"`, and removed `wireguard` and `ipsec` from the active options list.
- The external datastore YAML example declared `datastore-endpoint` multiple times in one configuration block, which would not be a valid single effective YAML config. I kept one active example and converted the alternative datastore examples to commented alternatives.
- The Helm customization comments described `disable-helm-controller` as disabling specific bundled charts, which is not what that option does. I corrected the comments to reflect Helm controller behavior and the purpose of `helm-job-image`.
- The TLS hardening example used `tls-min-version` and `tls-cipher-suites` as top-level K3s config keys. I moved them under `kube-apiserver-arg`, which is how K3s passes those kube-apiserver flags.
- The kube-proxy example used `proxy-mode=ipvs`, which is deprecated in current Kubernetes documentation. I replaced it with `proxy-mode=iptables` to keep the example current and supported.
- The node taint example used awkward empty-value syntax and an older role key. I changed it to `node-role.kubernetes.io/control-plane:NoSchedule` and clarified that node taints are applied at initial registration.
- The egress selector mode comments were oversimplified and misleading for `cluster` and `pod` modes. I corrected the descriptions to match current K3s documentation.
- The validation commands used plain `kubectl` without specifying K3s' kubeconfig path. I changed them to use `kubectl --kubeconfig /etc/rancher/k3s/k3s.yaml ...`, which matches official K3s cluster-access guidance.
- The production example used `cluster-init: true` without indicating that it only applies to the first embedded-etcd server. I clarified that scope in the comment.

## Review Notes
- K3s also loads drop-in files from `/etc/rancher/k3s/config.yaml.d/*.yaml`, in addition to the main `/etc/rancher/k3s/config.yaml` file.
- In HA clusters, several critical server settings must match across all server nodes, including `cluster-cidr`, `service-cidr`, `cluster-dns`, `cluster-domain`, `disable-helm-controller`, `egress-selector-mode`, `flannel-backend`, and `secrets-encryption`.
- K3s still supports `kubelet-arg` flags, but current K3s documentation recommends kubelet config files or drop-ins for more advanced kubelet configuration on newer Kubernetes releases.
