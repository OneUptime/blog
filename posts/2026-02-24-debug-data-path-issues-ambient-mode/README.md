# How to Debug Data Path Issues in Ambient Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mesh, Debugging, Kubernetes, Troubleshooting

Description: Practical techniques for debugging data path issues in Istio ambient mode, covering ztunnel, waypoint proxies, and traffic interception problems.

---

When traffic is not flowing correctly in Istio ambient mode, debugging can be tricky because the data path involves multiple components across different layers. Traffic passes through CNI-level redirection, ztunnel proxies, and potentially waypoint proxies before reaching its destination. This guide walks through systematic debugging techniques for each part of the data path.

## Understanding the Data Path

Before debugging, you need to know what a healthy data path looks like in ambient mode:

```text
Source Pod -> [CNI Redirection] -> Source ztunnel -> [HBONE/mTLS] -> Dest ztunnel -> [CNI Delivery] -> Dest Pod
```

With a waypoint proxy:

```text
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

# Check if pods are recognized by ztunnel and enrolled with HBONE
istioctl ztunnel-config workloads | grep "source-pod-name"
```

If the pod appears with `PROTOCOL` set to `TCP` instead of `HBONE`, it is not enrolled in ambient mode. If the pod does not appear in ztunnel's workload list at all, check for control plane or discovery issues. To check whether the CNI plugin configured redirection for it, review the CNI logs:

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
ZTUNNEL_POD=$(kubectl get pod -n istio-system -l app=ztunnel --field-selector spec.nodeName=$SOURCE_NODE -o jsonpath='{.items[0].metadata.name}')
kubectl logs -n istio-system $ZTUNNEL_POD -f
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
# List services ztunnel knows about
istioctl ztunnel-config services "$ZTUNNEL_POD".istio-system --service-namespace dest-ns | grep "dest-service"

# Check endpoints
istioctl ztunnel-config workloads "$ZTUNNEL_POD".istio-system --workload-namespace dest-ns | grep "dest-pod"
```

If ztunnel does not know about the destination, there may be a control plane issue. Check istiod:

```bash
# Check istiod logs for errors related to the service
kubectl logs -n istio-system -l app=istiod --tail=200 | grep "dest-service"

# Check if istiod is pushing config to ztunnel
kubectl logs -n istio-system -l app=istiod --tail=200 | grep "ztunnel"
```

## Step 4: Check mTLS and Certificates

ztunnel establishes mTLS connections on behalf of workloads. Certificate issues will cause connections to fail:

```bash
# Check certificates in ztunnel
istioctl ztunnel-config certificates "$ZTUNNEL_POD".istio-system
```

Common certificate issues:
- Certificate has expired
- Certificate was not issued for the correct service account
- Root CA mismatch between clusters (in multi-cluster setups)

## Step 5: Check HBONE Connectivity

ztunnel uses HBONE on port 15008 for inter-node communication. Verify connectivity:

```bash
# From the source node's ztunnel, identify the destination pod and node
DEST_NODE=$(kubectl get pod dest-pod -n dest-ns -o jsonpath='{.spec.nodeName}')
DEST_POD_IP=$(kubectl get pod dest-pod -n dest-ns -o jsonpath='{.status.podIP}')

# Check ztunnel logs for HBONE connection errors
kubectl logs -n istio-system $ZTUNNEL_POD --tail=100 | grep "HBONE\|hbone\|15008"
```

If HBONE connections are failing, check:

- Network policies that might block port 15008 between nodes
- Firewall rules blocking inter-node traffic
- Node-level security groups (in cloud environments)

```bash
# Test basic TCP reachability to the destination pod's HBONE listener
kubectl debug -n source-ns source-pod -it --image=nicolaka/netshoot -- nc -vz $DEST_POD_IP 15008
```

## Step 6: Check Waypoint Proxy (If Applicable)

If the destination has a waypoint proxy, traffic must pass through it. Check the waypoint:

```bash
# Find the waypoint pod
WAYPOINT_POD=$(kubectl get pod -n dest-ns -l gateway.istio.io/managed=istio.io-mesh-controller -o jsonpath='{.items[0].metadata.name}')

# Check waypoint is ready
kubectl get pod $WAYPOINT_POD -n dest-ns

# Check waypoint configuration
istioctl ztunnel-config services "$ZTUNNEL_POD".istio-system --service-namespace dest-ns | grep "dest-service"
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

Authorization policies can block traffic. Check what policies are in effect:

```bash
# List all authorization policies in the destination namespace
kubectl get authorizationpolicy -n dest-ns

# Check each policy
kubectl get authorizationpolicy -n dest-ns -o yaml

# Look for DENY policies that might be blocking traffic
kubectl get authorizationpolicy -n dest-ns -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.action}{"\n"}{end}'
```

To test if an authorization policy is the problem in a non-production environment, temporarily remove all policies and see if traffic flows:

```bash
# List and save policies before removing
kubectl get authorizationpolicy -n dest-ns -o yaml > /tmp/auth-policies-backup.yaml
kubectl delete authorizationpolicy --all -n dest-ns

# Watch ztunnel logs while testing
kubectl logs -n istio-system $ZTUNNEL_POD -f &

# Make a test request
kubectl exec -n source-ns source-pod -- curl http://dest-service.dest-ns:8080/health
```

## Step 8: Enable Debug Logging

When the above steps do not reveal the issue, enable debug logging on ztunnel:

```bash
# Set ztunnel log level to debug
istioctl ztunnel-config log "$ZTUNNEL_POD".istio-system --level debug

# Make a test request and collect logs
kubectl exec -n source-ns source-pod -- curl http://dest-service.dest-ns:8080/health
kubectl logs -n istio-system $ZTUNNEL_POD --tail=200

# Reset log level when done
istioctl ztunnel-config log "$ZTUNNEL_POD".istio-system --reset
```

For waypoint proxies:

```bash
# Set waypoint log level
istioctl proxy-config log $WAYPOINT_POD -n dest-ns --level debug
```

## Common Issues and Quick Fixes

**Pod not in mesh:** Re-label the namespace. Ambient mode does not normally require restarting pods because the CNI node agent watches for namespace and pod label changes.

```bash
kubectl label namespace my-ns istio.io/dataplane-mode=ambient --overwrite
istioctl ztunnel-config workloads --workload-namespace my-ns
```

**ztunnel OOMKilled:** Increase memory limits in the ztunnel DaemonSet.

**Intermittent failures:** Check if ztunnel is restarting. Each restart causes brief traffic disruption for pods on that node.

```bash
kubectl get pods -n istio-system -l app=ztunnel -o jsonpath='{range .items[*]}{.metadata.name} restarts={.status.containerStatuses[0].restartCount}{"\n"}{end}'
```

## Summary

Debugging ambient mode data path issues follows a systematic approach: verify enrollment, check traffic interception, confirm ztunnel configuration, test mTLS connectivity, verify HBONE tunnels, inspect waypoint proxies, and review authorization policies. The key debugging tools are `istioctl ztunnel-config`, `istioctl proxy-config`, Kubernetes logs, and CNI plugin logs. When in doubt, enable debug logging on the relevant ztunnel or waypoint proxy to get detailed connection-level information.
