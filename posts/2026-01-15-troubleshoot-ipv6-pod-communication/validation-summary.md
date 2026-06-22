# Validation Summary: How to Troubleshoot IPv6 Pod-to-Pod Communication Issues

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Kubernetes IPv4/IPv6 dual-stack networking
- Kubernetes Services, EndpointSlices, and NetworkPolicy
- kubectl debugging commands
- CoreDNS
- CNI plugins including Calico, Cilium, Flannel, Weave Net, Canal, and kube-router
- Linux IPv6 sysctls, routing, ip6tables, tcpdump, crictl, nsenter, and Hubble
- Prometheus Operator PrometheusRule resources

## Sources Consulted
- Kubernetes IPv4/IPv6 dual-stack documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes dual-stack validation task: https://kubernetes.io/docs/tasks/network/validate-dual-stack/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes EndpointSlice documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes kubectl node debugging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes crictl debugging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/crictl/
- Calico IPPool resource documentation: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico FelixConfiguration documentation: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico dual-stack / IPv6 IPAM documentation: https://docs.tigera.io/calico/latest/networking/ipam/ipv6
- Cilium Kubernetes configuration documentation: https://docs.cilium.io/en/stable/network/kubernetes/configuration/
- Cilium agent command reference: https://docs.cilium.io/en/latest/cmdref/cilium-agent/
- Cilium Hubble documentation: https://docs.cilium.io/en/stable/observability/hubble/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Flannel configuration documentation: https://github.com/flannel-io/flannel/blob/master/Documentation/configuration.md
- kube-router IPv6 / dual-stack support documentation: https://kube-router.io/docs/ipv6/

## Issues Found
- The CNI compatibility table overstated or oversimplified support for Flannel, Weave Net, Canal, and kube-router. Updated the table to reflect backend/version constraints and to avoid claiming universal full support.
- The CNI config inspection command read `/etc/cni/net.d` from the local machine instead of a Kubernetes node. Changed it to use `kubectl debug node/...` and read the host-mounted CNI config path.
- The routing troubleshooting section suggested manually adding a default route inside a pod. Replaced that with a CNI-focused diagnostic command because manual pod route changes require extra privileges and are not persistent.
- The NetworkPolicy examples implied `ipBlock` was the preferred mechanism for pod-to-pod traffic. Updated the text and YAML to prefer pod/namespace selectors for pod traffic and reserve `ipBlock` examples for external CIDRs.
- The dual-stack Service patch example did not mention that an existing Service's primary IP family is immutable. Added that caveat.
- The Hubble examples used an `--ip-version ipv6` flag that is not part of the documented Hubble CLI examples. Replaced it with documented `hubble observe` usage plus IPv6 address filtering.
- The debug script piped Kubernetes jsonpath output that is not valid JSON into `jq`. Changed it to fetch full JSON and query `.status.podIPs`.
- The debug script used `kubectl debug -it` in a non-interactive pipeline. Removed the interactive flags for that scripted check.
- The network namespace example passed a Kubernetes Pod UID directly to `crictl ps --pod`, which expects a CRI pod sandbox ID. Updated it to resolve the sandbox ID first.
- The CronJob heredoc example was missing the terminating `EOF`. Added it so the command is syntactically complete.

## Review Notes
- Several examples are necessarily CNI- and environment-dependent, especially Calico encapsulation, Cilium configuration, Hubble availability, firewall behavior, and node debug permissions. The post now calls out more of those constraints, but operators should still verify exact behavior against their installed Kubernetes and CNI versions.
