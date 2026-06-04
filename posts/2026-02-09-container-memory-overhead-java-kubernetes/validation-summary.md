# Validation Summary: How to Calculate Container Memory Overhead for Java Applications on Kubernetes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes resource requests and limits
- Kubernetes Pod QoS classes
- Java HotSpot JVM memory sizing
- JVM heap, metaspace, direct memory, thread stacks, and Native Memory Tracking
- `kubectl`, `jstat`, and `jcmd`
- Prometheus JMX Exporter
- Kubernetes Vertical Pod Autoscaler

## Sources Consulted
- Oracle Java 17 `java` command documentation: https://docs.oracle.com/en/java/javase/17/docs/specs/man/java.html
- Oracle Java 17 `jstat` command documentation: https://docs.oracle.com/en/java/javase/17/docs/specs/man/jstat.html
- Oracle Native Memory Tracking documentation: https://docs.oracle.com/en/java/javase/11/vm/native-memory-tracking.html
- Oracle `JAVA_TOOL_OPTIONS` documentation: https://docs.oracle.com/javase/8/docs/technotes/guides/troubleshoot/envvars002.html
- Kubernetes Resource Management for Pods and Containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes Pod Quality of Service Classes: https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Kubernetes Vertical Pod Autoscaling: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Prometheus JMX Exporter documentation: https://prometheus.github.io/jmx_exporter/

## Issues Found
- The post described the sizing formula as a memory request calculation even though Kubernetes OOM kills are enforced against memory limits. Updated the formula and surrounding wording to calculate total container memory and apply it to the limit, with requests set equal when Guaranteed QoS is desired.
- The Kubernetes examples used `JAVA_OPTS`, which is only a convention unless the container entrypoint reads it. Replaced it with `JAVA_TOOL_OPTIONS`, which the JVM recognizes for VM options and Java agents.
- The container-aware heap sizing section implied `-XX:+UseContainerSupport` must be explicitly set on Java 10+. Updated it to explain that supported HotSpot JVMs enable container support by default and that `-XX:MaxRAMPercentage` controls heap sizing.
- The metaspace monitoring text referred to a generic "Metaspace column" in `jstat -gc` output. Updated it to identify the current `MU` metaspace utilization column.
- The direct memory section stated that direct memory always defaults to heap size. Updated it to the more accurate HotSpot wording that the JVM chooses the limit automatically and that it is commonly tied to maximum heap size.
- The Native Memory Tracking monitoring example omitted that NMT must be enabled at JVM startup. Added the startup flag prerequisite and clarified what the `jcmd` output covers.
- The conclusion said Guaranteed QoS prevents memory throttling. Updated it to say Guaranteed QoS reduces eviction risk, because Kubernetes memory limits are normally enforced with OOM kills, while memory throttling is tied to the separate alpha MemoryQoS feature.

## Review Notes
The YAML snippets are structurally valid examples, but real deployments still need images or entrypoints that start the Java process normally and include the referenced JMX exporter jar and config file.
