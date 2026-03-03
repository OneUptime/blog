# How to Scale Talos Clusters with CAPI Machine Deployments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, CAPI, Scaling, Kubernetes, Machine Deployments

Description: Learn how to scale Talos Linux clusters using CAPI MachineDeployments for dynamic worker pools and control plane node management.

---

One of the biggest advantages of using Cluster API to manage Talos Linux clusters is how straightforward scaling becomes. Adding or removing nodes is a matter of changing a replica count in a Kubernetes resource. CAPI handles the rest - provisioning new machines, applying Talos configurations, joining nodes to the cluster, and cleaning up resources when scaling down. This guide covers the different scaling strategies available with CAPI MachineDeployments for Talos clusters.

## How CAPI Scaling Works

Cluster API uses a hierarchy of resources to manage machines:

- **MachineDeployment** - Similar to a Kubernetes Deployment, manages a set of machines with a desired replica count
- **MachineSet** - Created by MachineDeployment, similar to a ReplicaSet
- **Machine** - Represents a single machine (VM or bare metal node)

When you change the replica count on a MachineDeployment, CAPI creates or deletes Machine resources. The infrastructure provider creates or destroys the actual VMs, and the bootstrap provider generates Talos configurations for new machines.

## Basic Worker Scaling

The simplest scaling operation is changing the number of worker nodes:

```bash
# Scale workers from 3 to 5
kubectl patch machinedeployment my-cluster-workers \
  --type merge -p '{"spec":{"replicas":5}}'

# Watch the new machines being provisioned
kubectl get machines -l cluster.x-k8s.io/deployment-name=my-cluster-workers -w

# Verify new nodes joined the workload cluster
KUBECONFIG=workload-kubeconfig kubectl get nodes -w
```

You can also use `kubectl scale`:

```bash
# Scale using the scale subcommand
kubectl scale machinedeployment my-cluster-workers --replicas=5
```

Or edit the resource directly:

```bash
# Edit the MachineDeployment
kubectl edit machinedeployment my-cluster-workers
# Change spec.replicas to the desired count
```

## Scaling Down Safely

When scaling down, CAPI selects machines to delete. You can influence which machines get removed:

```bash
# Annotate a specific machine for deletion priority
kubectl annotate machine my-cluster-workers-abc123 \
  cluster.x-k8s.io/delete-machine=yes

# Then scale down - the annotated machine will be removed first
kubectl scale machinedeployment my-cluster-workers --replicas=2
```

For a graceful scale-down, you should drain nodes before they are removed. CAPI can be configured to drain automatically:

```yaml
# MachineDeployment with drain configuration
apiVersion: cluster.x-k8s.io/v1beta1
kind: MachineDeployment
metadata:
  name: my-cluster-workers
spec:
  replicas: 3
  selector:
    matchLabels: {}
  template:
    spec:
      nodeDrainTimeout: 120s  # Wait up to 2 minutes for drain
      clusterName: my-cluster
      version: v1.30.0
      bootstrap:
        configRef:
          apiVersion: bootstrap.cluster.x-k8s.io/v1alpha3
          kind: TalosConfigTemplate
          name: my-cluster-workers
      infrastructureRef:
        apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
        kind: AWSMachineTemplate
        name: my-cluster-workers
```

## Multiple Worker Pools

Create different worker pools for different workload types:

```yaml
# General purpose worker pool
apiVersion: cluster.x-k8s.io/v1beta1
kind: MachineDeployment
metadata:
  name: my-cluster-general-workers
  namespace: default
spec:
  clusterName: my-cluster
  replicas: 3
  selector:
    matchLabels: {}
  template:
    metadata:
      labels:
        node-pool: general
    spec:
      clusterName: my-cluster
      version: v1.30.0
      bootstrap:
        configRef:
          apiVersion: bootstrap.cluster.x-k8s.io/v1alpha3
          kind: TalosConfigTemplate
          name: my-cluster-general-workers
      infrastructureRef:
        apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
        kind: AWSMachineTemplate
        name: my-cluster-general

---
# High-memory worker pool
apiVersion: cluster.x-k8s.io/v1beta1
kind: MachineDeployment
metadata:
  name: my-cluster-highmem-workers
  namespace: default
spec:
  clusterName: my-cluster
  replicas: 2
  selector:
    matchLabels: {}
  template:
    metadata:
      labels:
        node-pool: high-memory
    spec:
      clusterName: my-cluster
      version: v1.30.0
      bootstrap:
        configRef:
          apiVersion: bootstrap.cluster.x-k8s.io/v1alpha3
          kind: TalosConfigTemplate
          name: my-cluster-highmem-workers
      infrastructureRef:
        apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
        kind: AWSMachineTemplate
        name: my-cluster-highmem
```

With separate machine templates for different instance sizes:

```yaml
# General purpose instances
apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
kind: AWSMachineTemplate
metadata:
  name: my-cluster-general
spec:
  template:
    spec:
      instanceType: m5.large
      ami:
        id: ami-xxxxxxxxxxxxxxxxx
      rootVolume:
        size: 100
        type: gp3

---
# High memory instances
apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
kind: AWSMachineTemplate
metadata:
  name: my-cluster-highmem
spec:
  template:
    spec:
      instanceType: r5.2xlarge
      ami:
        id: ami-xxxxxxxxxxxxxxxxx
      rootVolume:
        size: 200
        type: gp3
```

Scale each pool independently:

```bash
# Scale general workers
kubectl scale machinedeployment my-cluster-general-workers --replicas=5

# Scale high-memory workers
kubectl scale machinedeployment my-cluster-highmem-workers --replicas=4
```

## Scaling the Control Plane

Control plane scaling works through the TalosControlPlane resource:

```bash
# Scale control plane from 3 to 5 (must be odd numbers)
kubectl patch taloscontrolplane my-cluster-cp \
  --type merge -p '{"spec":{"replicas":5}}'

# Watch control plane scaling
kubectl get taloscontrolplane my-cluster-cp -w
```

Control plane scaling is more involved than worker scaling because:

- etcd membership needs to be managed
- The new nodes need to join the etcd cluster
- When scaling down, etcd members must be removed before the machine is deleted

CAPT handles all of this automatically, but you should monitor the process:

```bash
# Check etcd membership during scaling
KUBECONFIG=workload-kubeconfig kubectl get pods -n kube-system -l component=etcd
```

## Autoscaling with Cluster Autoscaler

Integrate the Kubernetes Cluster Autoscaler with CAPI for automatic scaling:

```yaml
# Cluster autoscaler deployment for CAPI
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cluster-autoscaler
  template:
    metadata:
      labels:
        app: cluster-autoscaler
    spec:
      containers:
        - name: cluster-autoscaler
          image: registry.k8s.io/autoscaling/cluster-autoscaler:v1.30.0
          command:
            - /cluster-autoscaler
            - --cloud-provider=clusterapi
            - --kubeconfig=/mnt/kubeconfig/value
            - --clusterapi-cloud-config-authoritative
            - --node-group-auto-discovery=clusterapi:namespace=default,clusterName=my-cluster
          volumeMounts:
            - name: kubeconfig
              mountPath: /mnt/kubeconfig
      volumes:
        - name: kubeconfig
          secret:
            secretName: workload-cluster-kubeconfig
```

Add autoscaling annotations to your MachineDeployment:

```yaml
apiVersion: cluster.x-k8s.io/v1beta1
kind: MachineDeployment
metadata:
  name: my-cluster-workers
  annotations:
    # Set min and max replicas for autoscaler
    cluster.x-k8s.io/cluster-api-autoscaler-node-group-min-size: "2"
    cluster.x-k8s.io/cluster-api-autoscaler-node-group-max-size: "10"
spec:
  replicas: 3
  # ... rest of spec
```

## Monitoring Scaling Operations

Keep track of scaling events:

```bash
# Watch all machines in the cluster
kubectl get machines -l cluster.x-k8s.io/cluster-name=my-cluster -w

# Check MachineDeployment status
kubectl get machinedeployment my-cluster-workers -o yaml | grep -A 10 status

# View scaling events
kubectl get events --sort-by='.metadata.creationTimestamp' \
  --field-selector reason=SuccessfulCreate

# Get a summary of the cluster
clusterctl describe cluster my-cluster
```

## Scaling Best Practices

When scaling Talos clusters through CAPI, keep these guidelines in mind. Always scale control plane nodes in odd numbers to maintain etcd quorum. Set `nodeDrainTimeout` on your MachineDeployments to ensure workloads are moved gracefully during scale-down. Use multiple MachineDeployments for different workload types rather than one large pool. Monitor etcd health during control plane scaling operations. Use the Cluster Autoscaler for workloads with variable resource demands.

CAPI makes scaling Talos clusters a first-class operation. Whether you need to add capacity for a traffic spike or reduce costs during off-peak hours, the declarative model means you change a number and let the controllers handle the rest.
