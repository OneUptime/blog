# How to Diagnose MySQL Replication Problems in Calico Networks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, MySQL, Replication, Networking, Troubleshooting

Description: Diagnose MySQL replication failures in Kubernetes clusters with Calico networking by investigating TCP connectivity on port 3306, network policy blocking, and BGP route propagation.

---

## Introduction

MySQL replication failures in Kubernetes environments running Calico often have networking root causes that are distinct from MySQL configuration issues. When MySQL replica pods cannot connect to the primary, the problem may be a network policy blocking port 3306, a BGP routing issue preventing cross-node communication, or IPAM exhaustion causing pods to receive incorrect IP addresses.

This post focuses on the networking layer diagnostics for MySQL replication failures, which should be ruled out before diving into MySQL-specific configuration troubleshooting.

## Prerequisites

- Kubernetes cluster with Calico and MySQL deployed (primary/replica StatefulSet)
- `kubectl` access with exec permissions
- `calicoctl` CLI configured
- Basic MySQL knowledge for verification steps

## Step 1: Test TCP Connectivity Between Replica and Primary

Before checking any Calico-specific configuration, verify basic TCP connectivity.

```bash
# Get primary and replica pod IPs
PRIMARY_POD="mysql-0"
REPLICA_POD="mysql-1"
NAMESPACE="database"

PRIMARY_IP=$(kubectl get pod ${PRIMARY_POD} -n ${NAMESPACE} \
  -o jsonpath='{.status.podIP}')
REPLICA_IP=$(kubectl get pod ${REPLICA_POD} -n ${NAMESPACE} \
  -o jsonpath='{.status.podIP}')

echo "Primary IP: ${PRIMARY_IP}"
echo "Replica IP: ${REPLICA_IP}"

# Test TCP from replica to primary on MySQL port
kubectl exec -n ${NAMESPACE} ${REPLICA_POD} -- \
  timeout 5 bash -c "echo > /dev/tcp/${PRIMARY_IP}/3306" && \
  echo "TCP 3306 reachable" || echo "TCP 3306 BLOCKED"
```

## Step 2: Check Network Policies on the Database Namespace

A network policy that doesn't include ingress rules for port 3306 from replica pods will block replication.

```bash
# List all network policies in the database namespace
kubectl get networkpolicies -n ${NAMESPACE} -o yaml

# Check if there is a deny-all policy that would block replication traffic
# Look for policies with policyTypes including Ingress but no ingress rules for MySQL

# Check for GlobalNetworkPolicies that might affect the namespace
calicoctl get globalnetworkpolicies -o yaml | \
  grep -B 5 -A 20 "3306\|mysql"
```

## Step 3: Verify WorkloadEndpoints for Both Pods

If Calico cannot program policy for a pod (WorkloadEndpoint missing), traffic to that pod may be blocked.

```bash
# Check that both MySQL pods have WorkloadEndpoints
calicoctl get workloadendpoints --all-namespaces | grep mysql

# Get detailed WEP for the primary pod
calicoctl get workloadendpoint \
  --node=$(kubectl get pod ${PRIMARY_POD} -n ${NAMESPACE} -o jsonpath='{.spec.nodeName}') \
  --orchestrator=k8s \
  --workload=${NAMESPACE}/${PRIMARY_POD} \
  -o yaml 2>/dev/null

# A missing WorkloadEndpoint means Felix cannot apply policies for that pod
```

## Step 4: Check BGP Routes for Cross-Node Replication

If primary and replica are on different nodes, BGP route propagation must be working.

```bash
# Check which nodes the pods are on
kubectl get pods -n ${NAMESPACE} -o wide | grep mysql

# If they are on different nodes, verify the primary pod's IP is routed to the replica's node
PRIMARY_NODE=$(kubectl get pod ${PRIMARY_POD} -n ${NAMESPACE} -o jsonpath='{.spec.nodeName}')
REPLICA_NODE=$(kubectl get pod ${REPLICA_POD} -n ${NAMESPACE} -o jsonpath='{.spec.nodeName}')

echo "Primary on: ${PRIMARY_NODE}"
echo "Replica on: ${REPLICA_NODE}"

# Check BGP peers are established (route exchange working)
calicoctl node status
```

## Step 5: Check iptables for Port 3306 Rules

Verify that Calico's iptables rules correctly handle MySQL traffic.

```bash
# Check iptables on the primary's node for rules affecting port 3306
CALICO_POD=$(kubectl get pods -n calico-system -l k8s-app=calico-node \
  --field-selector spec.nodeName=${PRIMARY_NODE} -o name | head -1)

kubectl exec -n calico-system "${CALICO_POD}" -- \
  iptables -L -n | grep "3306\|dport 3306"

# Check the Calico policy chain for the primary pod's endpoint
kubectl exec -n calico-system "${CALICO_POD}" -- \
  iptables -L -n | grep -A 5 "cali-tw-" | head -30
```

## Best Practices

- Always define explicit ingress rules allowing port 3306 from replica pod selectors when using default-deny policies
- Use named ports in Calico network policies for MySQL (`3306`) to make policy intent clear
- Monitor MySQL replication lag as a leading indicator of connectivity issues before full replication failure
- Ensure MySQL pods use stable pod IPs (or use a headless Service) since pod IP changes after restarts break replication

## Conclusion

MySQL replication failures in Calico clusters are often networking problems before they are MySQL configuration problems. Check TCP port 3306 reachability between replica and primary first, verify WorkloadEndpoints exist for both pods, check network policies for missing ingress rules on port 3306, and verify BGP route propagation for cross-node pod communication.
