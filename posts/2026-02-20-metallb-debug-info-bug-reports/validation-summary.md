# Validation Summary: How to Collect MetalLB Debug Information for Bug Reports

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- kubectl
- MetalLB
- MetalLB CRDs
- FRR mode
- Linux networking tools

## Sources Consulted
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes node debugging guide: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- MetalLB configuration documentation: https://metallb.io/configuration/
- MetalLB troubleshooting documentation: https://metallb.io/troubleshooting/
- MetalLB API reference: https://metallb.io/apis/
- MetalLB v0.15.3 native and FRR manifests: https://raw.githubusercontent.com/metallb/metallb/v0.15.3/config/manifests/metallb-native.yaml and https://raw.githubusercontent.com/metallb/metallb/v0.15.3/config/manifests/metallb-frr.yaml

## Issues Found
- The MetalLB configuration dump used a hard-coded list of CRDs and claimed to export every MetalLB custom resource. Current MetalLB releases expose additional resources, including status resources and ConfigurationState. Changed the snippet to discover namespaced MetalLB API resources dynamically with `kubectl api-resources --api-group=metallb.io --namespaced=true -o name`.
- The speaker and FRR log commands used a label selector without setting `--tail=-1`. Kubernetes defaults selector-based log retrieval to the last 10 lines, so the commands could omit most of the requested one-hour history. Added `--tail=-1` to selector-based log commands.
- The affected-service events command filtered only by object name, which could include non-Service objects with the same name. Added `involvedObject.kind=Service` to the field selector.
- The network-state section said to verify that a LoadBalancer IP appears on the correct interface. MetalLB Layer 2 mode answers ARP/NDP and does not require binding the LoadBalancer IP to a node interface. Reworded the comment.
- The iptables command implied iptables NAT rules always represent service forwarding. Added a caveat that this applies when kube-proxy is using iptables mode.
- The conclusion referred to an automated collection script, but the post provides command snippets rather than a complete script. Reworded it to refer to the commands above.

## Review Notes
The `kubectl debug node/... -- COMMAND` pattern is valid for node debugging, but clusters with stricter Pod Security Admission or RBAC may require additional permissions or an appropriate debug profile for privileged network inspection.
