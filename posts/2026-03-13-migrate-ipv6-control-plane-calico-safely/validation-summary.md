# Validation Summary: Migrate IPv6 Control Plane in Calico Safely

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Kubernetes IPv4/IPv6 dual-stack networking
- FelixConfiguration
- Typha
- Calico BGPConfiguration and BGPPeer
- kubectl and calicoctl

## Sources Consulted
- Calico: Configure Kubernetes control plane to operate over IPv6: https://docs.tigera.io/calico/latest/networking/ipam/ipv6-control-plane
- Calico: Configure dual stack or IPv6 only: https://docs.tigera.io/calico/latest/networking/ipam/ipv6
- Calico: Configuring Typha: https://docs.tigera.io/calico/latest/reference/typha/configuration
- Calico: FelixConfiguration resource: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico: BGPConfiguration resource: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico: BGPPeer resource: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Kubernetes: IPv4/IPv6 dual-stack: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes: Validate IPv4/IPv6 dual-stack: https://kubernetes.io/docs/tasks/network/validate-dual-stack/
- Kubernetes: kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The prerequisite listed Kubernetes v1.21+ even though Kubernetes dual-stack is GA and officially validated from v1.23. Updated the prerequisite to v1.23+.
- The API server validation command used the legacy Endpoints resource. Updated it to inspect EndpointSlices for the `kubernetes` service.
- The Typha ConfigMap example used `typha_endpoint`, which is not a documented Typha configuration key. Replaced it with a `kubectl set env` command using `TYPHA_SERVERHOST` and `TYPHA_SERVERPORT`.
- The FelixConfiguration example included `ipv6Enabled`, which is not a valid FelixConfiguration field. Removed it and added the documented `calico-node` environment variables `IP6=autodetect` and `FELIX_IPV6SUPPORT=true`.
- The BGPConfiguration example used `nodeMeshEnabled`, which is not a valid field. Replaced it with `nodeToNodeMeshEnabled`.
- The BGP section described `serviceClusterIPs` as enabling IPv6 BGP sessions. Clarified that it advertises the IPv6 Service CIDR over BGP.
- The pod connectivity test assumed IPv6 would always be at `.status.podIPs[1]`. Updated it to select the IPv6 address by matching addresses containing `:`.
- Added `--restart=Never` to the test pod creation commands so they produce standalone test pods.

## Review Notes
The Typha command uses a `CALICO_NAMESPACE` variable because manifest installations may use `kube-system` while operator installations commonly use `calico-system`. Calico documentation notes that Typha configuration cannot be modified through the operator-managed installation API, so operator-managed clusters should validate how local changes are reconciled before relying on a direct Deployment edit.
