# How to Execute a Shell in a Running Container in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Workload

Description: Learn how to open an interactive shell session in a running container in Rancher for debugging, inspecting files, and running commands.

Sometimes you need to get inside a running container to debug an issue, inspect files, check network connectivity, or run diagnostic commands. Rancher provides a built-in terminal that lets you open a shell session directly in any running container. This guide shows you how to use it along with kubectl-based alternatives.

## Prerequisites

- A running Rancher instance (v2.7 or later)
- A managed Kubernetes cluster with running pods
- Access to the namespace containing the target pods
- The container image must include a shell (bash, sh, or similar)

## Method 1: Execute Shell via the Rancher UI

### Step 1: Navigate to the Pod

1. Log in to the Rancher dashboard and select your cluster
2. Navigate to **Workload > Pods**
3. Find the pod you want to access
4. Alternatively, go to **Workload > Deployments**, click a deployment name, and find the pod in the **Pods** tab

### Step 2: Open the Shell

1. Click the three-dot menu next to the pod
2. Select **Execute Shell**
3. A terminal window opens at the bottom of the Rancher UI

For multi-container pods, you may be prompted to select which container to connect to. Choose the container you want to debug.

### Step 3: Run Commands

The terminal gives you an interactive shell inside the container. You can run commands like:

```bash
# Check the filesystem

ls -la /app

# View environment variables
env

# Check running processes
ps aux

# Test network connectivity
curl -v http://other-service:8080/health

# Check DNS resolution
nslookup other-service.default.svc.cluster.local

# View application configuration
cat /etc/config/app.yaml

# Check disk usage
df -h

# View memory usage
free -m
```

### Step 4: Exit the Shell

Type `exit` or press `Ctrl+D` to close the shell session. This does not affect the running container.

## Method 2: Execute Shell via kubectl

### Basic Shell Access

Open the kubectl shell from the Rancher UI (click the **Kubectl Shell** button), or use your local kubectl:

```bash
kubectl exec -it my-app-pod-abc123 -n default -- /bin/bash
```

If bash is not available, try sh:

```bash
kubectl exec -it my-app-pod-abc123 -n default -- /bin/sh
```

### Access a Specific Container

For multi-container pods, specify the container with `-c`:

```bash
kubectl exec -it my-app-pod-abc123 -c my-container -n default -- /bin/bash
```

### Run a Single Command

If you just need to run one command without an interactive session:

```bash
kubectl exec my-app-pod-abc123 -n default -- cat /etc/config/app.yaml
```

```bash
kubectl exec my-app-pod-abc123 -n default -- env
```

```bash
kubectl exec my-app-pod-abc123 -n default -- ls -la /app
```

## Common Debugging Tasks

### Check Network Connectivity

Test if a service is reachable from within the container:

```bash
# Using curl (if available)
curl -v http://api-service:8080/health

# Using wget (if curl is not available)
wget -qO- http://api-service:8080/health

# Using nc (netcat) to test TCP connectivity
nc -zv database-service 5432

# Check DNS resolution
nslookup api-service.default.svc.cluster.local
cat /etc/resolv.conf
```

### Inspect Files and Configuration

```bash
# View mounted ConfigMaps
ls -la /etc/config/
cat /etc/config/application.properties

# View mounted Secrets
ls -la /etc/secrets/
cat /etc/secrets/db-password

# Check application logs written to files
tail -f /var/log/app/application.log
```

### Check Processes and Resources

```bash
# List running processes
ps aux

# Check memory usage
cat /proc/meminfo
free -m

# Check CPU information
cat /proc/cpuinfo
nproc

# Check disk space
df -h
du -sh /app/*
```

### Debug Database Connectivity

```bash
# PostgreSQL
psql -h postgres-service -U myuser -d mydb -c "SELECT 1"

# MySQL
mysql -h mysql-service -u myuser -p -e "SELECT 1"

# Redis
redis-cli -h redis-service ping
```

## Using Ephemeral Debug Containers

If your container image is minimal (distroless or scratch-based) and does not include a shell, use ephemeral debug containers:

```bash
kubectl debug -it my-app-pod-abc123 --image=busybox --target=my-container -n default
```

This adds a new container with debugging tools to the existing pod. It shares the pod's network namespace, and `--target` requests access to the target container's process namespace when the container runtime supports it.

For more comprehensive debugging tools:

```bash
kubectl debug -it my-app-pod-abc123 --image=nicolaka/netshoot --target=my-container -n default
```

The `netshoot` image includes tools like curl, dig, tcpdump, nmap, and more.

## Copying Files To and From Containers

Sometimes you need to copy files for analysis:

These commands require the `tar` binary to be present in the container image.

### Copy from Container to Local Machine

```bash
kubectl cp default/my-app-pod-abc123:/var/log/app/error.log ./error.log
```

### Copy from Local Machine to Container

```bash
kubectl cp ./config.yaml default/my-app-pod-abc123:/etc/config/config.yaml
```

### Copy from a Specific Container

```bash
kubectl cp default/my-app-pod-abc123:/app/data.json ./data.json -c my-container
```

## Security Considerations

1. Limit who can exec into production containers using Rancher cluster and project roles together with Kubernetes RBAC.
2. Avoid running containers as root in production. Changes made inside a container are ephemeral and lost when the pod restarts.
3. Do not install unnecessary tools inside production containers. Use ephemeral debug containers instead.
4. Audit exec access by enabling Rancher API audit logging and Kubernetes audit logging when you need compliance records.

## Troubleshooting Shell Access

### Error: OCI runtime exec failed

This usually means the shell binary does not exist in the container:

```plaintext
OCI runtime exec failed: exec failed: unable to start container process: exec: "/bin/bash": stat /bin/bash: no such file or directory
```

Solution: Try `/bin/sh` instead, or use an ephemeral debug container.

### Error: container not running

The container must be in a Running state. Check the pod status:

```bash
kubectl get pod my-app-pod-abc123 -n default
```

If the pod is in CrashLoopBackOff, `kubectl exec` may not work reliably because the container is repeatedly exiting. View previous logs with `--previous` instead, or use an ephemeral debug container.

### Timeout Issues

If the shell connection times out, check your network connectivity to the cluster and make sure any proxy or load balancer in front of Rancher allows long-lived websocket connections for exec sessions.

## Summary

Rancher makes it easy to open shell sessions in running containers through its built-in terminal. For containers without a shell, use kubectl debug with ephemeral containers. Shell access is invaluable for debugging, but should be governed by proper RBAC policies in production environments. Always prefer viewing logs and metrics first, and use shell access as a secondary debugging tool.
