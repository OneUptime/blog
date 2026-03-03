# How to Troubleshoot CrashLoopBackOff Pods on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, CrashLoopBackOff, Pod Debugging, Troubleshooting

Description: Diagnose and fix CrashLoopBackOff pods on Talos Linux clusters by analyzing container logs, exit codes, resource limits, and configuration errors.

---

CrashLoopBackOff is one of the most common pod states you will encounter on any Kubernetes cluster, including those running on Talos Linux. It means a container starts, crashes, gets restarted by the kubelet, crashes again, and so on in an exponential backoff loop. While the problem is usually with the application itself, Talos Linux-specific factors can also contribute. This guide walks through the systematic process of finding and fixing the root cause.

## Understanding CrashLoopBackOff

When Kubernetes says a pod is in CrashLoopBackOff, it means:

1. The container started and exited (either with an error or successfully)
2. The kubelet restarted it (because the restart policy says to)
3. It crashed again
4. The backoff timer increases with each crash (10s, 20s, 40s, 80s, up to 5 minutes)

The pod is not stuck - it is actively being restarted, just with increasing delays between attempts.

```bash
# Check for CrashLoopBackOff pods
kubectl get pods -A | grep CrashLoopBackOff

# Get details about the pod
kubectl describe pod <pod-name> -n <namespace>
```

## Step 1: Check Container Logs

The logs from the crashing container are almost always the most useful piece of information:

```bash
# View the current container logs
kubectl logs <pod-name> -n <namespace>

# If the container has already restarted, view the previous instance logs
kubectl logs <pod-name> -n <namespace> --previous

# For multi-container pods, specify the container
kubectl logs <pod-name> -n <namespace> -c <container-name> --previous
```

The logs will usually show the error that caused the crash. Common errors include:

- Application configuration errors
- Missing environment variables
- Database connection failures
- Permission denied errors
- Segmentation faults

## Step 2: Check the Exit Code

The exit code tells you how the container terminated:

```bash
# Check the last termination status
kubectl get pod <pod-name> -n <namespace> -o jsonpath='{.status.containerStatuses[0].lastState.terminated}'
```

Common exit codes:

- **Exit code 0** - The container exited normally (but the restart policy is Always, so it restarts)
- **Exit code 1** - General application error
- **Exit code 126** - Permission problem or command not executable
- **Exit code 127** - Command not found (wrong image or missing binary)
- **Exit code 137** - Container was killed by SIGKILL (usually OOM killed)
- **Exit code 139** - Segmentation fault
- **Exit code 143** - Container received SIGTERM (graceful shutdown)

## Step 3: OOM Kill Investigation (Exit Code 137)

Exit code 137 almost always means the container was killed for using too much memory:

```bash
# Check the pod's memory limits
kubectl get pod <pod-name> -n <namespace> -o jsonpath='{.spec.containers[0].resources}'

# Check for OOM events on the node
talosctl -n <node-ip> dmesg | grep -i oom
```

If the container is being OOM killed, either increase the memory limit or fix the application's memory usage:

```yaml
resources:
  requests:
    memory: "256Mi"
  limits:
    memory: "512Mi"  # Increase if needed
```

## Step 4: Liveness Probe Failures

Liveness probes can cause a container to be restarted even if the application process is still running. If the liveness probe fails repeatedly, the kubelet kills the container:

```bash
# Check liveness probe configuration
kubectl get pod <pod-name> -n <namespace> -o yaml | grep -A 10 livenessProbe

# Check events for probe failures
kubectl describe pod <pod-name> -n <namespace> | grep -i "liveness\|unhealthy"
```

Common liveness probe issues:

- The probe timeout is too short for the application
- The probe endpoint is wrong
- The application takes too long to start (use a startup probe instead)

Fix by adjusting the probe parameters:

```yaml
livenessProbe:
  httpGet:
    path: /healthz
    port: 8080
  initialDelaySeconds: 30    # Give the app time to start
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 6        # Allow more failures before killing
```

## Step 5: Missing Configuration or Secrets

Applications often crash because required ConfigMaps, Secrets, or environment variables are missing:

```bash
# Check if all referenced ConfigMaps exist
kubectl get pod <pod-name> -n <namespace> -o yaml | grep -A2 configMapRef

# Check if all referenced Secrets exist
kubectl get pod <pod-name> -n <namespace> -o yaml | grep -A2 secretRef

# List ConfigMaps and Secrets in the namespace
kubectl get configmaps -n <namespace>
kubectl get secrets -n <namespace>
```

If a ConfigMap or Secret is missing, create it:

```bash
# Create a missing ConfigMap
kubectl create configmap <name> --from-literal=key=value -n <namespace>

# Create a missing Secret
kubectl create secret generic <name> --from-literal=key=value -n <namespace>
```

## Step 6: Volume Mount Issues

If a pod uses volumes that cannot be mounted, the container may start but fail immediately:

```bash
# Check for volume mount events
kubectl describe pod <pod-name> -n <namespace> | grep -A5 "Volumes\|Mount"

# Check PVC status if using persistent volumes
kubectl get pvc -n <namespace>
```

On Talos Linux, certain paths are read-only. If you are trying to use a hostPath volume, make sure the path exists and is writable:

```bash
# Check if the path exists on the Talos node
talosctl -n <node-ip> ls /path/to/volume
```

## Step 7: Image Issues

Sometimes the container image itself is the problem:

```bash
# Check the image being used
kubectl get pod <pod-name> -n <namespace> -o jsonpath='{.spec.containers[0].image}'

# Verify the entrypoint/command
kubectl get pod <pod-name> -n <namespace> -o jsonpath='{.spec.containers[0].command}'
```

Issues include:

- Wrong image tag (debugging image vs production image)
- Image built for wrong architecture (AMD64 vs ARM64)
- Image missing required runtime dependencies

Try running the image locally to verify it works:

```bash
# Test the image locally
docker run --rm <image-name>:<tag>
```

## Step 8: Network Dependencies

If the application depends on external services (databases, APIs, message queues), it may crash if those services are unreachable:

```bash
# Check DNS resolution from inside the pod
kubectl exec <pod-name> -n <namespace> -- nslookup <service-name>

# Check network connectivity
kubectl exec <pod-name> -n <namespace> -- wget -qO- http://<service-name>:<port>/health
```

If network dependencies are unreachable, the application should ideally handle this gracefully with retries. If it crashes instead, fix the dependency or add init containers that wait for dependencies:

```yaml
initContainers:
  - name: wait-for-db
    image: busybox
    command: ['sh', '-c', 'until nc -z db-service 5432; do echo waiting for db; sleep 2; done']
```

## Step 9: Talos-Specific CrashLoopBackOff Causes

On Talos Linux, some system-level pods may CrashLoopBackOff for Talos-specific reasons:

**CoreDNS CrashLoopBackOff:**

Usually caused by a DNS loop. Check the CoreDNS logs:

```bash
kubectl -n kube-system logs -l k8s-app=kube-dns --previous
```

**kube-proxy issues:**

```bash
kubectl -n kube-system logs -l k8s-app=kube-proxy --previous
```

**CNI plugin failures:**

```bash
kubectl -n kube-system logs -l app=flannel --previous
```

## Step 10: Debugging with an Ephemeral Container

If the pod crashes too quickly to exec into it, use an ephemeral debug container:

```bash
# Attach a debug container to the crashing pod
kubectl debug <pod-name> -n <namespace> -it --image=busybox --target=<container-name>
```

Or override the command to prevent the crash:

```bash
# Create a copy of the pod with a sleep command
kubectl debug <pod-name> -n <namespace> -it --copy-to=debug-pod --container=<container-name> -- sleep 3600
```

This lets you investigate the container environment without the crash.

## Summary

CrashLoopBackOff on Talos Linux is diagnosed the same way as on any Kubernetes cluster - start with the container logs and exit code. The logs will tell you what is happening inside the container, and the exit code will tell you how it died. From there, check for OOM kills, liveness probe failures, missing configurations, and network dependency issues. For Talos-specific system pods, check the Talos service logs for additional context.
