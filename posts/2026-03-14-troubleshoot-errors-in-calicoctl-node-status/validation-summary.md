# Validation Summary: Troubleshooting Errors in calicoctl node status

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- calicoctl
- BGP
- BIRD
- Kubernetes
- kubectl
- Linux networking tools

## Sources Consulted
- Calico `calicoctl node status` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico `calicoctl node` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/overview
- Calico `calicoctl` installation and configuration guidance: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico BGPConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico Node resource reference: https://docs.tigera.io/calico/latest/reference/resources/node
- Calico `calico/node` configuration reference: https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Kubernetes field selectors reference: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/

## Issues Found
- The post recommended running `calicoctl node status` inside the `calico-node` pod with `kubectl exec`. Calico documentation states that `calicoctl node` commands must run directly on the compute host because they need access to host filesystem paths. I changed the example to run the kubectl plugin form from the Calico node with `sudo kubectl calico node status`.
- The post referred to peers showing "states" other than `Established`, but the official `calicoctl node status` sample shows `Established` in the BGP information/session status column while the `STATE` column can show values such as `up`. I changed the wording to "BGP session status" and adjusted the subsection labels from peer state names to peer status names.
- The post used `start` as a peer state label for connection-not-initiated cases. Calico's documented BGP session states include values such as `Idle`, `Connect`, `Active`, and `Established`; the correction now refers to `Idle` or no peers listed.

## Review Notes
The remaining commands are broadly valid for common Calico Kubernetes deployments, but namespace and node-name assumptions can vary by installation method. For example, operator installs commonly use `calico-system`, while older manifest-based installs may use `kube-system`; Kubernetes node names also may not always match the operating system hostname.
