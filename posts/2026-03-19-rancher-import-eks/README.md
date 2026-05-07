# How to Import an EKS Cluster into Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, EKS, Cluster Management

Description: A practical guide to importing an existing Amazon EKS cluster into Rancher for unified multi-cluster management.

Amazon EKS is one of the most popular managed Kubernetes services. Importing your EKS clusters into Rancher gives you a unified management plane across all your clusters, enhanced RBAC, and integrated monitoring. This guide walks you through the process of importing an existing EKS cluster into Rancher.

## Prerequisites

- A running Rancher installation (v2.7 or later)
- An existing EKS cluster in AWS
- At least one EKS managed node group
- AWS CLI configured with appropriate permissions
- `kubectl` installed and configured for the EKS cluster
- Network connectivity from the EKS cluster to the Rancher server

## Step 1: Configure kubectl for the EKS Cluster

If you have not already configured kubectl for your EKS cluster, update your kubeconfig:

```bash
aws eks update-kubeconfig --name <EKS_CLUSTER_NAME> --region <REGION>
```

Verify access:

```bash
kubectl get nodes
kubectl cluster-info
```

## Step 2: Verify IAM Permissions

Your AWS IAM user or role needs enough AWS permissions for the workflow you plan to use in Rancher:

- For basic cluster discovery, Rancher needs to be able to list and describe EKS clusters.
- If you want Rancher to manage cluster settings, node groups, or upgrades after registration, use AWS credentials that satisfy Rancher's documented minimum EKS permissions.

The user running `kubectl` must have `cluster-admin` privileges in the EKS cluster. On modern EKS clusters, grant this with an EKS access entry. On older clusters, a legacy `aws-auth` ConfigMap mapping also works.

Check your identity:

```bash
aws sts get-caller-identity
```

Verify you have cluster-admin access:

```bash
kubectl auth can-i '*' '*' --all-namespaces
```

## Step 3: Import the EKS Cluster in Rancher

### Option A: Import as an EKS Cluster

If your Rancher version exposes Amazon EKS as an import type, this option lets Rancher treat the cluster as a hosted EKS cluster and sync its upstream state.

1. Log in to the Rancher UI
2. Go to **Cluster Management**
3. Click **Import Existing**
4. Select **Amazon EKS**

### Configure AWS Credentials

Create a cloud credential in Rancher with AWS credentials that can access the target cluster.

1. Go to **Cluster Management > Cloud Credentials**
2. Click **Create**
3. Select **Amazon**
4. Enter your AWS Access Key and Secret Key
5. Save the credential

### Select the Cluster

After configuring credentials:

1. Select the AWS region where your EKS cluster is running
2. Rancher will list available EKS clusters
3. Select the cluster you want to import
4. Click **Register**

### Option B: Import as a Generic Cluster

If your Rancher setup does not expose a dedicated EKS import flow, or if you only need standard imported-cluster features:

1. Go to **Cluster Management**
2. Click **Import Existing**
3. Select **Generic**
4. Name the cluster
5. Copy the generated kubectl command

Run the exact `kubectl` command Rancher generates for your cluster on a machine where kubeconfig points at the EKS cluster.

## Step 4: Wait for the Import to Complete

The import process deploys the Rancher cluster agent into the EKS cluster:

```bash
kubectl get pods -n cattle-system -l app=cattle-cluster-agent -w
```

In the Rancher UI, watch the cluster status move from `Pending` to `Active`.

## Step 5: Verify the Import

Once the cluster is Active:

```bash
# Check agent status

kubectl get pods -n cattle-system -l app=cattle-cluster-agent

# Verify all nodes are visible in Rancher
kubectl get nodes
```

In the Rancher UI:

- Click on the imported EKS cluster
- Verify the cluster dashboard shows correct node count and Kubernetes version
- If the cluster was imported as an EKS cluster, verify Rancher has synchronized the hosted-cluster configuration

## Step 6: Configure EKS-Specific Settings

When imported as an EKS cluster, Rancher provides the same EKS management options it exposes for EKS clusters created from Rancher:

### View EKS Configuration

Navigate to the cluster and check the EKS configuration tab to see:

- Node groups and their configurations
- Kubernetes version
- VPC and subnet configuration
- Logging settings

### Manage Node Groups

From Rancher, managed node group settings are handled through the cluster configuration rather than the **Nodes** view:

1. Open the EKS cluster in Rancher
2. Edit the cluster configuration
3. Review or update managed node group settings such as desired, minimum, and maximum size

### Upgrade Kubernetes Version

If the cluster was imported as an EKS type, you can trigger Kubernetes version upgrades from Rancher:

1. Go to the cluster configuration
2. Select a new Kubernetes version
3. Save the changes

After you start managing cluster settings through Rancher, continue making those changes through Rancher rather than changing the same fields separately in the EKS console.

## Step 7: Set Up Monitoring and Logging

Install the Rancher monitoring stack for unified observability:

1. Navigate to the EKS cluster in Rancher
2. Go to **Cluster Tools** or **Apps > Charts** (depending on Rancher version)
3. Install the `rancher-monitoring` chart

For logging, you can also enable EKS control plane logging through the cluster configuration or install the Rancher logging operator.

## Step 8: Configure RBAC

Set up access control for the imported cluster:

1. Go to **Cluster Members**
2. Add users or groups with roles like Cluster Owner or Cluster Member
3. Create projects to organize namespaces

Rancher's RBAC works alongside EKS IAM-based authentication. Users can authenticate through Rancher or directly through AWS IAM.

## Networking Considerations

### VPC Configuration

Ensure the EKS cluster can reach the Rancher server URL on port 443. If the EKS API endpoint is private-only or restricted by CIDR, Rancher must also have network access to that endpoint. If Rancher is in a different VPC, set up VPC peering, a transit gateway, or another private network path.

### Security Groups

The EKS worker nodes need outbound HTTPS access to Rancher. If Rancher is managing the cluster as EKS and the API endpoint is private, ensure the relevant security groups also allow Rancher to reach the cluster API endpoint.

### Private EKS Clusters

For private EKS clusters with no public endpoint:

1. Ensure Rancher can reach the EKS API endpoint through VPC peering, a VPN, or shared private networking
2. The Rancher agents inside the EKS cluster must be able to reach the Rancher server URL
3. You may need to configure proxy settings on the agents

## Troubleshooting

- **Import fails with permissions error**: Verify the AWS credentials Rancher is using can access the cluster, and that the IAM principal is authorized in the cluster. Prefer EKS access entries on modern clusters; use the legacy `aws-auth` ConfigMap only when required.
- **Agent cannot connect to Rancher**: Check VPC security groups and network ACLs. Verify outbound HTTPS is allowed and review `cattle-cluster-agent` logs.
- **Cluster shows as Unavailable**: Check agent logs with `kubectl logs -l app=cattle-cluster-agent -n cattle-system`.
- **EKS details not visible**: Make sure the cluster is registered as EKS in Rancher and that the cloud credential has the permissions Rancher needs to sync the hosted cluster state.

## Conclusion

Importing EKS clusters into Rancher gives you centralized management across your AWS Kubernetes infrastructure and any other clusters you manage. When Rancher registers the cluster as EKS, you get deeper integration for hosted-cluster settings such as node groups and version upgrades, while the generic import works for basic management needs. Once imported, you benefit from Rancher's unified RBAC, monitoring, and multi-cluster management capabilities.
