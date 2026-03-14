# How to Validate Kubernetes Networking for Calico Users in a Lab Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, CNI, Lab, Testing, Networking, Validation, Kubectl

Description: A systematic validation checklist for verifying Kubernetes networking behavior with Calico in a lab environment before production deployment.

---

## Introduction

Validating Kubernetes networking with Calico means verifying that every layer of the networking model is working as expected: pod IP allocation, cross-node routing, service resolution, and network policy enforcement. A missed validation in the lab becomes a production incident.

This post provides a structured validation checklist organized by networking layer. Each check includes the kubectl or calicoctl command, the expected output, and what failure indicates. Run these checks after any Calico installation, upgrade, or configuration change.

## Prerequisites

- A lab Kubernetes cluster with Calico installed
- `kubectl` and `calicoctl` configured
- At least two worker nodes for cross-node validation
- `netshoot` or `busybox` image available for test pods

## Layer 1: IP Allocation Validation

Verify the IPPool is configured correctly:

```bash
calicoctl get ippools -o wide
# Expected: At least one IPv4 IPPool with correct CIDR and mode
```

Check that IPAM has allocated IPs to pods:

```bash
calicoctl ipam show --show-blocks
# Expected: Block allocations visible per node
```

Verify no IP exhaustion:

```bash
calicoctl ipam show
# Expected: Available IPs > 0
```

## Layer 2: Pod-to-Pod Connectivity (Same Node)

Create two pods on the same node:

```bash
kubectl run pod-a --image=nginx --overrides='{"spec":{"nodeName":"worker-1"}}'
kubectl run pod-b --image=nicolaka/netshoot --overrides='{"spec":{"nodeName":"worker-1"}}' -- sleep 3600

POD_A_IP=$(kubectl get pod pod-a -o jsonpath='{.status.podIP}')
kubectl exec pod-b -- ping -c3 $POD_A_IP
# Expected: 0% packet loss
```

## Layer 3: Pod-to-Pod Connectivity (Cross-Node)

Create pods on different nodes:

```bash
kubectl run pod-c --image=nginx --overrides='{"spec":{"nodeName":"worker-2"}}'

POD_C_IP=$(kubectl get pod pod-c -o jsonpath='{.status.podIP}')
kubectl exec pod-b -- ping -c3 $POD_C_IP
# Expected: 0% packet loss (cross-node routing via Calico)
```

Verify the route exists on the sending node:

```bash
# On worker-1
ip route show $POD_C_IP
# Expected: Route via tunnel or direct via another node's IP
```

## Layer 4: Service Connectivity

Create a service and verify ClusterIP routing:

```bash
kubectl expose pod pod-a --port=80 --name=pod-a-svc
kubectl exec pod-b -- wget -qO- http://pod-a-svc
# Expected: nginx default page HTML
```

Verify DNS resolution:

```bash
kubectl exec pod-b -- nslookup pod-a-svc.default.svc.cluster.local
# Expected: ClusterIP of the service
```

## Layer 5: Network Policy Enforcement

Apply a deny-all policy and verify it blocks traffic:

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all
spec:
  podSelector:
    matchLabels:
      run: pod-a
  ingress: []
EOF

kubectl exec pod-b -- wget --timeout=5 -qO- http://$POD_A_IP
# Expected: timeout (policy is blocking)
```

Allow traffic and verify:

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-pod-b
spec:
  podSelector:
    matchLabels:
      run: pod-a
  ingress:
  - from:
    - podSelector:
        matchLabels:
          run: pod-b
EOF

kubectl exec pod-b -- wget --timeout=5 -qO- http://$POD_A_IP
# Expected: success
```

## Layer 6: Calico-Specific Resource Validation

Verify Felix is healthy on all nodes:

```bash
calicoctl node status
# Expected: BGP and dataplane both show "Established" or "Ready"
```

Verify Calico endpoints exist for all pods:

```bash
calicoctl get workloadendpoints --all-namespaces
# Expected: One entry per pod in the cluster
```

## Best Practices

- Run the full checklist after every Calico version upgrade
- Document baseline latency numbers from `ping` and `wget` for comparison after changes
- Add the checklist to your CI/CD pipeline as a post-deploy test suite
- Keep the test pods' node assignments explicit to ensure cross-node tests actually use different nodes

## Conclusion

Systematic layer-by-layer validation ensures that every component of Kubernetes networking with Calico is functioning correctly. Catching failures at the IP allocation layer before testing cross-node connectivity saves hours of debugging. Automating these checks as post-deploy tests provides ongoing confidence that networking changes have not introduced regressions.
