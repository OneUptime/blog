# Validation Summary: Troubleshooting Global Services Flapping Between Cilium Clusters

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Cilium ClusterMesh
- Kubernetes Services and CiliumEndpoint CRDs
- Hubble CLI
- Cilium CLI and cilium-dbg
- ClusterMesh KVStore / KVStoreMesh

## Sources Consulted
- Cilium ClusterMesh setup documentation: https://docs.cilium.io/en/stable/network/clustermesh/clustermesh/
- Cilium global services documentation: https://docs.cilium.io/en/stable/network/clustermesh/services/
- Cilium ClusterMesh troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting_clustermesh/
- Cilium `clustermesh status` CLI reference: https://docs.cilium.io/en/latest/cmdref/cilium_clustermesh_status/
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/latest/network/kubernetes/ciliumendpoint.html
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html
- Hubble `observe --help` output in the Cilium Hubble project: https://github.com/cilium/hubble/issues/1280
- Cilium security identities documentation: https://docs.cilium.io/en/stable/internals/security-identities/

## Issues Found
- Replaced `hubble observe --service-name` with `hubble observe --service`. The Hubble CLI selector flag for service filtering is `--service`; `--service-name` is not listed in the current Hubble observe help.
- Replaced `cilium clustermesh status --wait=false` with `cilium clustermesh status`. The official CLI exposes `--wait` as a boolean wait flag, but `--wait=false` is unnecessary and less portable in a troubleshooting guide.
- Replaced local `cilium kvstore`, `cilium endpoint`, and `cilium identity` commands with `kubectl exec ... cilium-dbg ...` forms. Current Cilium documentation uses `cilium-dbg` inside Cilium pods for endpoint, identity, service, and KVStore/state inspection.
- Corrected the identity-conflict explanation. ClusterMesh identities are cluster-scoped and include cluster ID information, so different numeric identities across clusters are not automatically an error. The corrected guidance checks whether remote identities are synchronized and identifiable via the `io.cilium.k8s.policy.cluster` label.
- Replaced the remote endpoint check with `cilium-dbg service list` and `cilium-dbg debuginfo` service-cache inspection, matching the official ClusterMesh troubleshooting workflow for global service backends and `externalEndpoints`.
- Updated the prerequisite wording so direct etcd access is not presented as universally required. ClusterMesh deployments commonly inspect KVStore state through Cilium and `clustermesh-apiserver` components.

## Review Notes
The global service annotations `service.cilium.io/global: "true"` and `service.cilium.io/shared: "true"` are valid. Cilium documents `shared` as implicitly true by default for global services, so keeping it explicit is technically acceptable.
