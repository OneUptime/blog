# Validation Summary: Optimize Calico VPP Host Networking

## Status
validated

## Post Type
Tutorial / Performance tuning guide

## Technologies Covered
- Calico VPP (CNI dataplane)
- VPP (Vector Packet Processing) startup.conf configuration
- DPDK (Data Plane Development Kit)
- Linux kernel boot parameters (isolcpus, nohz_full, rcu_nocbs)
- Hugepages (sysctl / sysfs)
- NUMA-aware memory allocation
- Receive Side Scaling (RSS)
- Kubernetes / kubectl

## Sources Consulted
- VPP startup.conf reference: https://s3-docs.fd.io/vpp/24.10/configuration/reference.html
- VPP DPDK plugin documentation: https://s3-docs.fd.io/vpp/24.10/developer/plugins/dpdk.html
- VPP buffers section reference (buffers-per-numa, page-size, default data-size)
- VPP CLI reference (show hardware-interfaces, show interface rx-placement, show runtime, show dpdk version)
- Calico VPP installation guide: https://docs.tigera.io/calico/latest/getting-started/kubernetes/vpp/getting-started (calico-vpp-dataplane namespace, calico-vpp-node DaemonSet, vpp container)
- Linux kernel admin-guide: kernel-parameters.txt (isolcpus, nohz_full, rcu_nocbs)
- Linux sysctl(8) / sysctl.d(5) — vm.nr_hugepages key
- Linux hugepage sysfs interface: /sys/devices/system/node/nodeN/hugepages/hugepages-2048kB/nr_hugepages

## Issues Found
1. **Incorrect sysctl key in hugepages config.** The line `echo "nr_hugepages = 1536" > /etc/sysctl.d/vpp-hugepages.conf` is incorrect — sysctl files require the full dotted key. Fixed to `vm.nr_hugepages = 1536` so the setting is actually applied at boot.
2. **`vppctl show dpdk version` does not show RX queues.** That command prints the DPDK library version VPP was built against, not interface/queue configuration. Replaced with `vppctl show hardware-interfaces`, which displays per-interface RX/TX queue counts.
3. **`vppctl show dpdk statistics` is not a valid VPP CLI command.** Replaced with `vppctl show interface rx-placement` (which queue is handled by which worker) and `vppctl show runtime` (per-worker, per-node packet counters) — the canonical commands for verifying RSS distribution across VPP workers.
4. **Removed fabricated `punt { punt-pool-size 2097152 }` block.** The VPP punt section configures socket-based punt (e.g., `socket <path>`); `punt-pool-size` is not a documented VPP startup.conf directive. Removed to avoid leading readers into a configuration parse error.

## Review Notes
- VPP startup configuration syntax for the `cpu`, `dpdk`, and `buffers` sections (workers, corelist-workers, main-core, num-rx-queues, num-tx-queues, num-rx-desc, num-tx-desc, buffers-per-numa, page-size) is correct. `corelist-workers 2-5` with `workers 4` is consistent.
- `no-tx-checksum-offload` at the top level of the `dpdk { }` block is valid (applies globally) — VPP also accepts it inside a per-`dev` block.
- The kernel boot parameters `isolcpus`, `nohz_full`, and `rcu_nocbs` are correct, though `isolcpus=` is documented as deprecated in newer kernels in favour of cpuset/cgroup-based isolation; it still works and is widely used for DPDK/VPP workloads.
- The benchmark results table is presented as a template — numbers should be treated as illustrative rather than guaranteed; left as-is because the post labels it a template.
- The Calico VPP DaemonSet name (`calico-vpp-node`) and namespace (`calico-vpp-dataplane`) and container name (`vpp`) match the upstream Calico VPP install manifest.
- `page-size 2m` is accepted by VPP's buffers parser (case-insensitive, also accepts `2M`, `1G`, etc.); left as written.
