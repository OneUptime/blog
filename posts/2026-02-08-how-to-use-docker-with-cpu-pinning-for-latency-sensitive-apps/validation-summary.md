# Validation Summary: How to Use Docker with CPU Pinning for Latency-Sensitive Apps

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine
- Docker Compose
- Linux cgroups and cpuset controller
- Linux kernel CPU isolation parameters
- Linux IRQ affinity
- NUMA tooling with numactl and numastat
- Hyperthreading / SMT
- perf
- cyclictest / rt-tests

## Sources Consulted
- Docker Docs: Running containers, cpuset constraints: https://docs.docker.com/engine/containers/run/
- Docker Docs: Resource constraints: https://docs.docker.com/engine/containers/resource_constraints/
- Docker Docs: Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Compose Specification: cpuset, mem_limit, and memswap_limit: https://compose-spec.github.io/compose-spec/spec.html
- Linux kernel documentation: cgroup v2 cpuset controller: https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html
- Linux kernel documentation: kernel command-line parameters: https://www.kernel.org/doc/html/latest/admin-guide/kernel-parameters.html
- Linux kernel documentation: CPU isolation: https://docs.kernel.org/admin-guide/cpu-isolation.html
- Linux kernel documentation: SMP IRQ affinity: https://www.kernel.org/doc/html/next/core-api/irq/irq-affinity.html
- Local CLI help/manpage checks for `docker run`, `docker compose config`, `lscpu`, and `numactl`

## Issues Found
- The post implied Docker CPU pinning fully eliminates CPU migrations and always keeps threads on the same core. Updated the wording to clarify that `--cpuset-cpus` constrains execution to a CPU set, but migrations can still occur within that set unless per-thread affinity is also used.
- The cache-migration explanation was too absolute. Updated it to state that migrated threads cannot directly reuse the previous core's private L1/L2 cache state and may need to reload data, with latency depending on workload and hardware.
- The `isolcpus` example used the implicit default behavior and the explanation overstated scheduler placement behavior. Updated the example to `isolcpus=domain,2-15`, clarified that it isolates CPUs from scheduler load balancing, and noted that current kernel documentation deprecates `isolcpus` in favor of cpusets.
- The IRQ script comment said it moved all IRQ balancing to system cores. Updated it to the accurate behavior: `/proc/irq/default_smp_affinity` sets the default affinity for newly allocated IRQs.
- The `perf stat -e migrations` example expected zero migrations. Updated the note to say lower migration counts are better and cpusets can still allow migrations within the selected CPU set.

## Review Notes
The Docker and Docker Compose CPU/memory fields are valid, and the Compose example parses successfully with `docker compose config -q`. The `cyclictest` examples use valid options, but the container image name is environment-dependent and should be treated as an example image that contains rt-tests.
