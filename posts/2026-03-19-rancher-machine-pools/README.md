# How to Set Up Machine Pools for Cluster Provisioning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Node Templates, Cloud Credentials

Description: Learn how to configure machine pools in Rancher for provisioning RKE2 and K3s clusters with the new provisioning framework.

Machine pools are the modern approach to node management in Rancher, used with RKE2 and K3s cluster provisioning. Unlike the legacy node pools used with RKE1, machine pools leverage the Cluster API and provide more flexibility in node lifecycle management. This guide walks through setting up and managing machine pools.

## Prerequisites

- Rancher v2.6 or later
- Cloud credentials configured for your target provider
- Understanding of RKE2 or K3s cluster architecture
- Admin or standard user permissions with cluster creation rights

## Machine Pools vs Node Pools

Machine pools are the next-generation approach to node management in Rancher. While node pools (used with RKE1) rely on Docker Machine, machine pools use the Cluster API framework. This means better support for infrastructure providers, more consistent lifecycle management, and alignment with upstream Kubernetes standards.

## Step 1: Start Creating an RKE2 or K3s Cluster

Begin the cluster creation process:

1. Go to **Cluster Management** and click **Create**.
2. Choose **RKE2** or **K3s** as the Kubernetes distribution.
3. Select your infrastructure provider (Amazon EC2, Azure, vSphere, etc.).
4. Enter the cluster name.

```plaintext
Cluster Name: production-rke2
Kubernetes Version: select a supported Rancher-listed release
```

## Step 2: Create the First Machine Pool

Configure the control plane machine pool:

1. In the **Machine Pools** section, configure the initial pool.
2. Configure it for control plane and etcd roles.

```plaintext
Pool Name: control-plane
Machine Count: 3
Roles: ☑ etcd  ☑ Control Plane  ☐ Worker

Cloud Provider Settings:
  Region: us-east-1
  Instance Type: m5.xlarge
  Root Volume Size: 100 GB
  VPC/Subnet: vpc-xxxxx / subnet-xxxxx
  Security Group: sg-xxxxx
```

## Step 3: Add a Worker Machine Pool

Click **Add Machine Pool** and configure the worker nodes:

```plaintext
Pool Name: workers
Machine Count: 5
Roles: ☐ etcd  ☐ Control Plane  ☑ Worker

Cloud Provider Settings:
  Region: us-east-1
  Instance Type: t3.2xlarge
  Root Volume Size: 200 GB
  VPC/Subnet: vpc-xxxxx / subnet-xxxxx
  Security Group: sg-xxxxx
```

## Step 4: Configure Advanced Machine Pool Options

Set up advanced options for each machine pool:

### Auto Replace and Drain Behavior

Configure automatic replacement and drain behavior:

```plaintext
Auto Replace: 5m
Drain Before Delete: Yes
```

### Cloud-Init / User Data

If your selected infrastructure provider exposes a cloud-init or user-data field, add custom initialization scripts:

```yaml
#cloud-config
package_update: true
packages:
  - nfs-common
  - open-iscsi
write_files:
  - path: /etc/sysctl.d/90-kubelet.conf
    content: |
      vm.max_map_count=262144
      vm.overcommit_memory=1
      vm.panic_on_oom=0
      kernel.panic=10
      kernel.panic_on_oops=1
runcmd:
  - systemctl enable --now iscsid
  - sysctl --system
```

## Step 5: Configure Machine Pool Labels and Taints

Add Kubernetes labels and taints through the machine pool configuration:

```yaml
# Labels

labels:
  pool-zone: us-east-1a
  node-pool: workers
  workload-class: general-purpose

# Taints
taints:
  - key: dedicated
    value: application
    effect: NoSchedule
```

In the Rancher UI:

1. Expand the **Advanced** section of the machine pool.
2. Under **Labels**, add key-value pairs.
3. Under **Taints**, add taint entries with key, value, and effect.

## Step 6: Configure Machine Health Checks

Set up automatic health checking for machine pools:

```yaml
# Machine Health Check configuration
apiVersion: cluster.x-k8s.io/v1beta2
kind: MachineHealthCheck
metadata:
  name: worker-health-check
  namespace: fleet-default
spec:
  clusterName: production-rke2
  selector:
    matchLabels:
      cluster.x-k8s.io/deployment-name: workers
  checks:
    nodeStartupTimeoutSeconds: 600
    unhealthyNodeConditions:
      - type: Ready
        status: "False"
        timeoutSeconds: 300
      - type: Ready
        status: Unknown
        timeoutSeconds: 300
  remediation:
    triggerIf:
      unhealthyLessThanOrEqualTo: 40%
```

## Step 7: Scale Machine Pools

Adjust the number of machines in a pool:

Through the UI:
1. Go to **Cluster Management** and select your cluster.
2. Click **Edit Config**.
3. Change the **Machine Count** for the desired pool.
4. Click **Save**.

Through kubectl:

```bash
# Get the machine deployment
kubectl get machinedeployments -n fleet-default

# Scale a machine deployment
kubectl scale machinedeployment workers \
  --replicas=8 \
  -n fleet-default
```

## Step 8: Rolling Updates for Machine Pools

Update machine configurations with rolling updates:

1. Edit the cluster configuration.
2. Modify the machine pool settings (instance type, disk size, user data, etc.).
3. If you manage the underlying Cluster API `MachineDeployment` directly, set a rolling update strategy.

```yaml
# MachineDeployment rolling update configuration
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
```

This creates new machines with the updated configuration and drains old machines one at a time.

## Step 9: Monitor Machine Pool Status

Track the status of machine pools and individual machines:

```bash
# Check machine deployment status
kubectl get machinedeployments -n fleet-default -o wide

# Check individual machines
kubectl get machines -n fleet-default -o wide

# Get detailed machine status
kubectl describe machine <machine-name> -n fleet-default

# Check machine sets
kubectl get machinesets -n fleet-default
```

Example output:

```plaintext
NAME       CLUSTER            REPLICAS   READY   AVAILABLE   AGE
workers    production-rke2    5          5       5           24h
cp-pool    production-rke2    3          3       3           24h
```

## Step 10: Delete and Recreate Machine Pools

Remove a machine pool from a cluster:

1. Edit the cluster configuration.
2. Click the delete icon next to the machine pool.
3. Click **Save**.

If **Drain Before Delete** is enabled for the pool, Rancher drains the nodes before deleting the machines. Ensure sufficient capacity exists in other pools to handle the displaced workloads.

To recreate a pool with updated specifications:

1. Edit the cluster configuration.
2. Click **Add Machine Pool**.
3. Configure the new pool with updated settings.
4. Click **Save**.

## Multi-Zone Machine Pools

Deploy machine pools across availability zones for high availability:

```plaintext
Pool: workers-us-east-1a
  Count: 3
  Region: us-east-1
  Availability Zone: us-east-1a

Pool: workers-us-east-1b
  Count: 3
  Region: us-east-1
  Availability Zone: us-east-1b

Pool: workers-us-east-1c
  Count: 3
  Region: us-east-1
  Availability Zone: us-east-1c
```

## Best Practices

- **Use RKE2 or K3s for new clusters**: Machine pools with the new provisioning framework offer better lifecycle management than legacy node pools.
- **Separate etcd and control plane pools**: For production, consider using dedicated pools for etcd and control plane even though they can be combined.
- **Implement health checks**: Configure machine health checks to automatically replace failed nodes.
- **Plan for multi-zone deployments**: Distribute machine pools across availability zones for resilience.
- **Use rolling updates**: Always use rolling update strategies when modifying machine pool configurations to maintain availability.

## Conclusion

Machine pools in Rancher bring modern infrastructure management to your Kubernetes clusters. By leveraging the Cluster API framework, machine pools provide consistent lifecycle management, automated health checking, and rolling update capabilities. Whether you are running RKE2 or K3s, machine pools give you the tools to manage your cluster nodes at scale with confidence.
