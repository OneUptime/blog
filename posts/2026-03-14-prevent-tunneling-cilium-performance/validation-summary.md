# Validation Summary: Preventing Tunneling Performance Issues in Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- VXLAN
- Geneve
- Native routing
- Prometheus Pushgateway
- iperf3
- netperf
- Flux HelmRelease

## Sources Consulted
- Cilium routing documentation: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium Helm reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium Helm installation documentation: https://docs.cilium.io/en/stable/installation/k8s-install-helm/
- Cilium performance tuning documentation: https://docs.cilium.io/en/stable/operations/performance/tuning/
- Cilium Kubernetes requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements.html
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- RFC 7348, VXLAN: https://www.rfc-editor.org/rfc/rfc7348
- RFC 8926, Geneve: https://www.rfc-editor.org/rfc/rfc8926

## Issues Found
- The introduction claimed a fixed 50-60 byte tunnel overhead. Cilium documents 50 bytes per VXLAN packet, while Geneve has a base header and can vary when options are used. Updated the wording to avoid an inaccurate fixed range.
- The Helm example used `--set tunnel=disabled`, which is deprecated in favor of `routingMode` and `tunnelProtocol`. Removed the deprecated value and kept `routingMode=native`.
- The native-routing example used a hard-coded `ipv4NativeRoutingCIDR` without explaining that it must match the routable cluster network. Replaced it with a `NATIVE_CIDR` variable and a comment to use the routable Pod or VPC CIDR.
- The Helm example set `bpf.hostLegacyRouting=false` without enabling the documented prerequisites for eBPF host routing. Added `bpf.masquerade=true` alongside `kubeProxyReplacement=true`.
- The prerequisites implied that any Kubernetes v1.24+ cluster is appropriate with Cilium v1.14+. Current Cilium releases only support specific Kubernetes minor versions, so the prerequisite now points readers to a Kubernetes version supported by their Cilium release.
- The monitoring CronJob used the `networkstatic/iperf3` image while invoking `jq` and `curl`, which are not guaranteed to be present. Switched to `alpine:3.20` and installed `curl`, `iperf3`, and `jq` in the command.
- The guardrail command checked for `tunnel: disabled`, but current Cilium configuration uses `routing-mode: native` for native routing. Updated the command and expected output.
- The verification command grepped `cilium status --verbose` for fields that are not part of the documented CLI output. Updated it to use `cilium config view` for routing-related keys.
- The MTU troubleshooting note mentioned `ping -M do` without the required payload-size context and did not name the Cilium Helm value. Updated it to use `ping -M do -s <payload-size>` and the `MTU` Helm value.
- The conclusion said BPF host routing minimizes tunneling impact. Cilium documents eBPF host routing as a host/direct-routing optimization, not a tunneling-specific mitigation, so the sentence now refers only to MTU configuration and monitoring when tunneling is required.

## Review Notes
- The Flux HelmRelease example is structurally plausible, but a real deployment still needs a matching HelmRepository and ConfigMap containing chart values.
- The performance thresholds in the examples are environment-specific and should be calibrated per cluster, NIC, instance type, kernel, and traffic profile.
