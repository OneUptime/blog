# How to Perform Rancher HA Failover Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, High Availability, Failover Testing, Disaster Recovery

Description: Systematically test Rancher HA failover scenarios including node failures, network partitions, and etcd member loss to validate your high availability configuration.

## Introduction

Failover testing is essential to validate that your Rancher HA configuration works as expected before you need it in production. This guide covers testing various failure scenarios-node failures, load balancer failover, etcd member loss, and managed cluster agent disruption-and documenting expected behavior and recovery times.

## Prerequisites

- Running Rancher HA deployment (3+ nodes)
- Monitoring stack in place (Prometheus/Grafana)
- Change management approval for planned tests
- Recovery procedures documented

## Step 1: Establish Baseline

```bash
# Record baseline metrics before testing

# Check cluster health

kubectl get nodes -o wide
kubectl get pods -n cattle-system
kubectl get pods -n kube-system | grep etcd

# Record Rancher version and cluster info
kubectl get settings.management.cattle.io server-version \
  -o jsonpath='{.value}'

# Start continuous health check to Rancher
while true; do
  STATUS=$(curl -sk -w "%{http_code}" -o /dev/null https://rancher.example.com/healthz)
  echo "$(date): $STATUS"
  sleep 5
done &
PING_PID=$!

# Start kubectl watch for cluster state
kubectl get clusters.management.cattle.io -w &
WATCH_PID=$!
```

## Step 2: Test Single Node Failure

```bash
# Test 1: Rancher server node failure
echo "=== TEST 1: Rancher Server Node Failure ==="
date

# Identify which node is running which Rancher pod
kubectl get pods -n cattle-system -o wide

# Graceful cordon and drain (simulate maintenance)
kubectl cordon rke2-server-02
kubectl drain rke2-server-02 --ignore-daemonsets --delete-emptydir-data

# Record time for failover
echo "Drained at: $(date)"

# Verify Rancher is still accessible
curl -sk https://rancher.example.com/healthz

# Verify remaining Rancher pods
kubectl get pods -n cattle-system

# Recovery
kubectl uncordon rke2-server-02
echo "Recovered at: $(date)"
```

## Step 3: Test abrupt Node Failure

```bash
# Test 2: Abrupt node failure (simulate server outage)
echo "=== TEST 2: Abrupt Node Failure ==="

# SSH into node and stop the RKE2 server service
ssh rke2-server-02 "systemctl stop rke2-server"

# Time to detect and respond
echo "Stopped at: $(date)"

# Monitor pod rescheduling
kubectl get pods -n cattle-system -w &

# Verify Rancher responds during failover
for i in {1..60}; do
  echo "$(date): $(curl -sk -w '%{http_code}' -o /dev/null https://rancher.example.com/healthz)"
  sleep 5
done

# Restart the node
ssh rke2-server-02 "systemctl start rke2-server"
echo "Restarted at: $(date)"
```

## Step 4: Test etcd Member Loss

```bash
# Test 3: etcd quorum test (lose 1 of 3 members)
echo "=== TEST 3: etcd Member Loss ==="

# Check etcd health before
kubectl exec -n kube-system \
  $(kubectl get pod -n kube-system -l component=etcd -o name | head -1) \
  -- etcdctl endpoint health \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/var/lib/rancher/rke2/server/tls/etcd/server-ca.crt \
  --cert=/var/lib/rancher/rke2/server/tls/etcd/client.crt \
  --key=/var/lib/rancher/rke2/server/tls/etcd/client.key \
  -w table

# Stop one RKE2 server node (cluster maintains etcd quorum with 2 of 3)
ssh rke2-server-03 "systemctl stop rke2-server"
echo "etcd member stopped at: $(date)"

# Verify API server still works (should work with 2/3 etcd)
kubectl get nodes
kubectl get pods -n cattle-system

# Rancher should remain accessible
curl -sk https://rancher.example.com/healthz

# Restore
ssh rke2-server-03 "systemctl start rke2-server"
echo "etcd member restored at: $(date)"
```

## Step 5: Test Load Balancer Failover

```bash
# Test 4: Load balancer node failure
echo "=== TEST 4: Load Balancer Failover ==="

# If using keepalived + HAProxy/NGINX
# Stop keepalived on primary to force VIP failover
ssh lb-primary "systemctl stop keepalived"

# Check VIP moved to secondary
ssh lb-secondary "ip addr show" | grep "10.0.0.100"

# Verify Rancher still accessible via VIP
curl -sk -H "Host: rancher.example.com" https://10.0.0.100/healthz
curl -sk https://rancher.example.com/healthz

# Check failover time
echo "LB failed at: $(date)"

# Restore
ssh lb-primary "systemctl start keepalived"
```

## Step 6: Test Managed Cluster Agent Recovery

```bash
# Test 5: Managed cluster agent recovery
echo "=== TEST 5: Managed Cluster Agent Recovery ==="

# Get list of managed clusters
kubectl get clusters.management.cattle.io

# Scale down cattle-cluster-agent on the managed cluster
# Rancher-provisioned RKE2/K3s clusters may remain connected via rancher-system-agent
kubectl scale deployment cattle-cluster-agent \
  -n cattle-system --replicas=0

echo "Agent scaled down at: $(date)"

# Monitor reconnection in Rancher
kubectl get clusters.management.cattle.io -w &

# Wait for the agent state change to be detected
sleep 60

# Check cluster state after the agent change
kubectl get clusters.management.cattle.io

# Reconnect
kubectl scale deployment cattle-cluster-agent \
  -n cattle-system --replicas=1
echo "Agent scaled back up at: $(date)"
```

## Step 7: Document Failover Metrics

```bash
# Record key metrics from tests
cat << EOF > failover-test-results.md
# Rancher HA Failover Test Results - $(date)

## Test 1: Rancher Server Node Failure
- Detection time: [X seconds]
- Failover time: [X seconds]
- Data loss: None
- Impact: No user-visible impact

## Test 2: Abrupt Node Failure
- Detection time: [X seconds]
- Failover time: [X seconds]
- Error rate during failover: [X%]
- Recovery time: [X minutes]

## Test 3: etcd Member Loss
- etcd quorum maintained: Yes (2/3 members active)
- API availability: [Yes/No]
- Rancher availability: [Yes/No]

## Test 4: Load Balancer Failover
- VIP migration time: [X seconds]
- Connection interruption: [Yes/No]
- Keepalived failover time: [X seconds]

## SLA Assessment
- Rancher availability during single node failure: [X%]
- Recovery time objective (RTO): [X minutes]
EOF
```

## Conclusion

Regular failover testing is the only way to ensure your Rancher HA configuration works as expected. Document recovery time objectives (RTO) and recovery point objectives (RPO) for each failure scenario. Rancher HA should maintain availability during single-node failures, but any interruption during pod rescheduling depends on pod placement and your load balancer and ingress health checks. For minimal interruption during failover, ensure your load balancer has active health checks and removes unhealthy nodes promptly from the rotation.
