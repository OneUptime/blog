# How to Debug Data Path Issues in Ambient Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mesh, Debugging, Kubernetes, Troubleshooting

Description: Practical techniques for debugging data path issues in Istio ambient mode, covering ztunnel, waypoint proxies, and traffic interception problems.

---

When traffic is not flowing correctly in Istio ambient mode, debugging can be tricky because the data path involves multiple components across different layers. Traffic passes through CNI-level redirection, ztunnel proxies, and potentially waypoint proxies before reaching its destination. This guide walks through systematic debugging techniques for each part of the data path.

## Understanding the Data Path

Before debugging, you need to know what a healthy data path looks like in ambient mode:

```
Source Pod -> [CNI Redirection] -> Source ztunnel -> [HBONE/mTLS] -> Dest ztunnel -> [CNI Delivery] -> Dest Pod
```

With a waypoint proxy:

```
Source Pod -> Source ztunnel -> Waypoint Proxy -> Dest ztunnel -> Dest Pod
```

Each arrow is a potential failure point. The debugging approach is to check each component in order, starting from the source and working toward the destination.

## Step 1: Verify Ambient Enrollment

First, confirm that both the source and destination pods are actually in the ambient mesh:

```bash
# Check namespace labels
kubectl get namespace source-ns -o jsonpath='{.metadata.labels}'
kubectl get namespace dest-ns -o jsonpath='{.metadata.labels}'

# Both should have: istio.io/dataplane-mode: ambient

# Check if pods are recognized by ztunnel
kubectl exec -n istio-system $(kubectl get pod -n istio-system -l app=ztunnel -o jsonpath='{.items[0].metadata.name}') -- curl -s localhost:15000/debug/workloads | python3 -m json.tool | grep "source-pod-name"
```

If the pod does not appear in ztunnel's workload list, the CNI plugin may not have configured redirection for it. Check the CNI logs:

```bash
kubectl logs -n istio-system -l k8s-app=istio-cni-node --tail=100 | grep "source-pod-name"
```

## Step 2: Check Traffic Interception

Verify that traffic from the source pod is actually being captured by ztunnel:

```bash
# From the source pod, make a request and note the destination IP
kubectl exec -n source-ns source-pod -- curl -v http://dest-service.dest-ns:8080/health 2>&1

# Simultaneously, watch ztunnel logs on the source node
SOURCE_NODE=$(kubectl get pod source-pod -n source-ns -o jsonpath='{.spec.nodeName}')
kubectl logs -n istio-system -l app=ztunnel --field-selector spec.nodeName=$SOURCE_NODE -f
```

In the ztunnel logs, you should see a connection event for the outbound traffic. If you do not see anything, the CNI redirection is not working.

To debug CNI redirection:

```bash
# Check if the CNI plugin is running on the source node
kubectl get pods -n istio-system -l k8s-app=istio-cni-node --field-selector spec.nodeName=$SOURCE_NODE

# Check CNI plugin logs for errors
CNI_POD=$(kubectl get pod -n istio-system -l k8s-app=istio-cni-node --field-selector spec.nodeName=$SOURCE_NODE -o jsonpath='{.items[0].metadata.name}')
kubectl logs -n istio-system $CNI_POD --tail=200
```

## Step 3: Check ztunnel Configuration

ztunnel needs to know about the destination service and its endpoints. Verify this:

```bash
# Check if ztunnel has the destination service information
ZTUNNEL_POD=$(kubectl get pod -n istio-system -l app=ztunnel --field-selector spec.nodeName=$SOURCE_NODE -o jsonpath='{.items[0].metadata.name}')

# List services ztunnel knows about
kubectl exec -n istio-system $ZTUNNEL_POD -- curl -s localhost:15000/debug/services | python3 -m json.tool | grep "dest-service"

# Check endpoints
kubectl exec -n istio-system $ZTUNNEL_POD -- curl -s localhost:15000/debug/workloads | python3 -m json.tool | grep -A 5 "dest-pod"
```

If ztunnel does not know about the destination, there may be a control plane issue. Check istiod:

```bash
# Check istiod logs for errors related to the service
kubectl logs -n istio-system -l app=istiod --tail=200 | grep "dest-service"

# Check if istiod is pushing config to ztunnel
kubectl logs -n istio-system -l app=istiod --tail=200 | grep "ztunnel"
```

## Step 4: Check mTLS and Certificates

ztunnel establishes mTLS connections between nodes. Certificate issues will cause connections to fail:

```bash
# Check certificates in ztunnel
istioctl proxy-config secret $ZTUNNEL_POD -n istio-system

# Look for certificate expiration issues
kubectl exec -n istio-system $ZTUNNEL_POD -- curl -s localhost:15000/debug/certs | python3 -m json.tool
```

Common certificate issues:
- Certificate has expired
- Certificate was not issued for the correct service account
- Root CA mismatch between clusters (in multi-cluster setups)

## Step 5: Check HBONE Connectivity

ztunnel uses HBONE on port 15008 for inter-node communication. Verify connectivity:

```bash
# From the source node's ztunnel, check if it can reach the destination ztunnel
DEST_NODE=$(kubectl get pod dest-pod -n dest-ns -o jsonpath='{.spec.nodeName}')
DEST_NODE_IP=$(kubectl get node $DEST_NODE -o jsonpath='{.status.addresses[?(@.type=="InternalIP")].address}')

# Check ztunnel logs for HBONE connection errors
kubectl logs -n istio-system $ZTUNNEL_POD --tail=100 | grep "HBONE\|hbone\|15008"
```

If HBONE connections are failing, check:

- Network policies that might block port 15008 between nodes
- Firewall rules blocking inter-node traffic
- Node-level security groups (in cloud environments)

```bash
# Test basic connectivity on port 15008
kubectl exec -n istio-system $ZTUNNEL_POD -- curl -k https://$DEST_NODE_IP:15008 -v 2>&1 | head -20
```

## Step 6: Check Waypoint Proxy (If Applicable)

If the destination has a waypoint proxy, traffic must pass through it. Check the waypoint:

```bash
# Find the waypoint pod
WAYPOINT_POD=$(kubectl get pod -n dest-ns -l gateway.istio.io/managed=istio.io-mesh-controller -o jsonpath='{.items[0].metadata.name}')

# Check waypoint is ready
kubectl get pod $WAYPOINT_POD -n dest-ns

# Check waypoint configuration
istioctl proxy-config listener $WAYPOINT_POD -n dest-ns
istioctl proxy-config route $WAYPOINT_POD -n dest-ns
istioctl proxy-config cluster $WAYPOINT_POD -n dest-ns

# Check waypoint logs
kubectl logs -n dest-ns $WAYPOINT_POD --tail=100
```

Common waypoint issues:
- Waypoint pod not running or not ready
- Missing routes for the destination service
- Authorization policy denying traffic at L7
- Service label `istio.io/use-waypoint` pointing to a non-existent waypoint

## Step 7: Check Authorization Policies

Authorization policies can silently drop traffic. Check what policies are in effect:

```bash
# List all authorization policies in the destination namespace
kubectl get authorizationpolicy -n dest-ns

# Check each policy
kubectl get authorizationpolicy -n dest-ns -o yaml

# Look for DENY policies that might be blocking traffic
kubectl get authorizationpolicy -n dest-ns -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.action}{"\n"}{end}'
```

To test if an authorization policy is the problem, temporarily remove all policies and see if traffic flows:

```bash
# List and save policies before removing
kubectl get authorizationpolicy -n dest-ns -o yaml > /tmp/auth-policies-backup.yaml

# Watch ztunnel logs while testing
kubectl logs -n istio-system $ZTUNNEL_POD -f &

# Make a test request
kubectl exec -n source-ns source-pod -- curl http://dest-service.dest-ns:8080/health
```

## Step 8: Enable Debug Logging

When the above steps do not reveal the issue, enable debug logging on ztunnel:

```bash
# Set ztunnel log level to debug
kubectl exec -n istio-system $ZTUNNEL_POD -- curl -s -X POST "localhost:15000/logging?level=debug"

# Make a test request and collect logs
kubectl exec -n source-ns source-pod -- curl http://dest-service.dest-ns:8080/health
kubectl logs -n istio-system $ZTUNNEL_POD --tail=200

# Reset log level when done
kubectl exec -n istio-system $ZTUNNEL_POD -- curl -s -X POST "localhost:15000/logging?level=info"
```

For waypoint proxies:

```bash
# Set waypoint log level
kubectl exec -n dest-ns $WAYPOINT_POD -- curl -s -X POST "localhost:15000/logging?level=debug"
```

## Common Issues and Quick Fixes

**Pod not in mesh:** Re-label the namespace and restart the pod so the CNI plugin picks it up.

```bash
kubectl label namespace my-ns istio.io/dataplane-mode=ambient --overwrite
kubectl delete pod problematic-pod -n my-ns
```

**ztunnel OOMKilled:** Increase memory limits in the ztunnel DaemonSet.

**Intermittent failures:** Check if ztunnel is restarting. Each restart causes brief traffic disruption for pods on that node.

```bash
kubectl get pods -n istio-system -l app=ztunnel -o jsonpath='{range .items[*]}{.metadata.name} restarts={.status.containerStatuses[0].restartCount}{"\n"}{end}'
```

## Summary

Debugging ambient mode data path issues follows a systematic approach: verify enrollment, check traffic interception, confirm ztunnel configuration, test mTLS connectivity, verify HBONE tunnels, inspect waypoint proxies, and review authorization policies. The key debugging tools are ztunnel's debug endpoints, istioctl proxy-config commands, and CNI plugin logs. When in doubt, enable debug logging on the relevant ztunnel or waypoint proxy to get detailed connection-level information.
