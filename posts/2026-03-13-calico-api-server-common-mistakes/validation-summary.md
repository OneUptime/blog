# Validation Summary: Common Mistakes with the Calico API Server

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico API server
- Calico operator installation APIs
- Kubernetes aggregated API servers and APIService resources
- kubectl
- calicoctl
- TigeraStatus

## Sources Consulted
- Calico documentation: Enable kubectl to manage Calico APIs - https://docs.tigera.io/calico/latest/operations/install-apiserver
- Calico documentation: Installation API reference - https://docs.tigera.io/calico/latest/reference/installation/api
- Calico documentation: calicoctl get reference - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: Configure resource requests and limits - https://docs.tigera.io/calico/latest/reference/configure-resources
- Calico documentation: Felix configuration resource - https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Kubernetes documentation: API aggregation layer - https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/apiserver-aggregation/

## Issues Found
- The post used `kubectl patch apiserver default ... spec.apiServerDeployment.spec.replicas`, but the current Calico `APIServerDeploymentSpec` does not expose a `replicas` field. Updated the operator-managed example to patch `Installation.spec.controlPlaneReplicas`, and kept direct deployment scaling only for manifest-based installs.
- The post treated the `calico-apiserver` namespace as universal. Added a prerequisite note that manifest installs use `calico-apiserver`, while operator-managed clusters commonly run the deployment in `calico-system`, and changed replica and pod checks to query by label across namespaces.
- The post presented TigeraStatus as always available. Clarified that TigeraStatus applies to operator-managed installations.
- The post described the API server issue as an incorrect kubeconfig problem. Updated the wording to focus on Kubernetes API reachability, service account/certificate credentials, and the Kubernetes API datastore requirement for manifest-based API server installs.
- The post used `kubectl api-versions | grep projectcalico` as the primary resource registration check. Updated this to `kubectl api-resources --api-group=projectcalico.org`, which matches Calico's documented verification flow more closely.
- The post piped a JSONPath condition list to `jq`, which is less reliable than querying JSON output directly. Updated the command to use `-o json | jq '.status.conditions[] | select(.type == "Available")'`.
- The post claimed complex Calico queries require `calicoctl` and gave an incorrect label-selector example. Current Calico docs state that the API server or native v3 CRDs allow `kubectl` to manage `projectcalico.org/v3` resources, while `calicoctl` remains required for specific subcommands such as `node`, `ipam`, `convert`, and `version`. Reworked the section accordingly.
- Added a deprecation caveat: current Calico documentation marks the aggregated `calico-apiserver` as deprecated and recommends native v3 CRDs for new installations.

## Review Notes
The post is now technically valid for existing clusters that still run the Calico aggregated API server. Future updates should consider reframing the article around migration to native v3 CRDs, since the aggregated API server is deprecated in current Calico documentation.
