# Validation Summary: Validate Calico Node Resource

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Calico Node resources
- Kubernetes
- BGP
- VXLAN
- BIRD
- `calicoctl`
- `kubectl`
- Python JSON parsing

## Sources Consulted
- Calico Node resource reference: https://docs.tigera.io/calico/latest/reference/resources/node
- Calico `calicoctl get` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico `calicoctl node` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/overview
- Calico `calicoctl node status` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico IP autodetection documentation: https://docs.tigera.io/calico/latest/networking/ipam/ip-autodetection
- Calico BGP peering documentation: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The node comparison used `calicoctl get nodes -o wide`, which produces tabular output that is not directly comparable to `kubectl get nodes -o name`. Changed it to a documented `calicoctl get` Go template so both commands list `node/<name>` resource names.
- The BGP status step implied `calicoctl node status` could be run generically through cluster access. Calico documents `calicoctl node` commands as host-side commands that must be run directly on the compute host running the Calico node instance, so the comment was corrected.
- The VXLAN tunnel validation step implied VXLAN tunnel addresses should always be assigned. Calico only has `spec.ipv4VXLANTunnelAddr` when VXLAN is in use, so the comment now scopes the check to VXLAN-enabled clusters.
- The pod connectivity test said it deployed pods on different nodes, but `kubectl run` without scheduling constraints does not guarantee that. Added a two-node guard, node selection through `--overrides`, and a readiness wait before reading pod IPs and pinging.

## Review Notes
The `calico-system` namespace is correct for operator-based Calico installations, but some manifest-based installations use `kube-system`. The post remains technically valid for the stated commands, though readers may need to adjust the namespace for their installation.
