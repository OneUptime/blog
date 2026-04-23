# Validation Summary: How to Configure RKE2 Networking with Calico - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RKE2
- Kubernetes
- Calico
- Tigera Operator
- CNI
- BGP
- Calico IP pools
- Calico GlobalNetworkPolicy
- HelmChartConfig
- calicoctl

## Sources Consulted
- RKE2 Network Options: https://docs.rke2.io/networking/basic_network_options
- RKE2 Windows and BGP: https://docs.rke2.io/networking/windows_bgp
- RKE2 Helm AddOns and HelmChartConfig: https://docs.rke2.io/add-ons/helm
- RKE2 Configuration Options: https://docs.rke2.io/install/configuration
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- RKE2 Calico chart values: https://github.com/rancher/rke2-charts/blob/main/charts/rke2-calico/rke2-calico/v3.31.500/values.yaml
- RKE2 Calico FelixConfiguration template: https://github.com/rancher/rke2-charts/blob/main/charts/rke2-calico/rke2-calico/v3.31.500/templates/felixconfig.yaml
- RKE2 Calico CRDs: https://github.com/rancher/rke2-charts/tree/main/charts/rke2-calico/rke2-calico-crd/v3.31.500/templates/calico
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico BGP peering documentation: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico BGPConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico BGPPeer resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico eBPF installation documentation: https://docs.tigera.io/calico/latest/operations/ebpf/install
- Calico calicoctl installation documentation: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico troubleshooting commands: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands

## Issues Found
- The verification commands checked `calico-node` in `kube-system`, but RKE2's operator-managed Calico components run in `calico-system`. Updated the pod, DaemonSet, exec, and monitoring commands to use `calico-system`.
- The readiness check used `calico-node --bird-ready`, which is the wrong flag form and is specific to BGP. Changed it to `/bin/calico-node -felix-ready` for a general Calico node readiness check.
- The Calico custom resources used `projectcalico.org/v3`, but RKE2's packaged Calico chart installs Kubernetes CRDs under `crd.projectcalico.org/v1` unless the Calico API server is enabled. Updated the IPPool, BGPConfiguration, BGPPeer, and GlobalNetworkPolicy examples to the CRD API version that works with RKE2's default packaged Calico install.
- The IPPool example used `ipipMode: CrossSubnet` while describing pure BGP routing without overlay encapsulation. Changed it to `ipipMode: Never` with `vxlanMode: Never`.
- The IPPool comment said NAT was disabled while `natOutgoing: true` actually enables masquerading. Changed the example to `natOutgoing: false` for routed BGP pod CIDRs and corrected the explanation.
- The BGP section configured BGP peers without enabling BGP in RKE2's Calico Helm chart. Added the required `HelmChartConfig` values to enable BGP, set encapsulation to `None`, disable NAT for routed pod CIDRs, and define the initial IP pool block size.
- The Calico selector example used `rack == rack1`, but Calico label selector values should be quoted. Updated the commented example to `rack == 'rack1'`.
- The GlobalNetworkPolicy examples lacked ordering and used a default-deny policy that would also affect `kube-system` traffic. Added explicit policy order, excluded `kube-system` from the default deny, and changed namespace selectors to Calico's `projectcalico.org/name` namespace label.
- The DNS egress rule included `destination.nets: []`, which is unnecessary and can make the rule confusing. Removed the empty `nets` field so the rule matches DNS destination ports as intended.
- The HelmChartConfig performance example used an invalid `calico:` values structure and an outdated `bpfEnabled` setting. Replaced it with the current RKE2 Calico chart values under `installation.calicoNetwork` and root-level `felixConfiguration`.
- The eBPF comment stated a generic kernel 5.3+ requirement and omitted RKE2's kube-proxy requirement. Updated the example to reference supported RKE2 releases, a recent supported kernel, and `disable-kube-proxy: true`.
- The MTU example set `mtu: "1480"` under the wrong values path and only described encapsulated networking. Updated it to `mtu: 1500` under `installation.calicoNetwork` with guidance for no encapsulation, IPIP, and VXLAN.
- The calicoctl install command pinned the old `v3.26.0` binary and wrote to `/usr/local/bin` without sudo. Updated it to derive the deployed Calico version from the Tigera Operator Installation status and use `sudo` for the install path.

## Review Notes
RKE2's packaged Calico chart currently disables the Calico API server by default, so direct `kubectl apply` examples should use the installed `crd.projectcalico.org/v1` CRDs unless the operator API server is enabled. For new BGP/native-routing clusters, the Calico HelmChartConfig should be present before first RKE2 startup so the initial IP pool is created with the intended encapsulation and block size behavior.
