# Validation Summary: How to Map Traffic Flows Through the Calico API Server

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Calico API server
- Kubernetes aggregated API servers and APIService resources
- Kubernetes kubectl CLI
- Calico GlobalNetworkPolicy resources
- Kubernetes admission webhooks
- Kubernetes Services and Endpoints

## Sources Consulted
- Calico documentation: Enable kubectl to manage Calico APIs - https://docs.tigera.io/calico/latest/operations/install-apiserver
- Calico documentation: Component architecture - https://docs.tigera.io/calico/latest/reference/architecture/overview
- Calico documentation: Global network policy resource - https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Kubernetes documentation: Configure the aggregation layer - https://kubernetes.io/docs/tasks/extend-kubernetes/configure-aggregation-layer/
- Kubernetes documentation: kubectl version reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Calico v3.32 apiserver manifest - https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/manifests/apiserver.yaml

## Issues Found
- The post implied the `kubectl get globalnetworkpolicies` flow always uses the Calico API server. Updated the introduction and prerequisites to clarify that this applies to clusters using the aggregated Calico API server, and that current Calico documentation deprecates this component for new installations in favor of native v3 CRDs.
- The prerequisites listed `calicoctl`, but the procedure only uses `kubectl`, and the Calico API server exists specifically to manage `projectcalico.org/v3` resources through `kubectl`. Removed `calicoctl` from the prerequisite.
- The APIService diagnostic command piped `jsonpath` object output into `jq`, which is not guaranteed to be valid JSON. Changed it to `kubectl get apiservice v3.projectcalico.org -o json | jq '.spec.service'`.
- The APIService comments described `caBundle` as the TLS certificate used to authenticate the Calico API server. Clarified that it is the CA bundle used to verify the Calico API server serving certificate.
- The APIService comments referred to a `calico-apiserver` Service. The current Calico manifest uses the `calico-api` Service in the `calico-apiserver` namespace, so the comment was corrected.
- The post used `kubectl version --short`, which is not present in the current official kubectl reference. Replaced it with `kubectl version`.
- The best-practice note said Service IP changes require APIService updates. APIService routing is based on the service name, namespace, and optional port, so the recommendation was changed to keep the APIService service reference aligned with the Calico API server Service.

## Review Notes
The remaining diagnostic commands are generally valid for an aggregated Calico API server deployment. `kubectl get endpoints` still works, but EndpointSlices are the more modern Kubernetes endpoint representation and may be worth mentioning in a future refresh.
