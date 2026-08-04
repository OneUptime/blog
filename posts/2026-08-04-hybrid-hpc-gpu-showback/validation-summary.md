# Validation Summary: Hybrid HPC GPU Showback by Capacity, Usage, and Energy

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Slurm workload scheduling and accounting
- Slurm Trackable RESources (TRES) and GPU Generic RESources (GRES)
- NVIDIA Data Center GPU Manager (DCGM)
- NVIDIA DCGM Exporter and GPU telemetry
- Hybrid cloud and on-premises GPU showback
- GPU utilization, energy accounting, and FinOps cost allocation

## Sources Consulted

- [Slurm `sacct` command and accounting fields](https://slurm.schedmd.com/sacct.html)
- [Slurm Generic Resource scheduling and GPU accounting](https://slurm.schedmd.com/gres.html)
- [Slurm configuration reference for energy accounting](https://slurm.schedmd.com/slurm.conf.html)
- [Slurm accounting gather plugin configuration](https://slurm.schedmd.com/acct_gather.conf.html)
- [NVIDIA DCGM Exporter metric reference](https://docs.nvidia.com/datacenter/dcgm/latest/reference/dcgm-exporter-metrics.html)
- [NVIDIA DCGM field identifiers](https://docs.nvidia.com/datacenter/dcgm/latest/reference/field-identifiers.html)
- [NVIDIA DCGM release notes](https://docs.nvidia.com/datacenter/dcgm/latest/release-notes/changelog.html)
- [NVIDIA DCGM process and job statistics](https://docs.nvidia.com/datacenter/dcgm/latest/learn/core-services/process-and-job-statistics.html)
- [NVIDIA DCGM profiling metrics](https://docs.nvidia.com/datacenter/dcgm/latest/learn/modules/profiling.html)

## Issues Found

- The definition of requested or allocated GPU-hours used only the allocated GPU count. It now specifies that requested GPU-hours use the requested count and allocated GPU-hours use the allocated count.
- The post exposed `ElapsedRaw` without noting that Slurm subtracts recorded suspension time, even though allocated GPU GRES remain unavailable during suspension. The field description, extraction command, and capacity guidance now distinguish active elapsed time from the full `Start`-to-`End` reservation interval and include `Suspended` in the extract.
- The period formula assumed a constant GPU allocation without stating that limitation. It now requires resized jobs to be segmented at allocation changes and identifies Slurm's `OriginalSLUID`, `SLUID`, and `--duplicates` support for correlating and distinguishing those records.
- The DCGM section presented legacy field names as if they were the current canonical identifiers. It now explains that DCGM Exporter retains `DCGM_FI_DEV_GPU_UTIL` and `DCGM_FI_DEV_POWER_USAGE` as configured metric names while current DCGM documentation calls the underlying fields `DCGM_FI_DEV_GPU_UTIL_RATIO` and `DCGM_FI_DEV_BOARD_POWER_WATTS`.
- The energy formula treated Slurm's already-aggregated `ConsumedEnergyRaw` job value like a cumulative device counter requiring a delta. The formula now converts the Slurm job total directly and applies differencing, reset, and wrap handling only to the DCGM cumulative counter.
- The energy-cost variable names implied that every source measured GPU-board energy. They now use boundary-neutral names because Slurm energy may be node-scoped while DCGM device telemetry is GPU-scoped.

## Review Notes

The `sacct` command is intentionally a simplified extract. For production machine parsing, consider parsable output and an explicit allocation-only grain; requeue histories may require `--duplicates` plus identifiers such as `DBIndex`, `Submit`, or `SLUID`. DCGM metric availability remains dependent on the GPU, driver, permissions, and exporter configuration, which the post appropriately covers with support and telemetry-gap caveats.
