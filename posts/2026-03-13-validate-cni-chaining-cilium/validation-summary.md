# Validation Summary: Validate CNI Chaining with Cilium

## Status
validated

## Post Type
Tutorial / validation guide

## Technologies Covered
- Cilium
- Kubernetes
- CNI chaining
- Kubernetes NetworkPolicy
- AWS VPC CNI
- Azure CNI
- Flannel
- eBPF

## Sources Consulted
- Cilium CNI Chaining documentation: https://docs.cilium.io/en/stable/installation/cni-chaining.html
- Cilium AWS VPC CNI chaining documentation: https://docs.cilium.io/en/stable/installation/cni-chaining-aws-cni/
- Cilium Azure CNI legacy chaining documentation: https://docs.cilium.io/en/stable/installation/cni-chaining-azure-cni.html
- Cilium Generic Veth Chaining documentation: https://docs.cilium.io/en/stable/installation/cni-chaining-generic-veth.html
- Cilium Portmap chaining documentation: https://docs.cilium.io/en/stable/installation/cni-chaining-portmap.html
- Cilium command reference for cilium-dbg endpoint list: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/latest/network/kubernetes/ciliumendpoint.html
- Cilium command reference for cilium-dbg monitor: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor.html
- Cilium Multi-Pool IPAM documentation: https://docs.cilium.io/en/stable/network/kubernetes/ipam-multi-pool/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The CNI config inspection command ran `ls /host/etc/cni/net.d/` outside the Cilium pod if the `cat` failed, where `/host` would not exist on the local workstation. Changed it to run all inspection commands inside the selected Cilium pod and to inspect both `.conflist` and `.conf` files.
- The supported chaining mode list included `azure-vnet` and `flannel` as Cilium chaining modes. Current Cilium docs use `generic-veth` for Azure CNI legacy and other veth-based primary CNIs, while `portmap` is specifically for HostPort support. Updated the list accordingly.
- The IPAM validation text implied that `delegated-plugin` or `cluster-pool` should be expected in chaining mode. Cilium's chaining docs state that the primary CNI manages base connectivity and IP allocation, while Cilium's IPAM modes are version and deployment specific. Reworded the check to avoid recommending live IPAM changes.
- The endpoint registration claim said all non-hostNetwork pods should have Cilium endpoints. Cilium docs note that pods already running before chaining is installed must be restarted before policy enforcement applies. Updated the wording to cover new or restarted pods.
- The post used `cilium policy get`, which is not the current documented command for endpoint policy introspection. Replaced it with `kubectl get networkpolicy` for Kubernetes object validation and `cilium-dbg endpoint list` inside a Cilium pod for agent-side inspection.
- The post checked `ciliumippools`, which is not the documented Cilium multi-pool resource name. Updated it to `ciliumpodippools` / `CiliumPodIPPools`.
- The best practices referenced `cilium monitor`; current Cilium command reference documents `cilium-dbg monitor`. Updated the command name.
- The best practices cited BPF NodePort as the example feature limitation. Current chaining docs specifically call out Layer 7 Policy and IPsec transparent encryption limitations, so the example was updated to match documented caveats.

## Review Notes
The NetworkPolicy manifest uses the current `networking.k8s.io/v1` API and is syntactically valid, but the guide still assumes the reader has suitable test pods with matching `role=server` and `role=client` labels. A future improvement could add explicit client/server pod manifests and positive/negative connectivity tests.
