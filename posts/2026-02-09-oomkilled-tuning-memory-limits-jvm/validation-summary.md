# Validation Summary: How to Handle Container OOMKilled by Tuning Memory Limits and JVM Heap

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Java / JVM
- JVM memory tuning
- Garbage collectors: G1GC, ZGC, Shenandoah
- Spring Boot / Micrometer
- kubectl

## Sources Consulted
- Oracle Java command documentation: https://docs.oracle.com/en/java/javase/24/docs/specs/man/java.html
- Oracle Java BufferPoolMXBean API documentation: https://docs.oracle.com/en/java/javase/17/docs/api/java.management/java/lang/management/BufferPoolMXBean.html
- Kubernetes memory requests and limits documentation: https://kubernetes.io/docs/tasks/configure-pod-container/assign-memory-resource/
- Kubernetes kubectl reference documentation: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes kubectl exec documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- OpenJDK JEP 241, Remove the jhat Tool: https://openjdk.org/jeps/241
- OpenJDK JEP 377, ZGC Production: https://openjdk.org/jeps/377
- Micrometer registry documentation: https://docs.micrometer.io/micrometer/reference/concepts/registry.html

## Issues Found
- Replaced `JAVA_OPTS` with `JDK_JAVA_OPTIONS` in Kubernetes examples because `JAVA_OPTS` is not read by the Java launcher unless the image entrypoint explicitly expands it. `JDK_JAVA_OPTIONS` is documented as being prepended by the Java launcher.
- Changed the statement that setting the container limit equal to max heap "guarantees" OOMKilled errors to "often leads to" OOMKilled errors. Equal heap and container limits are risky, but not a deterministic guarantee for every workload.
- Corrected the `MetaspaceSize` explanation. It is not simply the initial metaspace size; it is the class metadata threshold that triggers the first garbage collection. `MaxMetaspaceSize` remains the cap.
- Added a ZGC version caveat. ZGC was introduced in Java 11 as experimental and became a product feature in Java 15, so Java 11-14 require `-XX:+UnlockExperimentalVMOptions`.
- Replaced the direct-memory monitoring example. `MemoryMXBean.getNonHeapMemoryUsage()` reports non-heap memory broadly and is not direct-buffer-specific. The updated example uses `BufferPoolMXBean` and filters the `direct` buffer pool.
- Adjusted the production example from `-Xms3g -Xmx3g` to `-Xms2g -Xmx2g` under a `4Gi` memory limit so there is realistic headroom for metaspace, code cache, direct buffers, thread stacks, and native overhead.
- Removed the `jhat` analysis command because `jhat` was removed from the JDK in JDK 9. The post now recommends Eclipse MAT or VisualVM instead.
- Added missing `java.util.ArrayList` and `java.util.List` imports to the standalone memory stress test so it can compile.

## Review Notes
The local environment did not have `java` or `kubectl` installed, so validation was performed against official documentation rather than local command help. The Kubernetes YAML structure, resource fields, memory quantity format, JVM option names, and kubectl command forms were otherwise consistent with the consulted documentation.
