# Validation Summary: How to Configure NodePort Traffic Policies in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico GlobalNetworkPolicy
- Calico host endpoints
- Kubernetes Services and NodePort
- `calicoctl`
- `curl`

## Sources Consulted
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico pre-DNAT policy reference: https://docs.tigera.io/calico/latest/reference/host-endpoints/pre-dnat
- Calico host endpoint reference: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico Kubernetes node host endpoint guide: https://docs.tigera.io/calico/latest/network-policy/hosts/kubernetes-nodes
- Calico forwarded traffic reference: https://docs.tigera.io/calico/latest/reference/host-endpoints/forwarded
- Kubernetes Service documentation for NodePort behavior and default port range: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The policy used `ports: [30000-32767]`, which is not Calico's documented port range syntax. Calico port ranges must be strings in `start:end` format, so this was changed to `ports: ['30000:32767']`.
- The prerequisites did not mention host endpoints. Calico documents `preDNAT` and `applyOnForward` as meaningful for host endpoint policy, so the prerequisite now states that host endpoints must be enabled or created.
- The introduction claimed that any source can reach NodePort or ClusterIP services. ClusterIP services are normally cluster-internal, while NodePort exposes a port on each node. The text was corrected to describe external reachability for exposed NodePort services.
- The verification command tested `http://service-name:8080` from a pod, which verifies service DNS/ClusterIP behavior rather than NodePort pre-DNAT policy. It was changed to test `http://<node-external-ip>:<node-port>` from an allowed or denied source.

## Review Notes
- The `preDNAT: true` and `applyOnForward: true` combination is appropriate for filtering NodePort traffic before kube-proxy DNAT, provided the policy selects the relevant host endpoints.
- The default Kubernetes NodePort range is `30000-32767`, but clusters can customize it with the API server `--service-node-port-range` flag.
