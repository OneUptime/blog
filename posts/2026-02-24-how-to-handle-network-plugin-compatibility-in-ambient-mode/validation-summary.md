# Validation Summary: How to Handle Network Plugin Compatibility in Ambient Mode

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio ambient mode
- Istio CNI
- ztunnel
- Kubernetes CNI
- Calico
- Cilium
- Flannel
- Antrea
- iptables
- eBPF

## Sources Consulted
- Istio ambient ztunnel traffic redirection documentation: https://istio.io/latest/docs/ambient/architecture/traffic-redirection/
- Istio CNI node agent documentation: https://istio.io/latest/docs/setup/additional-setup/cni/
- Istio ambient platform-specific prerequisites and Cilium notes: https://istio.io/latest/docs/ambient/install/platform-prerequisites/
- Istio ambient install with Helm documentation: https://istio.io/latest/docs/ambient/install/helm/
- Istio ambient install with istioctl documentation: https://istio.io/latest/docs/ambient/install/istioctl/
- Cilium integration with Istio documentation: https://docs.cilium.io/en/stable/network/servicemesh/istio/
- Calico Felix configuration documentation: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico Istio ambient mode documentation: https://docs.tigera.io/calico/latest/operations/istio/about-istio-ambient
- Antrea NoEncap and Hybrid modes documentation: https://antrea.io/docs/main/docs/noencap-hybrid-modes/

## Issues Found
- The post described ambient redirection as using "iptables or eBPF" in the active implementation. Current Istio ambient documentation describes in-pod redirection rules installed by `istio-cni`, with Istio-specific iptables/netfilter examples. Updated the wording to avoid implying eBPF redirection is the current default.
- The Calico eBPF example claimed to disable eBPF while setting `bpfEnabled: true` and `bpfExternalServiceMode: DSR`. Updated the example to `bpfEnabled: false`, which is the documented FelixConfiguration field for disabling the BPF dataplane in manifest-based installs.
- The Calico workaround incorrectly implied the dataplane can be changed per namespace. Updated it to describe using Calico's standard Linux dataplane at the cluster level.
- The Cilium configuration used deprecated/invalid `kubeProxyReplacement: partial` guidance and omitted `cni.exclusive: false`. Updated it to the documented Cilium Istio integration options: use `kubeProxyReplacement: false` with kube-proxy present, or use `kubeProxyReplacement: true`, `socketLB.hostNamespaceOnly: true`, and `cni.exclusive: false` when kube-proxy is removed.
- The Flannel section used an unsupported `ZTUNNEL_OUTBOUND_MTU` environment variable. Replaced it with a Flannel MTU configuration example and clarified that MTU should be handled at the pod network/CNI layer.
- The Antrea snippet used a non-documented `AntreaAgentConfiguration` CRD shape and set `noSNAT` with `trafficEncapMode: encap`. Replaced it with the documented `antrea-config` ConfigMap format and clarified that `noSNAT` applies to Antrea `noEncap` mode external traffic, not the default `encap` mode.
- The debugging examples checked node-level iptables and used a fragile `nsenter`/`pgrep` pattern. Updated them to inspect the ambient workload pod network namespace using `kubectl debug` with the `netadmin` profile, matching Istio's troubleshooting flow.
- The ztunnel `tcpdump` example assumed tcpdump was present inside the ztunnel container. Updated it to attach a netshoot debug container to the ztunnel pod.

## Review Notes
The post remains a practical compatibility guide rather than a complete installation reference. CNI behavior is version- and platform-sensitive, especially for Cilium kube-proxy replacement and Calico operator-managed eBPF installs, so future updates should continue to check the current vendor compatibility notes before recommending specific Helm values or Felix settings.
