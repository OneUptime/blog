# Validation Summary: How to Install Calico CNI with a Custom IPv4 Pod CIDR

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico CNI
- Kubernetes
- kubeadm
- calicoctl
- IPv4 pod networking
- Kubernetes custom resources

## Sources Consulted
- Calico Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico installation customization options: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/config-options
- Calico IP pool configuration and operator-managed pools: https://docs.tigera.io/calico/latest/networking/ipam/ippools
- Calico IP pool migration guidance: https://docs.tigera.io/calico/latest/networking/ipam/migrate-pools
- Calico IP pool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico IPAM block size guidance: https://docs.tigera.io/calico/latest/networking/ipam/change-block-size
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl IPAM reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Calico datastore / calicoctl installation guidance: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/the-calico-datastore
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubeadm cluster creation guidance: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/
- Kubernetes kube-controller-manager flags: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager
- Calico v3.27.0 manifest: https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico.yaml
- Calico v3.27.0 operator manifest: https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml

## Issues Found
- The introduction stated that Calico defaults to `192.168.0.0/16` for pod IPs in general. I changed this to clarify that this default applies to the manifest-based install path, because operator-managed installs handle default pools differently.
- The verification example implied a single expected encapsulation result for both install methods. I updated it to state that the pool CIDR should match, while `ipipMode` and `vxlanMode` depend on whether the reader used the operator example or the `calico.yaml` manifest example.
- The "Modifying an Existing IP Pool" section incorrectly suggested editing an existing pool CIDR in place and reapplying it. I replaced that guidance with the documented migration pattern: operator installs should be updated via the `Installation` resource, and manifest installs should add a new pool and disable the old one.
- The test pod command used `kubectl run ... -- sleep 3600` with the `alpine` image. I corrected it to `--command -- sleep 3600`, because otherwise the arguments are passed to the image's default entrypoint rather than replacing it.
- The post used `calicoctl get ipamblock`, which is not a valid `calicoctl get` resource. I replaced it with `calicoctl ipam show --show-blocks`, which is the documented way to inspect block allocations.
- The system status section only used the `calico-system` namespace for the `calico-node` rollout check. I updated it to show the correct namespace split between operator installs (`calico-system`) and manifest installs (`kube-system`).
- The closing note on `blockSize` implied it could be adjusted generally after installation. I changed it to say it should be set when the pool is created, because the field is create-time only.

## Review Notes
The post is now technically correct for the pinned Calico `v3.27.0` examples it uses. It intentionally mixes two install methods, so readers still need to follow the namespace and encapsulation expectations that match the specific method they chose. Newer Calico releases exist, so version-pinned manifests and binaries should be rechecked before production use.
