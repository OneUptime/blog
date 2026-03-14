# How to Configure Network Chaos Experiments with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Chaos Engineering, Chaos Mesh, Network Chaos

Description: Manage network chaos experiments including latency injection and packet loss using Chaos Mesh and Flux CD for GitOps-driven network fault testing.

---

## Introduction

Network failures are among the most common and impactful failures in distributed systems. Latency spikes, packet loss, and DNS failures can cascade through microservice architectures in ways that are difficult to predict from code review alone. Network chaos experiments let you empirically verify that your services degrade gracefully and recover correctly when the network misbehaves.

Chaos Mesh provides a powerful `NetworkChaos` CRD that can inject latency, packet loss, bandwidth limits, network partitions, and DNS faults into specific pods without any application changes. When these experiments are managed by Flux CD, they become reproducible, reviewable artifacts that your entire team can reason about.

This guide walks through configuring network latency, packet loss, bandwidth throttling, and network partition experiments using Chaos Mesh CRDs managed by Flux CD.

## Prerequisites

- Chaos Mesh deployed via Flux HelmRelease
- Flux CD bootstrapped on the cluster
- Target application deployed and accessible within the cluster
- Namespace annotated for chaos injection: `chaos-mesh.org/inject: enabled`

## Step 1: Inject Network Latency

Network latency experiments simulate slow network links between services. This is critical for testing timeout and retry logic.

```yaml
# clusters/my-cluster/chaos-experiments/network-latency.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: network-latency-frontend
  namespace: chaos-mesh
spec:
  action: delay
  mode: all
  selector:
    namespaces:
      - default
    labelSelectors:
      app: frontend
  delay:
    # Add 200ms of latency with 50ms jitter
    latency: "200ms"
    jitter: "50ms"
    # Use a normal distribution for realistic jitter
    correlation: "25"
  # Only affect egress traffic (outbound calls to backend)
  direction: to
  target:
    selector:
      namespaces:
        - default
      labelSelectors:
        app: backend
    mode: all
  duration: "5m"
```

## Step 2: Inject Packet Loss

Packet loss experiments validate that your services handle unreliable UDP or TCP connections gracefully.

```yaml
# clusters/my-cluster/chaos-experiments/packet-loss.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: packet-loss-service
  namespace: chaos-mesh
spec:
  action: loss
  mode: one
  selector:
    namespaces:
      - default
    labelSelectors:
      app: payment-service
  loss:
    # Drop 20% of packets
    loss: "20"
    correlation: "25"
  direction: both
  duration: "3m"
```

## Step 3: Throttle Bandwidth

Bandwidth throttling simulates slow or congested network links, useful for testing large data transfers.

```yaml
# clusters/my-cluster/chaos-experiments/bandwidth-throttle.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: bandwidth-throttle-db
  namespace: chaos-mesh
spec:
  action: bandwidth
  mode: all
  selector:
    namespaces:
      - default
    labelSelectors:
      app: database-client
  bandwidth:
    # Limit to 1 Mbps
    rate: "1mbps"
    limit: 100
    buffer: 10000
  direction: to
  duration: "5m"
```

## Step 4: Simulate a Network Partition

Network partitions split your cluster into isolated groups, testing distributed consensus and failover.

```yaml
# clusters/my-cluster/chaos-experiments/network-partition.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: network-partition-replica
  namespace: chaos-mesh
spec:
  action: partition
  mode: one
  selector:
    namespaces:
      - default
    labelSelectors:
      app: redis
      role: replica
  direction: both
  target:
    selector:
      namespaces:
        - default
      labelSelectors:
        app: redis
        role: primary
    mode: all
  duration: "2m"
```

## Step 5: Schedule Recurring Network Chaos

```yaml
# clusters/my-cluster/chaos-experiments/network-latency-schedule.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: Schedule
metadata:
  name: weekly-network-latency
  namespace: chaos-mesh
spec:
  # Run every Monday at 9 AM
  schedule: "0 9 * * 1"
  historyLimit: 5
  concurrencyPolicy: Forbid
  type: NetworkChaos
  networkChaos:
    action: delay
    mode: one
    selector:
      namespaces:
        - default
      labelSelectors:
        app: frontend
    delay:
      latency: "500ms"
      jitter: "100ms"
    direction: to
    duration: "10m"
```

## Step 6: Apply via Flux Kustomization

```yaml
# clusters/my-cluster/chaos-experiments/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: network-chaos-experiments
  namespace: flux-system
spec:
  interval: 5m
  path: ./clusters/my-cluster/chaos-experiments
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: chaos-mesh
```

## Step 7: Validate Service Behavior

```bash
# Watch the NetworkChaos resource status
kubectl get networkchaos -n chaos-mesh -w

# From a test pod, measure latency during the experiment
kubectl run -it --rm test --image=busybox --restart=Never -- \
  sh -c "for i in \$(seq 1 10); do time wget -q -O- http://frontend/health; done"

# Check application error rates in your metrics system
kubectl top pods -n default
```

## Best Practices

- Use `direction: to` or `direction: from` rather than `both` when you need to test one-directional failures.
- Test latency injection before packet loss; high latency is more common in production than total packet loss.
- Set `duration` to a value shorter than your alerting SLO window so you can observe alerts firing.
- Use `correlation` in delay and loss specs to make the chaos pattern more realistic (bursts vs random).
- Combine network chaos with application metrics dashboards to capture the exact impact on your SLOs.

## Conclusion

Network chaos experiments reveal how your services behave when the network becomes unreliable — the most realistic failure mode in cloud-native environments. Managing these experiments through Flux CD ensures they are part of your engineering record, automatically reconciled, and applied consistently across environments, turning ad-hoc network testing into a repeatable discipline.
