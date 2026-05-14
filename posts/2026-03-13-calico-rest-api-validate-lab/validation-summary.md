# Validation Summary: How to Validate the Calico REST API in a Lab Cluster

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico Open Source
- Kubernetes API
- Kubernetes RBAC
- kubectl
- curl
- jq

## Sources Consulted
- Calico documentation: Enable kubectl to manage Calico APIs - https://docs.tigera.io/calico/latest/operations/install-apiserver
- Calico documentation: Enable native v3 CRDs - https://docs.tigera.io/calico/latest/operations/native-v3-crds
- Calico documentation: GlobalNetworkPolicy resource - https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation: Configure RBAC for tiered policies - https://docs.tigera.io/calico/latest/network-policy/policy-tiers/rbac-tiered-policies
- Kubernetes documentation: Use an HTTP Proxy to Access the Kubernetes API - https://kubernetes.io/docs/tasks/extend-kubernetes/http-proxy-access-api/
- Kubernetes kubectl reference: kubectl proxy - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_proxy/
- Kubernetes kubectl reference: kubectl create token - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_token/
- Kubernetes kubectl reference: kubectl create clusterrole - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_clusterrole/

## Issues Found
- The prerequisites only mentioned a Calico API server. Current Calico documentation notes that native `projectcalico.org/v3` CRDs can also expose the same resources through Kubernetes, so the prerequisite was updated to cover both supported lab setups.
- The setup started `kubectl proxy` in the background but did not save its PID. The cleanup command used `kubectl proxy --stop`, which is not a documented `kubectl proxy` option. The setup now captures `PROXY_PID=$!`, and cleanup uses `kill "$PROXY_PID"`.
- The sample Calico selectors used `rest-api-test == true`. Calico selector documentation shows string label values quoted, so the selector examples were changed to `rest-api-test == 'true'`.
- The service account authentication test used Kubernetes' built-in `view` ClusterRole, which is not a precise Calico GlobalNetworkPolicy permission set and can fail against Calico tiered-policy RBAC. The example now creates a dedicated read-only ClusterRole for `tiers`, `tier.globalnetworkpolicies`, and native `globalnetworkpolicies` in the `projectcalico.org` API group, then cleans it up.

## Review Notes
The aggregated Calico API server is documented as deprecated in current Calico documentation, with native v3 CRDs recommended for new installations. The REST paths in the post remain valid for validating `projectcalico.org/v3` resources through the Kubernetes API.
