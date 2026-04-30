# Validation Summary: How to Build IPv6 Labs with Containerlab

## Status
validated

## Post Type
Tutorial / Lab Guide

## Technologies Covered
- Containerlab
- FRRouting (FRR)
- IPv6
- OSPFv3
- Docker containers
- Linux networking commands (`ip`, `sysctl`, `ping`)
- YAML topology definitions

## Sources Consulted
- Containerlab Installation docs: https://containerlab.dev/install/
- Containerlab `version` command docs: https://containerlab.dev/cmd/version/
- Containerlab `inspect` command docs: https://containerlab.dev/cmd/inspect/
- Containerlab `save` command docs: https://containerlab.dev/cmd/save/
- Containerlab `destroy` command docs: https://containerlab.dev/cmd/destroy/
- Containerlab Linux kind docs: https://containerlab.dev/manual/kinds/linux/
- Containerlab node configuration docs (`binds`, `exec`): https://containerlab.dev/manual/nodes/
- Containerlab topology definition docs (`ipv4` / `ipv6` link fields and naming behavior): https://containerlab.dev/manual/topo-def-file/
- FRRouting release page: https://frrouting.org/release/
- FRRouting Docker image page: https://hub.docker.com/r/frrouting/frr
- FRR Basic Setup docs (`/etc/frr/daemons`, `vtysh_enable`): https://docs.frrouting.org/en/stable-7.4/setup.html
- FRR OSPFv3 docs: https://docs.frrouting.org/en/latest/ospf6d.html
- Docker `docker exec` CLI reference: https://docs.docker.com/engine/reference/commandline/exec
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849

## Issues Found
- The post used `frrouting/frr:latest` from Docker Hub. FRRouting’s official release page says image hosting moved to Quay starting with FRR 8.4.2, and the Docker Hub page marks `frrouting/frr` as moved. I changed all FRR image references to `quay.io/frrouting/frr:10.6.0`, which was the latest listed FRR release on March 26, 2026.
- The Containerlab overview overstated generic IP assignment. Containerlab’s official docs show management-network addressing and kind-specific interface-address support, while this post’s `linux` nodes actually configure IPv6 addresses via `exec`. I corrected that description.
- The bind-mounted `/etc/frr/daemons` example was incomplete for a working integrated-config setup. FRR’s Basic Setup docs require enabling daemons in `/etc/frr/daemons`, and `vtysh_enable=yes` is what causes the startup workflow to load `frr.conf` via `vtysh -b`. I changed the example to a shared `configs/common/daemons` file with `zebra`, `ospf6d`, `vtysh_enable`, and the daemon option lines.
- The OSPFv3 configuration block mixed old and current FRR syntax by using `ipv6 router ospf6` with `router-id` underneath it. FRR’s current OSPFv3 docs use `router ospf6` with `ospf6 router-id`. I corrected the syntax and added the missing `configs/r2/frr.conf` example required by the topology.
- The data center example was labeled as EVPN over IPv6 even though it only defined nodes and links and contained no EVPN configuration. I changed that label to a generic spine-leaf IPv6 lab topology.
- The lifecycle and test snippets referenced behavior the shown labs did not actually provide. `containerlab save` is valid but skips `linux` nodes, the simple three-router lab did not have OSPF routes to grep for, and the OSPF test targeted `r3` even though the configured OSPF lab only had `r1` and `r2`. I annotated the `save` limitation, made the route example generic, aligned the test script to the `ipv6-ospf-lab` container names and `r2` loopback, and changed the interactive shell example to `sh` for container portability.

## Review Notes
- The post now cleanly separates a simple topology scaffold from the OSPF-configured lab. The multi-tier data center section is still only a topology skeleton; it does not include host addressing or FRR underlay/overlay routing configuration, which is acceptable after removing the EVPN claim.
- `containerlab save` remains a valid command, but Containerlab’s official documentation only lists save actions for specific supported kinds; `linux` nodes are silently skipped.
- The examples use `2001:db8::/32`, which is the correct documentation prefix for published examples.
- The topology filenames use `.yml` rather than `.clab.yml`. That is still valid because the post always passes the topology explicitly with `-t`; the `.clab.yml` pattern matters for automatic topology discovery.
