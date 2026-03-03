# How to Set Scheduler Extra Args in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes Scheduler, Cluster Configuration, Pod Scheduling, Kubernetes

Description: Learn how to configure Kubernetes scheduler extra arguments in Talos Linux for custom scheduling profiles, feature gates, and performance tuning.

---

The Kubernetes scheduler decides which node each pod runs on. It evaluates available resources, affinity rules, taints, tolerations, and topology constraints to make placement decisions. While the default scheduler configuration works well for most workloads, there are situations where you need to tweak its behavior - enabling feature gates for scheduling enhancements, tuning the scheduling algorithm, configuring multiple scheduling profiles, or adjusting performance parameters for large clusters.

In Talos Linux, you configure the scheduler through the cluster configuration section of the machine config. This guide covers how to pass extra arguments to the scheduler and customize its behavior.

## The Scheduler Configuration Section

Scheduler settings are configured under `cluster.scheduler` in the Talos machine configuration:

```yaml
# Basic scheduler extra args
cluster:
  scheduler:
    extraArgs:
      v: "2"                    # Set log verbosity
      bind-address: "0.0.0.0"  # Bind metrics to all interfaces
```

Each key-value pair becomes a command-line flag for the kube-scheduler process. The scheduler runs as a static pod on control plane nodes.

## Enabling Feature Gates

Feature gates let you enable newer scheduling features. Some particularly useful ones include:

```yaml
# Enable scheduler feature gates
cluster:
  scheduler:
    extraArgs:
      feature-gates: >-
        MinDomainsInPodTopologySpread=true,
        PodSchedulingReadiness=true,
        SchedulerQueueingHints=true
```

`MinDomainsInPodTopologySpread` lets you specify the minimum number of domains for topology spread constraints. `PodSchedulingReadiness` allows pods to signal when they are ready to be scheduled, which is useful for batch workloads that need resources provisioned first.

## Configuring Metrics

The scheduler exposes Prometheus metrics for monitoring scheduling latency, queue depth, and plugin execution time:

```yaml
# Enable scheduler metrics
cluster:
  scheduler:
    extraArgs:
      bind-address: "0.0.0.0"
      secure-port: "10259"
```

By default, the scheduler binds to localhost, making metrics inaccessible from other pods. Setting `bind-address` to `0.0.0.0` allows your monitoring stack to scrape scheduler metrics.

## Logging and Debugging

For troubleshooting scheduling issues, you can increase the log verbosity:

```yaml
# Increase scheduler logging
cluster:
  scheduler:
    extraArgs:
      v: "4"  # Higher number = more verbose (0-10)
```

Verbosity levels:
- 0-1: Normal operation, only errors and warnings
- 2: Useful for understanding scheduling decisions
- 4-5: Detailed debugging information
- 6+: Very verbose, generates a lot of log data

For production, keep verbosity at 2 or below. Only increase it temporarily when debugging scheduling problems.

## Custom Scheduler Configuration

For more advanced scheduling customization, you can provide a scheduler configuration file through extra volumes:

```yaml
# Use a custom scheduler configuration
machine:
  files:
    - content: |
        apiVersion: kubescheduler.config.k8s.io/v1
        kind: KubeSchedulerConfiguration
        profiles:
          - schedulerName: default-scheduler
            plugins:
              score:
                enabled:
                  - name: NodeResourcesBalancedAllocation
                    weight: 2
                  - name: ImageLocality
                    weight: 1
                disabled:
                  - name: NodeResourcesLeastAllocated
            pluginConfig:
              - name: NodeResourcesBalancedAllocation
                args:
                  resources:
                    - name: cpu
                      weight: 1
                    - name: memory
                      weight: 1
      permissions: 0o644
      path: /var/etc/kubernetes/scheduler-config.yaml
      op: create

cluster:
  scheduler:
    extraArgs:
      config: "/etc/kubernetes/scheduler/scheduler-config.yaml"
    extraVolumes:
      - hostPath: /var/etc/kubernetes
        mountPath: /etc/kubernetes/scheduler
        readOnly: true
```

This custom configuration changes how the scheduler scores nodes, prioritizing balanced resource allocation across the cluster rather than packing pods onto the least-loaded nodes.

## Scheduling Profiles

Kubernetes supports multiple scheduling profiles, each with its own name and plugin configuration. This is useful when different workloads need different scheduling strategies:

```yaml
# Multiple scheduling profiles
machine:
  files:
    - content: |
        apiVersion: kubescheduler.config.k8s.io/v1
        kind: KubeSchedulerConfiguration
        profiles:
          - schedulerName: default-scheduler
            plugins:
              score:
                enabled:
                  - name: NodeResourcesBalancedAllocation
                    weight: 1
          - schedulerName: high-throughput-scheduler
            plugins:
              score:
                enabled:
                  - name: NodeResourcesLeastAllocated
                    weight: 1
      permissions: 0o644
      path: /var/etc/kubernetes/scheduler-config.yaml
      op: create
```

Pods can then specify which scheduler to use:

```yaml
# Pod using a specific scheduler profile
apiVersion: v1
kind: Pod
metadata:
  name: high-throughput-job
spec:
  schedulerName: high-throughput-scheduler
  containers:
    - name: worker
      image: my-batch-job:latest
```

## Performance Tuning for Large Clusters

In clusters with many nodes and pods, the scheduler can become a bottleneck. These settings help with performance:

```yaml
# Scheduler performance tuning
cluster:
  scheduler:
    extraArgs:
      # Percentage of nodes to score before making a decision
      # Lower values speed up scheduling but may make less optimal decisions
      percentage-of-nodes-to-score: "50"

      # Kube API QPS and burst limits
      kube-api-qps: "100"
      kube-api-burst: "200"
```

The `percentage-of-nodes-to-score` setting is one of the most impactful performance knobs. In a 1000-node cluster, scoring all nodes for every pod is expensive. Setting this to 50% means the scheduler evaluates 500 nodes and picks the best among those, which is usually good enough while cutting scheduling latency roughly in half.

## Extra Volumes

Some configurations require mounting additional files into the scheduler pod:

```yaml
# Mount volumes for custom configuration
cluster:
  scheduler:
    extraVolumes:
      - hostPath: /var/etc/kubernetes
        mountPath: /etc/kubernetes/scheduler
        readOnly: true
```

Extra volumes are useful for:
- Custom scheduler configuration files
- Additional CA certificates for webhook communication
- Policy files for scheduling policies

## Applying Scheduler Configuration

Apply the configuration to control plane nodes:

```bash
# Apply to control plane nodes
talosctl apply-config \
  --nodes 192.168.1.100 \
  --file controlplane.yaml
```

The scheduler runs only on control plane nodes, so you only need to apply scheduler configuration there. Changes trigger a restart of the scheduler pod:

```bash
# Verify the scheduler pod restarted
kubectl -n kube-system get pod -l component=kube-scheduler

# Check scheduler logs for configuration issues
kubectl -n kube-system logs -l component=kube-scheduler --tail=30
```

## Verifying the Configuration

Confirm that the scheduler is running with your extra args:

```bash
# Check scheduler pod spec
kubectl -n kube-system get pod kube-scheduler-cp-01 -o yaml | grep -A 30 "command:"

# Check scheduler health
kubectl get componentstatuses | grep scheduler

# Verify scheduling is working
kubectl run test-pod --image=busybox --command -- sleep 3600
kubectl get pod test-pod -o wide  # Check it was scheduled
kubectl delete pod test-pod
```

## Troubleshooting Scheduling Issues

If pods are stuck in Pending state, the scheduler might be misconfigured:

```bash
# Check why a pod is pending
kubectl describe pod <pending-pod-name> | grep -A 5 Events

# Check scheduler logs for errors
kubectl -n kube-system logs -l component=kube-scheduler | grep -i error

# Look for scheduling failures
kubectl -n kube-system logs -l component=kube-scheduler | grep "unable to schedule"
```

Common issues include invalid scheduler configuration files (check YAML syntax), missing extra volumes (the scheduler cannot find the config file), and incompatible feature gates for your Kubernetes version.

## Best Practices

The default scheduler configuration works for most clusters. Only customize it when you have measured a specific problem. If scheduling latency is too high in a large cluster, reduce `percentage-of-nodes-to-score`. If you need different scheduling behaviors for different workload types, use multiple scheduling profiles. Always test scheduler changes on a non-production cluster, as a broken scheduler means no new pods can be placed anywhere in the cluster.
