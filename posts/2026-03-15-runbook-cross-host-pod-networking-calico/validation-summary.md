# Validation Summary: How to Build a Runbook for Cross-Host Pod Networking Failures with Calico

## Status
validated

## Post Type
Technical guide / runbook

## Technologies Covered
- Calico
- Kubernetes
- BGP
- IP-in-IP
- VXLAN
- Linux routing and interfaces
- tcpdump and netcat

## Sources Consulted
- Calico calicoctl node status documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico BGP peering documentation: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico Kubernetes system requirements and network requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico FelixConfiguration resource documentation: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico calicoctl patch documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico calicoctl get documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Local OpenBSD netcat help output for `nc -zv -w 3 <host> <port>` syntax.

## Issues Found
- The post treated BGP checks as universally applicable to Calico cross-host pod networking. Calico VXLAN pod networking does not use BGP, so I made BGP verification and remediation conditional on BGP-enabled designs and added `N/A for VXLAN-only` to the runbook's BGP topology field.
- The security group remediation always required TCP 179. I changed that rule to apply only when BGP is enabled, while keeping IP-in-IP protocol 4 and VXLAN UDP 4789 checks intact.
- Several `kubectl exec` examples omitted the namespace even though the pod selection command lists pods across all namespaces. I added `-n <namespace>` and fixed the multi-pod verification loop to preserve namespace context.
- The runbook assumed `calico-system` for all Calico pod operations. Calico may run in `calico-system` or `kube-system` depending on installation method, so I added a `Calico namespace` quick-reference value and parameterized the commands with `<calico-namespace>`.
- The netcat examples placed `-w 3` after the target host and port. I changed them to the documented and locally verified option-before-destination form: `nc -zv -w 3 <peer-node-ip> 179`.
- The introduction said cross-host pod networking failures affect all inter-node communication. I narrowed that to inter-node pod communication, which matches the scope of Calico pod networking failures.

## Review Notes
The remaining examples are runbook templates and depend on cluster-specific values such as the Calico namespace, interface name, IP pool name, pod namespace, and encapsulation mode. The post now calls out the most important mode-specific caveat: VXLAN-only Calico pod networking should follow tunnel and route diagnostics rather than BGP recovery.
