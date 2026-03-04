# How to Troubleshoot Azure Kubernetes Service Pod CrashLoopBackOff Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, AKS, Kubernetes, CrashLoopBackOff, Troubleshooting, Containers, DevOps

Description: A systematic guide to diagnosing and fixing CrashLoopBackOff errors in Azure Kubernetes Service pods, from container logs to resource limits.

---

CrashLoopBackOff is the Kubernetes error that every engineer dreads seeing. Your pod starts, crashes, restarts, crashes again, and Kubernetes keeps trying with exponentially increasing delays. The status field shows CrashLoopBackOff, and your application is not running.

In Azure Kubernetes Service (AKS), this error has the same root causes as in any Kubernetes cluster, plus a few Azure-specific twists. Let us walk through a systematic debugging approach.

## Understanding CrashLoopBackOff

CrashLoopBackOff is not an error by itself. It is a state that indicates your container is repeatedly crashing. Kubernetes restarts it each time, but after enough failures, it starts adding backoff delays: 10 seconds, 20 seconds, 40 seconds, up to 5 minutes. The underlying cause could be anything from a missing environment variable to an out-of-memory kill.

## Step 1: Check Pod Status and Events

Start by looking at the pod's current state and recent events.

```bash
# Get the pod status with details
kubectl get pods -n <namespace> -o wide

# Describe the pod for events and conditions
kubectl describe pod <pod-name> -n <namespace>
```

The `describe` output is gold. Look at the Events section at the bottom. Common events that point to specific issues:

- `Back-off restarting failed container` - the container exits on its own
- `OOMKilled` - the container ran out of memory
- `FailedScheduling` - the pod could not be placed on a node
- `ImagePullBackOff` - cannot pull the container image
- `Failed to pull image` - image does not exist or auth failed

Also check the `Last State` section. It shows the exit code of the container:

- Exit code 0: container exited normally (which is still a crash if it was not supposed to exit)
- Exit code 1: application error
- Exit code 137: OOMKilled or SIGKILL
- Exit code 139: segmentation fault
- Exit code 143: SIGTERM (graceful shutdown)

## Step 2: Check Container Logs

The logs from the crashing container usually tell you exactly what went wrong.

```bash
# Get logs from the current container instance
kubectl logs <pod-name> -n <namespace>

# If the container has already crashed, get logs from the previous instance
kubectl logs <pod-name> -n <namespace> --previous

# For multi-container pods, specify the container
kubectl logs <pod-name> -n <namespace> -c <container-name> --previous
```

If there are no logs (the container crashes too quickly to produce any), the issue is likely at the startup level: missing binary, wrong entrypoint, or a crash before any logging framework initializes.

## Step 3: Common Causes and Fixes

### Cause 1: Application Configuration Errors

The most common cause. Your application needs environment variables, config files, or connection strings that are missing or incorrect.

```bash
# Check what environment variables the pod actually has
kubectl exec <pod-name> -n <namespace> -- env

# If the pod keeps crashing, check the deployment spec for env vars
kubectl get deployment <deployment-name> -n <namespace> -o yaml | grep -A 20 "env:"
```

Common configuration issues in AKS:

- ConfigMap or Secret not created in the namespace
- Typo in the environment variable name
- Connection string pointing to a service that is not reachable from the pod

```bash
# Verify the ConfigMap exists and has the expected data
kubectl get configmap <configmap-name> -n <namespace> -o yaml

# Verify the Secret exists (values are base64 encoded)
kubectl get secret <secret-name> -n <namespace> -o yaml
```

### Cause 2: OOMKilled - Memory Limits Too Low

If the exit code is 137 and the events show OOMKilled, your container is using more memory than its limit allows.

```yaml
# Check current resource limits in the deployment
# Look at the resources section
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      containers:
      - name: my-app
        image: myregistry.azurecr.io/my-app:latest
        resources:
          requests:
            memory: "256Mi"   # Starting allocation
            cpu: "250m"
          limits:
            memory: "512Mi"   # Maximum before OOMKill
            cpu: "500m"
```

Fix: increase the memory limit or fix the memory leak in your application. Use `kubectl top pods` to see actual memory usage (requires metrics-server, which AKS installs by default).

```bash
# Check current resource usage
kubectl top pods -n <namespace>

# Check node resource usage to see if the cluster is under pressure
kubectl top nodes
```

### Cause 3: Failed Health Checks

Liveness and readiness probes can cause CrashLoopBackOff if they are configured incorrectly. A liveness probe failure causes Kubernetes to restart the container.

```bash
# Check if probes are configured and what they are checking
kubectl get deployment <deployment-name> -n <namespace> -o yaml | grep -A 10 "livenessProbe\|readinessProbe"
```

Common probe issues:

- The probe path returns a non-200 status code
- The initial delay is too short, and the application has not started yet
- The timeout is too short for the application's response time

```yaml
# Example of more forgiving probe configuration
livenessProbe:
  httpGet:
    path: /healthz
    port: 8080
  initialDelaySeconds: 30    # Give the app time to start
  periodSeconds: 10          # Check every 10 seconds
  timeoutSeconds: 5          # Wait 5 seconds for a response
  failureThreshold: 3        # Allow 3 failures before restarting
```

### Cause 4: Image Pull Failures in AKS

If the container image cannot be pulled from Azure Container Registry, the pod will fail. This can look like CrashLoopBackOff if the image pulls intermittently.

```bash
# Check if AKS is authorized to pull from your ACR
az aks check-acr --resource-group <rg> --name <aks-cluster> --acr <acr-name>

# Attach ACR to AKS if not already done
az aks update --resource-group <rg> --name <aks-cluster> --attach-acr <acr-name>
```

### Cause 5: Incorrect Entrypoint or Command

If the Dockerfile entrypoint or the Kubernetes command/args are wrong, the container will exit immediately.

```bash
# Test the image locally to verify it runs
docker run --rm myregistry.azurecr.io/my-app:latest

# Check what command Kubernetes is running
kubectl get deployment <deployment-name> -n <namespace> -o jsonpath='{.spec.template.spec.containers[0].command}'
kubectl get deployment <deployment-name> -n <namespace> -o jsonpath='{.spec.template.spec.containers[0].args}'
```

### Cause 6: Persistent Volume Mount Failures

If a pod depends on a persistent volume and the volume fails to mount, the container may crash on startup because it cannot access expected data.

```bash
# Check PVC status
kubectl get pvc -n <namespace>

# Describe the PVC for events
kubectl describe pvc <pvc-name> -n <namespace>
```

In AKS, common PV issues include:

- Azure Disk already attached to another node (single-node attach limitation)
- Azure File share authentication failures
- Storage account firewall blocking AKS subnet

### Cause 7: DNS Resolution Failures

If your application tries to connect to other services on startup and DNS resolution fails, it might crash.

```bash
# Test DNS from inside the cluster
kubectl run dns-test --image=busybox:1.36 --rm -it --restart=Never -- nslookup kubernetes.default

# Check CoreDNS pod health
kubectl get pods -n kube-system -l k8s-app=kube-dns
```

## Step 4: Debug with an Interactive Shell

If the container crashes too fast to get useful logs, override the entrypoint to keep it running so you can inspect the environment.

```bash
# Create a debug pod with the same image but an infinite sleep command
kubectl run debug-pod \
  --image=myregistry.azurecr.io/my-app:latest \
  --command -- sleep infinity \
  -n <namespace>

# Exec into it to investigate
kubectl exec -it debug-pod -n <namespace> -- /bin/sh

# Check file paths, environment variables, test connectivity
ls /app/config/
env | grep DATABASE
curl -v http://other-service:8080/health
```

## Step 5: Check AKS-Specific Issues

A few things that are specific to AKS:

```bash
# Check AKS cluster health
az aks show --resource-group <rg> --name <aks-cluster> --query "powerState"

# Check node pool status
kubectl get nodes -o wide

# Check for node-level issues
kubectl describe node <node-name> | grep -A 5 "Conditions"
```

If nodes show `MemoryPressure` or `DiskPressure`, the cluster is running out of resources and pods may be evicted or unable to start properly.

## Preventing CrashLoopBackOff

Good practices that reduce the frequency of CrashLoopBackOff:

- Always set resource requests and limits based on actual application behavior
- Use init containers to verify dependencies before the main container starts
- Configure probes with appropriate timeouts and initial delays
- Test container images locally before deploying to AKS
- Use deployment strategies like rolling updates with maxUnavailable settings
- Set up monitoring with Azure Monitor for containers to catch issues early

CrashLoopBackOff is annoying but it is almost always diagnosable. Follow the logs, check the exit codes, verify the configuration, and you will find the root cause.
