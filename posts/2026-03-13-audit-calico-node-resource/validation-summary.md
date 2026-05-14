# Validation Summary: Audit Calico Node Resources

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Node resources
- Calico BGP configuration
- Calico tunnel addressing
- Kubernetes Nodes
- `calicoctl`
- `kubectl`
- Bash and Python audit scripts

## Sources Consulted
- Calico Node resource reference: https://docs.tigera.io/calico/latest/reference/resources/node
- Calico IP autodetection documentation: https://docs.tigera.io/calico/latest/networking/ipam/ip-autodetection
- Calico BGP peering documentation: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico node decommissioning documentation: https://docs.tigera.io/calico/latest/operations/decommissioning-a-node
- Calico `calicoctl get` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico `calicoctl delete` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/delete
- Kubernetes JSONPath reference: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The tunnel IP conflict script looked for `ipv4IPIPTunnelAddr` directly under `spec`, but Calico documents this field under `spec.bgp`. Updated the script to read `spec.ipv4VXLANTunnelAddr` and `spec.bgp.ipv4IPIPTunnelAddr` from their documented locations.
- The orphaned-node script used a regular-expression `grep` match for node names. Updated it to `grep -Fxq -- "$calico_node"` so node names containing dots or other regex metacharacters are matched literally.
- The remediation diagram said to delete and recreate a conflicting node. Updated it to decommission stale node resources, aligning with Calico's node decommissioning guidance and avoiding implying that an active node should be deleted.
- The conclusion stated that orphaned Node resources are harmless to BGP routing. Reworded this to the narrower, accurate claim that orphaned Node resources do not run BGP by themselves, while stale node references can still cause IP-in-use errors, unreachable peer readiness checks, or monitoring false alerts.

## Review Notes
The examples assume an IPv4 Calico deployment with BGP-related fields present. IPv6-only, policy-only, or non-BGP deployments may need adjusted audit checks.
