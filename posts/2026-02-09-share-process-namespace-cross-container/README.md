# How to Use shareProcessNamespace for Cross-Container Process Visibility

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Debugging, Containers

Description: Learn how to enable shareProcessNamespace in Kubernetes pods to share process namespaces between containers, enabling advanced debugging, monitoring, and sidecar patterns with cross-container visibility.

---

By default, each container in a Kubernetes pod has its own isolated process namespace. Processes in one container cannot see or interact with processes in another container. The shareProcessNamespace feature changes this by creating a single shared process namespace for all containers in a pod.

This capability enables powerful debugging techniques, advanced sidecar patterns, and better process monitoring. Understanding when and how to use shareProcessNamespace helps you build more observable and debuggable applications.

## Understanding Process Namespace Sharing

Without shareProcessNamespace, each container has its own PID 1 process and can only see its own processes. With shareProcessNamespace enabled, all containers in the pod share the same process namespace. They can see each other's processes, send signals across containers, and access shared process information.

The pause container becomes PID 1 for the entire pod. Your application containers start with higher PIDs. This means your application is no longer PID 1, which can affect signal handling and zombie process reaping.

## Basic Configuration

Enable shareProcessNamespace in your pod spec:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: shared-process-pod
spec:
  shareProcessNamespace: true
  containers:
  - name: app
    image: nginx
  - name: debugger
    image: busybox
    command: ['sleep', '3600']
```

Now both containers can see each other's processes.

Verify process sharing:

```bash
# Exec into the app container
kubectl exec -it shared-process-pod -c app -- ps aux

# You'll see processes from both containers
```

Output shows processes from nginx and the sleep command from the busybox container.

## Debugging with Shared Process Namespace

The primary use case for shareProcessNamespace is debugging. A debug sidecar can inspect and interact with application processes without modifying the application container.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: debug-pod
spec:
  shareProcessNamespace: true
  containers:
  - name: app
    image: myapp:latest
  - name: debug
    image: nicolaka/netshoot
    command: ['sleep', 'infinity']
    securityContext:
      capabilities:
        add: ['SYS_PTRACE']
```

The debug container can now attach to application processes:

```bash
# Exec into debug container
kubectl exec -it debug-pod -c debug -- /bin/bash

# Find app process
ps aux | grep myapp

# Attach strace to the process
strace -p <PID>

# Generate thread dump
gcore -o /tmp/core <PID>
```

This lets you debug production issues without adding debugging tools to your application container or restarting pods.

## Monitoring Application Processes

Use shared process namespace for advanced monitoring sidecars:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: monitored-app
spec:
  shareProcessNamespace: true
  containers:
  - name: app
    image: java-app:latest
  - name: monitor
    image: monitor:latest
    env:
    - name: APP_PROCESS_NAME
      value: "java"
    command:
    - /bin/sh
    - -c
    - |
      while true; do
        # Find app process
        APP_PID=$(pgrep -f java)

        if [ -n "$APP_PID" ]; then
          # Collect process metrics
          CPU=$(ps -p $APP_PID -o %cpu | tail -1)
          MEM=$(ps -p $APP_PID -o %mem | tail -1)
          FD=$(ls /proc/$APP_PID/fd | wc -l)

          echo "CPU: $CPU% MEM: $MEM% FD: $FD"

          # Send to monitoring system
          curl -X POST http://metrics-collector/metrics \
            -d "cpu=$CPU&mem=$MEM&fd=$FD"
        fi

        sleep 10
      done
```

The monitor sidecar collects detailed process metrics without instrumenting the application.

## Signal Handling Between Containers

With shared process namespace, containers can send signals to each other's processes:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: signal-pod
spec:
  shareProcessNamespace: true
  containers:
  - name: app
    image: myapp:latest
  - name: controller
    image: busybox
    command:
    - /bin/sh
    - -c
    - |
      # Wait for app to start
      sleep 10

      # Find app process
      APP_PID=$(pgrep myapp)

      # Send reload signal
      kill -HUP $APP_PID

      # Keep container running
      sleep infinity
```

This enables coordination patterns where one container controls another's lifecycle.

## Hot Reload Pattern

Implement configuration hot reload using shared process namespace:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: hot-reload-app
spec:
  shareProcessNamespace: true
  volumes:
  - name: config
    configMap:
      name: app-config
  containers:
  - name: app
    image: myapp:latest
    volumeMounts:
    - name: config
      mountPath: /etc/config
  - name: config-watcher
    image: busybox
    volumeMounts:
    - name: config
      mountPath: /etc/config
    command:
    - /bin/sh
    - -c
    - |
      CONFIG_HASH=$(md5sum /etc/config/app.conf | cut -d' ' -f1)

      while true; do
        sleep 30

        NEW_HASH=$(md5sum /etc/config/app.conf | cut -d' ' -f1)

        if [ "$CONFIG_HASH" != "$NEW_HASH" ]; then
          echo "Config changed, reloading app"

          # Find app process
          APP_PID=$(pgrep myapp)

          # Send reload signal
          if [ -n "$APP_PID" ]; then
            kill -HUP $APP_PID
          fi

          CONFIG_HASH=$NEW_HASH
        fi
      done
```

The watcher detects config changes and signals the application to reload.

## Process Lifecycle Management

Implement a process supervisor sidecar:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: supervised-app
spec:
  shareProcessNamespace: true
  containers:
  - name: app
    image: unstable-app:latest
  - name: supervisor
    image: busybox
    command:
    - /bin/sh
    - -c
    - |
      while true; do
        # Check if app is running
        if ! pgrep unstable-app > /dev/null; then
          echo "App process died, logging state"

          # Collect diagnostic info
          ps aux > /tmp/processes.txt
          dmesg > /tmp/kernel.log

          # Could send alerts here
          echo "App crashed at $(date)"
        fi

        sleep 5
      done
```

The supervisor detects application crashes and collects diagnostic information.

## Security Considerations

Sharing process namespace has security implications. Containers can see and interact with each other's processes, which might expose sensitive information.

Limit process visibility with securityContext:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: restricted-shared-pod
spec:
  shareProcessNamespace: true
  containers:
  - name: app
    image: sensitive-app:latest
    securityContext:
      runAsUser: 1000
      allowPrivilegeEscalation: false
  - name: debug
    image: debug-tools:latest
    securityContext:
      runAsUser: 2000
      capabilities:
        drop: ['ALL']
        add: ['SYS_PTRACE']  # Only if needed for debugging
```

Different user IDs provide some isolation. Capabilities control what actions containers can perform on processes.

Audit process access:

```yaml
apiVersion: v1
kind: Pod
metadata:
  annotations:
    audit: "high"
spec:
  shareProcessNamespace: true
  containers:
  - name: app
    image: app:latest
  - name: auditor
    image: audit:latest
    command:
    - /bin/sh
    - -c
    - |
      while true; do
        # Log all processes
        ps aux > /var/log/process-audit.log

        # Log any unexpected processes
        ps aux | grep -v "app\|auditor\|pause" | \
          logger -t process-audit

        sleep 60
      done
```

## Handling PID 1 Changes

When shareProcessNamespace is enabled, your application is no longer PID 1. This affects signal handling and zombie process reaping.

The pause container becomes PID 1 and handles SIGTERM for the entire pod. Your application receives SIGTERM from Kubernetes, but zombie processes are reaped by the pause container instead of your application.

If your application depends on being PID 1, use an init system:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: init-system-pod
spec:
  shareProcessNamespace: true
  containers:
  - name: app
    image: myapp:latest
    command:
    - /usr/bin/dumb-init
    - --
    - /app/start.sh
```

dumb-init acts as a minimal init system, reaping zombies and forwarding signals correctly.

## Troubleshooting Process Issues

Debug process problems using shared namespace:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: troubleshoot-pod
spec:
  shareProcessNamespace: true
  containers:
  - name: app
    image: problematic-app:latest
  - name: troubleshoot
    image: ubuntu:22.04
    command: ['sleep', 'infinity']
    securityContext:
      capabilities:
        add: ['SYS_PTRACE', 'SYS_ADMIN']
```

Exec into troubleshoot container:

```bash
kubectl exec -it troubleshoot-pod -c troubleshoot -- /bin/bash

# Install tools
apt-get update && apt-get install -y strace lsof procps

# Find app process
APP_PID=$(pgrep problematic-app)

# Trace system calls
strace -p $APP_PID -f

# Check open files
lsof -p $APP_PID

# Monitor resource usage
top -p $APP_PID

# Analyze threads
ps -L -p $APP_PID
```

## Real-World Example: Java Application Debugging

Complete configuration for debugging a Java application:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: java-debug-pod
spec:
  shareProcessNamespace: true
  containers:
  - name: java-app
    image: java-app:v1.0.0
    env:
    - name: JAVA_OPTS
      value: "-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/tmp"
    ports:
    - containerPort: 8080
  - name: jdk-tools
    image: openjdk:11
    command: ['sleep', 'infinity']
    securityContext:
      capabilities:
        add: ['SYS_PTRACE']
  - name: system-tools
    image: nicolaka/netshoot
    command: ['sleep', 'infinity']
```

Debug the Java application:

```bash
# Exec into jdk-tools container
kubectl exec -it java-debug-pod -c jdk-tools -- /bin/bash

# Find Java process
JAVA_PID=$(pgrep java)

# Generate thread dump
jstack $JAVA_PID > /tmp/thread-dump.txt

# Get heap histogram
jmap -histo $JAVA_PID > /tmp/heap-histo.txt

# Generate heap dump
jmap -dump:live,format=b,file=/tmp/heap.hprof $JAVA_PID
```

Network debugging from system-tools:

```bash
kubectl exec -it java-debug-pod -c system-tools -- /bin/bash

# Find Java process
JAVA_PID=$(pgrep java)

# Monitor network connections
lsof -p $JAVA_PID -i

# Capture network traffic for this process
tcpdump -i any -p $JAVA_PID
```

## Performance Monitoring Pattern

Implement detailed performance monitoring:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: perf-monitored-app
spec:
  shareProcessNamespace: true
  containers:
  - name: app
    image: cpu-intensive-app:latest
  - name: perf-monitor
    image: ubuntu:22.04
    command:
    - /bin/sh
    - -c
    - |
      apt-get update && apt-get install -y linux-tools-generic

      # Wait for app to start
      while ! pgrep cpu-intensive-app; do
        sleep 1
      done

      APP_PID=$(pgrep cpu-intensive-app)

      # Profile CPU usage
      perf record -p $APP_PID -g -o /tmp/perf.data sleep 30

      # Generate report
      perf report -i /tmp/perf.data > /tmp/perf-report.txt

      # Keep container alive
      sleep infinity
    securityContext:
      capabilities:
        add: ['SYS_ADMIN']
```

## Best Practices

Enable shareProcessNamespace only when needed. Most applications do not require it.

Use separate debug pods instead of adding debug sidecars to production pods when possible.

Document why shareProcessNamespace is enabled. Future maintainers need to understand the requirement.

Test applications with shareProcessNamespace enabled. The PID 1 change can affect behavior.

Limit capabilities and use security contexts to minimize risks.

Monitor process activity in pods with shared namespaces to detect unexpected behavior.

Use readiness and liveness probes that work correctly when the application is not PID 1.

## Conclusion

shareProcessNamespace enables powerful debugging and monitoring patterns by allowing containers to see and interact with each other's processes. Use it for debug sidecars, process monitoring, signal coordination, and advanced troubleshooting.

Configure security contexts appropriately to limit risks. Handle the PID 1 change by using init systems when necessary. Test thoroughly to ensure applications work correctly with shared process namespaces.

Master shareProcessNamespace to build more observable and debuggable Kubernetes applications while maintaining security and reliability.
