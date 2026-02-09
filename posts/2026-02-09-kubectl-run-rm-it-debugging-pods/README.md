# How to Use kubectl run --rm -it for One-Off Debugging Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, kubectl, Debugging

Description: Master kubectl run with --rm and -it flags to create temporary debugging pods that automatically clean up after use, perfect for network troubleshooting and cluster exploration.

---

Debugging cluster issues often requires running one-off commands inside the cluster network. Creating a pod, running tests, then manually deleting it wastes time. kubectl run with --rm -it creates temporary pods that execute interactively and delete themselves on exit.

## Basic kubectl run --rm -it Usage

Create a temporary pod with automatic cleanup:

```bash
# Run busybox with automatic cleanup
kubectl run debug --rm -it --image=busybox -- /bin/sh

# Inside the pod shell:
/ # nslookup kubernetes.default
/ # wget -O- http://service-name
/ # exit

# Pod automatically deleted after exit
```

The --rm flag deletes the pod on exit, -it provides interactive terminal access.

## Network Debugging Pods

Test cluster networking with network tools:

```bash
# Use nicolaka/netshoot for comprehensive network tools
kubectl run netdebug --rm -it --image=nicolaka/netshoot -- /bin/bash

# Available tools: curl, wget, nslookup, dig, netcat, tcpdump, etc.
bash-5.1# curl http://webapp-service
bash-5.1# nslookup webapp-service.default.svc.cluster.local
bash-5.1# nc -zv webapp-service 80
bash-5.1# exit
```

netshoot provides a complete network debugging toolkit.

## DNS Troubleshooting

Debug DNS resolution issues:

```bash
# Run dnsutils for DNS debugging
kubectl run dns-test --rm -it --image=gcr.io/kubernetes-e2e-test-images/dnsutils:1.3 -- /bin/sh

# Test DNS resolution
/ # nslookup kubernetes.default
/ # nslookup webapp-service
/ # nslookup webapp-service.production.svc.cluster.local
/ # dig +short webapp-service.default.svc.cluster.local

# Check DNS configuration
/ # cat /etc/resolv.conf
/ # exit
```

This isolates DNS configuration problems.

## Testing Service Connectivity

Verify services are reachable:

```bash
# Test HTTP endpoints
kubectl run curl-test --rm -it --image=curlimages/curl -- curl http://webapp-service/health

# Test with verbose output
kubectl run curl-test --rm -it --image=curlimages/curl -- curl -v http://webapp-service

# Test POST requests
kubectl run curl-test --rm -it --image=curlimages/curl -- \
  curl -X POST http://api-service/endpoint -d '{"key":"value"}'

# Pod deletes automatically after curl completes
```

Quick service connectivity validation without creating persistent pods.

## Running in Specific Namespaces

Target different namespaces:

```bash
# Run in production namespace
kubectl run debug --rm -it --image=busybox -n production -- /bin/sh

# Test services in that namespace
/ # wget -O- http://backend-service
/ # exit

# Run in kube-system for cluster service debugging
kubectl run debug --rm -it --image=busybox -n kube-system -- /bin/sh
```

Namespace selection tests network policies and service discovery.

## Database Connection Testing

Test database connectivity:

```bash
# Test PostgreSQL connection
kubectl run psql-test --rm -it --image=postgres:15 -- \
  psql -h postgres-service -U admin -d mydb

# Test MySQL connection
kubectl run mysql-test --rm -it --image=mysql:8 -- \
  mysql -h mysql-service -u root -p

# Test Redis connection
kubectl run redis-test --rm -it --image=redis:7 -- \
  redis-cli -h redis-service ping
```

This validates database service connectivity and credentials.

## Testing with Specific Service Accounts

Run with custom service accounts to test RBAC:

```bash
# Run with specific service account
kubectl run sa-test --rm -it \
  --image=bitnami/kubectl \
  --serviceaccount=my-service-account \
  -- /bin/bash

# Test what the service account can access
bash-5.1$ kubectl get pods
bash-5.1$ kubectl get secrets
bash-5.1$ exit
```

This validates service account permissions.

## Node-Specific Debugging

Run pods on specific nodes:

```bash
# Run on specific node
kubectl run node-debug --rm -it \
  --image=busybox \
  --overrides='{"spec":{"nodeName":"worker-1"}}' \
  -- /bin/sh

# Debug node-specific networking or filesystem issues
/ # ip addr
/ # route -n
/ # exit
```

This targets debugging to specific nodes.

## Running with Host Network

Debug using the node's network namespace:

```bash
# Use host network
kubectl run host-net-debug --rm -it \
  --image=nicolaka/netshoot \
  --overrides='{"spec":{"hostNetwork":true}}' \
  -- /bin/bash

# See node's network interfaces
bash-5.1# ip addr
bash-5.1# netstat -tlnp
bash-5.1# exit
```

Host networking reveals node-level network configuration.

## Testing with Resource Limits

Run with specific resource constraints:

```bash
# Run with CPU and memory limits
kubectl run resource-test --rm -it \
  --image=busybox \
  --requests=cpu=100m,memory=128Mi \
  --limits=cpu=200m,memory=256Mi \
  -- /bin/sh

# Test application behavior under resource constraints
```

This validates resource limit effects.

## Running Privileged Containers

Debug with elevated permissions:

```bash
# Run privileged container (use with caution)
kubectl run privileged-debug --rm -it \
  --image=ubuntu \
  --privileged \
  -- /bin/bash

# Access host devices and filesystems
root@privileged-debug:/# ls /dev
root@privileged-debug:/# exit
```

Privileged access enables low-level debugging but creates security risks.

## Testing Image Pull

Verify image pull policies and credentials:

```bash
# Test image pull from private registry
kubectl run image-pull-test --rm -it \
  --image=myregistry.com/private-image:latest \
  --image-pull-policy=Always \
  -- /bin/sh

# If pod starts, image pull succeeded
# If pod fails, check image pull secrets
```

This validates registry access and credentials.

## Running Commands Without Interactive Shell

Execute single commands with automatic cleanup:

```bash
# Run single command
kubectl run ping-test --rm --image=busybox -- ping -c 4 google.com

# Download and display content
kubectl run wget-test --rm --image=busybox -- wget -O- http://webapp-service/health

# DNS lookup
kubectl run nslookup-test --rm --image=busybox -- nslookup webapp-service

# No -it needed for non-interactive commands
```

Single-command pods complete and cleanup automatically.

## Debugging SSL/TLS Connections

Test certificate validation:

```bash
# Test HTTPS endpoint with SSL verification
kubectl run ssl-test --rm -it --image=curlimages/curl -- \
  curl https://secure-service

# Test with certificate details
kubectl run ssl-test --rm -it --image=curlimages/curl -- \
  curl -v https://secure-service

# Skip certificate verification (debugging only)
kubectl run ssl-test --rm -it --image=curlimages/curl -- \
  curl -k https://secure-service
```

This diagnoses certificate and TLS configuration issues.

## Running with Environment Variables

Pass configuration to debug pods:

```bash
# Run with environment variables
kubectl run env-test --rm -it \
  --image=busybox \
  --env="DATABASE_URL=postgresql://db:5432" \
  --env="DEBUG=true" \
  -- /bin/sh

# Inside pod, variables are set
/ # echo $DATABASE_URL
/ # echo $DEBUG
/ # exit
```

Environment variables configure debugging tools.

## Testing with Labels

Add labels for organization:

```bash
# Run with labels
kubectl run labeled-debug --rm -it \
  --image=busybox \
  --labels=purpose=debugging,team=platform \
  -- /bin/sh

# Labels visible during pod lifetime
# kubectl get pods -l purpose=debugging
```

Labels help identify temporary debugging pods.

## Running with Annotations

Document debug pod purpose:

```bash
# Run with annotations
kubectl run annotated-debug --rm -it \
  --image=busybox \
  --annotations="purpose=network-debugging,ticket=INC-1234" \
  -- /bin/sh

# Annotations provide context in events and logs
```

Annotations create audit trails for debugging sessions.

## Chaining Multiple Debug Commands

Run sequential debugging operations:

```bash
#!/bin/bash
# debug-workflow.sh

# Test DNS
echo "Testing DNS..."
kubectl run dns-test --rm --image=busybox -- nslookup webapp-service

# Test HTTP
echo "Testing HTTP..."
kubectl run http-test --rm --image=curlimages/curl -- curl -I http://webapp-service

# Test TCP port
echo "Testing TCP port..."
kubectl run port-test --rm --image=busybox -- nc -zv webapp-service 80

echo "Debugging complete"
```

Sequential tests build comprehensive debugging workflows.

## Using --restart=Never

Ensure single execution:

```bash
# Run with restart policy Never
kubectl run one-shot --rm -it \
  --restart=Never \
  --image=busybox \
  -- /bin/sh

# Pod won't restart on failure
# Still auto-deleted on exit due to --rm
```

This prevents unexpected pod restarts during debugging.

## Timeout Handling

Handle long-running debug sessions:

```bash
# Run with timeout using Unix timeout command
kubectl run timeout-test --rm -it --image=busybox -- \
  timeout 60 /bin/sh -c "while true; do echo running; sleep 5; done"

# Exits and cleans up after 60 seconds
```

Timeouts prevent abandoned debug pods.

## Combining with kubectl exec Alternative

Sometimes exec is unavailable, use run instead:

```bash
# If existing pod lacks shell or tools
# Instead of: kubectl exec -it webapp -- /bin/sh

# Run sidecar debug pod
kubectl run debug-sidecar --rm -it \
  --image=nicolaka/netshoot \
  --overrides='{"spec":{"nodeName":"<node-running-webapp>"}}' \
  -- /bin/bash

# Debug from same node
```

This works when target pods lack debugging tools.

## Saving Debug Session Output

Capture debug output for analysis:

```bash
# Redirect output to file
kubectl run debug-capture --rm --image=nicolaka/netshoot -- \
  sh -c "curl -v http://webapp-service 2>&1" | tee debug-output.txt

# Output saved locally
cat debug-output.txt
```

Saved output aids troubleshooting documentation.

## Debug Pod Best Practices

Follow these guidelines:

1. Always use --rm for automatic cleanup
2. Choose appropriate debug images for the task
3. Use specific namespaces when debugging namespace-specific issues
4. Add descriptive labels and annotations
5. Document what you're debugging in pod names
6. Clean up manually if --rm fails

```bash
# Good debug pod example
kubectl run debug-webapp-dns --rm -it \
  --image=nicolaka/netshoot \
  --namespace=production \
  --labels=purpose=debugging,app=webapp \
  --annotations=ticket=INC-1234,debugger=alice \
  -- /bin/bash
```

Descriptive commands improve debugging transparency.

## When --rm Fails

Manually cleanup if automatic deletion fails:

```bash
# If --rm doesn't delete pod (rare)
kubectl get pods | grep debug

# Delete manually
kubectl delete pod debug-pod-name

# Or delete all debug pods
kubectl delete pods -l purpose=debugging
```

Manual cleanup prevents debugging pod accumulation.

kubectl run --rm -it transforms debugging from a multi-step process into a single command. Create temporary pods for network testing, service verification, and cluster exploration without worrying about cleanup. Choose the right debug image, target the correct namespace, and let automatic deletion handle the rest. For more debugging techniques, see https://oneuptime.com/blog/post/kubectl-exec-troubleshoot-containers/view.
