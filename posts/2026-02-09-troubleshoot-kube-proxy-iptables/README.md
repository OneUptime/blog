# How to Troubleshoot kube-proxy iptables Rules Not Updating

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Networking, Debugging

Description: Diagnose and fix issues where kube-proxy fails to update iptables rules, causing service connectivity failures in Kubernetes clusters.

---

kube-proxy is responsible for implementing Kubernetes services by creating and maintaining iptables rules (or IPVS rules) that route traffic to backend pods. When kube-proxy fails to update these rules, new services become unreachable, existing services route to wrong pods, or deleted services continue receiving traffic. These issues are frustrating because the Kubernetes API shows everything is correct, but network traffic does not follow the expected path.

Troubleshooting kube-proxy iptables issues requires understanding how kube-proxy monitors services and endpoints, how it translates them into iptables rules, and what can go wrong in this process.

## Understanding kube-proxy Operation

kube-proxy watches the Kubernetes API for changes to services and endpoints. When it detects changes, it updates iptables rules to match the desired state. The process involves reading service definitions, retrieving corresponding endpoints (pod IPs), generating iptables rules for load balancing, and applying the rules to the kernel.

Failures in any step cause iptables rules to become stale or incorrect.

## Checking kube-proxy Status

Start by verifying kube-proxy is running:

```bash
# Check kube-proxy pods
kubectl get pods -n kube-system -l k8s-app=kube-proxy

# All pods should be Running
# If any are failing, check their logs

# View kube-proxy logs
kubectl logs -n kube-system kube-proxy-xxxxx --tail=100

# Look for errors about:
# - Failed to sync iptables rules
# - Cannot connect to API server
# - Permission denied
```

kube-proxy logs reveal most common issues directly.

## Verifying kube-proxy Mode

kube-proxy can run in iptables or IPVS mode. Confirm which mode is active:

```bash
# Check kube-proxy configuration
kubectl describe configmap kube-proxy -n kube-system | grep mode

# Or check logs
kubectl logs -n kube-system kube-proxy-xxxxx | grep "Using"

# Example output:
# Using iptables Proxier
```

The troubleshooting steps differ between modes. This guide focuses on iptables mode.

## Examining iptables Rules

Check if kube-proxy created the expected iptables rules:

```bash
# Access a node where kube-proxy runs
kubectl debug node/my-node -it --image=nicolaka/netshoot

# View kube-proxy chains
iptables -t nat -L | grep -E "KUBE-SERVICES|KUBE-SVC"

# Check rules for a specific service
iptables -t nat -L KUBE-SERVICES -n | grep my-service

# View detailed rules for a service
iptables -t nat -L KUBE-SVC-XXXXX -n -v
```

If rules are missing for your service, kube-proxy has not created them.

## Testing Service Connectivity

Verify if the connectivity issue is actually related to iptables:

```bash
# Test service from a pod
kubectl run test-pod --rm -it --image=curlimages/curl -- \
  curl -v http://my-service.my-namespace.svc.cluster.local:80

# Test using service cluster IP directly
kubectl get svc my-service -n my-namespace
curl http://CLUSTER_IP:PORT

# Test pod directly (bypassing service)
kubectl get endpoints my-service -n my-namespace
curl http://POD_IP:PORT
```

If the pod works but the service fails, the issue is in kube-proxy or iptables.

## Checking API Server Connectivity

kube-proxy must reach the API server to watch for changes:

```bash
# Check if kube-proxy can connect to API server
kubectl logs -n kube-system kube-proxy-xxxxx | grep -i "api\|connection"

# Look for errors like:
# - Unable to connect to the server
# - Connection refused
# - Authentication failed

# Test API connectivity from node
kubectl debug node/my-node -it --image=nicolaka/netshoot
curl -k https://kubernetes.default.svc.cluster.local:443
```

Network policies or firewall rules might block kube-proxy from reaching the API server.

## Verifying Service and Endpoints

kube-proxy only creates rules when services have valid endpoints:

```bash
# Check service definition
kubectl get svc my-service -n my-namespace -o yaml

# Check endpoints
kubectl get endpoints my-service -n my-namespace -o yaml

# If endpoints are empty, kube-proxy won't create routing rules
# subsets:  # Empty means no endpoints
```

Fix the service selector to match pod labels if endpoints are missing.

## Checking kube-proxy Configuration

Review kube-proxy configuration for issues:

```bash
# Get kube-proxy ConfigMap
kubectl get configmap kube-proxy -n kube-system -o yaml

# Check key settings:
# - clusterCIDR: must match pod network
# - mode: should be "iptables" or "ipvs"
# - syncPeriod: how often rules refresh

# Verify kube-proxy is using this config
kubectl get daemonset kube-proxy -n kube-system -o yaml | grep configMap
```

Incorrect configuration prevents proper rule creation.

## Forcing iptables Rules Refresh

Sometimes kube-proxy gets stuck and needs a refresh:

```bash
# Restart kube-proxy pod on a node
kubectl delete pod -n kube-system kube-proxy-xxxxx

# The DaemonSet recreates it immediately
# New pod will resync all iptables rules

# Check if rules appear after restart
kubectl logs -n kube-system kube-proxy-xxxxx | grep -i sync
```

If rules appear after restart, the issue was a transient sync failure.

## Checking for iptables Lock Contention

Multiple processes modifying iptables simultaneously cause lock contention:

```bash
# Check kube-proxy logs for lock errors
kubectl logs -n kube-system kube-proxy-xxxxx | grep -i "lock\|timeout"

# Example error:
# Another app is currently holding the xtables lock

# Check what's holding the lock on the node
kubectl debug node/my-node -it --image=nicolaka/netshoot
lsof | grep xtables
```

Docker, firewalld, or other network tools can cause lock contention.

## Verifying iptables Chain Integrity

Corrupt or incomplete chains prevent proper routing:

```bash
# Access node
kubectl debug node/my-node -it --image=nicolaka/netshoot

# Check if KUBE-SERVICES chain exists
iptables -t nat -L KUBE-SERVICES -n

# Verify it's referenced from PREROUTING and OUTPUT
iptables -t nat -L PREROUTING -n | grep KUBE-SERVICES
iptables -t nat -L OUTPUT -n | grep KUBE-SERVICES

# If these references are missing, kube-proxy didn't set up properly
```

Chain references are essential for service traffic to be intercepted.

## Checking Resource Limits

kube-proxy might be throttled by insufficient resources:

```bash
# Check kube-proxy resource usage
kubectl top pod -n kube-system -l k8s-app=kube-proxy

# View resource limits
kubectl get daemonset kube-proxy -n kube-system -o yaml | grep -A5 resources

# If CPU or memory is at limit, increase resources
kubectl edit daemonset kube-proxy -n kube-system
```

CPU throttling can prevent kube-proxy from processing updates quickly.

## Testing iptables Rule Creation Manually

Verify iptables itself works:

```bash
# Access node
kubectl debug node/my-node -it --image=nicolaka/netshoot

# Try creating a test rule
iptables -t nat -A OUTPUT -p tcp --dport 12345 -j REDIRECT --to-port 80

# Check if rule was created
iptables -t nat -L OUTPUT -n | grep 12345

# Delete test rule
iptables -t nat -D OUTPUT -p tcp --dport 12345 -j REDIRECT --to-port 80

# If manual rule creation fails, iptables module or kernel issues exist
```

This isolates whether the problem is with kube-proxy or iptables itself.

## Checking Kernel Modules

kube-proxy requires specific kernel modules:

```bash
# Access node
kubectl debug node/my-node -it --image=nicolaka/netshoot

# Check if required modules are loaded
lsmod | grep -E "ip_tables|iptable_nat|nf_nat|nf_conntrack"

# Load missing modules
modprobe ip_tables
modprobe iptable_nat
modprobe nf_nat
modprobe nf_conntrack

# Check if modules load successfully
lsmod | grep ip_tables
```

Missing modules prevent iptables from working.

## Analyzing Chain Traversal

Verify traffic actually traverses kube-proxy chains:

```bash
# Add packet counters to see if traffic hits chains
kubectl debug node/my-node -it --image=nicolaka/netshoot

# Check packet counters
iptables -t nat -L KUBE-SERVICES -n -v

# Try accessing a service and check if counters increase
# From another terminal:
kubectl run test-pod --rm -it --image=curlimages/curl -- \
  curl http://my-service.my-namespace:80

# Back on node, check counters again
iptables -t nat -L KUBE-SERVICES -n -v | grep my-service
```

If counters do not increase, traffic is not reaching kube-proxy chains.

## Checking for Stale Rules

Old rules might conflict with new ones:

```bash
# View all kube-proxy chains
kubectl debug node/my-node -it --image=nicolaka/netshoot
iptables-save | grep KUBE-

# Look for duplicate chains or rules
# Count rules for a specific service
iptables-save | grep "my-service" | wc -l

# If you see many duplicates, rules are accumulating

# Flush and recreate kube-proxy rules
# WARNING: This disrupts service traffic temporarily
iptables -t nat -F KUBE-SERVICES
kubectl delete pod -n kube-system kube-proxy-xxxxx
```

kube-proxy should clean up old rules, but bugs can cause accumulation.

## Verifying NodePort Allocation

For NodePort services, check if ports are properly configured:

```bash
# Check service NodePort
kubectl get svc my-service -n my-namespace -o yaml | grep nodePort

# Verify iptables rules exist for NodePort
kubectl debug node/my-node -it --image=nicolaka/netshoot
iptables -t nat -L KUBE-NODEPORTS -n

# Test NodePort connectivity
curl http://NODE_IP:NODE_PORT
```

NodePort rules appear in the KUBE-NODEPORTS chain.

## Checking masqueradeAll Configuration

The masqueradeAll setting affects SNAT behavior:

```bash
# Check if masqueradeAll is enabled
kubectl get configmap kube-proxy -n kube-system -o yaml | grep masqueradeAll

# When enabled, kube-proxy adds MASQUERADE rules
kubectl debug node/my-node -it --image=nicolaka/netshoot
iptables -t nat -L KUBE-POSTROUTING -n
```

This setting affects traffic to services from outside the pod network.

## Enabling Debug Logging

Increase kube-proxy verbosity for detailed troubleshooting:

```bash
# Edit kube-proxy DaemonSet
kubectl edit daemonset kube-proxy -n kube-system

# Add or modify the --v flag in command args
# spec:
#   containers:
#   - command:
#     - /usr/local/bin/kube-proxy
#     - --v=4  # Increase from default (2) to 4 or 5

# Higher values provide more detail
# --v=4: shows decisions about rule creation
# --v=5: shows detailed API watch events

# View detailed logs
kubectl logs -n kube-system kube-proxy-xxxxx --tail=200
```

Debug logs reveal exactly what kube-proxy is doing and why it makes specific decisions.

## Comparing Working vs Non-Working Nodes

If some nodes work while others do not, compare their configuration:

```bash
# Check kube-proxy version on each node
kubectl get daemonset kube-proxy -n kube-system -o yaml | grep image

# Compare iptables rules between nodes
# On working node:
kubectl debug node/working-node -it --image=nicolaka/netshoot
iptables-save > /tmp/working-rules.txt

# On failing node:
kubectl debug node/failing-node -it --image=nicolaka/netshoot
iptables-save > /tmp/failing-rules.txt

# Compare the files to find differences
diff /tmp/working-rules.txt /tmp/failing-rules.txt
```

Differences reveal node-specific configuration issues.

## Monitoring iptables Rule Count

Track rule count to detect accumulation:

```bash
# Count all iptables rules
kubectl debug node/my-node -it --image=nicolaka/netshoot
iptables-save | wc -l

# Count kube-proxy rules specifically
iptables-save | grep KUBE- | wc -l

# Monitor over time
watch 'iptables-save | grep KUBE- | wc -l'
```

Rapidly increasing rule counts indicate kube-proxy is not cleaning up properly.

## Conclusion

kube-proxy iptables issues stem from various causes including API server connectivity failures, resource exhaustion, iptables lock contention, missing kernel modules, or configuration errors. Systematic troubleshooting checks kube-proxy logs, verifies iptables rules exist and are correct, tests API connectivity, and examines service and endpoint configuration.

Most issues resolve by restarting kube-proxy pods to force a full resync. Persistent problems require deeper investigation into node configuration, kernel modules, or kube-proxy configuration. Enable debug logging to see exactly what kube-proxy is doing and why it creates or does not create specific rules.

Understanding how kube-proxy translates services into iptables rules helps you quickly identify where the translation fails. Master these troubleshooting techniques, and you will keep service networking reliable across your Kubernetes cluster.
