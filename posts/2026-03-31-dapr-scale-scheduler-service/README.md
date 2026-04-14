# How to Scale Dapr Scheduler Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Scheduler, Scaling, High Availability, Kubernetes

Description: Scale the Dapr Scheduler service for high availability and increased job throughput by configuring replica counts, resource limits, and etcd cluster sizing.

---

## Scaling Considerations for Dapr Scheduler

The Dapr Scheduler uses an embedded etcd cluster for storage and leader election. Unlike stateless services, etcd clusters require an odd number of replicas (1, 3, or 5) for proper quorum. Scaling the Scheduler means scaling the underlying etcd cluster.

## Scaling to 3 Replicas for HA

A 3-replica Scheduler cluster tolerates one node failure:

```bash
helm upgrade dapr dapr/dapr \
  --namespace dapr-system \
  --set dapr_scheduler.replicaCount=3 \
  --reuse-values
```

Monitor the rollout:

```bash
kubectl rollout status statefulset/dapr-scheduler-server -n dapr-system
kubectl get pods -n dapr-system -l app.kubernetes.io/name=dapr-scheduler -w
```

## Configuring etcd Cluster for 3 Replicas

When scaling to 3 replicas, configure the etcd initial cluster correctly:

```yaml
dapr_scheduler:
  replicaCount: 3
  extraArgs:
    - --etcd-initial-cluster=dapr-scheduler-server-0=http://dapr-scheduler-server-0.dapr-scheduler-server:2380,dapr-scheduler-server-1=http://dapr-scheduler-server-1.dapr-scheduler-server:2380,dapr-scheduler-server-2=http://dapr-scheduler-server-2.dapr-scheduler-server:2380
    - --etcd-initial-cluster-state=new
```

## Setting Resource Limits

Scale resource allocations for higher job throughput:

```yaml
dapr_scheduler:
  replicaCount: 3
  resources:
    requests:
      cpu: 200m
      memory: 256Mi
    limits:
      cpu: 1000m
      memory: 1Gi
```

## Verifying etcd Cluster Health After Scaling

```bash
# Check quorum status
kubectl exec -n dapr-system dapr-scheduler-server-0 -- \
  etcdctl --endpoints=http://localhost:2379 endpoint health --cluster

# Check member list
kubectl exec -n dapr-system dapr-scheduler-server-0 -- \
  etcdctl --endpoints=http://localhost:2379 member list
```

## Horizontal Pod Autoscaling Limitations

The Scheduler StatefulSet cannot use standard HPA because etcd requires a fixed number of members. Instead, plan capacity by measuring job throughput:

```bash
# Current job trigger rate
rate(dapr_scheduler_jobs_triggered_total[5m])
```

Scale from 3 to 5 replicas only when trigger rate exceeds 80% of observed capacity on the 3-replica setup.

## Distributing Scheduler Across Zones

Use pod topology spread constraints to distribute replicas across availability zones:

```yaml
dapr_scheduler:
  topologySpreadConstraints:
    - maxSkew: 1
      topologyKey: topology.kubernetes.io/zone
      whenUnsatisfiable: DoNotSchedule
      labelSelector:
        matchLabels:
          app.kubernetes.io/name: dapr-scheduler
```

## Summary

Scale the Dapr Scheduler by increasing replicas to 3 or 5 (always odd) for high availability. Configure etcd cluster membership accordingly, set appropriate resource limits, and distribute replicas across availability zones using topology spread constraints. Monitor etcd cluster health after scaling to confirm quorum is maintained.
