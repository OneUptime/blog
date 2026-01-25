# How to Use kubectl exec to Troubleshoot Running Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, kubectl, Troubleshooting, Debugging, DevOps

Description: A practical guide to using kubectl exec for debugging running containers, including interactive sessions, running commands, accessing multi-container pods, and common troubleshooting scenarios.

---

The `kubectl exec` command lets you run commands inside running containers. It is essential for debugging network issues, checking file systems, verifying configuration, and diagnosing application problems in production.

## Basic Usage

### Run a Single Command

```bash
# Run command in pod
kubectl exec my-pod -- ls -la

# Run command with arguments
kubectl exec my-pod -- cat /etc/nginx/nginx.conf

# Run command in specific namespace
kubectl exec -n production my-pod -- env
```

### Interactive Shell Session

```bash
# Get interactive bash shell
kubectl exec -it my-pod -- /bin/bash

# If bash is not available, try sh
kubectl exec -it my-pod -- /bin/sh

# Exit with 'exit' or Ctrl+D
```

The `-it` flags mean:
- `-i`: Keep stdin open (interactive)
- `-t`: Allocate a pseudo-TTY

## Multi-Container Pods

When a pod has multiple containers, specify which one:

```bash
# List containers in pod
kubectl get pod my-pod -o jsonpath='{.spec.containers[*].name}'

# Exec into specific container
kubectl exec -it my-pod -c nginx -- /bin/sh

# Exec into sidecar container
kubectl exec -it my-pod -c logging-sidecar -- /bin/sh
```

## Common Troubleshooting Scenarios

### Scenario 1: Check Network Connectivity

```bash
# Get shell in pod
kubectl exec -it my-pod -- /bin/sh

# Check DNS resolution
nslookup kubernetes.default
nslookup my-service

# Test connectivity to service
wget -qO- http://my-service:8080/health
curl -v http://another-service:80

# Check listening ports
netstat -tlnp
ss -tlnp

# Test external connectivity
ping -c 3 8.8.8.8
wget -qO- http://example.com
```

### Scenario 2: Verify Environment Variables

```bash
# Check all environment variables
kubectl exec my-pod -- env

# Check specific variable
kubectl exec my-pod -- printenv DATABASE_URL

# Check if secrets are mounted correctly
kubectl exec my-pod -- env | grep -i password
```

### Scenario 3: Check File System

```bash
# List directory contents
kubectl exec my-pod -- ls -la /app

# Check disk usage
kubectl exec my-pod -- df -h

# View file contents
kubectl exec my-pod -- cat /etc/config/app.yaml

# Check file permissions
kubectl exec my-pod -- stat /app/config.json

# Search for files
kubectl exec my-pod -- find /app -name "*.log"
```

### Scenario 4: Debug Application

```bash
# Check running processes
kubectl exec my-pod -- ps aux

# Check process resource usage
kubectl exec my-pod -- top -bn1

# View application logs (if not stdout)
kubectl exec my-pod -- tail -f /var/log/app/error.log

# Check memory usage
kubectl exec my-pod -- cat /proc/meminfo | head -5

# Check CPU info
kubectl exec my-pod -- cat /proc/cpuinfo | grep processor
```

### Scenario 5: Database Connectivity

```bash
# Test PostgreSQL connection
kubectl exec -it my-pod -- psql -h postgres-service -U myuser -d mydb -c "SELECT 1"

# Test MySQL connection
kubectl exec -it my-pod -- mysql -h mysql-service -u root -p -e "SHOW DATABASES"

# Test Redis connection
kubectl exec -it my-pod -- redis-cli -h redis-service ping
```

### Scenario 6: Check Mounted Volumes

```bash
# List mounted volumes
kubectl exec my-pod -- mount | grep -v "^cgroup"

# Check secret volume
kubectl exec my-pod -- ls -la /etc/secrets/

# Verify ConfigMap data
kubectl exec my-pod -- cat /etc/config/app.properties

# Check PVC data
kubectl exec my-pod -- ls -la /data/
kubectl exec my-pod -- du -sh /data/*
```

## Using Debug Containers

For minimal containers without shell or tools, use ephemeral debug containers:

```bash
# Add debug container to running pod
kubectl debug my-pod -it --image=busybox --target=my-container

# Use a more comprehensive debug image
kubectl debug my-pod -it --image=nicolaka/netshoot --target=my-container

# Debug with shared process namespace
kubectl debug my-pod -it --image=busybox --share-processes
```

The debug container shares the pod's network and can see other container processes.

## Running Complex Commands

### With Pipes and Redirects

```bash
# Piping requires wrapping in shell
kubectl exec my-pod -- sh -c 'ps aux | grep nginx'

# Multiple commands
kubectl exec my-pod -- sh -c 'cd /app && ls -la && cat config.yaml'

# Output redirection
kubectl exec my-pod -- sh -c 'echo "test" > /tmp/test.txt'
```

### With Special Characters

```bash
# Quote special characters
kubectl exec my-pod -- sh -c 'grep "error" /var/log/app.log'

# Environment variable substitution (in container)
kubectl exec my-pod -- sh -c 'echo $HOME'

# Environment variable substitution (local)
kubectl exec my-pod -- sh -c "echo $LOCAL_VAR"
```

## Copying Files

While not exec, these commands are useful alongside:

```bash
# Copy file from pod to local
kubectl cp my-pod:/app/config.yaml ./config.yaml

# Copy file from local to pod
kubectl cp ./config.yaml my-pod:/app/config.yaml

# Copy from specific container
kubectl cp my-pod:/logs/app.log ./app.log -c sidecar

# Copy entire directory
kubectl cp my-pod:/app/logs ./logs/
```

## Non-Interactive Commands

### Useful One-Liners

```bash
# Check if service is responding
kubectl exec my-pod -- wget -qO- --timeout=5 http://service:8080/health

# Get Java heap info
kubectl exec my-pod -- jstat -gc 1

# Check Node.js memory
kubectl exec my-pod -- node -e "console.log(process.memoryUsage())"

# List open files
kubectl exec my-pod -- lsof

# Check network connections
kubectl exec my-pod -- netstat -an | grep ESTABLISHED
```

### Scripting with exec

```bash
#!/bin/bash
# Check health across all pods

PODS=$(kubectl get pods -l app=web -o jsonpath='{.items[*].metadata.name}')

for pod in $PODS; do
  echo "Checking $pod..."
  kubectl exec $pod -- wget -qO- http://localhost:8080/health
  echo ""
done
```

## Troubleshooting exec Issues

### Container Has No Shell

```bash
# Error: OCI runtime exec failed: executable file not found

# Solution 1: Use sh instead of bash
kubectl exec -it my-pod -- /bin/sh

# Solution 2: Use debug container
kubectl debug my-pod -it --image=busybox

# Solution 3: Copy tools into container temporarily
kubectl cp /usr/local/bin/curl my-pod:/tmp/curl
kubectl exec my-pod -- /tmp/curl http://service
```

### Permission Denied

```bash
# Error: permission denied

# Check user running in container
kubectl exec my-pod -- id

# Run as root (if allowed)
kubectl exec my-pod -- sh -c 'su -c "cat /etc/shadow"'
```

### Container Not Running

```bash
# Error: container not running

# Check container status
kubectl get pod my-pod -o jsonpath='{.status.containerStatuses[*].state}'

# Check if pod is terminating
kubectl get pod my-pod

# Use previous container logs instead
kubectl logs my-pod --previous
```

### Exec Timeout

```bash
# For long-running commands, increase timeout
kubectl exec my-pod --request-timeout=300s -- ./long-script.sh
```

## Security Considerations

### Audit exec Commands

```bash
# Enable audit logging for exec
# In kube-apiserver audit policy:
- level: Request
  verbs: ["create"]
  resources:
  - group: ""
    resources: ["pods/exec"]
```

### Restrict exec Access

```yaml
# RBAC to prevent exec
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: no-exec
rules:
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list"]    # No exec permission
---
# RBAC to allow exec only for specific pods
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: limited-exec
rules:
  - apiGroups: [""]
    resources: ["pods/exec"]
    resourceNames: ["debug-pod"]    # Only this pod
    verbs: ["create"]
```

## Best Practices

### 1. Use Read-Only Commands First

```bash
# Start with non-destructive commands
kubectl exec my-pod -- cat /etc/config
kubectl exec my-pod -- ls -la

# Only modify if necessary
```

### 2. Document Your Debug Sessions

```bash
# Save session output
kubectl exec my-pod -- env > debug-output.txt
kubectl exec my-pod -- netstat -an >> debug-output.txt
```

### 3. Use Proper Images for Debugging

```bash
# Include debug tools in your images
# Or use specialized debug images
kubectl debug my-pod -it --image=nicolaka/netshoot
```

### 4. Clean Up After Debugging

```bash
# Remove any files created during debugging
kubectl exec my-pod -- rm /tmp/debug-file.txt

# Remove debug containers
kubectl delete pod debug-pod
```

## Quick Reference

```bash
# Basic exec
kubectl exec POD -- COMMAND

# Interactive shell
kubectl exec -it POD -- /bin/sh

# Specific container
kubectl exec -it POD -c CONTAINER -- /bin/sh

# Specific namespace
kubectl exec -n NAMESPACE POD -- COMMAND

# Run shell command with pipes
kubectl exec POD -- sh -c 'COMMAND | COMMAND'

# Debug container
kubectl debug POD -it --image=busybox
```

---

kubectl exec is an essential tool for Kubernetes troubleshooting. Use it to inspect running containers, verify configuration, test connectivity, and diagnose application issues. For containers without shells, use ephemeral debug containers. Always consider security implications and audit exec usage in production environments.
