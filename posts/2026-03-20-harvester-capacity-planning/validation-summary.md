# Validation Summary: How to Plan Harvester Capacity

## Status
validated

## Post Type
Guide

## Technologies Covered
- Harvester
- Longhorn
- Kubernetes
- KubeVirt
- Bash shell scripting
- VMware `govc`

## Sources Consulted
- Harvester Hardware and Network Requirements: https://docs.harvesterhci.io/v1.6/install/requirements/
- Harvester Resource Overcommit: https://docs.harvesterhci.io/v1.7/vm/resource-overcommit/
- Harvester Host Management: https://docs.harvesterhci.io/v1.7/host/
- Harvester Storage Network: https://docs.harvesterhci.io/v1.6/advanced/storagenetwork/
- Longhorn Architecture and Concepts: https://longhorn.io/docs/1.11.1/concepts/
- Longhorn Settings Reference: https://longhorn.io/docs/1.11.1/references/settings/
- Longhorn Node Space Usage: https://longhorn.io/docs/1.11.1/nodes-and-volumes/nodes/node-space-usage/
- Longhorn Knowledge Base, node CR inspection example: https://longhorn.io/kb/troubleshooting-resolving-backing-image-unavailability-issue/
- KubeVirt Lifecycle Guide: https://kubevirt.io/user-guide/user_workloads/lifecycle/
- Kubernetes `kubectl top node` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_node/
- Intel Xeon Gold 6256 specifications: https://www.intel.com/content/www/us/en/products/sku/198655/intel-xeon-gold-6256-processor-33m-cache-3-60-ghz/specifications.html

## Issues Found
- The HA diagram said "Add 33% HA Buffer," which is not generally correct for all `N+1` or `N+2` designs. I changed it to a generic HA buffer label.
- The CPU sizing snippet was mathematically wrong. It used floor division for `100 / 3` and then multiplied by node count, producing `49` instead of the intended `17`. I replaced it with ceiling division and the correct `N+1` per-node calculation.
- The CPU example named Intel Xeon Gold 6256 as a 20-core processor, but Intel lists that model as a 12-core CPU. I removed the incorrect model reference.
- The memory section recommended overcommit "with swap or balloon driver," but Harvester documents that classic memory overcommit or memory ballooning is not supported. I corrected the explanation and kept the guidance conservative.
- The memory calculator produced an arbitrary "add 16 GB" recommendation after already accounting for system overhead. I changed it to report usable per-node RAM and instruct readers to round up to the next standard size.
- The storage formula implied multiplying by an "overprovisioning factor" as part of required capacity. Longhorn documents over-provisioning as a scheduling setting, while actual disk growth is driven by replicas, snapshots, and reserved free space. I rewrote the formula and notes to match Longhorn’s documented behavior.
- The storage notes claimed a fixed 100 GB system volume per node. I replaced that with Harvester’s documented production disk guidance and Longhorn’s documented default free-space buffer.
- The network section said 1 GbE is typically sufficient for the management network, which conflicts with Harvester’s production requirement of 10 GbE minimum network speed. I corrected the production guidance.
- The network section described "3 nodes failing simultaneously" as the Longhorn storage replanning case. That is not a valid general HA planning scenario. I changed it to model single node or disk failure and replica rebuild traffic.
- The worksheet implied fixed three-NIC physical separation and only odd node counts (`3, 5, 7`). Harvester supports more flexible network layouts and `3+` node clusters, so I generalized those entries.
- The Longhorn storage command hard-coded `default-disk-1`, which is not portable across clusters because disk names vary. I replaced it with a generic `nodes.longhorn.io` inspection command that matches Longhorn documentation.
- The VM density commands counted header rows, which inflated totals by one for both VMs and nodes. I added `--no-headers` so the counts are numerically correct.
- The `kubectl top` examples were aligned to the documented `kubectl top node` form.

## Review Notes
The sizing ratios in the post remain planning heuristics rather than vendor-mandated defaults. The Harvester-specific behavior, commands, and product requirements are now technically aligned with current documentation, but final sizing should still be validated against real workload benchmarks and growth expectations.
