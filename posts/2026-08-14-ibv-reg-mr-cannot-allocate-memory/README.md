# Diagnose Cannot Allocate Memory from ibv_reg_mr()

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RDMA Verbs, RDMA, InfiniBand, Memory Locking, Memory Registration

Description: Diagnose ibv_reg_mr allocation failures by preserving errno, measuring the process memlock limit, isolating buffer and access issues, and checking registration-resource exhaustion.

---

`ibv_reg_mr()` does not allocate the application's buffer. It registers an existing virtual-address range with an RDMA device and returns local and remote keys. Registration can pin pages, create translation metadata, consume provider and HCA resources, and enforce access rules. Consequently, “Cannot allocate memory” may describe a locking or registration-resource failure even when the machine has plenty of free RAM.

Do not start by adding RAM or setting every limit to unlimited. Preserve the actual failure and reduce it to the smallest registration first.

## Capture errno Immediately

The libibverbs API returns `NULL` when `ibv_reg_mr()` fails. Read `errno` before another library call changes it:

~~~c
errno = 0;
struct ibv_mr *mr = ibv_reg_mr(pd, buf, length,
                               IBV_ACCESS_LOCAL_WRITE |
                               IBV_ACCESS_REMOTE_WRITE);
if (mr == NULL) {
    int saved_errno = errno;
    fprintf(stderr, "ibv_reg_mr(%zu) failed: errno=%d (%s)\n",
            length, saved_errno, strerror(saved_errno));
}
~~~

The access flags above are only an example. Request exactly what the protocol needs. The official man page requires `IBV_ACCESS_LOCAL_WRITE` when remote write or remote atomic access is requested.

Also record device, port, process identity, buffer type, address, length, page size, provider/driver version, and whether this is the first registration or one after hours of operation. A failure at startup and a failure after thousands of MRs have been created have different likely causes.

## Inspect the Effective memlock Limit

Linux uses `RLIMIT_MEMLOCK` to limit memory that a process may lock. Check the actual process, not merely `/etc/security/limits.conf`:

~~~console
# In the launcher shell:
$ ulimit -Sl
$ ulimit -Hl

# For the running application (replace 12345 with its PID):
$ failing_pid=12345
$ grep -i 'Max locked memory' "/proc/$failing_pid/limits"
$ grep -E 'VmLck|VmPin' "/proc/$failing_pid/status"
~~~

Run equivalent commands under the service manager, scheduler, or container entrypoint that launches the failing application. Limits are inherited. Common reasons a configured limit has no effect include:

- the user never started a new login session after a PAM limits change;
- systemd applies its own `LimitMEMLOCK=` to the unit;
- Slurm or another scheduler does not propagate the desired limit;
- the OCI/Kubernetes runtime starts the container with a smaller rlimit;
- the process lowered its soft limit;
- a different user or service account runs the job.

`ulimit -l` is commonly displayed in KiB by shells, while `/proc/<pid>/limits` labels its units. Do not compare the printed number directly with a byte-sized MR without checking units and accounting for all concurrent registrations.

For a controlled test, raise the soft limit only within the permitted hard limit and rerun the smallest reproducer. In production, size each process's bounded limit from its worst-case pinned memory, including page-granularity overhead and duplicate registrations. Separately multiply by ranks per node to verify aggregate host capacity. NVIDIA's NCCL troubleshooting documentation suggests unlimited memlock for its RDMA workloads, but that is an application deployment recommendation, not proof that every `ibv_reg_mr()` `ENOMEM` is an rlimit failure.

## Separate Virtual Memory, Pinning, and Registration

Test registrations systematically:

1. allocate one page-aligned host buffer;
2. touch every page so backing-memory pressure is exposed before registration;
3. register a small range with minimal access;
4. increase the size geometrically;
5. deregister each MR during the size sweep;
6. separately increase the number of concurrently live small MRs, then deregister them;
7. repeat with the application's real allocator and flags.

This matrix distinguishes useful cases:

| Result | Likely direction |
| --- | --- |
| small and large host MRs fail immediately | invalid arguments, provider/device failure, permissions, or tiny memlock limit |
| small succeeds, size threshold fails | effective lock/pin budget, address-space mapping, or device/provider size limit |
| many concurrently live small MRs eventually fail | aggregate lock/pin budget, leaked MRs, or registration-object/translation-resource exhaustion |
| normal host memory works, huge/GPU/dma-buf memory fails | memory-type-specific registration path or peer-memory support |
| minimal flags work, remote access flags fail | unsupported/invalid access combination or provider capability |

Page-aligned allocation is a useful diagnostic, but ordinary `malloc` buffers are valid inputs; libibverbs handles page granularity internally. Do not round the application's address and length in a way that registers memory it does not own.

## Query Device Capabilities Without Treating Them as Free Capacity

`ibv_query_device()` and `ibv_devinfo -v` expose limits including maximum MR size and maximum MR count where supported:

~~~console
$ ibv_devinfo -d mlx5_0 -v
$ rdma resource show
$ dmesg --ctime | tail -n 100
~~~

Advertised maxima are capability ceilings, not a real-time statement that all resources are available. Other processes, protection domains, queue pairs, memory windows, on-device translation tables, and provider caches can consume related resources. Firmware and virtualization can impose additional limits.

Look for these application defects:

- an MR is created per message and never deregistered;
- error paths lose the MR pointer;
- forked workers inherit an unsafe registration-cache state;
- every small buffer receives a separate MR instead of using a bounded registered pool;
- deregistration races with outstanding work requests;
- the application registers the same range repeatedly through multiple layers.

`rdma resource show` provides kernel RDMA object visibility on supported systems, though provider-specific registration accounting may not map one-to-one to its output.

## Treat ODP and Huge Pages as Separate Features

On-demand paging uses `IBV_ACCESS_ON_DEMAND` and requires device/provider support. It avoids pinning all pages eagerly and lets the HCA obtain translations on demand, but it is not a portable switch for bypassing every registration limit. Implicit ODP has special whole-address-space semantics; `IBV_ACCESS_HUGETLB` is applicable only to explicit ODP and promises that all pages are huge and remain so.

Likewise, explicit HugeTLB pages may reduce translation pressure for some workloads but require an appropriate allocator and available or configured huge-page capacity. They do not repair leaked MRs, invalid access flags, or absent GPU peer-memory support.

For CUDA memory, dma-buf, or another peer-memory type, validate that exact registration API and supported software matrix. A successful host `ibv_reg_mr()` does not prove `ibv_reg_dmabuf_mr()` or a legacy peer-memory path will work.

## Container and Service Checklist

Inside the failing workload, collect:

~~~console
$ failing_pid=12345  # replace with the application's PID
$ cat "/proc/$failing_pid/limits"
$ cat "/proc/$failing_pid/cgroup"
$ ls -l /dev/infiniband
$ ibv_devices
$ ibv_devinfo
$ dmesg --ctime | grep -iE 'mlx|rdma|uverbs|iommu|pin' | tail
~~~

Container device exposure, capabilities, cgroup policy, and rlimits are independent controls. Adding `CAP_IPC_LOCK` may affect lock-limit behavior, but granting it broadly is a security decision and is not a substitute for sizing the workload. Prefer an explicit memlock rlimit and the minimum device/capability exposure needed by the application.

## Remediation by Root Cause

- **Effective memlock too small:** change the real launcher or service limit, restart the session/unit, and verify `/proc/<pid>/limits`.
- **MR leak:** pair every successful registration with deregistration after all referencing work completes; add current/peak MR metrics.
- **Too many small registrations:** use a bounded registered-buffer pool or a documented registration cache.
- **Unsupported memory type:** install and validate the supported dma-buf or peer-memory path for the exact kernel, GPU driver, rdma-core, and HCA.
- **Device ceiling:** reduce MR count/size, spread workload only if the architecture supports it, and consult the adapter/provider support matrix.
- **Invalid flags or range:** minimize access flags and reproduce with a simple owned host buffer.

After a change, rerun both the minimal reproducer and the real concurrency level. A single successful 4 KiB MR is not evidence that hundreds of ranks can register their peak working sets.

## Official Documentation

- [rdma-core manual: ibv_reg_mr and registration access flags](https://man7.org/linux/man-pages/man3/ibv_reg_mr.3.html)
- [Linux manual: mlock, RLIMIT_MEMLOCK, and locked-memory errors](https://man7.org/linux/man-pages/man2/mlock.2.html)
- [rdma-core project and diagnostic tools](https://github.com/linux-rdma/rdma-core)
- [NVIDIA NCCL troubleshooting: pinned-memory registration and memlock](https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/troubleshooting/networking_troubleshooting.html)
- [NVIDIA RDMA Aware Networks Programming User Manual](https://docs.nvidia.com/rdma-aware-networks-programming-user-manual-1-7.pdf)

## Conclusion

An `ibv_reg_mr()` allocation error is a registration failure, not a free-RAM diagnosis. Save `errno`, verify the effective `RLIMIT_MEMLOCK` in the actual process, test size and registration-count thresholds, and inspect device/provider resources. Fix the measured constraint, whether limit propagation, leaked MRs, memory-type support, or HCA capacity, then validate at production concurrency.
