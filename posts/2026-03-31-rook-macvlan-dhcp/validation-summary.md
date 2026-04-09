# Validation Summary: How to Configure Macvlan with DHCP for Rook-Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (storage orchestrator for Kubernetes)
- Ceph (distributed storage system)
- Macvlan (CNI network plugin)
- DHCP IPAM (CNI IP address management plugin)
- Multus CNI (multi-network plugin for Kubernetes)
- Kubernetes NetworkAttachmentDefinitions (NADs)
- ISC DHCP Server

## Sources Consulted
- CNI DHCP plugin official documentation: https://www.cni.dev/plugins/current/ipam/dhcp/
- Rook network providers documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/network-providers/
- Multus CNI documentation: https://k8snetworkplumbingwg.github.io/multus-cni/
- k8snetworkplumbingwg/plugins GitHub repository (for container image details)
- CNI plugins systemd socket unit (for DHCP socket path verification)
- Reference DHCP daemon DaemonSet implementations (OpenSourceLAN, dougbtv gist, RKE2 issue #3917)

## Issues Found

### 1. DHCP daemon container used `args` instead of `command` (Fixed)
**What was wrong:** The DaemonSet container for the DHCP daemon specified `args: ["dhcp", "daemon"]` without a `command` field. In Kubernetes, `args` overrides the Docker CMD but preserves the ENTRYPOINT. The `ghcr.io/k8snetworkplumbingwg/cni-plugins` image has an `entrypoint.sh` ENTRYPOINT, so the container would execute `/entrypoint.sh dhcp daemon` instead of the DHCP daemon binary directly.

**What was changed:** Replaced `args: ["dhcp", "daemon"]` with `command: ["/usr/bin/dhcp", "daemon"]` to explicitly invoke the DHCP binary, bypassing the image's ENTRYPOINT.

**Why:** Without this fix, the DHCP daemon would not start correctly, and pods requesting DHCP-based IPAM would fail to obtain IP addresses.

### 2. Unnecessary `hostIPC: true` in DaemonSet (Fixed)
**What was wrong:** The DaemonSet pod spec included `hostIPC: true`, which is not required by the DHCP daemon and grants unnecessary access to the host's IPC namespace.

**What was changed:** Removed `hostIPC: true` from the pod spec. Only `hostPID: true` and `hostNetwork: true` are retained, as they are needed for `/proc` netns access and host network DHCP traffic respectively.

**Why:** Including unnecessary host namespace privileges increases the security attack surface without functional benefit.

## Review Notes
- The binary path `/usr/bin/dhcp` used in both the init container and main container may vary depending on the version/tag of the `ghcr.io/k8snetworkplumbingwg/cni-plugins` image. Some versions place binaries at `/usr/src/cni/bin/` instead. Users should verify the binary location for their specific image version.
- The image tag `:latest` is used for both init and main containers. For production deployments, pinning to a specific version tag is recommended.
- The DHCP leases file path `/var/lib/dhcpd/dhcpd.leases` in the monitoring section is specific to RHEL-based systems. On Debian/Ubuntu systems, the path is typically `/var/lib/dhcp/dhcpd.leases`.
- Some reference implementations include a stale socket cleanup step (`rm -f /run/cni/dhcp.sock`) before starting the DHCP daemon to prevent startup failures after unclean shutdowns. This could be a useful addition.
- The `status.podIP` in the jsonpath command returns the pod's primary (pod network) IP, not the Multus-attached network IP. This is fine for identifying pods but readers should be aware that the Multus network IP must be obtained from inside the pod or from the `k8s.v1.cni.cncf.io/network-status` annotation.
