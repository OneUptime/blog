# How to Rightsize JVM Containers Without Triggering Heap OOMs or CPU Throttling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: JVM, Java, Kubernetes, Rightsizing

Description: Size Java containers from heap live set, native memory, thread and cache demand, garbage collection, CPU throttling, and startup behavior.

---

The Java heap is only part of a JVM container's memory. Metaspace, code cache, thread stacks, direct buffers, garbage-collector structures, native libraries, and the operating environment also consume the cgroup budget. Setting the Kubernetes memory limit equal to `-Xmx` leaves no room for them and invites an OOM kill outside normal Java heap diagnostics.

CPU sizing has a similar trap: a low average can coexist with short garbage-collection, JIT compilation, and startup bursts that a hard CPU limit throttles.

## Establish container awareness first

Use a supported JDK. Run the first two commands inside the Linux application container with the same JVM options as the application; they inspect a new JVM, not the running application. The `jcmd` commands inspect the running JVM and assume Java is PID 1; substitute its actual PID if needed and run with the same effective user and group, using the matching JDK version with `jcmd` available:

```bash
java -XshowSettings:system -version
java -XX:+PrintFlagsFinal -version | grep -E 'MaxHeapSize|MaxRAMPercentage|ActiveProcessorCount'
jcmd 1 VM.flags
```

Oracle's Java command documentation states that the maximum memory available to the JVM considers environment constraints such as a container, and documents percentage-based heap flags such as `-XX:MaxRAMPercentage`. Defaults and container support differ by JDK build and version, so inspect the exact production image.

Pin the image digest and JVM flags in the sizing record. A JDK upgrade can change ergonomics, garbage collector behavior, and memory use.

## Build a complete memory budget

Budget for these components under representative load:

```text
container limit
  >= planned peak committed Java heap
  + metaspace and compressed class space
  + code cache
  + thread stacks
  + direct and mapped buffers
  + garbage collector native structures
  + JNI and other native libraries
  + memory-backed volumes charged to the cgroup
  + other charged page cache and kernel memory
  + diagnostic and uncertainty reserve
```

This is a sizing budget, not an exact cgroup accounting identity: committed memory is not necessarily resident, and mapped files and memory-backed volumes can overlap with page-cache accounting. Avoid double-counting and validate against total cgroup memory usage. Allow for heap growth up to `-Xmx` unless a smaller maximum is enforced.

Use post-collection live set to understand durable heap demand, then preserve allocation headroom so the collector can work efficiently. Do not size `-Xmx` from RSS alone.

Native Memory Tracking can report JVM-internal native allocations when enabled with `-XX:NativeMemoryTracking=summary` or `detail`:

```bash
jcmd 1 VM.native_memory baseline
# Run representative traffic
jcmd 1 VM.native_memory summary.diff
```

Oracle notes that NMT does not track memory allocated by non-JVM native code, and it has overhead. Combine it with container RSS, working set, page cache, and application-specific direct-buffer metrics.

## Choose heap and container limits together

An explicit policy is easier to reason about than an unknown default:

```yaml
env:
- name: JAVA_TOOL_OPTIONS
  value: >-
    -XX:MaxRAMPercentage=65
    -XX:InitialRAMPercentage=40
    -XX:+HeapDumpOnOutOfMemoryError
resources:
  requests:
    memory: 1536Mi
    cpu: "1"
  limits:
    memory: 2Gi
```

The percentages are examples, not recommendations. Select them from measured non-heap demand. Ensure the heap-dump path has enough durable space or use another supported diagnostic design; a dump can be large and may fail when the container is already out of memory.

If deterministic heap size is required, explicit `-Xms` and `-Xmx` can be appropriate. Confirm that the sum of all components still fits the cgroup and that a large initial heap does not create unnecessary committed memory or startup cost.

## Measure CPU phases and throttling

Profile steady traffic, cold start, warmup, scale-out, deployment, and recovery. Track:

- CPU usage and cgroup throttled time;
- request latency and throughput;
- garbage-collection pause and CPU time;
- allocation rate and live set;
- JIT compilation and class loading;
- runnable threads and executor queues.

Kubernetes CPU limits are enforced through throttling. A Java service can show modest average CPU while hitting its quota during a short parallel GC or compilation phase. Test tail latency with the proposed limit; do not infer safety from mean utilization.

A CPU request also affects scheduling and CPU share under contention. On HPA using CPU utilization, it is the denominator of the scaling signal.

## Control thread and direct-memory amplification

Smaller CPU visibility can change default pool sizes, while high concurrency can multiply stack and buffer memory. Inspect:

- web-server and client connection pools;
- fork-join and executor parallelism;
- garbage collector worker counts;
- thread stack size;
- Netty or NIO direct buffers;
- caches whose limits derive from maximum heap.

If the JVM or library does not recognize the cgroup CPU count correctly, an explicit `-XX:ActiveProcessorCount` may be a temporary controlled fix, but verify the JDK and library behavior before overriding ergonomics.

## Canary with failure tests

Roll out a smaller container to a representative traffic slice and include:

1. cold start and readiness;
2. normal peak and burst traffic;
3. dependency slowdown and retry behavior;
4. cache refill;
5. heap pressure and full collection;
6. graceful shutdown and replacement.

Rollback on container OOM, `OutOfMemoryError`, rising live set, excessive GC, throttling, or SLO regression. Distinguish a kernel OOM kill from a Java heap exception because their evidence and fixes differ.

## Conclusion

Rightsize a JVM container from a complete cgroup memory budget, not `-Xmx` alone. Verify container awareness, measure live heap and native components, and test CPU burst phases for throttling. Canary the proposed heap, request, and limit as one documented runtime configuration.

## Official Documentation

- [Oracle Java command options](https://docs.oracle.com/en/java/javase/26/docs/specs/man/java.html)
- [Oracle Native Memory Tracking](https://docs.oracle.com/en/java/javase/26/troubleshoot/diagnostic-tools.html)
- [Oracle Java troubleshooting preparation](https://docs.oracle.com/en/java/javase/26/troubleshoot/prepare-java-troubleshooting.html)
- [Kubernetes resource requests and limits](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
