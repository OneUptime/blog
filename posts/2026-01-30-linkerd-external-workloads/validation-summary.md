# Validation Summary: How to Create Linkerd External Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linkerd mesh expansion
- Linkerd ExternalWorkload resources
- Kubernetes Services and EndpointSlices
- Linkerd mTLS and SPIRE workload identity
- Linkerd policy resources
- iptables traffic redirection

## Sources Consulted
- Linkerd ExternalWorkload reference: https://linkerd.io/2-edge/reference/external-workload/
- Linkerd adding non-Kubernetes workloads guide: https://linkerd.io/2-edge/tasks/adding-non-kubernetes-workloads/
- Linkerd authorization policy reference: https://linkerd.io/2-edge/reference/authorization-policy/
- Linkerd restricting access to services guide: https://linkerd.io/2-edge/tasks/restricting-access/
- Linkerd CLI reference: https://linkerd.io/2-edge/reference/cli/
- Linkerd releases and versions: https://linkerd.io/releases/

## Issues Found
- The prerequisites claimed Linkerd 2.14+ and used `linkerd viz check` to verify External Workload support. Current documentation exposes mesh expansion in newer Linkerd docs and the relevant verification is the `ExternalWorkload` CRD, so the prerequisite wording and command were updated.
- Several `ExternalWorkload` examples omitted the required `spec.meshTLS` stanza or used non-documented identity values. Added `meshTLS.identity` and `meshTLS.serverName` values matching the documented SPIFFE/SPIRE flow.
- The post described `spec.probes` on `ExternalWorkload`, but the open-source Linkerd ExternalWorkload spec documents `meshTLS`, `workloadIPs`, and `ports`, with readiness represented in status conditions. Removed the unsupported probe examples and adjusted the health-check guidance.
- The post introduced a Linkerd `WorkloadGroup` resource, which is not an open-source Linkerd mesh expansion API. Replaced it with a labeled fleet of individual `ExternalWorkload` resources.
- The identity setup used Kubernetes service account tokens and the Linkerd identity controller for off-cluster VMs. Current Linkerd mesh expansion documentation uses SPIRE for external workload identity, so the identity and proxy setup sections were rewritten around SPIRE, shared trust anchors, and documented proxy environment variables.
- The proxy installation used `linkerd proxy-init --external-workload` and a YAML proxy config that are not documented Linkerd CLI interfaces. Replaced them with the documented proxy-binary extraction, iptables redirection pattern, and `LINKERD2_PROXY_*` environment variables.
- The complete hybrid example omitted `meshTLS` fields on external database/cache workloads and authorized a service account that was never created. Added the required ExternalWorkload identity fields and an `api-server` ServiceAccount.
- The policy example used `policy.linkerd.io/v1beta3` for `Server` and selected pods even though the protected workload was external. Updated the example to the documented mesh expansion policy API version and `externalWorkloadSelector`.
- The verification command attempted `curl -v http://postgres:5432/` against PostgreSQL. Replaced it with a TCP connectivity check using `nc -zv`.
- Troubleshooting and monitoring commands referenced stale certificate paths and unsupported `externalworkload` viz resource commands. Updated them to SPIRE trust-anchor paths, SPIRE/proxy service checks, service-level metrics, and `linkerd diagnostics endpoints`.

## Review Notes
The post is now aligned with open-source Linkerd mesh expansion documentation. Buoyant Enterprise for Linkerd provides additional automation such as ExternalGroup/proxy harness workflows, but those are separate enterprise APIs and were intentionally not presented as open-source Linkerd resources.
