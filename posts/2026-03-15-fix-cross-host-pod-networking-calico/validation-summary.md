# Validation Summary: How to Fix Cross-Host Pod Networking Failures with Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- BGP
- VXLAN
- IP-in-IP
- AWS EC2 security groups
- Linux networking commands

## Sources Consulted
- Calico Open Source IPPool resource documentation: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico Open Source overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico Open Source BGPConfiguration resource documentation: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico Open Source BGPPeer resource documentation: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico Open Source BGP peering documentation: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico Open Source MTU configuration documentation: https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Calico Open Source IP pool migration documentation: https://docs.tigera.io/calico/latest/networking/ipam/migrate-pools
- Calico Open Source calicoctl get documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Open Source calicoctl patch documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico Open Source GlobalNetworkPolicy documentation: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico Open Source Kubernetes node host endpoint policy documentation: https://docs.tigera.io/calico/latest/network-policy/hosts/kubernetes-nodes
- AWS CLI authorize-security-group-ingress documentation: https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- Kubernetes kubectl rollout restart documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/
- Kubernetes kubectl exec documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl run documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The operator-managed MTU patch used `kubectl patch installation default`; changed it to the fully qualified `installation.operator.tigera.io` resource form used in Calico documentation.
- The workload restart command used `kubectl rollout restart deployment --all -n <namespace>`, but `rollout restart` restarts all deployments in a namespace by specifying `deployment -n <namespace>`; removed `--all`.
- The host endpoint policy used `selector: all()`, which can select workload endpoints as well as host endpoints in a `GlobalNetworkPolicy`. Changed it to label nodes with `kubernetes-host` and select `has(kubernetes-host)`, matching Calico's host endpoint policy guidance.
- The host endpoint policy allowed IP-in-IP and VXLAN but omitted BGP TCP/179, which is required when host endpoint policy is the reason BGP peering is blocked. Added TCP/179 ingress and egress allow rules.
- The `kubectl run` verification command passed `bash -c` as arguments to the image entrypoint. Added `--command` and `--restart=Never` so the command is executed as intended and cleaned up correctly with `--rm`.
- The troubleshooting note claimed existing pods keep old tunnel config after a VXLAN switch and require workload restarts. Updated it to clarify that calico-node should be restarted for encapsulation changes and workload recreation is specifically needed when MTU changes affect pod veth MTU.

## Review Notes
- The Calico namespace in the examples is `calico-system`, which is correct for common operator-managed installs. Manifest-based installs often use `kube-system`, so readers may need to adjust the namespace for their installation method.
- Switching IP pools or encapsulation is disruptive in production environments and should be tested on a small node or workload subset before broad rollout.
