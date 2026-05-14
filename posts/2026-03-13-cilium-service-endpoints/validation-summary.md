# Validation Summary: Service Endpoints in Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes Services
- Kubernetes EndpointSlices
- eBPF load balancing
- kube-proxy replacement
- Cilium CLI and cilium-dbg

## Sources Consulted
- Cilium Kubernetes introduction: https://docs.cilium.io/en/stable/network/kubernetes/intro/
- Cilium kube-proxy replacement documentation: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium command reference for `cilium-dbg service list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_service_list/
- Cilium command reference for `cilium-dbg bpf lb list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_lb_list/
- Cilium command reference for `cilium-dbg endpoint list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium command reference for `cilium-dbg endpoint get`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_get/
- Cilium command reference for `cilium-dbg endpoint health`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_health/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Topology Aware Routing documentation: https://kubernetes.io/docs/concepts/services-networking/topology-aware-routing/

## Issues Found
- The post used the Kubernetes-facing `cilium` CLI for agent-local service, endpoint, and BPF map inspection commands. Current Cilium documentation exposes these commands through `cilium-dbg` inside a Cilium agent pod, so the examples were updated to use `kubectl exec -n kube-system ds/cilium -- cilium-dbg ...`.
- The BPF load-balancer flags were written as `--frontend` and `--backend`. Cilium documents the plural flags `--frontends` and `--backends`, so those commands were corrected.
- The post referenced `cilium service get <service-id>`, but current Cilium command documentation lists `service list` rather than a `service get` subcommand. The example was changed to filter `cilium-dbg service list` output for a specific ClusterIP or port.
- The topology-aware routing section described local endpoint preference. Kubernetes Topology Aware Routing and Cilium's implementation use EndpointSlice hints to prefer same-zone endpoints, so the wording was corrected and the Cilium `loadBalancer.serviceTopology=true` prerequisite was added.
- The architecture diagram showed the Cilium Operator updating eBPF LB maps. Cilium agents watch Kubernetes service and endpoint changes and update node-local eBPF maps, so the diagram was corrected.
- The architecture diagram described service handling only as a `connect()` syscall hook and backend selection as round-robin. Cilium service translation can happen through socket or packet-path hooks, and the documented load-balancing algorithms include random and Maglev, so the diagram was generalized.
- The introduction overclaimed that Cilium replaces connection tracking and provides session affinity without conntrack tables. The wording was adjusted to describe Cilium's eBPF load-balancer state more accurately.

## Review Notes
The Kubernetes Service YAML examples for `sessionAffinity: ClientIP` and `service.kubernetes.io/topology-mode: auto` are valid. Cilium's per-service load-balancing algorithm annotation is available behind `bpf.lbAlgorithmAnnotation=true` and only applies at service creation time; that caveat could be useful in a deeper future article but was not necessary for this guide.
