# Validation Summary: How to Configure Service Handling in Calico eBPF Mode

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico eBPF data plane
- Kubernetes Services
- kube-proxy replacement
- Direct Server Return
- kubectl

## Sources Consulted
- Calico documentation: About Calico eBPF - https://docs.tigera.io/calico/latest/about/kubernetes-training/about-ebpf
- Calico documentation: Enabling the eBPF data plane - https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico documentation: Troubleshoot eBPF mode - https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico documentation: Add Maglev load balancing to a service - https://docs.tigera.io/calico/latest/networking/configuring/add-maglev-load-balancing
- Calico documentation: Felix configuration - https://docs.tigera.io/calico/latest/reference/felix/configuration
- Kubernetes documentation: Service - https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes documentation: kubectl exec reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The post incorrectly stated that Calico eBPF handles ExternalName services with BPF programs and maps. Kubernetes ExternalName services are DNS CNAME mappings and do not configure service proxying. I changed the introduction to limit Calico eBPF service handling to proxied service traffic and explicitly note that ExternalName is DNS-only.
- The BPF NAT dump command used the non-current dashed form `calico-node -bpf-nat-dump`. Calico documentation shows `calico-node -bpf nat dump`, so I updated the command.
- The service affinity verification command used `calico-node -bpf-affinity-dump`, which is not shown in current Calico eBPF troubleshooting commands. I replaced it with a documented NAT table dump filtered by the service ClusterIP and adjusted the comment so it does not claim to dump an affinity map directly.
- The DSR explanation said return traffic bypasses the load balancer node. Calico documents DSR as allowing the remote node to return traffic directly, bypassing the ingress node, with underlying network requirements. I updated the wording and diagram label.
- The conclusion claimed O(1) routing for all Kubernetes service types. I changed this to a more supportable statement about efficient routing for Kubernetes service traffic and clarified that BPF map capacity must cover service frontends and backends.

## Review Notes
kubectl is not installed in this workspace, so local CLI help could not be run. kubectl command syntax was checked against the official Kubernetes generated reference instead. The examples still assume the reader has a running cluster with a `calico-node` DaemonSet in `calico-system` and test services named `my-service` and `my-nodeport`.
