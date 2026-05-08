# Validation Summary: How to Use calicoctl node status with Practical Examples

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Calico
- calicoctl
- Kubernetes
- BGP
- BIRD
- Bash

## Sources Consulted
- Calico `calicoctl node status` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico `calicoctl node` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/overview
- Calico BGP peering documentation: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico troubleshooting commands: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico `calicoctl` installation guidance: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The original pod-based examples ran `calicoctl node status` inside `calico-node` pods. Calico's official documentation states that `calicoctl node ...` commands must run directly on the compute host because they need host filesystem access. I changed the all-node and monitoring examples to run `sudo calicoctl node status` over SSH to each node.
- The pod-based BGP inspection examples used `calico-node -birdcl`. The official troubleshooting documentation shows using BIRD's CLI (`birdcl`) from inside the `calico-node` container. I updated those examples to use `birdcl show protocols`, `birdcl show protocols all`, and `birdcl show route`.
- The monitoring script would have treated a failed status collection as healthy because empty output did not match the unhealthy-state grep. I changed it to warn and return a nonzero exit code when SSH/status collection fails.
- The pod namespace examples assumed `calico-system` only. Calico's documentation notes that operator-based installs use `calico-system`, while manifest-based installs use `kube-system`. I added a short note to adjust the namespace for manifest-based installs.

## Review Notes
- The expected peer count example is correct for a simple full-mesh, node-to-node BGP deployment. It may not match clusters using route reflectors, external peers, disabled node-to-node mesh, or non-BGP overlays such as VXLAN-only deployments.
