# Validation Summary: How to Configure Istio for eBPF-Based Data Plane

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Istio CNI
- Istio ambient mesh
- ztunnel
- Cilium
- eBPF
- Kubernetes
- Helm
- Fortio
- Prometheus ServiceMonitor

## Sources Consulted
- Istio documentation: Install the Istio CNI node agent - https://istio.io/latest/docs/setup/additional-setup/cni/
- Istio documentation: Ztunnel traffic redirection - https://istio.io/latest/docs/ambient/architecture/traffic-redirection/
- Istio documentation: Ambient install with Helm - https://istio.io/latest/docs/ambient/install/helm/
- Istio blog: Using eBPF for traffic redirection in Istio ambient mode - https://istio.io/latest/blog/2023/ambient-ebpf-redirection/
- Istio blog: Maturing Istio Ambient traffic redirection - https://istio.io/latest/blog/2024/inpod-traffic-redirection-ambient/
- Cilium documentation: Integration with Istio - https://docs.cilium.io/en/latest/network/servicemesh/istio/
- Cilium documentation: Helm values - https://docs.cilium.io/en/stable/helm-values/
- Cilium documentation: Kubernetes without kube-proxy - https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium documentation: System requirements - https://docs.cilium.io/en/latest/operations/system_requirements.html
- Cilium documentation: Monitoring and metrics - https://docs.cilium.io/en/stable/observability/metrics/
- Fortio GitHub project and command usage - https://github.com/fortio/fortio

## Issues Found
- The post claimed Istio CNI can currently use eBPF instead of iptables for sidecar traffic interception. Current Istio documentation states Istio CNI configures iptables for sidecar redirection, so the section was corrected to describe the supported Istio CNI behavior.
- The ambient mesh eBPF redirection guidance was based on historical Istio ambient documentation. Istio now documents in-pod redirection and marks the old eBPF ambient redirection approach as no longer needed, so the ambient section was updated.
- The Cilium integration section incorrectly said Cilium redirects traffic to Envoy and replaces Istio iptables interception. Cilium documentation says the goal is to avoid disrupting Istio proxying, so the Cilium configuration was changed to use `cni.exclusive=false`, preserve Istio redirection, and add `socketLB.hostNamespaceOnly=true` when using kube-proxy replacement.
- The IstioOperator snippet used `meshConfig.defaultConfig.interceptionMode: NONE`, which would disable normal Istio traffic interception rather than configure Cilium integration. It was replaced with a normal Istio CNI-enabled installation example.
- Verification commands checked for Istio eBPF programs in ztunnel. These were replaced with separate checks for Istio iptables redirection and Cilium status/BPF maps.
- The Fortio deployment URL returned 404. The load test setup now starts a temporary Fortio pod with the official Fortio container image.
- The post gave fixed latency improvement numbers for eBPF. These were changed to workload-dependent expectations because official docs do not support those exact generic latency claims.
- Kernel requirements were inaccurate. They were updated to Cilium's current kernel requirement of Linux 5.10+ or a distribution-supported equivalent.
- Cilium tuning keys were corrected to use Istio-compatible settings, including `bpf-lb-sock-hostns-only` and keeping BPF masquerading disabled for ambient compatibility.
- Cilium CLI commands were updated from `cilium` subcommands to current `cilium-dbg` commands documented by Cilium.
- The ServiceMonitor example was replaced with Cilium Helm values that enable Prometheus metrics and chart-managed ServiceMonitor resources.

## Review Notes
The post is now technically valid as a guide for running Istio with an eBPF-based primary CNI data plane, especially Cilium. It should not be interpreted as a guide for replacing Istio's supported traffic capture with eBPF.
