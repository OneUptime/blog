# Validation Summary: Kubernetes Service Has Endpoints but Envoy EDS Is Empty: Trace Port Names, Subsets, and Discovery Scope

## Status
validated

## Post Type
Technical troubleshooting guide.

## Technologies Covered
- Kubernetes Services, Pods, readiness, named ports, and EndpointSlice v1
- Istio, Istiod, revisions, VirtualService, DestinationRule, ServiceEntry, and Sidecar configuration
- Envoy clusters, EDS, xDS synchronization, and mTLS
- kubectl, istioctl, Bash, jq, JSONPath, and YAML

## Sources Consulted
- Istio proxy diagnostics: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio CLI reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio configuration scoping: https://istio.io/latest/docs/ops/configuration/mesh/configuration-scoping/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Sidecar reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio protocol selection: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio describe diagnostics: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-describe/
- Istio analyze diagnostics: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Istio resource annotations: https://istio.io/latest/docs/reference/config/annotations/
- Istiod options, including HTTP debugging and native sidecars: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Kubernetes EndpointSlices: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes EndpointSlice v1 API (the post's original URL redirects here): https://kubernetes.io/docs/reference/kubernetes-api/discovery/endpoint-slice-v1/
- Kubernetes authoritative EndpointSlice type definitions: https://raw.githubusercontent.com/kubernetes/api/master/discovery/v1/types.go
- Kubernetes Services: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes native sidecar containers: https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/
- kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes JSONPath support: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- jq manual: https://jqlang.org/manual/

## Issues Found
1. **Sync-table commands invoked diff mode.** Both verification sequences supplied a Pod argument to `istioctl proxy-status`, which requests a configuration diff rather than the table containing EDS synchronization status. Replaced both with `istioctl proxy-status --namespace shop` so readers can inspect the caller's row.
2. **Subset diagnostic targeted the caller instead of the destination.** The describe command checks routes associated with the described destination Pod; describing frontend does not perform the intended inventory subset check. Changed the example to an inventory backend Pod and explicitly instructed readers to substitute a Pod from their listing.
3. **Pod inspection missed native sidecars.** Listing only `spec.containers` can omit an Istio proxy installed as a native sidecar. Added `spec.initContainers` names with optional iteration so the query also works when that field is absent.
4. **EndpointSlice port checklist was ambiguous.** Requiring the port used by the Envoy cluster could suggest looking for the Service's client-facing port number in the slice. Clarified that the slice holds the resolved target port and that its port name corresponds to the Service port name, which can differ from a named targetPort.
5. **Missing-proxy conclusion was too absolute.** Absence from the queried view alone does not establish disconnection from every control plane. Qualified the explanation to check the Kubernetes context and selected control plane first.
6. **Debug-access protection was overstated.** Istiod still has an HTTP debug interface controlled by `ENABLE_DEBUG_ON_HTTP`. Replaced the blanket protection claim with accurate wording about authenticated istioctl access and the optional HTTP interface.

## Review Notes
- Reviewed the commands, field names, resource API, port mapping, readiness semantics, subset label matching, protocol precedence, discovery controls, revision annotation, and synchronization explanations against official references. The DestinationRule `networking.istio.io/v1` example is valid for current Istio installations with the corresponding CRDs.
- The seven official documentation links in the post resolved to the intended resources; the EndpointSlice API link redirects to its current location.
- Kubernetes Endpoints is deprecated since v1.33 and can truncate large endpoint sets. The recommendation to inspect all EndpointSlices is appropriate. Omitted readiness is interpreted as ready; publishNotReadyAddresses affects published readiness and does not establish application health.
- These examples assume a sidecar-based caller, the illustrative shop/inventory namespaces and workload names, the cluster.local DNS suffix, and suitable read permissions. Ambient ztunnel does not expose the same Envoy sidecar interface.
- Checked every Bash command block with bash syntax validation and exercised the jq expressions on synthetic JSON, including a native sidecar. This was a documentation and local syntax review, not a live Kubernetes/Istio integration test. Server-side dry-run requires the reader's inventory-service.yaml and cluster; no cluster resources were changed during this review.
- Kept the existing section structure and limited README edits to technical corrections. No specific Kubernetes or Istio release was pinned by the article; deployments should use CLI and CRD versions compatible with their installed mesh.
