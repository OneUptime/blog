# Validation Summary: Use Calico Node Resource

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Node resources
- Calico BGP configuration
- calicoctl
- Kubernetes nodes and node draining
- Python command-line JSON processing
- YAML configuration

## Sources Consulted
- Calico Node resource reference: https://docs.tigera.io/calico/latest/reference/resources/node
- Calico calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico BGP peering configuration: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico IP autodetection and manual node IP configuration: https://docs.tigera.io/calico/latest/networking/ipam/ip-autodetection
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/

## Issues Found
- The Python header print statement in the first command used nested single quotes inside an f-string, which would cause a syntax error. Changed it to a `.format(...)` call so the `python3 -c` example runs correctly.
- The multi-homed node YAML manually set `spec.ipv4VXLANTunnelAddr`. Calico documents VXLAN tunnel address fields as system-configured and not to be updated manually. Removed that field and narrowed the surrounding text to configuring the node BGP IP and subnet.

## Review Notes
- `calicoctl`, `kubectl`, and Calico were not installed in the local environment, so CLI validation was performed against official command references rather than local `--help` output.
- The worker-node label `node-role.kubernetes.io/worker` is common but not guaranteed in every Kubernetes distribution; operators may need to adapt the label selector to their cluster.
