# How to Configure Controller Manager on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Controller Manager, Kubernetes, Control Plane, Cluster Management

Description: Learn how to configure the Kubernetes controller manager in Talos Linux for custom cluster behavior, resource management, and security policies.

---

The Kubernetes controller manager runs a set of controllers that regulate the state of the cluster. It handles node lifecycle, replication, endpoints, service accounts, and many other core functions. In Talos Linux, the controller manager is a control plane component that you configure through the machine configuration. Customizing its settings lets you tune how aggressively the cluster reacts to changes, how resources are garbage collected, and how certificates are managed.

This guide walks through the controller manager configuration options available in Talos Linux.

## Controller Manager in Talos Linux

Like other control plane components, the kube-controller-manager runs as a managed service on Talos control plane nodes. You configure it in the `cluster.controllerManager` section of the machine configuration:

```yaml
cluster:
  controllerManager:
    image: registry.k8s.io/kube-controller-manager:v1.30.0
    extraArgs:
      key: value
    extraVolumes: []
```

## Common Extra Arguments

The `extraArgs` field is the primary way to customize controller manager behavior:

```yaml
cluster:
  controllerManager:
    extraArgs:
      # Logging verbosity
      v: "2"
      # Node eviction settings
      node-monitor-period: "5s"
      node-monitor-grace-period: "40s"
      pod-eviction-timeout: "5m0s"
      # Concurrent operations
      concurrent-deployment-syncs: "10"
      concurrent-replicaset-syncs: "10"
      concurrent-service-syncs: "5"
```

Each of these flags controls a specific aspect of controller behavior. Let us break down the most important ones.

## Node Lifecycle Management

The controller manager decides when a node is considered unhealthy and when to evict pods from it. These settings directly affect how your cluster responds to node failures:

```yaml
cluster:
  controllerManager:
    extraArgs:
      # How often the controller checks node status
      node-monitor-period: "5s"
      # How long a node can be unresponsive before it is marked NotReady
      node-monitor-grace-period: "40s"
      # How long to wait before evicting pods from a NotReady node
      pod-eviction-timeout: "5m0s"
```

For clusters that need fast failover, reduce these values:

```yaml
cluster:
  controllerManager:
    extraArgs:
      node-monitor-period: "2s"
      node-monitor-grace-period: "20s"
      pod-eviction-timeout: "30s"
```

Be careful with aggressive settings. In environments with occasional network blips, too-aggressive eviction can cause unnecessary pod migrations that make the situation worse.

## Concurrency Settings

The controller manager processes different resource types concurrently. You can adjust how many of each type it processes simultaneously:

```yaml
cluster:
  controllerManager:
    extraArgs:
      # Number of deployment objects to process concurrently
      concurrent-deployment-syncs: "10"
      # Number of replica set objects to process concurrently
      concurrent-replicaset-syncs: "10"
      # Number of resource quota syncs
      concurrent-resource-quota-syncs: "10"
      # Number of service syncs
      concurrent-service-syncs: "5"
      # Number of namespace syncs
      concurrent-namespace-syncs: "20"
      # Number of garbage collector syncs
      concurrent-gc-syncs: "30"
```

Higher concurrency values speed up reconciliation but consume more CPU and memory on the control plane node. For large clusters with thousands of deployments, increasing these values can significantly reduce the time it takes for changes to propagate.

## Service Account Management

The controller manager creates and manages service account tokens. You can configure this behavior:

```yaml
cluster:
  controllerManager:
    extraArgs:
      # Use service account credentials for controller authentication
      use-service-account-credentials: "true"
      # Root CA file for service accounts
      root-ca-file: /etc/kubernetes/pki/ca.crt
      # Service account private key for signing tokens
      service-account-private-key-file: /etc/kubernetes/pki/sa.key
```

Talos typically handles these paths automatically, but you may need to adjust them if you are using custom PKI.

## Cluster CIDR and Networking

The controller manager needs to know the cluster's pod and service CIDR ranges:

```yaml
cluster:
  controllerManager:
    extraArgs:
      # Pod network CIDR
      cluster-cidr: "10.244.0.0/16"
      # Service network CIDR
      service-cluster-ip-range: "10.96.0.0/12"
      # Allocate node CIDR from the cluster CIDR
      allocate-node-cidrs: "true"
      # Size of the CIDR block allocated to each node
      node-cidr-mask-size: "24"
```

These should match your cluster network configuration. Getting them wrong can cause networking issues that are difficult to diagnose.

## Garbage Collection

The controller manager handles garbage collection of orphaned resources:

```yaml
cluster:
  controllerManager:
    extraArgs:
      # Enable garbage collection
      enable-garbage-collector: "true"
      # Number of concurrent garbage collector workers
      concurrent-gc-syncs: "30"
      # Terminated pod garbage collection threshold
      terminated-pod-gc-threshold: "1000"
```

The `terminated-pod-gc-threshold` is particularly useful. It controls how many completed or failed pods are kept before the garbage collector starts cleaning them up. In clusters that run many short-lived jobs, lowering this value keeps the API server responsive by reducing the number of pod objects.

## Leader Election

In a multi-control-plane setup, only one controller manager instance is active. The others are on standby:

```yaml
cluster:
  controllerManager:
    extraArgs:
      leader-elect: "true"
      leader-elect-lease-duration: "15s"
      leader-elect-renew-deadline: "10s"
      leader-elect-retry-period: "2s"
```

These settings control how quickly leadership transfers when the active controller manager fails. Shorter durations mean faster failover but more frequent lease renewals.

## Horizontal Pod Autoscaler Settings

The HPA controller is part of the controller manager. You can tune its behavior:

```yaml
cluster:
  controllerManager:
    extraArgs:
      # How often HPA checks metrics
      horizontal-pod-autoscaler-sync-period: "15s"
      # Cooldown after scaling up
      horizontal-pod-autoscaler-upscale-delay: "3m0s"
      # Cooldown after scaling down
      horizontal-pod-autoscaler-downscale-stabilization: "5m0s"
      # Tolerance for metric changes
      horizontal-pod-autoscaler-tolerance: "0.1"
```

Adjusting these values affects how responsive the HPA is. Shorter sync periods and delays make autoscaling more aggressive, while longer values add stability.

## Disabling the Controller Manager

In rare cases, you might want to disable the built-in controller manager:

```yaml
cluster:
  controllerManager:
    disabled: true
```

This is almost never needed in practice. Only disable it if you are running a completely custom control plane setup.

## Applying the Configuration

Apply changes to all control plane nodes:

```bash
# Apply to control plane nodes
talosctl apply-config --nodes 10.0.0.2 --file controlplane.yaml

# Verify the controller manager is running
talosctl service kube-controller-manager --nodes 10.0.0.2

# Check logs for any errors
talosctl logs kube-controller-manager --nodes 10.0.0.2

# Verify leader election
kubectl get lease -n kube-system kube-controller-manager -o yaml
```

## Monitoring Controller Manager Health

Keep an eye on the controller manager to ensure your configuration changes are working:

```bash
# Check controller manager metrics
kubectl get --raw /metrics | grep controller_manager

# Look for specific controller sync durations
talosctl logs kube-controller-manager --nodes 10.0.0.2 | grep "sync"

# Check for error conditions
talosctl logs kube-controller-manager --nodes 10.0.0.2 | grep -i error
```

## Conclusion

The controller manager is one of the most impactful control plane components to tune. Node lifecycle settings affect how quickly your cluster responds to failures. Concurrency settings affect how fast changes propagate. HPA settings affect how responsive autoscaling is. In Talos Linux, all of these are configured through extra args in the machine configuration, making it easy to adjust and apply consistently across all control plane nodes. Start with the defaults, measure your cluster's behavior, and tune based on what you observe.
