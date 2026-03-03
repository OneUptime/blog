# How to Enable Workers on Control Plane Nodes in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Control Plane, Worker Nodes, Kubernetes, Cluster Topology

Description: Learn how to configure Talos Linux control plane nodes to also run regular workloads, which is ideal for small clusters and development environments.

---

In a standard Kubernetes setup, control plane nodes are dedicated to running control plane components like the API server, scheduler, controller manager, and etcd. Worker nodes handle regular application workloads. But in smaller clusters, especially development and testing environments, dedicating separate nodes for the control plane can be wasteful. You might have a 3-node cluster where all nodes are control plane nodes, and you need those same nodes to run your applications too.

Talos Linux supports running worker workloads on control plane nodes. This guide explains how to configure this and what to consider before doing it.

## Why Run Workers on Control Plane Nodes

The primary motivation is resource efficiency. If you have a 3-node cluster for development, you do not want 3 control plane nodes doing nothing but running etcd, API server, and other control plane components. Those nodes have plenty of spare CPU and memory that could be running your applications.

Common scenarios where this makes sense:

- Development and testing clusters with limited nodes
- Small production clusters where cost is a concern
- Edge deployments with only 3 nodes
- Homelab setups where every node counts

## Understanding Talos Node Types

In Talos Linux, nodes are either control plane nodes or worker nodes based on their machine configuration. Control plane nodes run both the machine services (kubelet, containerd) and the control plane services (API server, etcd, scheduler, controller manager). Worker nodes run only the machine services.

By default, control plane nodes in Kubernetes have a taint that prevents regular pods from being scheduled on them:

```text
node-role.kubernetes.io/control-plane:NoSchedule
```

This taint is what keeps your application pods off the control plane nodes.

## Allowing Workloads on Control Plane Nodes

In Talos Linux, you can configure control plane nodes to allow scheduling by setting `allowSchedulingOnControlPlanes` in the cluster configuration:

```yaml
cluster:
  allowSchedulingOnControlPlanes: true
```

When this is set to true, Talos does not apply the `NoSchedule` taint to control plane nodes. The scheduler can then place any pod on any node, including control plane nodes.

## Complete Configuration Example

Here is a complete control plane configuration that allows worker workloads:

```yaml
# controlplane.yaml
cluster:
  clusterName: my-cluster
  controlPlane:
    endpoint: https://10.0.0.1:6443
  allowSchedulingOnControlPlanes: true
  network:
    cni:
      name: flannel
  # Rest of cluster configuration...

machine:
  type: controlplane
  network:
    hostname: cp-1
    interfaces:
      - interface: eth0
        dhcp: true
  # Rest of machine configuration...
```

## Generating Configuration

When generating a new Talos configuration, you can include this setting from the start:

```bash
# Generate configuration with scheduling on control planes enabled
talosctl gen config my-cluster https://10.0.0.1:6443 \
  --config-patch '[{"op": "add", "path": "/cluster/allowSchedulingOnControlPlanes", "value": true}]'
```

Or create a patch file:

```yaml
# allow-scheduling-patch.yaml
cluster:
  allowSchedulingOnControlPlanes: true
```

```bash
talosctl gen config my-cluster https://10.0.0.1:6443 \
  --config-patch @allow-scheduling-patch.yaml
```

## Enabling on an Existing Cluster

If your cluster is already running and you want to start scheduling workloads on control plane nodes:

```bash
# Patch the configuration on all control plane nodes
talosctl patch machineconfig --nodes 10.0.0.2 \
  --patch '[{"op": "add", "path": "/cluster/allowSchedulingOnControlPlanes", "value": true}]'

talosctl patch machineconfig --nodes 10.0.0.3 \
  --patch '[{"op": "add", "path": "/cluster/allowSchedulingOnControlPlanes", "value": true}]'

talosctl patch machineconfig --nodes 10.0.0.4 \
  --patch '[{"op": "add", "path": "/cluster/allowSchedulingOnControlPlanes", "value": true}]'
```

After applying, verify the taints have been removed:

```bash
# Check node taints
kubectl describe node cp-1 | grep Taints
# Should show: Taints: <none>

# Or check all nodes
kubectl get nodes -o custom-columns=NAME:.metadata.name,TAINTS:.spec.taints
```

## Resource Reservations

When running application workloads on control plane nodes, it is critical to reserve enough resources for the control plane components. Without reservations, application pods could starve etcd or the API server:

```yaml
machine:
  kubelet:
    extraArgs:
      # Reserve resources for control plane components
      system-reserved: "cpu=1000m,memory=2Gi"
      kube-reserved: "cpu=500m,memory=1Gi"
      # Set eviction thresholds
      eviction-hard: "memory.available<500Mi,nodefs.available<10%"
```

These reservations ensure that the control plane always has enough CPU and memory to function, even when application workloads are consuming resources.

## Using Node Affinity for Critical Workloads

Even with scheduling enabled on control plane nodes, you might want some workloads to prefer worker nodes when they are available:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3
  template:
    spec:
      affinity:
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              preference:
                matchExpressions:
                  - key: node-role.kubernetes.io/control-plane
                    operator: DoesNotExist
      containers:
        - name: app
          image: myapp:latest
```

This tells the scheduler to prefer nodes that are not control plane nodes, but if no worker nodes are available, it will schedule on control plane nodes.

## Priority Classes for Control Plane Protection

Use PriorityClasses to ensure control plane pods are never evicted in favor of application pods:

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: system-critical
value: 1000000
globalDefault: false
description: "Priority class for system-critical pods"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: application
value: 100
globalDefault: true
description: "Default priority for application pods"
```

Control plane components already use system priority classes, so this mainly ensures your application pods have a lower priority.

## Monitoring Control Plane Health

When running mixed workloads on control plane nodes, monitor the health of control plane components closely:

```bash
# Check etcd performance
talosctl etcd status --nodes 10.0.0.2

# Monitor API server response times
kubectl get --raw /healthz?verbose

# Check control plane pod resource usage
kubectl top pods -n kube-system

# Monitor node resource usage
kubectl top nodes
```

If you notice increased latency in API server responses or etcd performance degradation, your application workloads may be consuming too many resources. Increase the system and kube reservations.

## When Not to Do This

Running workers on control plane nodes is not appropriate in every situation:

For production clusters with strict availability requirements, keep control plane nodes dedicated. A resource-hungry application pod should not be able to affect etcd or the API server.

For large clusters, the control plane nodes are usually busy enough with their own workloads. Adding application pods just increases the risk of problems.

For compliance environments that require separation between infrastructure and application workloads, keep them separate.

## Disabling Again

If you decide to go back to dedicated control plane nodes:

```bash
talosctl patch machineconfig --nodes 10.0.0.2 \
  --patch '[{"op": "replace", "path": "/cluster/allowSchedulingOnControlPlanes", "value": false}]'
```

This will re-add the `NoSchedule` taint. Existing pods will not be immediately evicted, but no new pods will be scheduled on the control plane nodes. To remove existing workload pods, you can drain the node:

```bash
kubectl drain cp-1 --ignore-daemonsets --delete-emptydir-data
```

## Conclusion

Enabling worker workloads on Talos Linux control plane nodes is a simple configuration change that makes perfect sense for small clusters and development environments. The key is to protect the control plane by setting appropriate resource reservations and monitoring control plane health. For production clusters, carefully consider whether the cost savings justify the added risk before enabling this feature.
