# Validation Summary: Document Calico CNI Plugin for Operators

## Status
validated

## Post Type
Operator guide / reference

## Technologies Covered
- Calico CNI
- Calico IPAM and IPPool resources
- Kubernetes pod scheduling and kubelet networking
- containerd / CRI
- calicoctl
- kubectl debug

## Sources Consulted
- Calico CNI plugin configuration: https://docs.tigera.io/calico/latest/reference/configure-cni-plugins
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico IP address management overview: https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- calicoctl ipam show reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- calicoctl ipam check reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- calicoctl ipam release reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes node debugging guide: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/

## Issues Found
- The architecture diagram showed the scheduler handing work directly to the kubelet. Kubernetes scheduling decisions are recorded through the API server and the kubelet observes assigned pods from the API server, so the diagram arrows were adjusted to route scheduler updates back through the API server.
- The `default-pool` example used `192.168.32.0/16`, which is not a valid /16 network boundary and would overlap the earlier `192.168.0.0/20` and `192.168.16.0/20` examples if normalized to `192.168.0.0/16`. It was changed to `10.244.0.0/16`.
- The IPAM block allocation strategy claimed nodes never share blocks. Calico documents that, with default `StrictAffinity=false`, a host can borrow addresses from blocks allocated to other hosts when needed. The wording was corrected.
- The leaked handle cleanup command used `calicoctl ipam gc`, which is not a documented current `calicoctl ipam` subcommand. It was replaced with the documented lock, check, release-from-report, and unlock workflow.

## Review Notes
- The CNI configuration table is accurate for a manifest-based Calico installation using the `calico-config` ConfigMap. Operator-managed installations generally use the Tigera operator installation API instead of directly editing CNI plugin configuration.
- `kubectl debug node/<NODE> -it --image=ubuntu -- ...` is valid, and Kubernetes documents that the host filesystem is mounted at `/host`; access still depends on cluster RBAC and pod security settings.
