# Validation Summary: How to Secure Cluster Discovery Communications in Talos Linux

## Status
validated

## Post Type
Guide / Hardening tutorial

## Technologies Covered
- Talos Linux (v1.9 era)
- Sidero Labs Discovery Service (`siderolabs/discovery-service`, `siderolabs/discovery-client`)
- `talosctl` CLI (gen secrets, patch machineconfig, get resources)
- Talos machine configuration (`v1alpha1`, `cluster.discovery.registries.service.endpoint`)
- Kubernetes NetworkPolicy (`networking.k8s.io/v1`)
- iptables firewall rules
- NGINX (TLS termination / gRPC reverse proxy)
- HashiCorp Vault (illustrative)
- KubeSpan (referenced via peer status resource)
- AES-256-GCM encryption (cluster secret–derived keys)

## Sources Consulted
- Talos discovery docs: https://docs.siderolabs.com/talos/v1.9/configure-your-talos-cluster/system-configuration/discovery
- Talos v1alpha1 config reference: https://docs.siderolabs.com/talos/v1.9/reference/configuration/v1alpha1/config/
- Talos v1alpha1 source (`DiscoveryRegistriesConfig`, `RegistryServiceConfig` with `endpoint` field): https://raw.githubusercontent.com/siderolabs/talos/main/pkg/machinery/config/types/v1alpha1/v1alpha1_types.go
- Discovery service repo (gRPC on 3000, HTTP on 3001, encrypted blobs): https://github.com/siderolabs/discovery-service
- Discovery client source (32-byte AES-GCM key = AES-256-GCM, GCM for affiliates, ECB for endpoints): https://raw.githubusercontent.com/siderolabs/discovery-client/main/pkg/client/client.go
- Cluster resource definitions: `pkg/machinery/resources/cluster/identity.go`, `info.go`, `member.go`, `affiliate.go`
- KubeSpan peer status resource (`KubeSpanPeerStatuses.kubespan.talos.dev`): `pkg/machinery/resources/kubespan/peer_status.go`
- Talos CLI reference for `talosctl gen secrets` and `talosctl patch machineconfig`: https://docs.siderolabs.com/talos/v1.9/reference/cli/
- Talos config patches guide (inline JSON / strategic merge auto-detection): https://docs.siderolabs.com/talos/v1.9/configure-your-talos-cluster/system-configuration/patching
- Existing validated sibling posts for resource naming consistency (e.g., `set-up-custom-discovery-registries-in-talos-linux`, `understand-talos-linux-resource-definitions`)

## Issues Found

1. **Non-existent resource `discoveredmembers`.** Talos does not register a `DiscoveredMembers` resource — discovered cluster members live in the `Members.cluster.talos.dev` resource. Replaced all four uses of `talosctl get discoveredmembers` with `talosctl get members` (in the monitoring script, the audit-report script, and the incident-response snippet). This matches the fix applied in the already-validated `set-up-custom-discovery-registries-in-talos-linux` post.

2. **Non-existent resource `clusteridentity`.** There is no `ClusterIdentity` resource. The cluster ID lives in the `Infos.cluster.talos.dev` resource (`spec.clusterId`); per-node identity lives in `Identities.cluster.talos.dev` (`spec.nodeId`). Both uses of `talosctl get clusteridentity` were changed to `talosctl get infos`, consistent with the fix in the validated `understand-talos-linux-resource-definitions` post.

3. **Wrong jq path for cluster ID.** The verification loop used `jq -r '.[0].spec.id'`, but Talos JSON output is newline-delimited objects (not a top-level array) and the field is `clusterId`, not `id`. Changed to `jq -r '.spec.clusterId'`.

4. **`jq 'length'` on NDJSON.** `talosctl get … -o json` emits one JSON object per resource separated by newlines. `jq 'length'` would report the number of top-level keys of the *first* object rather than the member count. Changed to `jq -s 'length'` (slurp into an array, then count).

5. **NGINX `proxy_pass http://…` to a gRPC backend.** The Sidero discovery service speaks gRPC on port 3000 (port 3001 is only the human-readable HTTP debug UI). Talos nodes connect over gRPC, so a plain `proxy_pass http://127.0.0.1:3000;` would not actually proxy the discovery traffic. Switched the access-logging server block to `listen 443 ssl http2;` with `grpc_pass grpc://127.0.0.1:3000;` and `grpc_set_header …` directives, and added `http2` to the TLS-hardening server block (since gRPC requires HTTP/2). Also corrected the resource name `kubespanpeerstatus` → `kubespanpeerstatuses` in the audit-report block to match `KubeSpanPeerStatuses.kubespan.talos.dev`.

## Review Notes
- The encryption claim "AES-256-GCM" is accurate: the discovery client uses a 32-byte key with `cipher.NewGCMWithRandomNonce` for affiliate payloads. (Note: endpoint data is separately encrypted with AES-ECB to allow server-side deduplication — the post does not need to call this out, but it is worth being aware of.)
- The discovery endpoint URL `https://discovery.talos.dev/` and the default-enabled service registry are current.
- `talosctl patch machineconfig --patch '{…json…}'` works because Talos auto-detects between strategic-merge and JSON-patch formats.
- `kubespanpeerstatus` (singular) is sometimes accepted by talosctl's fuzzy resource matching but the canonical/registered short name is the plural `kubespanpeerstatuses`; the canonical form was used for the audit script.
- The iptables example uses `-d <discovery-ip>` on the `INPUT` chain, which only makes sense when the rules are loaded on the discovery host itself (not on an intermediate firewall). This is a stylistic ambiguity rather than a technical error and was left as-is.
- The "Cluster Isolation" section's claim that the cluster ID prevents cross-cluster visibility is accurate — the discovery service partitions affiliates by cluster ID, and only encrypted blobs are stored server-side.
