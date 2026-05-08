# Validation Summary: Validate Calico Host Endpoint Selectors

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Calico Enterprise
- Kubernetes
- Calico HostEndpoint resources
- Calico GlobalNetworkPolicy selectors
- calicoctl
- calicoq
- kubectl

## Sources Consulted
- Calico HostEndpoint resource documentation: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico Protect Kubernetes nodes documentation: https://docs.tigera.io/calico/latest/network-policy/hosts/kubernetes-nodes
- Calico calicoctl get documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl patch documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico KubeControllersConfiguration documentation: https://docs.tigera.io/calico/latest/reference/resources/kubecontrollersconfig
- Calico Enterprise calicoq eval documentation: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoq/eval
- Calico Enterprise calicoq policy documentation: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoq/policy
- Calico Enterprise Policy Impact Preview documentation: https://docs.tigera.io/calico-enterprise/latest/network-policy/policy-impact-preview
- Kubernetes kubectl get documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get
- Kubernetes JSONPath documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The post stated that automatic HostEndpoint labels may need to be applied manually. Calico documentation says automatic HostEndpoints sync labels from their corresponding Kubernetes nodes, so the wording was changed to apply manual patching only to manually created HostEndpoints.
- The post used `calicoctl get hostendpoints --selector=...`, but current `calicoctl get` documentation does not include a `--selector` option. The command was replaced with a documented Kubernetes label-selector query against the HostEndpoint CRD.
- The post implied Felix logs show exact policy-to-endpoint application. This was softened to say Felix logs can help troubleshoot selector and endpoint updates.
- The post described using `calicoctl get globalnetworkpolicy ... -o yaml` to check for zero matching endpoints. That command can inspect the selector but does not compute endpoint matches, so an Enterprise `calicoq policy` command was added for policy-to-endpoint matching.
- The node IP lookup used `.status.addresses[0].address`, which depends on address ordering. It was changed to select the `InternalIP` address by type.
- The post used a `calicoctl policy-test` command, but that command was not found in current Calico Enterprise CLI documentation. It was replaced with documented `calicoq policy` usage and a note that Policy Impact Preview is available in the Enterprise web console.

## Review Notes
The traffic-test ports remain examples and should be adjusted to match the actual policy and Kubernetes distribution being validated. Calico Enterprise-only validation commands require the Enterprise `calicoq` tool; Calico Open Source users can still inspect selectors and HostEndpoint labels but do not have the same policy-query CLI.
