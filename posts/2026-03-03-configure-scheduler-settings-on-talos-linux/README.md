# How to Configure Scheduler Settings on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes Scheduler, Pod Scheduling, Cluster Configuration, Control Plane

Description: A detailed guide on configuring the Kubernetes scheduler in Talos Linux for optimized pod placement and resource utilization.

---

The Kubernetes scheduler is responsible for deciding which node each new pod runs on. It evaluates available resources, affinity rules, taints, tolerations, and various other constraints to make optimal placement decisions. In Talos Linux, the scheduler runs as a control plane component that you configure through the machine configuration, just like every other part of the system.

This guide covers how to customize scheduler settings in Talos Linux to fit your workload requirements.

## How the Scheduler Works in Talos Linux

Talos Linux runs the kube-scheduler as a static pod on control plane nodes. The scheduler configuration is derived from the Talos machine configuration. You can pass extra arguments to the scheduler, configure custom scheduler profiles, and even run multiple schedulers.

The scheduler section in the Talos configuration lives under `cluster.scheduler`:

```yaml
cluster:
  scheduler:
    image: registry.k8s.io/kube-scheduler:v1.30.0
    extraArgs:
      v: "2"
    extraVolumes: []
```

## Passing Extra Arguments to the Scheduler

The `extraArgs` field lets you pass command-line flags to the kube-scheduler process:

```yaml
cluster:
  scheduler:
    extraArgs:
      # Increase logging verbosity
      v: "4"
      # Set the leader election lease duration
      leader-elect-lease-duration: "30s"
      # Set the leader election renew deadline
      leader-elect-renew-deadline: "15s"
      # Set the leader election retry period
      leader-elect-retry-period: "5s"
      # Configure bind address
      bind-address: "0.0.0.0"
```

Leader election settings are important in multi-control-plane setups. The defaults work for most clusters, but if you experience scheduler failover issues, adjusting these values can help.

## Custom Scheduler Configuration

For advanced scheduling needs, you can provide a custom KubeSchedulerConfiguration. This involves creating a configuration file and mounting it into the scheduler pod:

```yaml
cluster:
  scheduler:
    extraArgs:
      config: /etc/kubernetes/scheduler-config.yaml
    extraVolumes:
      - hostPath: /etc/kubernetes/scheduler-config.yaml
        mountPath: /etc/kubernetes/scheduler-config.yaml
        readonly: true

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
                  - name: NodeResourcesFit
                    weight: 2
                disabled:
                  - name: NodeResourcesLeastAllocated
            pluginConfig:
              - name: NodeResourcesFit
                args:
                  scoringStrategy:
                    type: MostAllocated
      path: /etc/kubernetes/scheduler-config.yaml
      permissions: 0644
      op: create
```

This example configures the scheduler to prefer placing pods on nodes that are already heavily utilized (bin packing). This is useful for cost optimization because it concentrates workloads on fewer nodes, allowing you to scale down unused nodes.

## Scheduling Profiles

Kubernetes supports multiple scheduling profiles, allowing you to run different scheduling strategies simultaneously:

```yaml
machine:
  files:
    - content: |
        apiVersion: kubescheduler.config.k8s.io/v1
        kind: KubeSchedulerConfiguration
        profiles:
          # Default profile - balanced allocation
          - schedulerName: default-scheduler
            plugins:
              score:
                enabled:
                  - name: NodeResourcesBalancedAllocation
                    weight: 2
          # Bin packing profile - most allocated
          - schedulerName: bin-packing-scheduler
            plugins:
              score:
                enabled:
                  - name: NodeResourcesFit
                    weight: 2
                disabled:
                  - name: NodeResourcesBalancedAllocation
            pluginConfig:
              - name: NodeResourcesFit
                args:
                  scoringStrategy:
                    type: MostAllocated
      path: /etc/kubernetes/scheduler-config.yaml
      permissions: 0644
      op: create
```

Pods can select their scheduler profile:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: batch-job
spec:
  schedulerName: bin-packing-scheduler
  containers:
    - name: worker
      image: batch-processor:latest
```

## Resource-Aware Scheduling

The default scheduler considers CPU and memory requests when placing pods. You can configure how much weight each resource gets:

```yaml
machine:
  files:
    - content: |
        apiVersion: kubescheduler.config.k8s.io/v1
        kind: KubeSchedulerConfiguration
        profiles:
          - schedulerName: default-scheduler
            pluginConfig:
              - name: NodeResourcesFit
                args:
                  scoringStrategy:
                    type: LeastAllocated
                    resources:
                      - name: cpu
                        weight: 1
                      - name: memory
                        weight: 2
      path: /etc/kubernetes/scheduler-config.yaml
      permissions: 0644
      op: create
```

In this example, memory availability is weighted twice as heavily as CPU, which is useful for memory-intensive workloads.

## Disabling the Scheduler

In some specialized setups, you might want to disable the default scheduler entirely and use a custom scheduler deployed as a regular Kubernetes deployment. Talos supports disabling the built-in scheduler:

```yaml
cluster:
  scheduler:
    disabled: true
```

Only do this if you have a replacement scheduler ready to deploy through extra manifests or another mechanism.

## Scheduler Performance Tuning

For large clusters with hundreds of nodes, scheduler performance becomes important:

```yaml
cluster:
  scheduler:
    extraArgs:
      # Percentage of nodes to score in large clusters
      percentage-of-nodes-to-score: "50"
```

The `percentage-of-nodes-to-score` flag tells the scheduler to evaluate only a percentage of eligible nodes when scoring. In a 1000-node cluster, evaluating all nodes for every pod is wasteful. Setting this to 50% means the scheduler finds a good enough node faster without evaluating every option.

## Monitoring Scheduler Behavior

After configuring the scheduler, monitor its behavior to make sure it is working as expected:

```bash
# Check scheduler logs on control plane nodes
talosctl logs kube-scheduler --nodes 10.0.0.2

# View scheduler events
kubectl get events --field-selector reason=Scheduled -A

# Check if pods are pending due to scheduling issues
kubectl get pods --all-namespaces --field-selector status.phase=Pending

# Describe a pending pod to see why it is not scheduled
kubectl describe pod <pod-name> -n <namespace>
```

Common scheduling failures include insufficient resources, unmet affinity requirements, and taints without matching tolerations.

## Applying Scheduler Configuration

Apply the configuration to all control plane nodes:

```bash
# Apply to control plane nodes
talosctl apply-config --nodes 10.0.0.2 --file controlplane.yaml
talosctl apply-config --nodes 10.0.0.3 --file controlplane.yaml
talosctl apply-config --nodes 10.0.0.4 --file controlplane.yaml

# Verify the scheduler restarted
talosctl service kube-scheduler --nodes 10.0.0.2
```

The scheduler will restart automatically when the configuration changes. There may be a brief period where new pods are not scheduled while the scheduler restarts.

## Conclusion

Scheduler configuration in Talos Linux gives you control over how pods are distributed across your cluster. For most clusters, the default settings work well. When you need more control, use extra args for simple tuning or a custom KubeSchedulerConfiguration for advanced features like bin packing, custom profiles, and resource weighting. Monitor scheduler behavior after changes to confirm your configuration produces the placement patterns you expect.
