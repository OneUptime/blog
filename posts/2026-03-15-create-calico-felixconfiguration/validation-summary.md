# Validation Summary: How to Create the Calico FelixConfiguration Resource

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico FelixConfiguration
- Calico Felix data plane agent
- Kubernetes
- calicoctl
- kubectl
- iptables
- Calico eBPF data plane
- Prometheus metrics

## Sources Consulted
- Calico Open Source documentation: FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Open Source documentation: Configuring Felix: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico Open Source documentation: Failsafe rules: https://docs.tigera.io/calico/latest/reference/host-endpoints/failsafe
- Calico Open Source documentation: Enabling the eBPF data plane: https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico Open Source documentation: Install in eBPF mode: https://docs.tigera.io/calico/latest/operations/ebpf/install
- Calico Open Source documentation: calicoctl apply command: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Project Calico v3.32.0 FelixConfiguration CRD schema: https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/libcalico-go/config/crd/crd.projectcalico.org_felixconfigurations.yaml

## Issues Found
- The default FelixConfiguration example replaced Calico's documented failsafe defaults with a smaller and partly different set of ports. Updated the inbound and outbound failsafe port lists to match the documented defaults so the example does not accidentally remove access to DHCP, etcd, or the Kubernetes API server.
- The eBPF section implied that applying `bpfEnabled: true` is the general enablement method. Updated the wording to scope this to manifest-based installations, matching current Calico guidance that operator-managed installations should use the Installation resource.
- The eBPF example did not account for Calico's current guidance that IPIP is not supported in eBPF mode and VXLAN is the recommended overlay. Added `ipipEnabled: false` and `vxlanEnabled: true` to the eBPF FelixConfiguration snippet.
- The troubleshooting section stated that BPF mode requires Linux kernel 5.3 or later. Updated this to the current Calico requirement: Linux kernel 5.10 or later, with a Red Hat-derived distribution exception for Red Hat 8.4 kernel 4.18.0-305 or later due to backported features.

## Review Notes
The `kubectl` examples assume Calico node pods run in `kube-system`, which is common for manifest-based installs. Operator-based installs commonly use `calico-system`, so readers may need to adjust the namespace for their installation method.
