# Validation Summary: How to Configure BGP Peering in Calico

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- BGP
- BIRD
- `calicoctl`
- `kubectl`

## Sources Consulted
- Calico Open Source documentation: Configure BGP peering, https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico Open Source documentation: BGPConfiguration resource, https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico Open Source documentation: BGPPeer resource, https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico Open Source documentation: `calicoctl node status`, https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico Open Source documentation: Troubleshooting commands, https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Kubernetes documentation: `kubectl exec`, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The post said full-mesh BGP works well for clusters with fewer than 50 nodes. Calico's current documentation describes full mesh as suitable for small and medium-size deployments of around 100 nodes or less. Updated the sizing guidance to match the official documentation.
- The BIRD inspection command used `kubectl exec -n calico-system ds/calico-node -- birdcl show protocols`. While `kubectl exec` can target workload resources, Calico's troubleshooting documentation shows BIRD inspection by execing into a specific `calico-node` pod. Updated the command to use `<calico-node-pod>` so the reader checks the intended node explicitly.

## Review Notes
- The `BGPConfiguration` and `BGPPeer` examples use current `projectcalico.org/v3` resource kinds and valid fields for Calico Open Source.
- `calicoctl node status` is the correct command for checking Calico node BGP peering state.
- The namespace `calico-system` is correct for operator-based Calico installations; manifest-based installations may use `kube-system`.
