# Test Static Pod IPs in Calico Before Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: calico, ipam, kubernetes, static-ips, testing, production-readiness

Description: A pre-production testing guide for validating static pod IP assignment in Calico, ensuring your configuration is reliable before deploying to production workloads.

---

## Introduction

Assigning static IP addresses to pods is a common requirement for stateful workloads, legacy integrations, and compliance-driven environments. However, static IP configurations can introduce subtle failures that only manifest under specific conditions—such as pod restarts, node failures, or IPAM state corruption.

Testing static pod IP assignment before moving to production is essential to identify and resolve these edge cases. A thorough pre-production test covers IP assignment, persistence across restarts, conflict detection, and behavior during node failures.

This guide provides a structured testing checklist and procedures for validating Calico static IP assignment in a staging environment before rolling out to production.

## Prerequisites

- A staging Kubernetes cluster with Calico installed (mirroring production config)
- `calicoctl` installed and configured
- `kubectl` with cluster admin access
- A dedicated IP pool for static IP testing

## Step 1: Set Up a Staging IP Pool

Create an IP pool that mirrors your production static IP pool.

```yaml
# staging-static-pool.yaml - Staging IP pool for static assignment testing
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: staging-static-pool
spec:
  # Mirror the production CIDR for testing
  cidr: 10.200.10.0/24
  natOutgoing: true
  ipipMode: Always
```

```bash
calicoctl apply -f staging-static-pool.yaml
```

## Step 2: Test Basic Static IP Assignment

Verify that a pod can be created with a specific static IP.

```yaml
# static-pod-test.yaml - Pod with a static IP annotation for testing
apiVersion: v1
kind: Pod
metadata:
  name: static-ip-test
  annotations:
    # Request the specific static IP from Calico IPAM
    cni.projectcalico.org/ipAddrs: '["10.200.10.100"]'
spec:
  containers:
  - name: busybox
    image: busybox
    command: ["sleep", "3600"]
```

```bash
kubectl apply -f static-pod-test.yaml
kubectl get pod static-ip-test -o wide
```

## Step 3: Test IP Persistence Across Pod Restarts

Confirm the static IP is reassigned after the pod restarts.

```bash
# Delete and recreate the pod to test IP persistence
kubectl delete pod static-ip-test
kubectl apply -f static-pod-test.yaml

# Verify the same IP is assigned after restart
kubectl get pod static-ip-test -o jsonpath='{.status.podIP}'
# Expected: 10.200.10.100
```

## Step 4: Test Conflict Detection

Attempt to schedule two pods with the same IP to verify conflict handling.

```bash
# Try to create a second pod with the same static IP
kubectl run conflict-test \
  --image=busybox \
  --overrides='{"metadata":{"annotations":{"cni.projectcalico.org/ipAddrs":"[\"10.200.10.100\"]"}}}' \
  -- sleep 3600

# The second pod should fail to start; check events for error
kubectl describe pod conflict-test | grep -A5 Events
```

## Step 5: Test Node Failure Scenario

Simulate a node failure and verify the static IP is released and can be reassigned.

```bash
# Cordon and drain the node hosting the static IP pod
kubectl cordon <node-name>
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data

# Verify IPAM releases the IP
calicoctl ipam show --ip=10.200.10.100

# Redeploy the pod and verify it gets the same IP on a different node
kubectl apply -f static-pod-test.yaml
kubectl get pod static-ip-test -o wide
```

## Best Practices

- Always test static IP behavior in a staging environment before production rollout
- Include pod restart and node failure scenarios in your test plan
- Verify IPAM cleanup occurs when pods are deleted to prevent IP leaks
- Document the static IP allocation map and store it in version control
- Set up monitoring alerts for IPAM exhaustion in static IP pools

## Conclusion

Pre-production testing of static pod IPs in Calico is a critical step toward reliable production deployments. By validating assignment, persistence, conflict detection, and failure recovery in a staging environment, you can deploy static IP configurations to production with confidence that edge cases have been identified and addressed.
