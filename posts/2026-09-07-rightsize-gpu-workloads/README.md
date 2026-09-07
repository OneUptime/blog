# How to Rightsize GPU Workloads Using Utilization, Memory, and Queue Time

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GPU, Rightsizing, Capacity Planning, Performance

Description: Match GPU model and sharing mode to compute activity, framebuffer demand, throughput, queue objectives, and cost per completed unit of work.

---

GPU utilization alone is an incomplete sizing signal. A job can show low device utilization because it waits for input, launches tiny kernels, synchronizes frequently, or shares a bottlenecked CPU. It can also report high activity while completing less useful work than a different model.

Rightsize GPUs from application throughput, device telemetry, and queue objectives together.

## Define the unit of useful work

Choose an outcome that matters:

- training samples or tokens per second;
- inference requests or tokens per second at a latency objective;
- frames rendered per minute;
- simulations completed before a deadline;
- batch jobs completed per GPU-hour.

Then calculate:

```text
cost per work = GPU-hour cost * elapsed GPU hours / successful work units
```

Include failed jobs, retries, checkpoint overhead, idle reservation, data transfer, and required CPU or memory hosts. The GPU with the lowest hourly price can be more expensive per completed unit.

## Collect the right device telemetry

NVIDIA recommends DCGM Exporter for GPU telemetry in Kubernetes. Useful signals include:

- GPU or SM activity;
- framebuffer memory used and total;
- DRAM activity;
- tensor-pipe activity where supported;
- PCIe or NVLink traffic;
- power, temperature, clocks, and slowdown reasons;
- ECC and XID errors.

NVIDIA documents `nvidia-smi` GPU utilization as the percentage of the sample period during which one or more kernels executed. Its memory utilization describes time spent reading or writing device memory, not the fraction of framebuffer capacity allocated. Keep activity and capacity metrics distinct.

DCGM profiling metrics are interval averages rather than kernel traces. Use Nsight or another appropriate profiler for code-level optimization, and coordinate profiling because tools can compete for hardware counters.

## Align telemetry with job boundaries

Fleet averages hide short jobs and idle reservations. Attach workload, tenant, model, batch size, dataset, GPU model, and job identifiers to samples. Record setup, data load, compute, checkpoint, and teardown phases separately.

Measure queue time outside the GPU as well:

```text
end-to-end completion = queue wait + provisioning + initialization + execution
```

A saturated GPU fleet with an acceptable queue may be efficient. A 40 percent utilized fleet with a long queue may have scheduling fragmentation, missing telemetry, or CPU and data-pipeline stalls.

## Diagnose the limiting resource

| Pattern | Likely investigation |
| --- | --- |
| Low SM activity, low memory traffic | CPU input pipeline, tiny batches, synchronization, queue gaps |
| High SM activity, moderate memory | Compute-bound kernel or model |
| High DRAM activity, low SM activity | Memory bandwidth or access pattern |
| Framebuffer near capacity | Model, activation, batch, or cache memory bound |
| High PCIe traffic with idle gaps | Host-device transfer and overlap |
| Clocks below expected under load | Power, thermal, policy, or hardware health |

These are investigation prompts, not automatic diagnoses. Correlate related metrics and profile a representative job.

## Choose among smaller GPUs, sharing, and batching

### Smaller GPU

Use a smaller or cheaper model when memory, supported precision, interconnect, and throughput remain sufficient. Benchmark the exact software stack because architecture and library support affect results.

### Multi-Instance GPU

On supported NVIDIA GPUs, MIG partitions the device into defined instances with hardware memory and fault isolation. It can improve placement for smaller isolated workloads, but available profiles and capabilities depend on the GPU.

### Time-slicing

NVIDIA GPU Operator can expose time-sliced replicas that interleave workloads. NVIDIA explicitly notes that time-slicing does not provide MIG-style memory or fault isolation, and requesting multiple shared replicas does not guarantee proportional compute. DCGM Exporter also cannot associate metrics with individual containers when time-slicing is enabled through the NVIDIA device plugin. Plan another attribution method or evaluate the shared GPU as a whole. Time-slicing suits compatible workloads that tolerate sharing, not hard multi-tenant isolation.

### Application batching

Inference batching can raise GPU efficiency but also adds waiting time and framebuffer demand. Tune batch size against p99 latency and queue age, not throughput alone.

## Account for Kubernetes placement

Traditional Kubernetes device-plugin resources such as `nvidia.com/gpu` are integer extended resources. Specify a GPU in `limits`; Kubernetes uses that limit as the request when `requests` omits it. If both fields specify the GPU, their values must be equal, and a request without a limit is invalid. A pod cannot request a fractional ordinary GPU unless the installed sharing or partitioning design exposes an appropriate resource.

GPU memory use is not a native scheduler dimension for a whole GPU. A pod can fit the integer request and still exhaust framebuffer memory at runtime. Encode supported model or MIG profile through the platform's documented resources and labels, and validate admission and isolation.

Track fragmentation by GPU model and profile. Free capacity on three incompatible devices cannot satisfy one pod requiring a specific model or multi-GPU topology.

## Run a representative benchmark matrix

Test candidate GPU, precision, batch size, sharing mode, and replica count. Include warm and cold model load, steady and burst arrival, checkpointing, one-device failure, and the maximum supported input.

Gate on:

- useful throughput and tail latency;
- maximum framebuffer usage and OOMs;
- queue age and deadline misses;
- GPU errors and slowdown states;
- CPU, RAM, storage, and network feeding the device;
- cost per successful work unit.

Canary with production-shaped inputs. Retain the old node pool until workloads can be rescheduled and rollback capacity is confirmed.

## Conclusion

Rightsize GPUs using useful throughput, framebuffer demand, device activity, and queue time. Diagnose feed and synchronization stalls before buying more GPU, and choose smaller devices, MIG, time-slicing, or batching only after testing their isolation and latency tradeoffs. Compare cost per completed work.

## Official Documentation

- [NVIDIA GPU telemetry](https://docs.nvidia.com/datacenter/cloud-native/gpu-telemetry/latest/)
- [NVIDIA DCGM profiling metrics](https://docs.nvidia.com/datacenter/dcgm/latest/learn/modules/profiling.html)
- [NVIDIA System Management Interface](https://docs.nvidia.com/deploy/nvidia-smi/)
- [NVIDIA GPU Operator time-slicing](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/gpu-sharing.html)
- [Kubernetes scheduling GPUs](https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/)
