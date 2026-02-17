# How to Set Up Cloud Profiler for a Java Application Running on GKE

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Profiler, Java, GKE, Performance

Description: A step-by-step guide to enabling Google Cloud Profiler for Java applications running on GKE, with configuration for CPU, heap, and wall-clock profiling.

---

Cloud Profiler is one of those GCP tools that does not get enough attention. It continuously collects CPU, heap, and wall-clock profiles from your production applications with minimal overhead (typically under 1%). For Java applications on GKE, it can reveal hotspots in your code that you would never find through tracing or metrics alone.

Unlike traditional profilers that you attach to a running JVM and sample for a few minutes, Cloud Profiler runs continuously. It collects short profiles at regular intervals and aggregates them in the Cloud Console, where you can analyze flame graphs over hours, days, or weeks.

## How Cloud Profiler Works for Java

Cloud Profiler for Java uses the Google Cloud Profiler agent, which is a native library that hooks into the JVM. It collects profiles using these methods:

- **CPU time**: Tracks time spent executing code on the CPU. Helps find computationally expensive methods.
- **Wall time**: Tracks elapsed time including I/O waits, locks, and sleeps. Helps find methods that are slow but not necessarily CPU-intensive.
- **Heap**: Tracks memory allocations. Helps find methods that create excessive garbage.

The agent collects a 10-second profile approximately once per minute. The overhead is typically 0.5-1% of CPU.

## Step 1: Add the Cloud Profiler Agent to Your Docker Image

The profiler agent needs to be included in your container image. Download it during the build.

```dockerfile
# Dockerfile for Java application with Cloud Profiler
FROM eclipse-temurin:17-jre

WORKDIR /app

# Download the Cloud Profiler agent
RUN apt-get update && apt-get install -y wget && \
    mkdir -p /opt/cprof && \
    wget -q -O- https://storage.googleapis.com/cloud-profiler/java/latest/profiler_java_agent.tar.gz \
    | tar xzv -C /opt/cprof && \
    apt-get remove -y wget && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

# Copy your application JAR
COPY target/my-app.jar /app/app.jar

# Start the JVM with the profiler agent attached
# -cprof_service sets the service name shown in Cloud Profiler
# -cprof_service_version helps compare profiles across versions
ENTRYPOINT ["java", \
  "-agentpath:/opt/cprof/profiler_java_agent=-cprof_service=my-java-service,-cprof_service_version=1.0.0", \
  "-jar", "/app/app.jar"]
```

## Step 2: Configure GKE Permissions

The profiler agent needs to authenticate with Google Cloud. On GKE, use Workload Identity for this.

```bash
# Create a service account for profiling
gcloud iam service-accounts create profiler-agent \
  --display-name="Cloud Profiler Agent"

# Grant the Cloud Profiler agent role
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:profiler-agent@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudprofiler.agent"

# Create a Kubernetes service account
kubectl create serviceaccount profiler-sa -n default

# Bind K8s SA to GCP SA via Workload Identity
gcloud iam service-accounts add-iam-policy-binding \
  profiler-agent@YOUR_PROJECT_ID.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="serviceAccount:YOUR_PROJECT_ID.svc.id.goog[default/profiler-sa]"

# Annotate the K8s service account
kubectl annotate serviceaccount profiler-sa \
  -n default \
  iam.gke.io/gcp-service-account=profiler-agent@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

## Step 3: Deploy to GKE

Here is the Kubernetes deployment that uses the profiler-enabled image.

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-java-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-java-service
  template:
    metadata:
      labels:
        app: my-java-service
    spec:
      serviceAccountName: profiler-sa
      containers:
        - name: app
          image: gcr.io/YOUR_PROJECT/my-java-service:1.0.0
          ports:
            - containerPort: 8080
          env:
            # Tell the profiler agent which GCP project to report to
            - name: GOOGLE_CLOUD_PROJECT
              value: "YOUR_PROJECT_ID"
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: "1"
              memory: 1Gi
          # JVM tuning for GKE
          env:
            - name: JAVA_TOOL_OPTIONS
              value: "-XX:MaxRAMPercentage=75.0 -XX:+UseG1GC"
```

## Step 4: Configure Profiling Options

The profiler agent accepts several configuration options through the `-agentpath` argument. Here are the most useful ones.

```dockerfile
# Full configuration example with all major options
ENTRYPOINT ["java", \
  "-agentpath:/opt/cprof/profiler_java_agent=\
-cprof_service=my-java-service,\
-cprof_service_version=1.0.0,\
-cprof_cpu_use_per_thread_timers=true,\
-cprof_enable_heap_sampling=true,\
-cprof_heap_sampling_interval=262144", \
  "-jar", "/app/app.jar"]
```

Configuration options explained:
- `cprof_service`: The service name displayed in the Cloud Profiler UI. Required.
- `cprof_service_version`: Version string for comparing profiles across deployments.
- `cprof_cpu_use_per_thread_timers`: Enables per-thread CPU time measurement. More accurate but slightly higher overhead.
- `cprof_enable_heap_sampling`: Enables heap allocation profiling. Disabled by default.
- `cprof_heap_sampling_interval`: Bytes between heap samples. Lower values give more detail but higher overhead. Default is 512KiB.

## Step 5: Using the Maven/Gradle Approach

If you use Spring Boot, you can add the profiler agent programmatically instead of through the JVM agent path.

Add the dependency to your `pom.xml`:

```xml
<!-- pom.xml - Add the Cloud Profiler dependency -->
<dependency>
  <groupId>com.google.cloud</groupId>
  <artifactId>google-cloud-profiler</artifactId>
  <version>2.3.0</version>
</dependency>
```

Then initialize it in your application startup code.

```java
// ProfilerConfig.java - Initialize Cloud Profiler in Spring Boot
package com.example.myapp.config;

import com.google.devtools.cloudprofiler.v2.ProfilerServiceClient;
import org.springframework.context.annotation.Configuration;
import javax.annotation.PostConstruct;

@Configuration
public class ProfilerConfig {

    @PostConstruct
    public void startProfiler() {
        // The agent-based approach (Dockerfile) is preferred over the API approach
        // This class is here to show the alternative if you cannot modify the Dockerfile
        System.out.println("Cloud Profiler agent should be configured via -agentpath JVM flag");
    }
}
```

The native agent approach through the Dockerfile is generally preferred because it has lower overhead and does not require code changes.

## Step 6: Viewing Profiles in the Cloud Console

After deploying, go to **Profiler** in the Cloud Console. It takes about 5-10 minutes for the first profiles to appear.

In the Profiler UI, you will see:

1. **Service selector**: Choose your service (the name you set with `cprof_service`)
2. **Profile type dropdown**: Select CPU time, Wall time, or Heap
3. **Time range**: Select the period to aggregate profiles over
4. **Flame graph**: The main visualization showing where time is spent

### Reading the Flame Graph

The flame graph is read bottom to top:
- The bottom bar represents the entry point (like `main()` or the request handler)
- Each bar above it is a method called by the one below
- The width of a bar represents the proportion of total time spent in that method
- Wider bars indicate hotter code paths

Look for:
- Wide bars deep in the stack: These are the actual hotspots
- Unexpected wide bars: Methods you did not expect to be expensive
- Many narrow bars: Could indicate excessive method call overhead

## Step 7: Comparing Profiles Across Versions

One of the most powerful features is comparing profiles between service versions.

1. Deploy a new version with a different `cprof_service_version`
2. In the Cloud Console, select "Compare to" and choose the previous version
3. The flame graph will highlight methods that got slower (red) or faster (blue)

This makes it easy to spot performance regressions introduced by a specific deployment.

## Common Java Performance Issues Found with Profiler

Based on patterns I have seen in production Java services:

1. **Excessive JSON serialization**: Jackson or Gson taking significant CPU. Fix by using streaming APIs or pre-compiled serializers.
2. **Regex compilation in loops**: `Pattern.compile()` called repeatedly. Fix by pre-compiling patterns as static fields.
3. **Unnecessary object creation**: Methods creating temporary objects in hot paths. Fix by reusing objects or using primitives.
4. **Lock contention**: Threads waiting on synchronized blocks. Visible in wall-time profiles as wide bars in `park()` or `wait()`.
5. **Class loading**: Dynamic class loading during request processing. Usually caused by reflection-heavy frameworks.

## Wrapping Up

Cloud Profiler for Java on GKE is straightforward to set up - add the agent to your Docker image, configure Workload Identity, and deploy. The continuous profiling approach means you always have production profile data available when you need it, without the overhead of attaching a profiler after a problem is reported. Check the flame graphs weekly to catch regressions early and focus optimization efforts on the methods that actually matter.
