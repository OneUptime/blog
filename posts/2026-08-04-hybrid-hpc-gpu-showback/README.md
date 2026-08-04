# Hybrid HPC GPU Showback by Capacity, Usage, and Energy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Showback, FinOps, HPC, GPU, Slurm, NVIDIA DCGM, Sustainability, Cost Allocation

Description: Combine scheduler allocations, GPU telemetry, and measured energy to show hybrid HPC cost without rewarding reserved but idle capacity.

---

GPU showback needs to answer two questions without confusing them: who reserved scarce accelerator capacity, and how efficiently did they use it? A job can reserve four GPUs for ten hours while doing little work. The capacity still could not serve another job, so utilization should not make the reserved cost disappear.

For a hybrid environment, normalize cloud and on-premises money into cost pools, use scheduler allocation as the primary capacity driver, and publish utilization and energy as additional evidence.

## Define the Four Measures Precisely

The terms are related but not interchangeable:

- **Requested or allocated GPU-hours:** the respective requested or allocated GPU count multiplied by elapsed wall-clock hours.
- **Wall time:** elapsed time between the job's start and end, without multiplying by GPU count.
- **Utilization:** sampled GPU activity over time, reported separately for efficiency or used within a specifically defined variable-cost pool.
- **Energy:** power integrated over time, expressed in kilowatt-hours and multiplied by an approved electricity rate.

For a job allocated four GPUs for ten hours:

```text
wall time = 10 hours
allocated GPU-hours = 4 * 10 = 40 GPU-hours
```

If mean GPU utilization is 25 percent, the job still reserved 40 GPU-hours. Calling that 10 billable GPU-hours would leave 30 unavailable GPU-hours with no owner.

## Treat the Scheduler as the Capacity Ledger

Slurm accounting supplies job identity, account, allocation, and elapsed time. In `sacct`:

- `Account` is the account associated with the job;
- `ReqTRES` contains requested trackable resources;
- `AllocTRES` contains resources allocated after the job starts;
- `ElapsedRaw` is Slurm's elapsed time in seconds and excludes recorded suspension time;
- `Suspended` is the amount of time the job or step was suspended;
- `ConsumedEnergyRaw` is total energy in joules when energy accounting is available.

Use `AllocTRES` for actual reserved capacity after start. Use requested resources separately to diagnose scheduling behavior, pending demand, or differences between requests and allocations.

For capacity time, use the `Start` and `End` interval rather than `ElapsedRaw` alone. Slurm excludes recorded suspension from elapsed time, while GPU GRES remain allocated and unavailable to other jobs during suspension.

A simplified extraction is:

```bash
sacct -S 2026-07-01 -E 2026-08-01 \
  --format=JobIDRaw,Account,State,Start,End,ElapsedRaw,Suspended,ReqTRES,AllocTRES,ConsumedEnergyRaw
```

Do not limit the accounting extract to a short hand-written state list: states such as `OUT_OF_MEMORY`, `NODE_FAIL`, and `PREEMPTED` can also consume allocated capacity. Production extraction should query Slurm's accounting database with a stable cutoff, classify every returned state deliberately, and retain revisions for jobs that cross the period boundary.

Slurm can return a job record and records for its job steps. Do not sum the parent allocation and every step as independent capacity. Define one grain, usually the job allocation for chargeback, while step data supports utilization analysis. Handle job arrays, requeues, and resizes with stable job and run identifiers; current Slurm exposes `OriginalSLUID` to correlate resize records and `SLUID` to distinguish each run, with earlier records available through `--duplicates`.

## Allocate Time Across Billing Periods

A job that spans midnight or month end must be split by interval overlap:

```text
period_seconds = max(
  0,
  min(job_end, period_end) - max(job_start, period_start)
)

period_gpu_hours = allocated_gpu_count * period_seconds / 3600
```

This formula assumes that the allocated GPU count is constant over the interval. If a job is resized, split it at each allocation change and use the GPU count for each segment instead of multiplying the final `AllocTRES` count by the job's full lifetime.

Do not assign the entire job to its submission month or completion month. For running jobs, use an explicit snapshot cutoff and mark the current result provisional.

The scheduler `Account`, quality of service, partition, or workload key can map a job to a cost center. Effective-date that mapping, and route missing or ambiguous identities to a visible residual bucket.

## Build Comparable Cloud and On-Premises Pools

For cloud GPUs, use the provider billing data as the monetary source. Include GPU instance cost plus attached storage, data transfer, support, and commitment economics according to the declared showback scope. If a cloud instance provides multiple GPUs, allocate its in-scope cost across the jobs that held those GPUs during each interval; keep unallocated instance time in an idle pool.

For on-premises GPUs, construct an approved rate card from components such as:

- depreciation or lease cost;
- maintenance and vendor support;
- scheduler and platform operations;
- facility and network overhead;
- measured electricity;
- idle capacity and resilience policy.

Do not present depreciation assumptions or facility allocation as measurements. Version the rate card and expose which components are policy.

A capacity rate can be calculated as:

```text
on_prem_gpu_hour_rate =
  fixed_gpu_pool_cost / available_gpu_hours
```

Define `available_gpu_hours` carefully: fleet GPU count multiplied by serviceable hours, less approved maintenance windows if policy allows. If the denominator uses only consumed hours, the rate rises when demand falls and makes teams absorb idle fleet cost implicitly. A stable capacity rate plus a separate idle pool is easier to explain.

## Use DCGM Telemetry for Efficiency

NVIDIA DCGM exposes device telemetry that can be exported to a monitoring system. The shipped DCGM Exporter configuration retains some legacy metric names while mapping them to current canonical DCGM fields:

- `DCGM_FI_DEV_GPU_UTIL` (canonical field `DCGM_FI_DEV_GPU_UTIL_RATIO`) for GPU utilization;
- `DCGM_FI_DEV_POWER_USAGE` (canonical field `DCGM_FI_DEV_BOARD_POWER_WATTS`) as a gauge for board power in watts;
- `DCGM_FI_DEV_TOTAL_ENERGY_CONSUMPTION` as a total-energy counter in millijoules since the driver was last reloaded, where supported;
- profiling fields for GPU activity and memory behavior.

Join samples to jobs through GPU identity, node, and scheduler allocation intervals. DCGM does not replace the scheduler's authoritative job ledger. Its profiling metrics are interval observations, not a trace of every kernel.

Telemetry gaps must stay visible. Report sample coverage per job and do not treat a missing sample as zero utilization or zero energy.

## Convert Energy Without Mixing Boundaries

Preserve each source unit. Slurm reports the job total in `ConsumedEnergyRaw` in joules, while DCGM documents `DCGM_FI_DEV_TOTAL_ENERGY_CONSUMPTION` as a cumulative counter in millijoules:

```text
slurm_job_kwh = consumed_energy_raw_joules / 3,600,000
dcgm_interval_kwh = counter_delta_millijoules / 3,600,000,000
attributable_energy_cost = attributable_job_kwh * electricity_rate_per_kwh
```

For power samples, integrate watts over time rather than averaging values from unequal intervals. Reset and wrap handling are required when differencing the DCGM cumulative counter.

Keep measurement boundaries explicit:

- GPU board energy is not whole-node energy;
- whole-node energy can include CPUs, memory, fans, and power conversion;
- facility overhead is not present in device telemetry;
- a power usage effectiveness multiplier, if used, is an internal facility policy;
- cloud electricity may already be embedded in the provider price and must not be added again.

Slurm warns that `ConsumedEnergyRaw` reflects real job energy only for an exclusive job allocation. When nodes are shared, allocate node energy using supported device attribution or a declared proxy, and preserve an unattributed remainder.

## Combine Cost Without Double Charging

A clear model is:

```text
job_showback =
    allocated_gpu_hours * approved_capacity_rate
  + attributable_variable_energy_cost
  + direct_job_storage_and_transfer
```

This works only if energy is excluded from the fixed capacity rate. If the on-premises rate already includes electricity, show measured energy as an efficiency metric or use it to split the existing electricity pool; do not add it again.

Publish idle fleet cost separately:

```text
idle_gpu_hours = serviceable_gpu_hours - allocated_gpu_hours
```

Then classify idle cost as planned headroom, maintenance, platform capacity, or waste according to policy. Negative idle hours indicate overlapping allocations, an incorrect fleet denominator, or a data-grain error and should fail a control.

## Publish Cost and Efficiency Side by Side

For each account or workload, show:

- allocated GPU-hours and wall time;
- requested versus allocated GPU count;
- capacity cost and variable energy cost;
- average and percentile utilization with coverage;
- GPU memory pressure when supported;
- energy in kWh and its measurement boundary;
- failed, cancelled, and timed-out capacity;
- cloud, on-premises, and idle-pool totals.

This avoids the false choice between charging for reservations and encouraging efficient code. Capacity attribution answers who occupied the resource; utilization explains whether that occupation produced useful work.

## Official Documentation

- [Slurm: sacct command and accounting fields](https://slurm.schedmd.com/sacct.html)
- [Slurm: Generic Resource scheduling and GPU accounting](https://slurm.schedmd.com/gres.html)
- [Slurm: Accounting gather and energy plugin configuration](https://slurm.schedmd.com/acct_gather.conf.html)
- [NVIDIA DCGM: Exporter metric reference](https://docs.nvidia.com/datacenter/dcgm/latest/reference/dcgm-exporter-metrics.html)
- [NVIDIA DCGM: Process and job statistics](https://docs.nvidia.com/datacenter/dcgm/latest/learn/core-services/process-and-job-statistics.html)
- [NVIDIA DCGM: Profiling metrics](https://docs.nvidia.com/datacenter/dcgm/latest/learn/modules/profiling.html)

## Conclusion

Hybrid GPU showback should charge scarce capacity according to scheduler allocations, not discount it away when utilization is low. Normalize cloud bills and on-premises rate cards, split jobs across time, use DCGM for measured efficiency and energy, and make telemetry gaps and idle fleet cost explicit. Teams then see both what they reserved and how well they used it.
