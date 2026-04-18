# How to Troubleshoot Message Queue Issues in Rancher - Message Queue

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Troubleshooting, Message Queue, RabbitMQ, Kafka, Debugging

Description: A systematic guide to diagnosing and resolving common message queue issues in Rancher including consumer lag, broker failures, and networking problems.

## Introduction

Message queue issues in Rancher span several layers: pod scheduling, persistent storage, network connectivity, and broker-specific configuration. A systematic approach to troubleshooting saves time and prevents misdiagnoses.

## Step 1: Check Pod Status

Start with basic pod health. Most issues are visible here.

```bash
# Check pod status and restarts

kubectl get pods -n messaging

# Describe a pod to see events and conditions
kubectl describe pod rabbitmq-0 -n messaging

# Common issues in Events section:
# - "0/3 nodes are available: 3 Insufficient memory"  → increase node size
# - "PVC bound failed"                                 → storage issue
# - "Back-off restarting failed container"             → application crash
```

## Step 2: Inspect Logs

```bash
# Stream current logs
kubectl logs -n messaging rabbitmq-0 -f

# View previous container logs (after crash)
kubectl logs -n messaging rabbitmq-0 --previous

# Kafka controller logs
kubectl logs -n messaging kafka-controller-0 | tail -100
```

## Step 3: Check Persistent Volume Claims

Many MQ startup failures are caused by PVC issues.

```bash
# Check PVC status
kubectl get pvc -n messaging

# If PVC is Pending, check events
kubectl describe pvc rabbitmq-data-0 -n messaging

# Common PVC issues:
# - No StorageClass available
# - Insufficient storage capacity
# - Node affinity mismatch
```

## Step 4: Verify Network Connectivity

```bash
# Test connectivity from an application pod
kubectl run nettest --rm -it --image=busybox \
  --restart=Never -n myapp -- sh

# Inside the test pod
nc -zv rabbitmq.messaging.svc.cluster.local 5672
# If this fails, check NetworkPolicy and Service definitions
```

## Step 5: Diagnose RabbitMQ-Specific Issues

```bash
# Check cluster membership
kubectl exec -it rabbitmq-0 -n messaging -- \
  rabbitmqctl cluster_status

# Check queue states (look for queues in error state)
kubectl exec -it rabbitmq-0 -n messaging -- \
  rabbitmqctl list_queues name messages consumers state

# Reset a stuck node (app must be stopped first)
kubectl exec -it rabbitmq-0 -n messaging -- \
  rabbitmqctl stop_app
kubectl exec -it rabbitmq-0 -n messaging -- \
  rabbitmqctl reset
kubectl exec -it rabbitmq-0 -n messaging -- \
  rabbitmqctl start_app
```

## Step 6: Diagnose Kafka-Specific Issues

```bash
# Check under-replicated partitions (should be 0)
kubectl exec -it kafka-controller-0 -n messaging -- \
  kafka-topics.sh --bootstrap-server localhost:9092 \
  --describe --under-replicated-partitions

# Check consumer group lag
kubectl exec -it kafka-controller-0 -n messaging -- \
  kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --group my-consumer-group --describe

# Verify leader election is healthy
kubectl exec -it kafka-controller-0 -n messaging -- \
  kafka-metadata-quorum.sh --bootstrap-server localhost:9092 \
  describe --status
```

## Step 7: Common Fixes

| Symptom | Likely Cause | Fix |
|---|---|---|
| Pod stuck in Pending | Resource or PVC issue | Check describe output, add nodes |
| High consumer lag | Slow consumers | Add consumer replicas |
| Split-brain cluster | Network partition | Force restart and rejoin |
| Messages not persisted | Non-durable queue | Re-declare queue as durable |
| Connection refused | Service misconfigured | Check Service selector labels |

## Conclusion

Systematic troubleshooting of message queues in Rancher follows a clear path: pod health → storage → networking → broker-specific diagnostics. Keep the `kubectl describe` and broker CLI tools as your primary diagnostic instruments.
