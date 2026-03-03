# How to Troubleshoot CAPI Provisioning Issues with Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, CAPI, Troubleshooting, Kubernetes, Debugging

Description: A comprehensive troubleshooting guide for resolving common CAPI provisioning issues when deploying Talos Linux Kubernetes clusters.

---

When Cluster API provisioning works, it feels like magic. Machines appear, configure themselves, and join your cluster without manual intervention. When it does not work, the debugging experience can be frustrating because there are multiple controllers, resources, and providers involved. This guide provides a systematic approach to troubleshooting CAPI provisioning issues specific to Talos Linux clusters.

## The Provisioning Pipeline

Understanding the provisioning pipeline helps you pinpoint where failures occur. When you create a Cluster resource, this sequence happens:

1. **CAPI core** creates the Cluster and associated infrastructure
2. **Infrastructure provider** creates cloud resources (VPC, load balancer, subnets)
3. **Control plane provider** creates Machine resources for control plane nodes
4. **Infrastructure provider** creates VMs for each Machine
5. **Bootstrap provider** generates Talos machine configurations
6. **VMs boot** with the Talos configuration as user data
7. **Talos nodes** apply the configuration and start Kubernetes components
8. **Nodes join** the cluster and report as Ready

A failure at any step blocks the subsequent steps. Your job is to identify which step failed and why.

## Step 1: Check the Cluster Status

Start with a high-level view:

```bash
# Get the overall cluster status
clusterctl describe cluster my-cluster

# Check the cluster resource directly
kubectl get cluster my-cluster -o yaml | grep -A 30 status

# Look for conditions that indicate problems
kubectl get cluster my-cluster -o jsonpath='{.status.conditions[*].message}'
```

Common cluster-level issues include infrastructure provisioning failures, missing credentials, and network configuration errors.

## Step 2: Check Infrastructure Resources

If the cluster infrastructure is not ready, investigate the infrastructure provider resources:

```bash
# For AWS
kubectl describe awscluster my-cluster
kubectl get awscluster my-cluster -o yaml | grep -A 20 status

# For Azure
kubectl describe azurecluster my-cluster

# For vSphere
kubectl describe vspherecluster my-cluster

# Check for events related to infrastructure
kubectl get events --sort-by='.metadata.creationTimestamp' \
  --field-selector involvedObject.kind=AWSCluster
```

Common infrastructure issues:

- **Insufficient IAM permissions** - The service account lacks permissions to create VPCs, subnets, or load balancers
- **Resource limits** - You have hit your cloud account's quota for instances, VPCs, or elastic IPs
- **Invalid region or zone** - The specified region does not exist or does not support the requested instance type

## Step 3: Check Machine Status

If infrastructure is ready but machines are stuck:

```bash
# List all machines and their phases
kubectl get machines -l cluster.x-k8s.io/cluster-name=my-cluster \
  -o custom-columns=NAME:.metadata.name,PHASE:.status.phase,READY:.status.nodeRef.name

# Describe a stuck machine
kubectl describe machine <machine-name>

# Check the underlying infrastructure machine
kubectl describe awsmachine <machine-name>  # or azuremachine, vspheremachine

# Check events for the machine
kubectl get events --sort-by='.metadata.creationTimestamp' \
  --field-selector involvedObject.name=<machine-name>
```

Machine provisioning failures often come from:

- **Invalid AMI/image** - The Talos image does not exist in the target region
- **Instance type unavailable** - The requested instance type is not available
- **Subnet full** - No available IP addresses in the subnet
- **Security group issues** - Incorrect or missing security group rules

## Step 4: Check Bootstrap Data

If machines are created but not joining the cluster, the issue is often with the bootstrap data:

```bash
# Check the TalosConfig status
kubectl get talosconfig -l cluster.x-k8s.io/cluster-name=my-cluster

# Describe the TalosConfig for details
kubectl describe talosconfig <machine-name>

# Verify the bootstrap data secret exists
kubectl get secrets -l cluster.x-k8s.io/cluster-name=my-cluster | grep bootstrap

# Inspect the bootstrap data (contains secrets - be careful)
kubectl get secret <machine-name>-bootstrap-data \
  -o jsonpath='{.data.value}' | base64 -d | head -20
```

Bootstrap data issues include:

- **Invalid config patches** - JSON patches that reference non-existent paths
- **Version mismatch** - The specified Talos version does not match the installed image
- **Missing cluster secrets** - The bootstrap provider could not generate certificates

## Step 5: Check the Talos Node

If the VM is running but the node is not joining the cluster, connect to the node through the Talos API:

```bash
# Get the machine's IP address
kubectl get machine <machine-name> -o jsonpath='{.status.addresses[0].address}'

# Try to reach the Talos API
talosctl version --insecure --nodes <node-ip>

# Check if the node received its configuration
talosctl get machineconfig --insecure --nodes <node-ip>

# Check Talos service statuses
talosctl services --insecure --nodes <node-ip>

# Look at system logs
talosctl dmesg --insecure --nodes <node-ip>

# Check kubelet logs
talosctl logs kubelet --insecure --nodes <node-ip>

# Check etcd logs (control plane only)
talosctl logs etcd --insecure --nodes <node-ip>
```

Common node-level issues:

- **Cannot reach the API endpoint** - Network security rules block port 6443 or 50000
- **etcd failure** - etcd cannot form a cluster due to DNS resolution or connectivity
- **Disk issues** - The install disk path does not match the actual disk device
- **Certificate problems** - Clock skew causes certificate validation failures

## Step 6: Check Controller Logs

When the resource statuses do not give enough information, check the controller logs:

```bash
# CAPI core controller
kubectl logs -n capi-system deployment/capi-controller-manager -f --tail=100

# Talos bootstrap provider
kubectl logs -n cabpt-system deployment/cabpt-controller-manager -f --tail=100

# Talos control plane provider
kubectl logs -n cacppt-system deployment/cacppt-controller-manager -f --tail=100

# Infrastructure provider (AWS example)
kubectl logs -n capa-system deployment/capa-controller-manager -f --tail=100

# Filter for errors
kubectl logs -n cabpt-system deployment/cabpt-controller-manager \
  --tail=500 | grep -i error
```

## Common Scenarios and Solutions

### Machines Stuck in "Provisioning"

```bash
# Check the infrastructure machine status
kubectl get awsmachines -l cluster.x-k8s.io/cluster-name=my-cluster

# Look for AWS API errors
kubectl logs -n capa-system deployment/capa-controller-manager --tail=200 | grep -i error

# Common fix: verify IAM permissions and AMI availability
aws ec2 describe-images --image-ids <ami-id> --region <region>
```

### Control Plane Not Becoming Ready

```bash
# Check if etcd is running on control plane nodes
talosctl services --nodes <cp-ip> --insecure | grep etcd

# Check etcd logs for cluster formation issues
talosctl logs etcd --nodes <cp-ip> --insecure --tail 50

# Verify the load balancer is routing to control plane nodes
# For AWS:
aws elbv2 describe-target-health --target-group-arn <tg-arn>
```

### Workers Not Joining the Cluster

```bash
# Check kubelet logs on the worker
talosctl logs kubelet --nodes <worker-ip> --insecure --tail 50

# Verify the worker can reach the API server
talosctl get machineconfig --nodes <worker-ip> --insecure \
  -o jsonpath='{.spec.cluster.controlPlane.endpoint}'

# Check if the worker's bootstrap token is valid
KUBECONFIG=workload-kubeconfig kubectl get csr
```

### Bootstrap Data Not Generated

```bash
# Check CABPT controller
kubectl logs -n cabpt-system deployment/cabpt-controller-manager --tail=100

# Verify the TalosConfig or TalosConfigTemplate exists
kubectl get talosconfig -A
kubectl get talosconfigtemplate -A

# Check for ownership issues
kubectl get talosconfig <name> -o yaml | grep ownerReferences -A 10
```

## Diagnostic Checklist

When troubleshooting, work through this checklist systematically:

```bash
# 1. Cluster resource healthy?
kubectl get cluster my-cluster

# 2. Infrastructure cluster ready?
kubectl get awscluster my-cluster  # or azurecluster, vspherecluster

# 3. Control plane provisioned?
kubectl get taloscontrolplane my-cluster-cp

# 4. All machines in "Running" phase?
kubectl get machines -l cluster.x-k8s.io/cluster-name=my-cluster

# 5. Bootstrap data secrets exist?
kubectl get secrets -l cluster.x-k8s.io/cluster-name=my-cluster | grep bootstrap

# 6. Infrastructure machines have provider IDs?
kubectl get machines -o custom-columns=NAME:.metadata.name,PROVIDER:.spec.providerID

# 7. Nodes registered in workload cluster?
KUBECONFIG=workload-kubeconfig kubectl get nodes

# 8. Any unhealthy conditions?
kubectl get machines -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.conditions[*].type}{"\t"}{.status.conditions[*].status}{"\n"}{end}'
```

## Cleaning Up Failed Provisioning

If a provisioning attempt is thoroughly stuck and you need to start over:

```bash
# Delete the cluster (CAPI will clean up infrastructure)
kubectl delete cluster my-cluster

# If cleanup is stuck, check for finalizers
kubectl get cluster my-cluster -o jsonpath='{.metadata.finalizers}'

# Force delete if needed (be careful - may leave orphaned cloud resources)
kubectl patch cluster my-cluster -p '{"metadata":{"finalizers":[]}}' --type merge
kubectl delete cluster my-cluster

# Manually clean up any orphaned cloud resources
# AWS: check for VPCs, instances, load balancers with the cluster name tag
# Azure: check the resource group
# vSphere: check the folder for leftover VMs
```

Troubleshooting CAPI provisioning issues with Talos requires patience and a systematic approach. Start from the top of the resource hierarchy and work your way down. Check resource statuses, then events, then controller logs. Most issues fall into a few categories: credential problems, network connectivity, invalid configurations, or resource availability. With the techniques in this guide, you should be able to diagnose and resolve the most common provisioning failures.
