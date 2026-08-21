# Validation Summary: How to Publish vCluster Gateway API Routes Through a Host-Cluster Gateway

## Status

validated

## Post Type

Technical tutorial / implementation guide

## Technologies Covered

- vCluster 0.36
- Kubernetes
- Kubernetes Gateway API v1.5+
- GatewayClass and Gateway
- HTTPRoute and ReferenceGrant
- kubectl
- vCluster CLI
- curl and DNS
- Multi-tenant shared-node routing

## Sources Consulted

- [vCluster 0.36: Gateway API overview and prerequisites](https://www.vcluster.com/docs/vcluster/key-features/gateway-api)
- [vCluster 0.36: Native Gateway API sync and configuration reference](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/to-host/networking/gateway-api)
- [vCluster 0.36: Import Gateways and GatewayClasses](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/from-host/gateways)
- [vCluster 0.36: Sync from the control plane cluster reference](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/from-host/)
- [vCluster 0.36: Sync to the control plane cluster reference](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/to-host/)
- [vCluster 0.36: Resolve Gateway API sync errors](https://www.vcluster.com/docs/vcluster/troubleshoot/gateway-api-sync)
- [vCluster 0.36: `vcluster create` CLI reference](https://www.vcluster.com/docs/vcluster/cli/vcluster_create)
- [vCluster 0.36: Access and connect to a tenant cluster](https://www.vcluster.com/docs/vcluster/manage/accessing-vcluster)
- [vCluster 0.36: Annotations and labels reference](https://www.vcluster.com/docs/vcluster/reference/annotations)
- [vCluster 0.36 source: single-namespace name translation](https://github.com/loft-sh/vcluster/blob/v0.36.0/pkg/util/translate/single_namespace.go)
- [Gateway API: HTTPRoute](https://gateway-api.sigs.k8s.io/reference/api-types/httproute/)
- [Gateway API: Cross-namespace routing](https://gateway-api.sigs.k8s.io/guides/user-guides/multiple-ns/)
- [Gateway API: ReferenceGrant](https://gateway-api.sigs.k8s.io/reference/api-types/referencegrant/)
- [Gateway API v1.5 specification](https://gateway-api.sigs.k8s.io/reference/api-spec/1.5/spec/)
- [Gateway API: Implementations and conformance](https://gateway-api.sigs.k8s.io/docs/implementations/list/)
- [Kubernetes: `kubectl label`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/)
- [Kubernetes: kubectl JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [curl: `--resolve` option](https://curl.se/docs/manpage.html#--resolve)

## Issues Found

- The post did not state the deployment-mode limitation documented for vCluster 0.36 Gateway API sync. It now specifies a container-based control plane with Shared Nodes so the guide does not imply support for other vCluster topologies.

- The prerequisites did not specify vCluster 0.36's minimum Gateway API bundle, and “a conformant Gateway controller” did not guarantee the required route support. The text now requires Gateway API v1.5.0-or-later CRDs and a compatible controller with Gateway and `HTTPRoute` support.

- The generic-custom-resource warning called every listed kind “core,” although that term has a specific conformance meaning in Gateway API and does not accurately characterize every listed resource. It now refers to the resource kinds supported by vCluster's native sync.

- The HTTPS test assumed a port 443 HTTPS listener and a matching certificate without stating those requirements. The listener prerequisites now make that assumption explicit.

- `vcluster create --connect=false` intentionally leaves the current kube context on the control plane cluster, but the following commands were tenant-side. The guide now explicitly runs `vcluster connect team-blue --namespace team-blue-vcluster`, then runs `vcluster disconnect` before control-plane inspection.

- The route-condition troubleshooting implied that native sync failures would always appear as `Accepted=False` or `ResolvedRefs=False`. vCluster can reject unauthorized or unresolved references before creating the host Route, leaving those conditions absent and emitting a tenant Warning event. The troubleshooting text now covers absent conditions and the broader standard reasons for false conditions.

- The control-plane inspection used the shell-invalid placeholder `<translated-route-name>` and did not qualify the hard-coded host namespace. It now uses the vCluster 0.36 single-namespace translated name `web-x-apps-x-team-blue` and explicitly states that `team-blue-vcluster` is the placement for the default single-namespace mode used by the example.

- The `curl --resolve` example treated any Gateway status address as an IP address. Gateway status can contain multiple IP or hostname addresses, while curl's `--resolve` address must be numeric and requires special IPv6 formatting. Because the guide already directs the reader to configure DNS, the test now uses a normal HTTPS request that works with either an A/AAAA record or a CNAME.

## Review Notes

- The `vcluster.yaml` field paths, selectors, Gateway mapping direction, hostname policy, and virtual namespace policy match the vCluster 0.36 schema and official imported-Gateway example. The configuration also rendered successfully with the official vCluster Helm chart version 0.36.0.
- The Service and `HTTPRoute` YAML are syntactically valid. The backend port correctly refers to Service port 80, and no `ReferenceGrant` is needed for the cross-namespace Route-to-Gateway attachment.
- All Bash examples pass shell syntax checking after the placeholder correction, and both YAML blocks parse successfully.
- All documentation links in the post resolve to the intended official pages; the older Gateway API cross-namespace URL redirects to its current canonical location.
- The deployment command assumes a matching vCluster 0.36 CLI/default chart. For long-term reproducibility, the chart can additionally be pinned with `--chart-version 0.36.0`.
