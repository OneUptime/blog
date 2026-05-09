# Validation Summary: How to Test Network Policies with Calico on Bare Metal with Binaries

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes NetworkPolicy
- kubectl
- Calico
- calicoctl
- Felix
- iptables
- Calico eBPF dataplane
- Bare metal Kubernetes

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes Service expose tutorial/reference examples: https://kubernetes.io/docs/tutorials/kubernetes-basics/expose/expose-intro/
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico WorkloadEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico Kubernetes and Calico network policy overview: https://docs.tigera.io/calico/latest/about/about-network-policy
- Calico eBPF troubleshooting documentation: https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico system requirements, including iptables/eBPF requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements

## Issues Found
- The iptables inspection commands used literal chain names derived from the namespace (`cali-pi-_bm-policy-test` and `cali-po-_bm-policy-test`). Calico-generated iptables chains are not stable namespace-derived names, so those commands would commonly fail. I changed the commands to inspect `iptables-save` output and grep for Calico chains and policy identifiers, with a note to follow the generated `cali-` chain jumps and comments.
- The post said it covered both iptables and eBPF scenarios, but the steps only covered iptables. I changed the introduction to say the guide focuses on iptables and notes the eBPF check, then added the correct high-level eBPF inspection direction using `calico-node -bpf`.
- The verification step used `calicoctl get networkpolicy` after applying Kubernetes `networking.k8s.io/v1` NetworkPolicy resources with `kubectl`. `calicoctl get networkpolicy` is for Calico policy resources, so I changed the policy verification command to `kubectl get networkpolicy -n bm-policy-test -o wide` and kept `calicoctl get workloadendpoint` for Calico workload endpoint inspection.
- The conclusion claimed host iptables inspection provided a level of verification not available in fully containerized environments. That is too broad because Calico still programs host dataplane state in common containerized deployments. I changed it to the narrower, accurate claim that reading Felix dataplane state helps diagnose policy issues.

## Review Notes
The Kubernetes NetworkPolicy manifests are valid for `networking.k8s.io/v1`, and the ingress default-deny plus selective allow behavior matches the Kubernetes additive policy model. The workload commands are syntactically consistent with current `kubectl run`, `kubectl expose`, and `kubectl exec` usage. Future improvements could include adding cleanup commands and making DNS/service-name caveats explicit for clusters with unusual DNS or eBPF service handling, but those are not correctness blockers for this post.
