# How to Configure Cluster API Machine Health Checks with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Cluster API, CAPI, MachineHealthCheck, Self-Healing, GitOps, Kubernetes

Description: Manage Cluster API MachineHealthCheck resources using Flux CD to enable automatic detection and remediation of unhealthy Kubernetes nodes.

---

## Introduction

MachineHealthCheck (MHC) is Cluster API's mechanism for detecting and remediating unhealthy nodes. When a node fails a health check-because it becomes NotReady, enters an Unknown state, or loses connectivity-the MHC controller deletes the corresponding Machine object. CAPI's MachineDeployment then creates a replacement node automatically, restoring the desired node count.

This self-healing capability is one of the most valuable features of Cluster API. Without it, a dead node requires manual detection and remediation. With a properly configured MachineHealthCheck managed by Flux, unhealthy nodes are replaced within minutes without human intervention.

This guide covers configuring MachineHealthChecks for different scenarios, setting appropriate thresholds, and managing them through Flux CD.

## Prerequisites

- Cluster API installed with a cloud provider
- Flux CD bootstrapped on the management cluster
- Existing MachineDeployments for the cluster
- `kubectl` CLI installed

## Step 1: Create a Basic MachineHealthCheck

```yaml
# clusters/workloads/production-cluster/machinehealthcheck-default.yaml
apiVersion: cluster.x-k8s.io/v1beta1
kind: MachineHealthCheck
metadata:
  name: production-cluster-workers-default-mhc
  namespace: default
spec:
  clusterName: production-cluster
  # Select which machines this health check applies to
  selector:
    matchLabels:
      cluster.x-k8s.io/cluster-name: production-cluster
      pool: default
  # Health check conditions - a machine is unhealthy if ANY of these are true
  unhealthyConditions:
    # Node is NotReady for more than 5 minutes
    - type: Ready
      status: "False"
      timeout: 5m
    # Node status is Unknown (kubelet not reporting) for more than 5 minutes
    - type: Ready
      status: "Unknown"
      timeout: 5m
    # Node reports MemoryPressure for more than 10 minutes
    - type: MemoryPressure
      status: "True"
      timeout: 10m
    # Node reports DiskPressure for more than 10 minutes
    - type: DiskPressure
      status: "True"
      timeout: 10m
  # Maximum number of machines that can be simultaneously remediated
  # Prevents a bug from deleting all nodes at once
  maxUnhealthy: 33%
  # How long to wait before remediating (gives time for transient issues to resolve)
  nodeStartupTimeout: 10m
```

## Step 2: Create a Stricter MHC for Control Plane Nodes

Control plane nodes require special handling. Remediating multiple control plane nodes simultaneously could break etcd quorum.

```yaml
# clusters/workloads/production-cluster/machinehealthcheck-control-plane.yaml
apiVersion: cluster.x-k8s.io/v1beta1
kind: MachineHealthCheck
metadata:
  name: production-cluster-control-plane-mhc
  namespace: default
spec:
  clusterName: production-cluster
  selector:
    matchLabels:
      cluster.x-k8s.io/cluster-name: production-cluster
      # Target only control plane machines
      cluster.x-k8s.io/control-plane: ""
  unhealthyConditions:
    - type: Ready
      status: "False"
      # Longer timeout for control plane - give etcd elections time to settle
      timeout: 10m
    - type: Ready
      status: "Unknown"
      timeout: 10m
  # Only remediate 1 control plane node at a time to protect etcd quorum
  maxUnhealthy: 1
  nodeStartupTimeout: 20m
```

## Step 3: Configure External Remediation

For advanced scenarios, you can delegate remediation to an external controller (e.g., Node Problem Detector, Metal3 remediation).

```yaml
# clusters/workloads/production-cluster/machinehealthcheck-external.yaml
apiVersion: cluster.x-k8s.io/v1beta1
kind: MachineHealthCheck
metadata:
  name: production-cluster-workers-external-mhc
  namespace: default
spec:
  clusterName: production-cluster
  selector:
    matchLabels:
      cluster.x-k8s.io/cluster-name: production-cluster
      pool: gpu
  unhealthyConditions:
    - type: Ready
      status: "False"
      timeout: 5m
    - type: Ready
      status: "Unknown"
      timeout: 5m
    # GPU-specific health condition from Node Problem Detector
    - type: GPUProblem
      status: "True"
      timeout: 2m
  maxUnhealthy: 50%
  # Use external remediation instead of machine deletion
  remediationTemplate:
    apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
    kind: AWSRemediationTemplate
    name: production-cluster-remediation-template
    namespace: default
```

## Step 4: Add Flux Kustomization for Health Checks

```yaml
# clusters/management/workloads/production-cluster-mhc.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: production-cluster-mhc
  namespace: flux-system
spec:
  interval: 5m
  path: ./clusters/workloads/production-cluster/health-checks
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: workload-cluster-production
    - name: production-cluster-workers
```

## Step 5: Monitor MachineHealthCheck Status

```bash
# Check the health check status
kubectl get machinehealthcheck -n default

# Get detailed status including remediated machines
kubectl describe machinehealthcheck \
  production-cluster-workers-default-mhc \
  -n default

# Watch for remediation events
kubectl get events -n default \
  --field-selector reason=RemediationTemplateNotFound \
  --sort-by='.lastTimestamp'

# Check how many machines are currently unhealthy
kubectl get machinehealthcheck production-cluster-workers-default-mhc \
  -n default \
  -o jsonpath='{.status}'
```

Example status output:
```json
{
  "currentHealthy": 3,
  "expectedMachines": 3,
  "remediationsAllowed": 1,
  "conditions": [
    {
      "type": "RemediationAllowed",
      "status": "True",
      "reason": "AtLeastOneHealthy"
    }
  ]
}
```

## Step 6: Test MachineHealthCheck Remediation

```bash
# Simulate a node failure by draining and cordoning a node in the workload cluster
# Get the workload cluster kubeconfig first
clusterctl get kubeconfig production-cluster > production-cluster.kubeconfig

# Find a worker node
kubectl --kubeconfig=production-cluster.kubeconfig get nodes

# Cordon and drain the node to simulate failure
kubectl --kubeconfig=production-cluster.kubeconfig cordon worker-node-1
kubectl --kubeconfig=production-cluster.kubeconfig drain worker-node-1 --force

# Stop kubelet on the node to trigger Unknown status
# (In a real scenario, this would be a hardware failure)
# The MHC will detect the Unknown status after the timeout and remediate

# Watch remediation on the management cluster
kubectl get machines -n default --watch
```

## Best Practices

- Set `maxUnhealthy: 33%` for worker node pools to prevent cascading failures where a systemic issue deletes all nodes simultaneously.
- Use `maxUnhealthy: 1` for control plane node health checks to protect etcd quorum. Never allow simultaneous remediation of multiple control plane nodes.
- Set `nodeStartupTimeout` to accommodate your cloud provider's node provisioning time plus the time for kubelet and CNI to start. A value of 10-15 minutes works for most providers.
- Use `RemediationTemplate` with hardware providers (Metal3) to perform hardware remediation (power cycle) before falling back to machine deletion.
- Monitor `status.remediationsAllowed` to understand the safety margin. If it approaches zero, investigate the cluster health immediately.

## Conclusion

Cluster API MachineHealthChecks are now managed through Flux CD, enabling automatic self-healing for your Kubernetes clusters. Unhealthy nodes are detected within minutes and replaced automatically, maintaining the desired node count without manual intervention. The health checks are version-controlled in Git, auditable, and continuously reconciled by Flux.
