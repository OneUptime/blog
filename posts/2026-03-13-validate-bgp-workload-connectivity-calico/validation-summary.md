# Validation Summary: How to Validate BGP to Workload Connectivity in Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- Kubernetes
- BGP
- BIRD
- calicoctl
- iptables
- tcpdump
- nicolaka/netshoot

## Sources Consulted
- Calico IPPool resource documentation: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico outgoing NAT documentation: https://docs.tigera.io/calico/latest/networking/configuring/workloads-outside-cluster
- Calico BGP peering documentation: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico calicoctl get documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- BIRD 2 user guide, command-line client and route inspection: https://bird.nic.cz/doc/bird-2.17.3.html
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- nicolaka/netshoot project documentation: https://github.com/nicolaka/netshoot

## Issues Found
- The post incorrectly implied that `natOutgoing: true` prevents pods from seeing the real external client IP for inbound connections and treated `natOutgoing: false` as universally required. Calico documents `natOutgoing` as masquerading pod-originated traffic to destinations outside Calico IP pools. I corrected the explanation, checklist, and conclusion to describe pod-initiated egress SNAT and matching NAT behavior to the intended routed pod design.
- The BIRD export-route command assumed a protocol name of `BGP_<peer_ip>`, which is not a reliable Calico/BIRD protocol name. I changed the example to list BIRD protocols first, then run `show route export <protocol_name>` against the discovered protocol name, using Calico's BIRD socket path.
- The packet-capture test created a sleeping netshoot pod and then used `curl` against port 80, but no process was listening on that port. I changed the pod command to run a simple netcat-based HTTP responder so the end-to-end curl test can complete while tcpdump captures the flow.

## Review Notes
The guide assumes an operator-style Calico namespace of `calico-system` and a `calico-node` container name. Some deployments use `kube-system` or different manifests, so readers may need to adjust the namespace or container selector for their installation.
