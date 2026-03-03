# How to Troubleshoot ztunnel Connectivity Issues in Ambient Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mode, ztunnel, Troubleshooting, Kubernetes

Description: A practical troubleshooting guide for diagnosing and fixing ztunnel connectivity issues in Istio ambient mode with real commands and solutions.

---

When traffic stops flowing in Istio ambient mode, ztunnel is usually involved. Since ztunnel handles all L4 traffic for ambient workloads on a node, a problem with ztunnel affects every meshed pod on that node. The good news is that ztunnel issues tend to fall into a few common categories, and the debugging tools are straightforward.

This guide walks through systematic troubleshooting of ztunnel connectivity problems.

## Step 1: Is ztunnel Actually Running?

Start with the basics. Check if ztunnel pods are running on all nodes:

```bash
kubectl get daemonset ztunnel -n istio-system
```

```text
NAME      DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE
ztunnel   3         3         3       3             3
```

If READY does not match DESIRED, some nodes do not have a running ztunnel. Check which nodes are affected:

```bash
kubectl get pods -l app=ztunnel -n istio-system -o wide
```

If a ztunnel pod is in CrashLoopBackOff, check its logs:

```bash
kubectl logs -l app=ztunnel -n istio-system --tail=50
```

Common causes for crashes:
- Cannot connect to istiod (network policy blocking, istiod not running)
- Certificate provisioning failure
- Resource limits too low (OOMKilled)

Check for OOMKilled:

```bash
kubectl get pods -l app=ztunnel -n istio-system -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.containerStatuses[0].lastState.terminated.reason}{"\n"}{end}'
```

If you see OOMKilled, increase the memory limit:

```bash
kubectl patch daemonset ztunnel -n istio-system --type=json \
  -p='[{"op":"replace","path":"/spec/template/spec/containers/0/resources/limits/memory","value":"512Mi"}]'
```

## Step 2: Is the Workload Enrolled?

Verify that the workload is actually part of the ambient mesh:

```bash
istioctl ztunnel-config workloads
```

Look for your workload in the output. If it is missing:

1. Check the namespace label:
```bash
kubectl get namespace my-namespace -L istio.io/dataplane-mode
```

2. Check if the pod has an override label:
```bash
kubectl get pod my-pod -n my-namespace -L istio.io/dataplane-mode
```

3. Check if istio-cni is running on the pod's node:
```bash
kubectl get pods -l k8s-app=istio-cni-node -n istio-system -o wide
```

## Step 3: Is Traffic Being Intercepted?

If the workload shows up in ztunnel's config but traffic is not flowing through ztunnel, the issue is likely with traffic interception.

Check the istio-cni logs for the relevant node:

```bash
# Find the CNI pod on the same node as your workload
NODE=$(kubectl get pod my-pod -n my-namespace -o jsonpath='{.spec.nodeName}')
kubectl logs -l k8s-app=istio-cni-node -n istio-system --field-selector spec.nodeName=$NODE --tail=50
```

Look for errors related to iptables rules or network namespace setup.

You can also check if the redirect rules are in place by examining the network namespace:

```bash
# Get the pod's network namespace (requires node access)
kubectl debug node/$NODE -it --image=nicolaka/netshoot -- \
  nsenter -t $(kubectl get pod my-pod -n my-namespace -o jsonpath='{.status.containerStatuses[0].containerID}' | cut -d/ -f3 | cut -c1-12) -n iptables -t nat -L -n
```

## Step 4: Check ztunnel Connectivity to istiod

ztunnel needs a working connection to istiod for configuration updates and certificate issuance. Check the connection:

```bash
kubectl logs -l app=ztunnel -n istio-system --tail=100 | grep -i "istiod\|xds\|connection"
```

Look for lines like:
- `Connected to istiod` - good
- `Connection refused` or `timeout` - bad

If ztunnel cannot reach istiod, check:

```bash
# Is istiod running?
kubectl get pods -l app=istiod -n istio-system

# Can ztunnel reach istiod's service?
kubectl exec -n istio-system -l app=ztunnel -- wget -q -O- --timeout=5 https://istiod.istio-system.svc:15012/debug/endpointz 2>&1 | head -5
```

## Step 5: Check mTLS Certificate Issues

Certificate problems cause connections to fail silently or with TLS errors. Check ztunnel's certificates:

```bash
istioctl ztunnel-config certificates
```

Look for:
- Certificates with `VALID CERT: false` - they might be expired or malformed
- Missing certificates for workloads that should be enrolled

If certificates are not being provisioned, check the istiod logs:

```bash
kubectl logs -l app=istiod -n istio-system --tail=50 | grep -i "cert\|error\|fail"
```

## Step 6: Test Connectivity Between Specific Pods

Narrow down the problem by testing specific communication paths:

```bash
# From pod A to pod B
kubectl exec deploy/frontend -n app -- curl -v http://backend.app:8080/health --max-time 10 2>&1

# Check if the connection goes through ztunnel
kubectl logs -l app=ztunnel -n istio-system --tail=30 | grep "frontend\|backend"
```

If the curl hangs or times out, the issue is likely in traffic interception or ztunnel routing. If it returns a connection refused error, the backend service might not be running or the port might be wrong.

## Step 7: Check for AuthorizationPolicy Denials

ztunnel enforces L4 AuthorizationPolicies. A misconfigured policy can silently block traffic:

```bash
# List all policies in the namespace
kubectl get authorizationpolicies -n my-namespace

# Check what ztunnel loaded
istioctl ztunnel-config policies
```

Check ztunnel logs for RBAC denials:

```bash
kubectl logs -l app=ztunnel -n istio-system --tail=100 | grep "RBAC"
```

If you see `RBAC: access denied`, review your policies. A common mistake is creating an ALLOW policy that does not cover all legitimate traffic sources. Remember: if any ALLOW policy exists in a namespace, all traffic not matching an ALLOW rule is denied.

To temporarily disable policies for debugging:

```bash
# Delete all policies in the namespace (be careful in production)
kubectl delete authorizationpolicy --all -n my-namespace
```

If traffic flows after removing policies, you know the issue is in your policy configuration.

## Step 8: Cross-Node Connectivity

If pods on the same node can communicate but cross-node traffic fails, the issue is with the HBONE tunnel between ztunnel instances.

Test cross-node connectivity:

```bash
# Find pods on different nodes
kubectl get pods -n my-namespace -o wide

# Test from a pod on node-1 to a pod on node-2
kubectl exec pod-on-node1 -n my-namespace -- curl -v http://service-on-node2:8080/ --max-time 10
```

Check ztunnel logs on both nodes for tunnel establishment:

```bash
# Source node ztunnel
kubectl logs ztunnel-node1 -n istio-system --tail=30

# Destination node ztunnel
kubectl logs ztunnel-node2 -n istio-system --tail=30
```

Cross-node issues often come down to:
- Firewall rules blocking port 15008 (HBONE) between nodes
- Network policies in istio-system blocking ztunnel-to-ztunnel traffic
- CNI plugin conflicts with other CNI plugins

Check if port 15008 is reachable between nodes:

```bash
kubectl exec -n istio-system ztunnel-node1 -- wget -q -O- --timeout=5 http://ztunnel-node2-ip:15008/ 2>&1
```

## Step 9: DNS Resolution

If workloads cannot resolve service names, traffic will not reach ztunnel at all:

```bash
kubectl exec deploy/frontend -n app -- nslookup backend.app.svc.cluster.local
```

DNS issues are not ztunnel-specific but can look like ztunnel problems.

## Common Fixes Summary

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| ztunnel CrashLoopBackOff | OOMKilled or istiod unreachable | Increase memory limits or fix istiod connectivity |
| Workload not in ztunnel config | Missing namespace label | Add `istio.io/dataplane-mode=ambient` label |
| Traffic not intercepted | istio-cni not running | Check CNI DaemonSet status |
| Cross-node traffic fails | Port 15008 blocked | Open firewall for HBONE traffic |
| Connections refused | AuthorizationPolicy blocking | Check policies and ztunnel RBAC logs |
| Certificate errors | istiod CA issues | Check istiod logs and certificate status |

When troubleshooting, always start from the outside in: verify the pods are enrolled, verify traffic is being intercepted, verify ztunnel can route the traffic, and verify policies allow it. This systematic approach saves time compared to jumping around randomly.
