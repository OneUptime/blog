# Validation Summary: How to Run Docker macvlan Containers Across VLANs on Photon OS and a vSphere vDS

## Status

validated

## Post Type

Technical tutorial / networking deployment guide.

## Technologies Covered

- Photon OS and Linux networking
- Docker Engine, macvlan, and local IP address management
- VMware vSphere distributed switches and distributed port groups
- IEEE 802.1Q VLAN trunking and inter-VLAN routing
- iproute2 and Alpine Linux diagnostic containers

## Sources Consulted

- [Docker macvlan driver documentation](https://docs.docker.com/engine/network/drivers/macvlan/) — parent interfaces, tagged subinterfaces, MAC requirements, host isolation, and host connectivity alternatives.
- [Docker network create CLI reference](https://docs.docker.com/reference/cli/docker/network/create/) — driver, subnet, gateway, allocation range, and parent options.
- [Docker container run CLI reference](https://docs.docker.com/reference/cli/docker/container/run/) — interactive disposable containers, network selection, and static IP assignment.
- [Moby libnetwork macvlan documentation](https://github.com/moby/libnetwork/blob/master/docs/macvlan.md) — allocation pools, external routing, and VLAN interface handling.
- [Broadcom: How to enable MACVLAN traffic between VMs in vSphere](https://knowledge.broadcom.com/external/article?articleNumber=401823) — both supported security-policy combinations described in the post.
- [Broadcom: vNetwork Distributed PortGroup configuration](https://knowledge.broadcom.com/external/article/310573/) — guest VLAN tagging, trunk ranges, and security-policy behavior.
- [Photon OS 5.0: Docker Containers](https://vmware.github.io/photon/docs-v5/administration-guide/containers/docker-containers/) — Docker availability and daemon prerequisites on Photon OS.
- [Upstream iproute2 ip manual](https://raw.githubusercontent.com/iproute2/iproute2/main/man/man8/ip.8) — brief and detailed output flags and network objects.
- [RFC 5737: IPv4 Address Blocks Reserved for Documentation](https://www.rfc-editor.org/rfc/rfc5737) — the two example IPv4 networks.
- [Alpine Linux release branches](https://alpinelinux.org/releases/) — Alpine 3.22 support lifecycle.
- [Docker Official Images Alpine manifest](https://raw.githubusercontent.com/docker-library/official-images/master/library/alpine) — existence of the Alpine 3.22 image tag.

## Issues Found

No technical issues found.

The README.md was left unchanged.

## Review Notes

- All three Bash code blocks passed `bash -n` syntax checks. The Docker flags match the official CLI references, and the `ip` commands use valid syntax.
- Both allocation pools are correctly aligned /27 ranges contained within their respective /24 subnets. Each gateway belongs to its subnet and is outside the allocation pool. The example container address, `192.0.2.130`, falls within the VLAN 120 pool. The documentation-only addresses must be replaced as the post states.
- Docker documents automatic creation of dotted VLAN parent interfaces and direct host/container isolation. The post correctly separates VLAN attachment from routing and calls for external routing, return paths, and suitable firewall rules.
- Broadcom explicitly documents MAC learning enabled with forged transmits accepted and promiscuous mode rejected, or promiscuous mode and forged transmits accepted with learning disabled. MAC Address Changes can remain rejected in both configurations. The post correctly makes MAC learning conditional on platform support.
- Guest tagging requires the distributed port group and physical network to permit the selected VLANs. The per-VLAN tests and migration acceptance checks appropriately address configuration outside Docker's control.
- Alpine 3.22 remains supported for its main repository through 2027-05-01. It is not the newest branch, but the diagnostic example does not require the newest branch. The `3.22` tag is mutable; the post already recommends digest pinning for controlled production use.
- Execution assumes a running, accessible, rootful Docker daemon and an operational data NIC. Photon installation variants can differ in whether Docker starts automatically. Rootless Docker does not support macvlan.
- Review consisted of official-documentation cross-checks, shell syntax validation, and address-plan checks. No Photon VM, ESXi/vDS deployment, physical VLAN trunk, packet capture, or VM migration was exercised; environment-specific connectivity remains subject to the acceptance tests described in the post.
