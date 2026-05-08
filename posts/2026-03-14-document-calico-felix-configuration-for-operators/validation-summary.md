# Validation Summary: Documenting Calico Felix Configuration for Kubernetes Operators

## Status
validated

## Post Type
Reference guide

## Technologies Covered
- Calico Felix
- Kubernetes
- Calico FelixConfiguration custom resources
- Calico IPIP, VXLAN, and eBPF dataplanes
- kubectl and calicoctl
- Prometheus metrics

## Sources Consulted
- Calico Open Source FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Open Source Configuring Felix reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico Open Source eBPF installation guide: https://docs.tigera.io/calico/latest/operations/ebpf/install
- Calico Open Source eBPF enablement guide: https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico Open Source IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico Open Source overlay networking guide: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico Open Source calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/

## Issues Found
- Node-specific FelixConfiguration names were described as matching node hostnames directly. Updated the text and YAML example to use the documented `node.<nodename>` naming convention.
- The eBPF dataplane kernel requirement was outdated. Updated the requirement to Linux kernel 5.10+ or a supported RHEL kernel with required backports, and noted the operator-managed `Installation` setting for BPF mode.
- The post implied `ipipEnabled` and `vxlanEnabled` are the main encapsulation controls. Clarified that these are Felix tunnel-device overrides and that Kubernetes deployments usually configure encapsulation through IP pools or the operator Installation resource.
- The invalid FelixConfiguration field `reportingInterval` was replaced with the valid `usageReportingInterval` field.
- The high-CPU troubleshooting note referenced `reportingInterval`; updated it to reference Felix refresh intervals such as `iptablesRefreshInterval` and `ipsetsRefreshInterval`.
- The failsafe-port recommendation said to always include SSH and kubelet. Revised this to recommend only environment-required ports, since Calico defaults and production requirements vary.
- The `kubectl auth can-i` example mixed `--list` with a specific verb/resource check and claimed to show who has permissions. Replaced it with valid current-user authorization checks.

## Review Notes
The post uses `calico-system` in Kubernetes commands, which is appropriate for operator-managed Calico installs. Manifest-based installs may use a different namespace such as `kube-system`, so operators should adjust commands to match their deployment.
