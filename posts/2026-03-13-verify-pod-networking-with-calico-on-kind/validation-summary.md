# Validation Summary: How to Verify Pod Networking with Calico on Kind

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubectl
- Kind
- Calico
- calicoctl
- Kubernetes Services and Pods

## Sources Consulted
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl expose reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Calico quickstart guide for Kind: https://docs.tigera.io/calico/latest/getting-started/kubernetes/quickstart
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico calicoctl node reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/overview
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl ipam show reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show/
- Calico overlay networking and BGP/VXLAN behavior: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico BGP configuration documentation: https://docs.tigera.io/calico/latest/networking/configuring/bgp

## Issues Found
- The Calico pod checks were scoped only to `kube-system`. Current Calico Kind/operator installs use Calico namespaces such as `calico-system`, while older manifest installs may use `kube-system`. Changed the commands to use `kubectl get pods -A` with the same labels so they work across namespaces.
- The node IP explanation was too absolute. Calico's node IP autodetection commonly uses Kubernetes internal IPs by default, but this can be configured. Changed the wording to "By default".
- The `calicoctl node status` explanation implied it always applies and reports data plane synchronization. Official documentation says it must be run on the node being inspected and reports Calico process status plus BGP peering states. Updated the text and noted that VXLAN-only Calico installations do not use BGP.
- The BusyBox pod commands passed `sleep 3600` as container arguments, not as the command. With `kubectl run`, a custom command requires `--command --`. Updated both test pod commands.
- The guide claimed the test pods were deployed on different nodes, but the commands did not enforce that. Updated the section title and clarified that the `NODE` column should be checked when specifically validating inter-node routing.
- The conclusion treated BGP status as universally applicable. Updated it to say BGP status is checked when applicable.

## Review Notes
The service connectivity example is syntactically valid and follows the current `kubectl expose pod` command form. The guide still assumes a permissive network policy state; users who have already applied default-deny policies may need temporary allow policies for these connectivity tests.
