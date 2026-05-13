# Validation Summary: Optimize Calico VPP Technical Details

## Status
validated

## Post Type
Technical optimization guide / tutorial

## Technologies Covered
- Calico VPP (Project Calico's VPP dataplane)
- FD.io VPP (Vector Packet Processing)
- DPDK (Data Plane Development Kit)
- Kubernetes / kubectl
- Linux CPU governors and C-state management
- iperf3

## Sources Consulted
- [FD.io VPP Configuration Reference (v23.02)](https://s3-docs.fd.io/vpp/23.02/configuration/reference.html) — DPDK plugin and ACL plugin parameter syntax
- [FDio/vpp startup.conf example on GitHub](https://github.com/FDio/vpp/blob/master/src/vpp/conf/startup.conf) — canonical buffers / cpu / dpdk stanza syntax
- [VPP Multi-threading docs (v22.02)](https://s3-docs.fd.io/vpp/22.02/developer/corearchitecture/multi_thread.html) — cpu stanza (main-core, corelist-workers, skip-cores, workers)
- [FD.io VPP ACL plugin CLI commands](https://docs.fd.io/vpp/18.10/clicmd_src_plugins_acl.html) — valid `show acl-plugin ...` subcommands
- [VPP startup.conf documentation](https://my-vpp-docs.readthedocs.io/en/latest/gettingstarted/users/configuring/startup.html) — overall startup.conf format

## Issues Found

1. **Buffer pool calculation formula was mathematically wrong (Optimization 1).**
   The original formula `10e9 × 0.001 / 1000 × 8 = 1,250,000` does not evaluate to 1,250,000 under any standard order of operations (it yields 80,000 left-to-right, or 1,250 with proper bandwidth-delay-product math). The author appears to have conflated total bits/bytes with total packets, and the multiplier should be a divisor.
   **Fix:** Rewrote the formula as the standard bandwidth-delay product in packets: `Total_buffers = (NIC_line_rate × buffer_hold_time) / (avg_packet_size × 8)`, and replaced the example with realistic numbers (10 Gbps, 100 ms hold, 64 B worst-case packets) that actually produce ≈ 2 M buffers.

2. **Invalid `vppctl show acl-plugin statistics` command (Optimization 4).**
   `statistics` is not a valid `show acl-plugin` subcommand. The valid subcommands are `acl`, `interface`, `tables`, `sessions`, `memory`, `macip acl`, `macip interface`, `lookup context`, `lookup user`, and `decode 5tuple`.
   **Fix:** Replaced with `show acl-plugin tables` and `show acl-plugin memory`, which together cover the ACL hash table state and memory usage the author was asking about.

3. **`hash-lookup-mheap-size` is not a real ACL plugin parameter (Optimization 4).**
   Per the VPP configuration reference, the actual ACL plugin tuning knobs are `hash-lookup-heap-size`, `hash-lookup-hash-buckets`, and `hash-lookup-hash-memory`. `hash-lookup-mheap-size` does not exist.
   **Fix:** Replaced `hash-lookup-mheap-size 4G` with the correct `hash-lookup-hash-memory 64M` and added `hash-lookup-hash-buckets 65536` to round out the hash-table sizing knobs.

4. **Invalid `rss { ipv4-tcp ipv4-udp … }` block in DPDK config (Optimization 5).**
   The VPP DPDK `dev` stanza does not accept a free-form `rss { … }` block listing protocol names. Per the official configuration reference, RSS is enabled implicitly when `num-rx-queues > 1`, and the RSS hash function is chosen automatically based on NIC capability.
   **Fix:** Removed the invalid `rss { … }` block and added a comment explaining that RSS is enabled implicitly by setting `num-rx-queues`.

5. **`skip-cores 0` with misleading comment (Optimization 5).**
   `skip-cores N` skips N CPU cores during *automatic* worker pinning; it has no relationship to hyperthreading siblings, and `skip-cores 0` is a no-op (skip zero cores). The comment "Disable hyperthreading siblings for consistency" did not describe what the directive does, and the directive is redundant when `corelist-workers` lists cores explicitly.
   **Fix:** Removed the `skip-cores 0` line and replaced the misleading comment with accurate guidance: list only physical-core IDs in `corelist-workers`, or isolate them via the kernel command line / `nosmt`.

6. **Minor: `page-size 2m` → `page-size 2M` (Optimization 1).**
   The canonical example in the upstream `startup.conf` uses uppercase suffixes (e.g. `8M`). The parser is generally case-insensitive, but uppercase matches the documented form.
   **Fix:** Changed `2m` to `2M`.

## Review Notes

- The high-level guidance (buffer sizing tradeoffs, RX/TX descriptor sizing, CPU governor / C-state pinning, ACL hash pre-sizing, iperf3 benchmarking) is technically sound and the remaining configuration syntax (`buffers { … }`, `dpdk { dev … }`, `cpu { … }`, `num-rx-queues`/`num-tx-queues`/`num-rx-desc`/`num-tx-desc`) matches the upstream VPP reference.
- The `ds/calico-vpp-node` DaemonSet name and the `calico-vpp-dataplane` namespace match the upstream `projectcalico/vpp-dataplane` deployment.
- The bash loops in Optimization 3 (performance governor, C-state disable) are correct; the C-state disable loop intentionally swallows errors with `2>/dev/null` because some `state*/disable` files are read-only.
- The iperf3 image (`networkstatic/iperf3`) and CLI flags (`-c`, `-t`, `-P`, `-J`) are valid.
- Worth noting for the author: the ACL plugin `hash-lookup-hash-buckets` value is rounded up to the next power of two by VPP, so 65536 is a "natural" value; arbitrary values still work but get rounded.
