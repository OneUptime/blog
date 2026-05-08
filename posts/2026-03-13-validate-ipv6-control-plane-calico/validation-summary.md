# Validation Summary: Validate IPv6 Control Plane in Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- Kubernetes
- IPv6
- BGP
- calicoctl
- kubectl
- BIRD
- CoreDNS/Kubernetes DNS

## Sources Consulted
- Calico documentation: Configure dual stack or IPv6 only - https://docs.tigera.io/calico/latest/networking/ipam/ipv6
- Calico documentation: Node resource - https://docs.tigera.io/calico/latest/reference/resources/node
- Calico documentation: BGPPeer resource - https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico documentation: IPPool resource - https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: FelixConfiguration resource - https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: calicoctl node status - https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico documentation: Troubleshooting commands - https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Kubernetes documentation: Validate IPv4/IPv6 dual-stack - https://v1-33.docs.kubernetes.io/docs/tasks/network/validate-dual-stack/
- Kubernetes documentation: IPv4/IPv6 dual-stack - https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes documentation: JSONPath Support - https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes documentation: kubectl run - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes documentation: DNS for Services and Pods - https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/

## Issues Found
- The pod IPv6 extraction command used a Kubernetes JSONPath filter with `contains`, but Kubernetes JSONPath does not document or support a `contains` predicate. Changed it to a documented Go template that prints `.status.podIPs`, then filters for an IPv6 address with `grep ':'`.
- The Calico BIRD check assumed the `kube-system` namespace. Current Calico operator installations use `calico-system`, while manifest installs commonly use `kube-system`. Added a `CALICO_NS` variable defaulting to `calico-system` with an inline note for manifest-based installs.
- The BGPPeer check implied all BGP peering would appear as `BGPPeer` resources. Calico node-to-node mesh peers can be configured without explicit `BGPPeer` resources, so the comment was narrowed to "explicit BGPPeer resources, if used."

## Review Notes
The guide is technically relevant and generally aligned with current Kubernetes and Calico documentation. Some checks are diagnostic heuristics rather than exhaustive validation, especially the `grep`-based YAML inspection and the direct `birdcl6` command, which assumes the BIRD backend is present in the selected Calico node container.
