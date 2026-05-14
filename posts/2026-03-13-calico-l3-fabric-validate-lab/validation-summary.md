# Validation Summary: How to Validate L3 Interconnect Fabric with Calico in a Lab Cluster

## Status
validated

## Post Type
Tutorial / technical validation guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- BGP
- BIRD / birdcl
- calicoctl
- Linux routing table
- tcpdump
- iptables

## Sources Consulted
- Calico BGP configuration resource documentation: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico IPPool resource documentation: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico BGP peering documentation: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico component architecture documentation: https://docs.tigera.io/calico/latest/reference/architecture/overview
- Calico data path documentation: https://docs.tigera.io/calico/latest/reference/architecture/data-path
- Calico troubleshooting commands documentation: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico Felix configuration documentation for ProgramClusterRoutes: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- BIRD user guide command reference: https://bird.nic.cz/doc/bird-3.2.0.html

## Issues Found
- `kubectl exec -l k8s-app=calico-node` was not valid for current `kubectl exec` usage. I changed the examples to first select a Calico node pod with `kubectl get pod -l ... --field-selector spec.nodeName=worker-1`, then pass the pod name to `kubectl exec`.
- The post said Felix programs learned BGP routes into the Linux routing table. Calico documentation distinguishes Felix local endpoint route programming from BIRD/confd handling of cluster routes when `ProgramClusterRoutes` is disabled. I changed the wording to say learned routes are present in the Linux routing table, and specifically that BIRD pushes learned BGP routes into the node routing table.
- `ip route show $POD_IP` may not show a matching aggregate route when the pod IP is covered by a broader Calico IPAM block CIDR. I changed those checks to `ip route get $POD_IP`, which performs a destination route lookup.
- The `kubectl run pod-a ... -- sleep 3600` example passed `sleep 3600` as container arguments rather than as the container command. I added `--command -- sleep 3600`.
- The no-encapsulation test attempted traffic before confirming both test pods were ready. I added `kubectl wait` commands for both pods.
- The convergence test measured `kubectl run` API creation time and implied each new pod creates a new BGP route. Calico commonly advertises IPAM block routes. I changed the text to measure route usability and added a note that a new pod may use an already-converged block route.

## Review Notes
The examples assume an operator-style Calico namespace of `calico-system` and a `k8s-app=calico-node` label. Some installations use different namespaces or labels, so future improvements could mention adapting those values to the local Calico install.
