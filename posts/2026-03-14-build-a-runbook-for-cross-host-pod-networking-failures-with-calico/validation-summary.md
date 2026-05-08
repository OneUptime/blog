# Validation Summary: Building a Runbook for Cross-Host Pod Networking Failure Errors in Calico

## Status
validated

## Post Type
Operational runbook / technical guide

## Technologies Covered
- Calico
- Kubernetes
- kubectl
- calicoctl
- Kubernetes RBAC
- Kubernetes networking and pod connectivity

## Sources Consulted
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico BGP peering documentation: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico Kubernetes system requirements and network requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico troubleshooting commands: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico calicoctl ipam show reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico calicoctl ipam check reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico calicoctl ipam release reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release

## Issues Found
- The IPAM/IP allocation fix only ran `calicoctl ipam show --show-blocks`, which is diagnostic rather than corrective. Added `calicoctl ipam check -o report.json` and `calicoctl ipam release --from-report=report.json` with a caution to use release only after confirming leaked addresses and locking the datastore per procedure.
- The connectivity verification used `<known-pod-ip>`, which did not ensure the runbook was testing cross-host pod networking. Changed the placeholder to `<known-pod-ip-on-another-node>`.
- The RBAC check used `kubectl auth can-i create ... --all-namespaces --list`, mixing a specific authorization check with the `--list` mode. Changed it to `kubectl auth can-i create globalnetworkpolicies.crd.projectcalico.org` and corrected the comment to clarify that it checks the current identity.

## Review Notes
- The post assumes an operator-style Calico installation using the `calico-system` namespace. Calico documentation notes that manifest-based installs commonly use `kube-system`, so readers may need to adjust namespaces for their environment.
- `calicoctl node status` is useful for BGP troubleshooting, but Calico VXLAN overlays do not use BGP. In VXLAN-only clusters, BGP status may not be relevant to the failure mode.
