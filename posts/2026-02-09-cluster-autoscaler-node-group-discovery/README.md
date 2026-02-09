# How to Use Cluster Autoscaler Node Group Auto-Discovery for Cloud Providers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cluster Autoscaler, Cloud Providers

Description: Configure Cluster Autoscaler node group auto-discovery to automatically detect and manage cloud provider autoscaling groups without manual configuration, simplifying multi-node-group cluster management.

---

Manually configuring Cluster Autoscaler with every node group in your cluster becomes unwieldy as the number of groups grows. Auto-discovery uses cloud provider tags or labels to automatically identify which autoscaling groups should be managed by Cluster Autoscaler. This eliminates manual configuration and makes it easy to add or remove node groups.

Auto-discovery works across major cloud providers including AWS, GCP, and Azure. By tagging your autoscaling groups appropriately, Cluster Autoscaler finds and manages them automatically, scaling each group based on pod resource requirements and constraints.

## Understanding Auto-Discovery

Auto-discovery scans cloud provider APIs for autoscaling groups that match specific tag patterns. When found, Cluster Autoscaler manages these groups without requiring them to be explicitly listed in the configuration. This is particularly valuable for environments with many node groups or where node groups are created and destroyed frequently.

The autoscaler uses cloud provider tags to identify which groups to manage and which cluster they belong to. This allows running multiple clusters in the same cloud account without interference.

## AWS Auto Scaling Group Discovery

Configure auto-discovery for AWS using ASG tags.

First, tag your Auto Scaling Groups with the required tags.

```bash
# Tag ASG for Cluster Autoscaler discovery
aws autoscaling create-or-update-tags \
  --tags \
  "ResourceId=my-node-group,ResourceType=auto-scaling-group,Key=k8s.io/cluster-autoscaler/enabled,Value=true,PropagateAtLaunch=true" \
  "ResourceId=my-node-group,ResourceType=auto-scaling-group,Key=k8s.io/cluster-autoscaler/my-cluster,Value=owned,PropagateAtLaunch=true"

# Repeat for each ASG you want autoscaled
aws autoscaling create-or-update-tags \
  --tags \
  "ResourceId=spot-node-group,ResourceType=auto-scaling-group,Key=k8s.io/cluster-autoscaler/enabled,Value=true,PropagateAtLaunch=true" \
  "ResourceId=spot-node-group,ResourceType=auto-scaling-group,Key=k8s.io/cluster-autoscaler/my-cluster,Value=owned,PropagateAtLaunch=true"
```

Deploy Cluster Autoscaler with auto-discovery configuration.

```yaml
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
      serviceAccountName: cluster-autoscaler
      containers:
      - name: cluster-autoscaler
        image: k8s.gcr.io/autoscaling/cluster-autoscaler:v1.27.0
        command:
        - ./cluster-autoscaler
        - --v=4
        - --cloud-provider=aws
        - --node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/my-cluster
        - --balance-similar-node-groups=true
        - --skip-nodes-with-system-pods=false
        env:
        - name: AWS_REGION
          value: us-east-1
```

The auto-discovery tag pattern finds all ASGs with both the enabled tag and the cluster-specific tag.

## GCP Managed Instance Group Discovery

Configure auto-discovery for GKE using instance group labels.

```bash
# Label MIG for discovery
gcloud compute instance-groups managed update my-node-pool \
  --region=us-central1 \
  --update-labels=k8s-io-cluster-autoscaler-enabled=true,k8s-io-cluster-autoscaler-my-cluster=owned
```

Deploy Cluster Autoscaler with GCP auto-discovery.

```yaml
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
      serviceAccountName: cluster-autoscaler
      containers:
      - name: cluster-autoscaler
        image: k8s.gcr.io/autoscaling/cluster-autoscaler:v1.27.0
        command:
        - ./cluster-autoscaler
        - --v=4
        - --cloud-provider=gce
        - --node-group-auto-discovery=mig:name_prefix=gke-my-cluster-,label=k8s-io-cluster-autoscaler-enabled=true
        env:
        - name: GCE_PROJECT
          value: my-project
        - name: GCE_ZONE
          value: us-central1-a
```

This discovers all MIGs with names starting with the cluster prefix and the enabled label.

## Azure Virtual Machine Scale Set Discovery

Configure auto-discovery for AKS using VMSS tags.

```bash
# Tag VMSS for discovery
az vmss update \
  --resource-group my-resource-group \
  --name my-node-pool \
  --set tags.k8s-io-cluster-autoscaler-enabled=true \
  --set tags.k8s-io-cluster-autoscaler-my-cluster=owned
```

Deploy Cluster Autoscaler with Azure auto-discovery.

```yaml
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
      serviceAccountName: cluster-autoscaler
      containers:
      - name: cluster-autoscaler
        image: k8s.gcr.io/autoscaling/cluster-autoscaler:v1.27.0
        command:
        - ./cluster-autoscaler
        - --v=4
        - --cloud-provider=azure
        - --node-group-auto-discovery=label:cluster-autoscaler-enabled=true,cluster-autoscaler-name=my-cluster
        env:
        - name: ARM_SUBSCRIPTION_ID
          value: subscription-id
        - name: ARM_RESOURCE_GROUP
          value: my-resource-group
```

## Multi-Cluster Discovery

Run multiple clusters in the same cloud account using different cluster names.

```bash
# Cluster 1 ASGs
aws autoscaling create-or-update-tags \
  --tags \
  "ResourceId=cluster1-nodes,ResourceType=auto-scaling-group,Key=k8s.io/cluster-autoscaler/cluster-1,Value=owned,PropagateAtLaunch=true"

# Cluster 2 ASGs
aws autoscaling create-or-update-tags \
  --tags \
  "ResourceId=cluster2-nodes,ResourceType=auto-scaling-group,Key=k8s.io/cluster-autoscaler/cluster-2,Value=owned,PropagateAtLaunch=true"
```

Each cluster's autoscaler only manages ASGs tagged with its specific cluster name.

```yaml
# Cluster 1 autoscaler
command:
- --node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/cluster-1

# Cluster 2 autoscaler
command:
- --node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/cluster-2
```

## Filtering by Additional Tags

Use multiple tag conditions to filter discovered node groups.

```yaml
command:
- ./cluster-autoscaler
- --node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/my-cluster,environment=production
```

This only discovers ASGs tagged with all three conditions, allowing separate autoscaling for different environments.

## Verifying Auto-Discovery

Check which node groups were discovered.

```bash
# View Cluster Autoscaler logs
kubectl logs -n kube-system deployment/cluster-autoscaler | \
  grep -i "discovered"

# Check for specific node groups
kubectl logs -n kube-system deployment/cluster-autoscaler | \
  grep -i "node group"

# View autoscaler status
kubectl get configmap cluster-autoscaler-status -n kube-system -o yaml
```

Logs show which node groups were discovered and any that were rejected due to missing tags.

## Dynamic Node Group Addition

Add new node groups without restarting Cluster Autoscaler.

```bash
# Create new ASG with proper tags
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name new-node-group \
  --launch-template LaunchTemplateName=my-template \
  --min-size 0 \
  --max-size 10 \
  --desired-capacity 0 \
  --tags \
  "ResourceId=new-node-group,ResourceType=auto-scaling-group,Key=k8s.io/cluster-autoscaler/enabled,Value=true,PropagateAtLaunch=true" \
  "ResourceId=new-node-group,ResourceType=auto-scaling-group,Key=k8s.io/cluster-autoscaler/my-cluster,Value=owned,PropagateAtLaunch=true"

# Cluster Autoscaler discovers it automatically on next scan
```

The autoscaler periodically scans for new groups matching the discovery pattern.

## Setting Node Group Limits

Configure min and max sizes through cloud provider APIs.

```bash
# AWS: Set ASG limits
aws autoscaling update-auto-scaling-group \
  --auto-scaling-group-name my-node-group \
  --min-size 1 \
  --max-size 50

# GCP: Set MIG limits
gcloud compute instance-groups managed set-autoscaling my-node-pool \
  --region=us-central1 \
  --min-num-replicas=1 \
  --max-num-replicas=50

# Azure: Set VMSS limits
az vmss update \
  --resource-group my-resource-group \
  --name my-node-pool \
  --set sku.capacity=1
```

Cluster Autoscaler respects these limits when scaling node groups.

## Monitoring Discovered Node Groups

Track which groups are active and their status.

```bash
# List all discovered node groups
kubectl logs -n kube-system deployment/cluster-autoscaler | \
  grep "Registered node group"

# Check node group sizes
aws autoscaling describe-auto-scaling-groups \
  --query 'AutoScalingGroups[?Tags[?Key==`k8s.io/cluster-autoscaler/enabled` && Value==`true`]].[AutoScalingGroupName,MinSize,MaxSize,DesiredCapacity]' \
  --output table

# View nodes per group
kubectl get nodes -o json | \
  jq -r '.items[] | .metadata.labels["alpha.eksctl.io/nodegroup-name"]' | \
  sort | uniq -c
```

## Handling Discovery Failures

Debug issues with node group discovery.

```bash
# Check for discovery errors
kubectl logs -n kube-system deployment/cluster-autoscaler | \
  grep -i error

# Verify IAM permissions for cloud API access
kubectl logs -n kube-system deployment/cluster-autoscaler | \
  grep -i "permission\|denied\|unauthorized"

# Check tag configuration on ASGs
aws autoscaling describe-auto-scaling-groups \
  --query 'AutoScalingGroups[].[AutoScalingGroupName,Tags]' \
  --output table
```

Common issues include missing IAM permissions, incorrect tag names, or tag values that don't match the discovery pattern.

## Best Practices

Use consistent tag naming across all node groups. This makes discovery patterns simpler and reduces configuration errors.

Include the cluster name in discovery tags to prevent cross-cluster interference when running multiple clusters in the same account.

Set reasonable min and max sizes on autoscaling groups before enabling auto-discovery. This prevents runaway scaling if configuration is incorrect.

Monitor Cluster Autoscaler logs after enabling auto-discovery to verify all expected node groups were found and are being managed.

Document your tag naming conventions and discovery patterns so team members understand how to create new node groups that will be automatically discovered.

## Limitations

Auto-discovery has a scan interval, so newly created node groups may not be discovered immediately. The default scan interval is 10 minutes.

Changes to node group tags require the autoscaler to re-scan, which may delay recognition of tag changes.

Complex tag filtering patterns can make it difficult to understand which node groups will be discovered without checking logs.

## Conclusion

Cluster Autoscaler node group auto-discovery simplifies managing multiple node groups by eliminating manual configuration. By properly tagging your cloud provider autoscaling groups, you enable Cluster Autoscaler to automatically find and manage them without requiring deployment updates.

Auto-discovery is especially valuable in dynamic environments where node groups are frequently added or removed, or in large clusters with many specialized node groups. Combined with appropriate tagging strategies and monitoring, auto-discovery provides a maintainable, scalable approach to cluster autoscaling configuration.
