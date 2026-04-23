# Validation Summary: How to Configure RKE Networking

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- RKE1
- Kubernetes
- Rancher
- CNI networking
- Canal
- Flannel
- Calico
- Weave
- Kubernetes NetworkPolicy
- kubectl

## Sources Consulted
- RKE1 Network Plug-ins: https://rke.docs.rancher.com/config-options/add-ons/network-plugins
- RKE1 Default Kubernetes Services: https://rke.docs.rancher.com/config-options/services
- RKE1 Nodes configuration: https://rke.docs.rancher.com/config-options/nodes
- RKE1 Example cluster.yml files: https://rke.docs.rancher.com/example-yamls
- Rancher CNI provider FAQ: https://ranchermanager.docs.rancher.com/v2.11/faq/container-network-interface-providers
- RKE source for network options and validation: https://github.com/rancher/rke/blob/release/v1.8/cluster/network.go
- RKE source for network validation: https://github.com/rancher/rke/blob/release/v1.8/cluster/validation.go
- RKE source for cluster config types: https://github.com/rancher/rke/blob/release/v1.8/types/rke_types.go
- RKE metadata templates for bundled CNI manifests: https://github.com/rancher/rke/blob/release/v1.8/data/data.json
- Flannel backend documentation: https://github.com/flannel-io/flannel/blob/master/Documentation/backends.md
- Calico BGPPeer resource documentation: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kube-controller-manager flags: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager
- kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- Added an RKE1 end-of-life caveat. RKE/RKE1 reached end of life on July 31, 2025, so the post now scopes the guidance to maintaining existing RKE1 clusters and points new deployments toward RKE2.
- Qualified Weave support. RKE source and docs show Weave is deprecated for Kubernetes v1.27+ and removed for v1.30+, so the supported plugins table now reflects that.
- Removed unsupported RKE network options. `canal_default_local_action_allow`, `flannel_backend_vxlan_mtu`, `calico_backend`, `calico_mtu`, and `calico_node_selector` are not valid RKE1 cluster.yml options. The examples now use supported RKE fields, including top-level `network.mtu` for Canal/Calico.
- Fixed service CIDR examples. RKE requires `service_cluster_ip_range` to match on both `kube-controller` and `kube-api` when it is set, so the snippets now configure both services.
- Corrected the Calico CIDR example. The post labeled `192.168.0.0/16` as the Calico default, but RKE defaults the pod CIDR to `10.42.0.0/16`; the snippet now uses the RKE default.
- Replaced the invalid Calico BGP cluster.yml options with a Calico `BGPPeer` resource example. RKE's bundled Calico uses BIRD, and BGP peering is configured through Calico resources after deployment.
- Fixed the node CIDR mask example. `node_cidr_mask_size` is not a direct RKE `kube-controller` field, so the post now sets the Kubernetes controller-manager flag through `services.kube-controller.extra_args.node-cidr-mask-size`.
- Corrected the per-node networking example. RKE node `labels` do not override the pod network interface, so the example now uses `internal_address` for per-node inter-host component traffic and keeps `canal_iface` as the plugin-level interface setting.
- Made the verification commands more reliable. `kubectl run` now uses `--command -- sleep 3600`, and the workflow waits for both pods to become Ready before reading the second pod IP.

## Review Notes
No live RKE cluster was available for end-to-end execution, so the review validated syntax and behavior against official documentation and RKE source code.
