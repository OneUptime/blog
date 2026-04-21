# How to Troubleshoot ClusterIP Service IPv4 Connectivity in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, ClusterIP, IPv4, Troubleshooting, Kube-proxy, Networking

Description: Diagnose and fix common IPv4 ClusterIP service connectivity failures in Kubernetes including iptables issues, DNS problems, and endpoint mismatches.

ClusterIP services provide stable IPv4 addresses for in-cluster communication with Services. When they stop working, failures often look like timeouts; port or application mismatches can also return connection refused.

## Step 1: Verify the Service and EndpointSlices

```bash
# Check the service exists and has a ClusterIP

kubectl get svc my-service -n my-namespace
# NAME         TYPE        CLUSTER-IP      PORT(S)   AGE
# my-service   ClusterIP   10.96.45.123    80/TCP    10m

# CRITICAL: Check EndpointSlices - this is the most common issue
kubectl get endpointslices -n my-namespace -l kubernetes.io/service-name=my-service
# NAME               ADDRESSTYPE   PORTS   ENDPOINTS    AGE
# my-service-abcde   IPv4          8080    10.244.1.5   10m   ← Pods are selected
# my-service-abcde   IPv4          8080    <none>       10m   ← NO PODS MATCH THE SELECTOR!
```

If EndpointSlice `ENDPOINTS` show `<none>`, the service selector usually doesn't match any ready backing pods.

## Step 2: Verify the Selector Matches Pod Labels

```bash
# Get the service selector
kubectl get svc my-service -n my-namespace -o jsonpath='{.spec.selector}'
# {"app":"my-app","version":"v1"}

# Find pods matching this selector
kubectl get pods -n my-namespace -l "app=my-app,version=v1"
# If no pods show, the labels don't match - check pod labels
kubectl get pod my-pod -n my-namespace --show-labels
```

## Step 3: Test ClusterIP Connectivity from Within the Cluster

```bash
# Deploy a debug pod
kubectl run debug -n my-namespace --image=alpine --restart=Never -- sleep 3600

# Try connecting to the service ClusterIP directly
kubectl exec -n my-namespace debug -- wget -qO- -T 5 http://10.96.45.123:80

# Try by DNS name (tests CoreDNS + ClusterIP)
kubectl exec -n my-namespace debug -- wget -qO- -T 5 http://my-service.my-namespace.svc.cluster.local
```

## Step 4: Verify kube-proxy is Running

```bash
# Check kube-proxy pods
kubectl get pods -n kube-system -l k8s-app=kube-proxy

# Check kube-proxy logs for errors
kubectl logs -n kube-system $(kubectl get pods -n kube-system -l k8s-app=kube-proxy -o name | head -1)
# Look for: "error syncing rules", "Failed to update iptables rules"
```

## Step 5: Verify iptables Rules on a Node

```bash
# SSH to a worker node and check iptables rules for the ClusterIP (iptables mode only)
sudo iptables -t nat -L KUBE-SERVICES -n | grep 10.96.45.123

# Expected:
# KUBE-SVC-xxxx  tcp -- 0.0.0.0/0  10.96.45.123  tcp dpt:80

# If no entry appears in iptables mode, kube-proxy hasn't synced this service
# or the cluster is using another service proxy mode such as IPVS or nftables
```

## Step 6: Check DNS Resolution

```bash
# DNS failure looks like ClusterIP failure but is a different root cause
kubectl exec -n my-namespace debug -- nslookup my-service.my-namespace.svc.cluster.local

# Expected: Server: 10.96.0.10 (CoreDNS), Address: 10.96.45.123
# If NXDOMAIN: DNS configuration issue - check CoreDNS
```

## Common Causes and Fixes

| Symptom | Cause | Fix |
|---|---|---|
| EndpointSlice ENDPOINTS = `<none>` | Selector mismatch | Fix pod labels or service selector |
| Connection refused | Pod not listening on Service targetPort | Check targetPort and app listener |
| Timeout | Service proxy not synced | Check kube-proxy logs and force a resync if needed |
| DNS failure | CoreDNS issue | Check CoreDNS pods |
| Works between namespaces sometimes | NetworkPolicy | Check for deny policies |

## Quick Reset

```bash
# If kube-proxy rules are stale, restarting kube-proxy forces a resync
kubectl rollout restart daemonset/kube-proxy -n kube-system
```

The `kubectl get endpointslices` check quickly reveals selector mismatches and empty backend sets.
