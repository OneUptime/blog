# How to Handle Container OOMKilled by Tuning Memory Limits and JVM Heap

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Java, OOMKilled

Description: Learn how to prevent OOMKilled errors in Java containers by properly configuring memory limits, JVM heap sizes, and garbage collection settings for optimal performance in Kubernetes.

---

OOMKilled errors are among the most frustrating issues in Kubernetes, especially for Java applications. When a container exceeds its memory limit, the kernel's Out-Of-Memory killer terminates the process, leading to pod restarts and potential service disruptions. Java applications require special attention because the JVM's memory usage extends beyond just heap space.

This guide covers how to properly size memory limits for Java containers and configure JVM settings to prevent OOM kills while maintaining good performance.

## Understanding Java Memory Usage in Containers

The JVM allocates memory for multiple areas, not just the heap:

- **Heap**: Objects and their data (controlled by -Xmx)
- **Metaspace**: Class metadata (replaced PermGen in Java 8+)
- **Thread stacks**: Each thread gets its own stack
- **Code cache**: JIT-compiled native code
- **Direct buffers**: Off-heap NIO buffers
- **Native memory**: JNI allocations, internal JVM structures

A common mistake is setting the container memory limit equal to the max heap size. This ignores all other memory areas and guarantees OOMKilled errors.

## Calculating Container Memory Limits

Use this formula to calculate appropriate container limits:

```
Container Limit = Heap + Metaspace + CodeCache + ThreadStacks + DirectBuffers + Overhead
```

For a typical Spring Boot application:

```
Container Limit = Xmx + 256MB (metaspace) + 256MB (code cache) + (threads * 1MB) + 256MB (buffers) + 512MB (overhead)
```

Example: For a 2GB heap application with 100 threads:

```
Container Limit = 2048MB + 256MB + 256MB + 100MB + 256MB + 512MB = 3378MB ≈ 3.5GB
```

## Basic JVM Configuration for Containers

Here's a deployment with properly configured memory settings:

```yaml
# java-app-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: spring-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: spring-app
  template:
    metadata:
      labels:
        app: spring-app
    spec:
      containers:
      - name: app
        image: mycompany/spring-app:latest
        resources:
          requests:
            memory: "3Gi"
            cpu: "1000m"
          limits:
            memory: "3.5Gi"
            cpu: "2000m"
        env:
        - name: JAVA_OPTS
          value: >-
            -Xms2g
            -Xmx2g
            -XX:MaxMetaspaceSize=256m
            -XX:ReservedCodeCacheSize=256m
            -XX:MaxDirectMemorySize=256m
            -XX:+UseG1GC
            -XX:+UseContainerSupport
            -XX:MaxRAMPercentage=75.0
```

The `-XX:+UseContainerSupport` flag (default since Java 10) ensures the JVM recognizes container memory limits. The `MaxRAMPercentage=75.0` allocates 75% of container memory to heap when Xmx isn't specified.

## Using Percentage-Based Heap Sizing

Instead of hardcoding heap sizes, use percentage-based allocation for flexibility:

```yaml
env:
- name: JAVA_OPTS
  value: >-
    -XX:+UseContainerSupport
    -XX:InitialRAMPercentage=50.0
    -XX:MaxRAMPercentage=75.0
    -XX:MinRAMPercentage=50.0
    -XX:+UseG1GC
    -XX:MaxGCPauseMillis=200
```

With a 4GB container limit:
- Initial heap: 2GB (50%)
- Maximum heap: 3GB (75%)
- Remaining 1GB: Metaspace, code cache, threads, etc.

## Configuring Metaspace Limits

Metaspace grows dynamically but should be capped to prevent runaway growth:

```yaml
env:
- name: JAVA_OPTS
  value: >-
    -Xmx2g
    -XX:MetaspaceSize=128m
    -XX:MaxMetaspaceSize=256m
    -XX:+UseG1GC
```

The `MetaspaceSize` sets the initial size, while `MaxMetaspaceSize` caps growth. For applications with many classes (like those using heavy frameworks), increase this limit:

```bash
# For large Spring applications
-XX:MaxMetaspaceSize=512m

# For microservices with fewer classes
-XX:MaxMetaspaceSize=128m
```

## Optimizing Thread Stack Size

Each thread consumes memory for its stack. Reduce stack size if you have many threads:

```yaml
env:
- name: JAVA_OPTS
  value: >-
    -Xmx2g
    -Xss256k
    -XX:+UseG1GC
```

Default stack size is typically 1MB. Reducing to 256KB saves memory with hundreds of threads:

```
100 threads * 1MB = 100MB (default)
100 threads * 256KB = 25.6MB (optimized)
Savings: 74.4MB
```

Only reduce stack size after testing, as too-small stacks cause StackOverflowErrors.

## Configuring Garbage Collection for Containers

G1GC is the default in modern Java and works well in containers:

```yaml
env:
- name: JAVA_OPTS
  value: >-
    -Xmx2g
    -XX:+UseG1GC
    -XX:MaxGCPauseMillis=200
    -XX:G1HeapRegionSize=16m
    -XX:InitiatingHeapOccupancyPercent=45
    -XX:+ParallelRefProcEnabled
    -XX:+UseStringDeduplication
```

For low-latency requirements, consider ZGC (Java 11+) or Shenandoah:

```yaml
# ZGC configuration
env:
- name: JAVA_OPTS
  value: >-
    -Xmx4g
    -XX:+UseZGC
    -XX:ZCollectionInterval=5
    -XX:ZAllocationSpikeTolerance=2
```

## Handling Direct Buffer Memory

NIO direct buffers live outside the heap but count toward container memory:

```yaml
env:
- name: JAVA_OPTS
  value: >-
    -Xmx2g
    -XX:MaxDirectMemorySize=512m
    -XX:+UseG1GC
```

Applications using Netty, gRPC, or direct file I/O need substantial direct memory. Monitor direct buffer usage:

```java
// Check direct buffer usage in application
MemoryMXBean memoryMXBean = ManagementFactory.getMemoryMXBean();
MemoryUsage directMemory = memoryMXBean.getNonHeapMemoryUsage();
System.out.println("Direct memory used: " + directMemory.getUsed() / (1024 * 1024) + "MB");
```

## Creating a Complete Production Configuration

Here's a production-ready configuration with monitoring and debugging options:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: java-production-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: java-app
  template:
    metadata:
      labels:
        app: java-app
    spec:
      containers:
      - name: app
        image: mycompany/java-app:1.0.0
        resources:
          requests:
            memory: "4Gi"
            cpu: "2000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
        env:
        - name: JAVA_OPTS
          value: >-
            -Xms3g
            -Xmx3g
            -XX:MaxMetaspaceSize=512m
            -XX:ReservedCodeCacheSize=256m
            -XX:MaxDirectMemorySize=256m
            -Xss512k
            -XX:+UseG1GC
            -XX:MaxGCPauseMillis=200
            -XX:+HeapDumpOnOutOfMemoryError
            -XX:HeapDumpPath=/tmp/heapdump.hprof
            -XX:+ExitOnOutOfMemoryError
            -XX:+UnlockDiagnosticVMOptions
            -XX:+PrintFlagsFinal
        volumeMounts:
        - name: heap-dumps
          mountPath: /tmp
      volumes:
      - name: heap-dumps
        emptyDir:
          sizeLimit: 8Gi
```

The `-XX:+HeapDumpOnOutOfMemoryError` flag creates a heap dump when OOM occurs, helping debug memory leaks. The `-XX:+ExitOnOutOfMemoryError` ensures the container exits cleanly (triggering a restart) rather than hanging.

## Debugging OOMKilled Issues

When containers are OOMKilled, check these indicators:

```bash
# View recent OOMKilled events
kubectl get events --all-namespaces | grep OOMKilled

# Check pod exit status (137 indicates OOMKilled)
kubectl get pods -o jsonpath='{.items[*].status.containerStatuses[*].lastState.terminated.exitCode}'

# Describe the pod to see termination reason
kubectl describe pod <pod-name> | grep -A 10 "Last State"
```

Extract heap dumps from failed containers:

```bash
# List heap dumps in the container
kubectl exec <pod-name> -- ls -lh /tmp/*.hprof

# Copy heap dump locally for analysis
kubectl cp <pod-name>:/tmp/heapdump.hprof ./heapdump.hprof

# Analyze with jhat or Eclipse MAT
jhat -J-Xmx4g heapdump.hprof
```

## Implementing Memory Monitoring

Add JVM metrics to track memory usage before OOM occurs:

```java
// Expose JVM metrics using Micrometer
@Bean
public MeterRegistryCustomizer<MeterRegistry> metricsCommonTags() {
    return registry -> {
        registry.config().commonTags("app", "my-service");
    };
}

// Add custom memory monitoring
@Scheduled(fixedRate = 30000)
public void logMemoryUsage() {
    Runtime runtime = Runtime.getRuntime();
    long usedMemory = (runtime.totalMemory() - runtime.freeMemory()) / (1024 * 1024);
    long maxMemory = runtime.maxMemory() / (1024 * 1024);
    double usagePercent = (double) usedMemory / maxMemory * 100;

    logger.info("JVM Memory: {}MB / {}MB ({}%)", usedMemory, maxMemory, String.format("%.2f", usagePercent));
}
```

## Testing Memory Limits

Create a test that validates your memory configuration:

```java
// Memory stress test
public class MemoryTest {
    public static void main(String[] args) throws InterruptedException {
        List<byte[]> memory = new ArrayList<>();
        Runtime runtime = Runtime.getRuntime();

        while (true) {
            // Allocate 10MB chunks
            memory.add(new byte[10 * 1024 * 1024]);

            long usedMB = (runtime.totalMemory() - runtime.freeMemory()) / (1024 * 1024);
            long maxMB = runtime.maxMemory() / (1024 * 1024);

            System.out.printf("Allocated: %d chunks, Used: %dMB / %dMB%n",
                              memory.size(), usedMB, maxMB);

            Thread.sleep(1000);
        }
    }
}
```

Run this in your container to verify OOM behavior and limit enforcement.

Properly tuning JVM settings and container memory limits prevents OOMKilled errors and improves application stability. Start with conservative settings (leaving 25-30% headroom above heap), monitor actual memory usage in production, and adjust based on observed patterns. Always enable heap dumps for post-mortem analysis when OOM events do occur.
