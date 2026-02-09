# How to Implement strace Tracing Inside Kubernetes Containers for System Call Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Debugging, Performance

Description: Learn how to use strace inside Kubernetes containers to trace system calls, diagnose performance issues, and understand application behavior at the kernel level.

---

When applications behave unexpectedly or perform poorly, understanding what system calls they're making can reveal the root cause. strace is a powerful diagnostic tool that intercepts and records system calls made by processes, showing you exactly how your application interacts with the kernel. In Kubernetes environments, using strace requires special considerations for security context and capabilities.

System call tracing helps diagnose file access issues, network connection problems, performance bottlenecks, hanging processes, and security policy violations. It's particularly valuable when source code isn't available or when the issue only appears in production.

## Understanding strace Basics

strace attaches to running processes or starts new ones while tracing every system call. It shows the call name, arguments, return values, and timing information. Common use cases include finding which files an application opens, seeing why network connections fail, understanding why processes hang, and measuring syscall performance overhead.

## Enabling strace in Kubernetes

strace requires the SYS_PTRACE capability, which is not granted by default. You need to add this capability to your pod security context:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: strace-enabled-pod
  namespace: debugging
spec:
  containers:
  - name: app
    image: myapp:latest
    securityContext:
      capabilities:
        add:
        - SYS_PTRACE
  - name: debug
    image: ubuntu:22.04
    command: ["sleep", "infinity"]
    securityContext:
      capabilities:
        add:
        - SYS_PTRACE
    volumeMounts:
    - name: proc
      mountPath: /host/proc
      readOnly: true
  volumes:
  - name: proc
    hostPath:
      path: /proc
```

## Installing strace in Running Containers

Add strace to containers that don't have it:

```bash
# For Debian/Ubuntu based containers
kubectl exec -it my-pod -- bash -c "apt-get update && apt-get install -y strace"

# For Alpine Linux
kubectl exec -it my-pod -- sh -c "apk add --no-cache strace"

# For RHEL/CentOS
kubectl exec -it my-pod -- bash -c "yum install -y strace"

# Using ephemeral containers
kubectl debug my-pod -it \
  --image=ubuntu \
  --target=my-pod \
  --share-processes \
  -- bash -c "apt-get update && apt-get install -y strace && bash"
```

## Basic strace Usage

Trace a running process:

```bash
# Find the process ID
kubectl exec my-pod -- ps aux | grep myapp

# Attach strace to the process
kubectl exec -it my-pod -- strace -p <PID>

# Trace with timestamps
kubectl exec -it my-pod -- strace -t -p <PID>

# Trace with relative timestamps
kubectl exec -it my-pod -- strace -r -p <PID>

# Trace with absolute timestamps and microseconds
kubectl exec -it my-pod -- strace -tt -p <PID>
```

## Tracing Specific System Calls

Focus on particular syscalls:

```bash
# Trace only file operations
kubectl exec -it my-pod -- strace -e trace=file -p <PID>

# Trace only network operations
kubectl exec -it my-pod -- strace -e trace=network -p <PID>

# Trace specific syscalls
kubectl exec -it my-pod -- strace -e trace=open,read,write -p <PID>

# Trace open and stat family calls
kubectl exec -it my-pod -- strace -e trace=open,openat,stat,fstat,lstat -p <PID>

# Trace socket operations
kubectl exec -it my-pod -- strace -e trace=socket,connect,accept,send,recv -p <PID>
```

## Performance Analysis with strace

Measure syscall performance:

```bash
# Show time spent in each syscall
kubectl exec -it my-pod -- strace -c -p <PID>

# Shows summary like:
# % time     seconds  usecs/call     calls    errors syscall
# ------ ----------- ----------- --------- --------- ----------------
#   44.82    0.000156           1       123           read
#   22.41    0.000078           2        45           write

# Trace with timing information
kubectl exec -it my-pod -- strace -T -p <PID>

# Sort by time spent
kubectl exec -it my-pod -- strace -c -S time -p <PID>

# Sort by number of calls
kubectl exec -it my-pod -- strace -c -S calls -p <PID>
```

## Debugging File Access Issues

Trace file operations to find missing files or permission issues:

```bash
# Trace all file access
kubectl exec -it my-pod -- strace -e trace=file -f -p <PID>

# Find files being opened
kubectl exec -it my-pod -- strace -e trace=open,openat -p <PID> 2>&1 | grep -E "ENOENT|EACCES"

# Trace file reads and writes
kubectl exec -it my-pod -- strace -e trace=read,write -p <PID>

# See which directories are accessed
kubectl exec -it my-pod -- strace -e trace=chdir,getcwd -p <PID>

# Trace file descriptor operations
kubectl exec -it my-pod -- strace -e trace=dup,dup2,dup3 -p <PID>
```

## Network Debugging with strace

Diagnose network connectivity issues:

```bash
# Trace all network syscalls
kubectl exec -it my-pod -- strace -e trace=network -p <PID>

# Trace connection attempts
kubectl exec -it my-pod -- strace -e trace=connect -p <PID>

# Show DNS resolution
kubectl exec -it my-pod -- strace -e trace=connect -p <PID> 2>&1 | grep -A2 "connect"

# Trace send and receive operations
kubectl exec -it my-pod -- strace -e trace=send,sendto,recv,recvfrom -p <PID>

# Trace socket creation
kubectl exec -it my-pod -- strace -e trace=socket -p <PID>
```

## Following Child Processes

Trace parent and child processes:

```bash
# Follow forks
kubectl exec -it my-pod -- strace -f -p <PID>

# Follow forks and show PID
kubectl exec -it my-pod -- strace -f -ff -p <PID>

# Save each process to separate file
kubectl exec my-pod -- strace -f -ff -o /tmp/strace.out -p <PID>

# Analyze output files
kubectl exec my-pod -- ls -la /tmp/strace.out.*
kubectl exec my-pod -- cat /tmp/strace.out.1234
```

## Saving and Analyzing strace Output

Capture strace output for later analysis:

```bash
# Save to file
kubectl exec my-pod -- strace -o /tmp/strace.log -p <PID>

# Save with timestamps
kubectl exec my-pod -- strace -tt -o /tmp/strace.log -p <PID>

# Copy to local system
kubectl cp my-pod:/tmp/strace.log ./strace-analysis.log

# Analyze the output
grep -E "ENOENT|EACCES|ETIMEDOUT|ECONNREFUSED" strace-analysis.log

# Find slow syscalls (taking more than 1 second)
grep "<[0-9]\.[0-9][0-9][0-9][0-9][0-9][0-9]>" strace-analysis.log

# Count syscalls
awk '{print $NF}' strace-analysis.log | sort | uniq -c | sort -rn
```

## Tracing Application Startup

Trace an application from the beginning:

```bash
# Start process under strace
kubectl exec my-pod -- strace -o /tmp/startup.log /app/myapp

# Trace with environment variables
kubectl exec my-pod -- strace -E VAR=value /app/myapp

# Follow all children during startup
kubectl exec my-pod -- strace -f -ff -o /tmp/startup /app/myapp

# Analyze what files are accessed during startup
kubectl exec my-pod -- grep "^open" /tmp/startup.log | awk '{print $2}' | sort | uniq
```

## Advanced strace Techniques

Filter and format output:

```bash
# Show only failed syscalls
kubectl exec -it my-pod -- strace -Z -p <PID>

# Show string arguments in full
kubectl exec -it my-pod -- strace -s 1000 -p <PID>

# Show stack traces (if available)
kubectl exec -it my-pod -- strace -k -p <PID>

# Decode socket addresses
kubectl exec -it my-pod -- strace -yy -p <PID>

# Show instruction pointer
kubectl exec -it my-pod -- strace -i -p <PID>
```

## Using strace in Sidecar Container

Deploy a dedicated debugging sidecar:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-strace-sidecar
spec:
  shareProcessNamespace: true
  containers:
  - name: app
    image: myapp:latest
    ports:
    - containerPort: 8080
  - name: strace-sidecar
    image: ubuntu:22.04
    command:
    - /bin/bash
    - -c
    - |
      apt-get update && apt-get install -y strace procps
      while true; do
        echo "Waiting for app process..."
        PID=$(ps aux | grep myapp | grep -v grep | awk '{print $2}' | head -1)
        if [ -n "$PID" ]; then
          echo "Tracing PID: $PID"
          strace -tt -T -f -p $PID 2>&1 | tee /var/log/strace.log
        fi
        sleep 5
      done
    securityContext:
      capabilities:
        add:
        - SYS_PTRACE
    volumeMounts:
    - name: strace-logs
      mountPath: /var/log
  volumes:
  - name: strace-logs
    emptyDir: {}
```

## Creating an strace Analysis Script

Automated strace analysis:

```bash
#!/bin/bash
# Save as analyze-strace.sh

POD_NAME=$1
PID=$2
DURATION=${3:-60}

if [ -z "$POD_NAME" ] || [ -z "$PID" ]; then
    echo "Usage: $0 <pod-name> <pid> [duration-seconds]"
    exit 1
fi

echo "Tracing pod $POD_NAME PID $PID for $DURATION seconds..."

# Run strace
kubectl exec -it "$POD_NAME" -- timeout "$DURATION" strace -c -f -p "$PID" 2>&1 | tee strace-summary.txt

# Detailed trace
kubectl exec "$POD_NAME" -- timeout "$DURATION" strace -tt -T -f -o /tmp/strace.log -p "$PID"

# Copy log
kubectl cp "$POD_NAME":/tmp/strace.log ./strace-detailed.log

echo "Analysis complete. Files created:"
echo "  - strace-summary.txt (syscall summary)"
echo "  - strace-detailed.log (detailed trace)"

# Basic analysis
echo ""
echo "Top 10 syscalls by count:"
grep -v "^---" strace-detailed.log | awk -F'(' '{print $1}' | sort | uniq -c | sort -rn | head -10

echo ""
echo "Failed syscalls:"
grep -E "= -1 E" strace-detailed.log | awk -F'(' '{print $1}' | sort | uniq -c | sort -rn
```

## Troubleshooting Common Issues

If strace fails with "Operation not permitted":

```bash
# Check if SYS_PTRACE capability is enabled
kubectl get pod my-pod -o jsonpath='{.spec.containers[*].securityContext.capabilities.add}'

# Add capability to pod
kubectl patch pod my-pod --type=json -p='[{"op":"add","path":"/spec/containers/0/securityContext/capabilities/add","value":["SYS_PTRACE"]}]'
```

If you cannot see other container processes:

```yaml
# Enable process namespace sharing
spec:
  shareProcessNamespace: true
```

strace is an invaluable tool for deep system-level debugging in Kubernetes, revealing exactly how applications interact with the operating system and helping diagnose issues that are invisible at the application layer.
