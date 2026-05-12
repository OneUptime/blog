# Validation Summary: Secure Calico VPP Host Networking

## Status
validated

## Post Type
Guide (security hardening guide)

## Technologies Covered
- Calico VPP (Calico's VPP dataplane)
- VPP (Vector Packet Processing) / FD.io
- DPDK (Data Plane Development Kit)
- Kubernetes (NetworkPolicy, SecurityContext, ConfigMap)
- Linux capabilities (SYS_ADMIN, NET_ADMIN, IPC_LOCK)
- Hugepages
- VPP ACL plugin
- vppctl CLI

## Sources Consulted
- Calico VPP documentation: https://docs.tigera.io/calico/latest/reference/vpp/
- Calico VPP project repository: https://github.com/projectcalico/vpp-dataplane
- FD.io VPP documentation: https://fd.io/docs/vpp/
- VPP CLI socket reference (`/run/vpp/cli.sock` is the documented default for the unix CLI listener)
- VPP startup.conf reference (api-trace stanza)
- VPP ACL plugin documentation (`show acl-plugin interface`)
- DPDK documentation on required Linux capabilities for userspace drivers
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes namespace metadata label (`kubernetes.io/metadata.name`) auto-applied since 1.21

## Issues Found
No technical issues found.

All commands, paths, namespace/daemonset names, and configuration syntax check out:
- `/run/vpp/cli.sock` is the default VPP CLI listener socket path.
- VPP/DPDK needing root + NET_ADMIN/SYS_ADMIN/IPC_LOCK is consistent with DPDK userspace driver and hugepage requirements.
- `vppctl show acl-plugin interface` is a valid command exposed by the VPP ACL plugin.
- Calico VPP resource names (`calico-vpp-dataplane` namespace, `calico-vpp-node` daemonset, `vpp` container, `calico-vpp-config` ConfigMap) match the project defaults.
- `api-trace { on }` is the correct stanza form for VPP `startup.conf`.
- The NetworkPolicy manifest uses `networking.k8s.io/v1`, a valid `podSelector`, and the `kubernetes.io/metadata.name` namespace label (auto-applied by Kubernetes since 1.21).

## Review Notes
- Section 6 is titled "Audit VPP CLI Access" but the demonstrated mechanism (`api-trace { on }`) records binary API calls, not text CLI commands typed via `vppctl`. The inline comment ("VPP can log API calls") is accurate, so the technical content is correct — the heading is just slightly broader than what `api-trace` actually captures. Worth tightening in a future revision (either rename the section to "Audit VPP API Access" or add a note that CLI-over-API still flows through the binary API and is therefore captured).
- The capability set (SYS_ADMIN + NET_ADMIN + IPC_LOCK) is a reasonable minimum but the exact required capabilities can vary with the chosen DPDK PMD and uio/vfio mode. Some deployments additionally need `SYS_NICE` (for thread affinity) or `SYS_RAWIO`. The guidance to avoid `privileged: true` and prefer explicit capabilities is sound.
- "VPP does this by default" regarding hugepage clearing between uses is a softer claim than the rest of the post — VPP reuses buffers from its own pool rather than wiping pages, so the practical mitigation is really "don't leak the hugepage backing files and don't enable coredumps." The `COREDUMP` configmap check is a reasonable surrogate.
- No version pinning in the post; recommendations should remain valid for current Calico VPP releases at the time of review.
