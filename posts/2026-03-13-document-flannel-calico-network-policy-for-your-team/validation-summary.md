# Validation Summary: How to Document Flannel with Calico Network Policy for Your Team

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes
- Kubernetes NetworkPolicy
- kubectl
- Calico Open Source
- Calico Felix
- calicoctl
- Flannel
- Canal
- VXLAN

## Sources Consulted
- Calico documentation: Install Calico for policy and flannel (aka Canal) for networking: https://docs.tigera.io/calico/latest/getting-started/kubernetes/flannel/install-for-flannel
- Calico v3.32.0 Canal manifest: https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/manifests/canal.yaml
- Calico v3.27.0 Canal manifest, used to verify the original command/container references: https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/canal.yaml
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Calico network policy overview: https://docs.tigera.io/calico/latest/about/kubernetes-training/about-network-policy
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl Kubernetes API datastore configuration: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/kdd
- Flannel project documentation: https://github.com/flannel-io/flannel

## Issues Found
- The installation and upgrade snippets used Calico v3.27.0 or a literal `v3.XX.0` placeholder. Updated the examples to use the currently documented v3.32.0 Canal manifest and a `CALICO_VERSION` variable for upgrades.
- The health check attempted `kubectl exec -l k8s-app=canal -- calicoctl node status`, but the Canal manifest does not deploy a `calicoctl` pod or container, and `kubectl exec` should target a specific pod or workload. Replaced it with a Canal pod lookup and the `calico-node` Felix liveness command used by the manifest.
- The troubleshooting table referenced a `canal` container, but the Canal DaemonSet containers are `calico-node` and `kube-flannel`. Updated the log commands to use those container names.
- The policy troubleshooting command listed only the default namespace. Updated it to `calicoctl get workloadendpoint -A` so it matches the multi-namespace nature of workload policy debugging.
- The version/configuration section assumed `deploy/calicoctl` exists and used `ippool` for Flannel overlay configuration. Replaced those commands with direct Kubernetes CRD/ConfigMap reads and added the `kube-flannel` image check.
- The architecture diagram labeled enforcement as `iptables/nftables`, which was too broad for the Canal manifest being documented. Updated it to `iptables/ipsets`, matching the Felix dataplane used in the manifest.
- The developer test pod command passed `sleep 3600` without `--command`, which can be interpreted as container arguments rather than the command. Added `--command` and changed the BusyBox `wget` timeout flag to the portable `-T 5` form.

## Review Notes
The NetworkPolicy YAML is valid and matches the Kubernetes `networking.k8s.io/v1` API. The post remains a documentation template, so placeholders such as `<your-namespace>` and `<backend-pod>` still need to be replaced before running the examples.
