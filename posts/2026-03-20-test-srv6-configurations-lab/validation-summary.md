# Validation Summary: How to Test SRv6 Configurations in Lab Environments

## Status
validated

## Post Type
Tutorial / lab guide

## Technologies Covered
- SRv6
- Linux network namespaces
- iproute2 IPv6 routing and SRv6 `seg6` / `seg6local`
- IPv6 static routing
- Containerlab
- FRRouting
- Bash
- tcpdump

## Sources Consulted
- RFC 8986, Segment Routing over IPv6 (SRv6) Network Programming: https://www.rfc-editor.org/rfc/rfc8986.html
- Linux `ip-route(8)` manual page for `seg6` and `seg6local` route syntax: https://man7.org/linux/man-pages/man8/ip-route.8.html
- Linux kernel Seg6 sysctl documentation: https://docs.kernel.org/5.17/networking/seg6-sysctl.html
- Containerlab topology definition documentation: https://containerlab.dev/manual/topo-def-file/
- Containerlab Linux kind documentation: https://containerlab.dev/manual/kinds/linux/
- Containerlab `exec` command documentation: https://containerlab.dev/cmd/exec/
- FRRouting Zebra SRv6 documentation: https://docs.frrouting.org/en/latest/zebra.html
- FRRouting SHARP SRv6 local route examples: https://docs.frrouting.org/en/latest/sharp.html
- Local command help from `iproute2-6.1.0` via `ip -6 route help` and iputils `ping -h`

## Issues Found
- The Linux namespace example used `encap seg6local action End.DT6 vrftable 254` without creating a VRF device or enabling VRF strict mode. Changed it to `table 254`, which matches a main-table End.DT6 lab.
- The test script pinged `End` and `End.DT6` SIDs directly. Linux `End` local behavior expects an SRH with non-zero Segments Left, and `End.DT6` decapsulates an inner IPv6 packet, so direct ICMP echo tests to those SIDs are not valid. Replaced those checks with route-installation checks for the local SIDs.
- The service-chain test targeted `fd00:99::1`, but the lab did not configure that service address or enough return routing. Added `fd00:99::1/128` on R3 and return routes for the link subnets.
- The SRv6 encapsulation route on R1 did not specify the next hop toward the first segment. Added `via fd00:12::2` so the outer packet is forwarded to R2 instead of relying on on-link resolution for an off-link SID.
- SRH processing was enabled only globally before veth interfaces were created. Added `default.seg6_enabled=1` and explicit per-interface `seg6_enabled=1` settings for the lab links.
- The SRH capture test started `tcpdump` in the background but did not wait for it, so the test could pass without proving that an SRH was captured. Added a `capture_srh` helper that uses `timeout`, sends a test ping, waits for `tcpdump`, and fails if either step fails.
- Replaced `ping6` examples with `ping -6`, matching the current iputils command form.

## Review Notes
The embedded Bash snippets pass `bash -n`. I did not execute the full namespace lab because it requires privileged network namespace and routing changes. The Containerlab snippet matches documented topology and `exec` syntax, but a future improvement would be to pin the FRRouting image version and include the referenced `frr.conf` and `daemons` files for a fully reproducible lab.
