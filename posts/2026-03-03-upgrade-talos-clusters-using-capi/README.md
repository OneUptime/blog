# How to Upgrade Talos Clusters Using CAPI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, CAPI, Cluster Upgrade, Kubernetes, Rolling Update

Description: A complete guide to upgrading Talos Linux clusters through Cluster API with rolling updates for both the OS and Kubernetes versions.

---

Upgrading Kubernetes clusters is one of the most anxiety-inducing operations in infrastructure management. Cluster API takes much of the stress out of this process by providing a declarative, controller-driven upgrade mechanism. For Talos Linux clusters managed through CAPI, upgrades to both the Talos OS and the Kubernetes version can be triggered by updating resource specifications. CAPI then orchestrates the rolling update automatically. This guide covers everything you need to know about upgrading Talos clusters through CAPI.

## Understanding CAPI Upgrade Mechanics

When you update the version specification on a TalosControlPlane or MachineDeployment, CAPI does not modify existing machines. Instead, it follows a rolling update strategy:

1. Creates a new machine with the updated specification
2. Waits for the new machine to join the cluster and become healthy
3. Cordons and drains the old machine
4. Removes the old machine from the cluster
5. Deletes the old machine and its underlying infrastructure

This approach ensures that your cluster always has the desired number of healthy nodes during the upgrade. If a new machine fails to come up, the rollout pauses, giving you time to investigate.

## Upgrading the Kubernetes Version

To upgrade the Kubernetes version, update the `version` field on both the TalosControlPlane and MachineDeployment resources:

```bash
# Upgrade control plane Kubernetes version
kubectl patch taloscontrolplane my-cluster-cp \
  --type merge \
  -p '{"spec":{"version":"v1.31.0"}}'

# Watch the rolling update progress
kubectl get machines -l cluster.x-k8s.io/control-plane-name=my-cluster-cp -w
```

The control plane provider will upgrade one control plane node at a time, waiting for each new node to join the etcd cluster before proceeding to the next.

After the control plane is upgraded, upgrade the workers:

```bash
# Upgrade worker Kubernetes version
kubectl patch machinedeployment my-cluster-workers \
  --type merge \
  -p '{"spec":{"template":{"spec":{"version":"v1.31.0"}}}}'

# Watch worker rollout
kubectl get machines -l cluster.x-k8s.io/deployment-name=my-cluster-workers -w
```

## Upgrading the Talos OS Version

To upgrade the Talos OS version, update the `talosVersion` in the config patches:

```yaml
# Update the TalosControlPlane with new Talos version
apiVersion: controlplane.cluster.x-k8s.io/v1alpha3
kind: TalosControlPlane
metadata:
  name: my-cluster-cp
spec:
  version: v1.31.0
  replicas: 3
  infrastructureTemplate:
    apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
    kind: AWSMachineTemplate
    name: my-cluster-cp-v2  # New template with updated AMI
  controlPlaneConfig:
    controlplane:
      generateType: controlplane
      talosVersion: v1.8.0  # Updated Talos version
```

You also need to update the machine template to use the new Talos image:

```yaml
# New machine template with updated Talos AMI
apiVersion: infrastructure.cluster.x-k8s.io/v1beta2
kind: AWSMachineTemplate
metadata:
  name: my-cluster-cp-v2
spec:
  template:
    spec:
      instanceType: m5.xlarge
      ami:
        id: ami-yyyyyyyyyyyyyyyyy  # New Talos v1.8.0 AMI
      rootVolume:
        size: 50
        type: gp3
```

Apply the changes:

```bash
# Create the new machine template
kubectl apply -f new-machine-template.yaml

# Update the TalosControlPlane to use the new template and version
kubectl apply -f updated-control-plane.yaml

# Watch the rolling update
kubectl get machines -w
```

## Upgrading Both Versions Together

You can upgrade both the Talos OS and Kubernetes version in a single operation by updating all the relevant fields at once:

```bash
# Apply a comprehensive update
kubectl patch taloscontrolplane my-cluster-cp --type merge -p '{
  "spec": {
    "version": "v1.31.0",
    "infrastructureTemplate": {
      "name": "my-cluster-cp-v2"
    },
    "controlPlaneConfig": {
      "controlplane": {
        "talosVersion": "v1.8.0"
      }
    }
  }
}'
```

## Monitoring the Upgrade Process

Track the upgrade with multiple commands:

```bash
# Get high-level cluster description
clusterctl describe cluster my-cluster

# Watch machine lifecycle events
kubectl get machines -l cluster.x-k8s.io/cluster-name=my-cluster -w

# Check the TalosControlPlane status
kubectl get taloscontrolplane my-cluster-cp -o yaml | grep -A 20 status

# Watch MachineDeployment rollout status
kubectl get machinedeployment my-cluster-workers -o yaml | grep -A 15 status

# Check events for issues
kubectl get events --sort-by='.metadata.creationTimestamp' \
  --field-selector involvedObject.kind=Machine

# Verify nodes on the workload cluster
KUBECONFIG=workload-kubeconfig kubectl get nodes -o wide
```

## Controlling the Rollout Speed

Customize how fast the rolling update proceeds:

```yaml
# MachineDeployment with rollout strategy
apiVersion: cluster.x-k8s.io/v1beta1
kind: MachineDeployment
metadata:
  name: my-cluster-workers
spec:
  replicas: 10
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1  # Only one machine can be unavailable at a time
      maxSurge: 1         # Only create one new machine at a time
  template:
    spec:
      nodeDrainTimeout: 300s  # 5 minutes to drain
      clusterName: my-cluster
      version: v1.31.0
      # ... rest of spec
```

For the control plane, the rollout is always done one node at a time to protect etcd quorum. You cannot configure parallel control plane upgrades.

## Pre-Upgrade Checks

Before starting an upgrade, verify your cluster is healthy:

```bash
# Check cluster health from the management cluster
clusterctl describe cluster my-cluster

# Verify all machines are running
kubectl get machines -l cluster.x-k8s.io/cluster-name=my-cluster \
  -o custom-columns=NAME:.metadata.name,PHASE:.status.phase,VERSION:.spec.version

# Check workload cluster health
KUBECONFIG=workload-kubeconfig kubectl get nodes
KUBECONFIG=workload-kubeconfig kubectl get pods -A --field-selector status.phase!=Running,status.phase!=Succeeded

# Back up etcd from a control plane node
KUBECONFIG=workload-kubeconfig kubectl get pods -n kube-system -l component=etcd
talosctl etcd snapshot backup.db \
  --nodes <cp-ip> --talosconfig talosconfig
```

## Handling Upgrade Failures

If a new machine fails to come up during the rollout, CAPI will pause the update. Investigate the issue:

```bash
# Check the stuck machine
kubectl describe machine <machine-name>

# Check the infrastructure resource
kubectl describe awsmachine <machine-name>  # or azuremachine, vspheremachine

# Check the bootstrap data
kubectl describe talosconfig <machine-name>

# View CAPI controller logs
kubectl logs -n capi-system deployment/capi-controller-manager -f
kubectl logs -n cabpt-system deployment/cabpt-controller-manager -f
kubectl logs -n cacppt-system deployment/cacppt-controller-manager -f
```

If you need to roll back, revert the version changes:

```bash
# Roll back the Kubernetes version on the control plane
kubectl patch taloscontrolplane my-cluster-cp \
  --type merge \
  -p '{"spec":{"version":"v1.30.0"}}'

# Roll back workers
kubectl patch machinedeployment my-cluster-workers \
  --type merge \
  -p '{"spec":{"template":{"spec":{"version":"v1.30.0"}}}}'
```

## Staged Upgrades Across Environments

For production safety, upgrade your clusters in order:

```bash
# 1. Upgrade the development cluster
kubectl --context dev-mgmt patch taloscontrolplane dev-cluster-cp \
  --type merge -p '{"spec":{"version":"v1.31.0"}}'

# 2. After dev is verified, upgrade staging
kubectl --context staging-mgmt patch taloscontrolplane staging-cluster-cp \
  --type merge -p '{"spec":{"version":"v1.31.0"}}'

# 3. Finally, upgrade production
kubectl --context prod-mgmt patch taloscontrolplane prod-cluster-cp \
  --type merge -p '{"spec":{"version":"v1.31.0"}}'
```

## Upgrade Best Practices

Always back up etcd before upgrading. Upgrade the management cluster's CAPI providers before upgrading workload clusters. Upgrade the control plane before workers. Check the Talos release notes for any breaking changes or required migration steps. Monitor the rollout closely and be ready to pause if issues arise. Test the full upgrade path in a non-production environment first.

CAPI transforms Talos cluster upgrades from a manual, error-prone process into a declarative operation with built-in safety mechanisms. The rolling update strategy, combined with automatic health checking, ensures that your cluster stays available throughout the upgrade process.
