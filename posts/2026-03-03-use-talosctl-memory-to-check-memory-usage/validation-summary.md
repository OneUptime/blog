# Validation Summary: How to Use talosctl memory to Check Memory Usage

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Talos Linux
- talosctl CLI
- Linux memory accounting
- Kubernetes resource requests and limits
- Kubernetes node memory pressure and pod metrics
- Bash scripting

## Sources Consulted
- Sidero Labs Talos CLI reference for `talosctl memory`, `talosctl processes`, `talosctl mounts`, `talosctl stats`, `talosctl usage`, and `talosctl dmesg`: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Sidero Labs Talos for Linux Admins guide, including `free` to `talosctl memory` mapping and Talos API-driven management model: https://docs.siderolabs.com/talos/v1.12/learn-more/talos-for-linux-admins
- Upstream Talos `talosctl memory` implementation, confirming output columns and MB conversion: https://raw.githubusercontent.com/siderolabs/talos/main/cmd/talosctl/cmd/talos/memory.go
- Linux kernel `/proc/meminfo` documentation for `MemAvailable`: https://docs.kernel.org/filesystems/proc.html
- Kubernetes resource management documentation for scheduling by requests and memory limit enforcement: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes node-pressure eviction documentation for `MemoryPressure` and `memory.available`: https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- Kubernetes `kubectl top pod` reference for `--sort-by` and `--field-selector`: https://v1-34.docs.kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/

## Issues Found
- The sample `talosctl memory` output omitted the `NODE` and `AVAILABLE` columns and showed values with `MB` suffixes. Updated the example to match current `talosctl memory` output, which prints columns `NODE TOTAL USED FREE SHARED BUFFERS CACHE AVAILABLE` with values already converted to MB.
- The post described available memory as the sum of free memory plus reclaimable cache and buffers. Updated this to describe it as the kernel's estimate of memory available for new applications without swapping, matching Linux `MemAvailable` semantics.
- The post said cached and buffered memory can be reclaimed immediately. Softened this to "much of this memory can usually be reclaimed" because not all page cache or reclaimable memory is instantly reclaimable.
- The multiple-node output was described as side-by-side. Updated this to say each node is shown in a separate row.
- The post used `talosctl disks --nodes ...` for disk usage. Replaced it with `talosctl usage --nodes ...`, which is the current Talos command for disk usage.
- The alerting script parsed the wrong columns because current `talosctl memory` output starts with a `NODE` column. Updated parsing to use `TOTAL` from column 2, `USED` from column 3, and `AVAILABLE` from column 8.
- The trend script parsed the wrong columns and omitted available memory. Updated the CSV header and parsing to match current output columns.

## Review Notes
The guide is technically relevant and broadly accurate after the corrections. The example scripts are still intentionally lightweight and assume normal tabular `talosctl memory` output; production monitoring should prefer metrics collection through Kubernetes or a monitoring stack instead of parsing human-readable CLI output.
