# How to Set Up Container Insights for EKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EKS, Kubernetes, Monitoring, CloudWatch

Description: Learn how to set up Amazon CloudWatch Container Insights on EKS for comprehensive monitoring of cluster metrics, pod performance, and container logs.

---

CloudWatch Container Insights gives you a pre-built monitoring dashboard for your EKS cluster without the overhead of managing your own Prometheus stack. It collects metrics at the cluster, node, pod, and container level - CPU usage, memory, disk I/O, network traffic - and ships everything to CloudWatch where you can build dashboards, set alarms, and run queries.

It's not as flexible as a full [Prometheus and Grafana](https://oneuptime.com/blog/post/2026-02-12-set-up-prometheus-and-grafana-on-eks/view) setup, but it's much simpler to configure and maintain. For many teams, especially those already invested in the AWS ecosystem, it's the right choice.

## What Container Insights Collects

Container Insights captures metrics from two sources:

- **CloudWatch Agent** - collects infrastructure metrics (CPU, memory, disk, network) at the node, pod, and container level
- **Fluent Bit** - collects application logs from container stdout/stderr

The metrics are stored as CloudWatch metrics in the `ContainerInsights` namespace, and logs go to CloudWatch Log Groups. Together, they give you visibility into both what's happening and why.

## Prerequisites

You'll need:

- An EKS cluster with nodes running
- kubectl configured for your cluster
- An OIDC provider set up for IRSA (see our [IRSA guide](https://oneuptime.com/blog/post/2026-02-12-set-up-iam-roles-for-eks-service-accounts-irsa/view))

## Method 1: Using the EKS Add-on (Recommended)

The easiest way to enable Container Insights is through the EKS managed add-on. This approach keeps the agent updated automatically.

First, create the IAM role that the add-on's CloudWatch agent service account will use:

```bash
# Create the OIDC provider if your cluster doesn't already have one
eksctl utils associate-iam-oidc-provider \
  --cluster my-cluster \
  --approve

# Create the IAM role for the CloudWatch agent service account
eksctl create iamserviceaccount \
  --name cloudwatch-agent \
  --cluster my-cluster \
  --namespace amazon-cloudwatch \
  --role-name CloudWatchAgentServerRole \
  --attach-policy-arn arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy \
  --role-only \
  --approve
```

Install the Amazon CloudWatch Observability add-on:

```bash
# Install the CloudWatch Observability EKS add-on
aws eks create-addon \
  --cluster-name my-cluster \
  --addon-name amazon-cloudwatch-observability \
  --service-account-role-arn arn:aws:iam::123456789012:role/CloudWatchAgentServerRole
```

Check the add-on status:

```bash
# Verify the add-on is active
aws eks describe-addon --cluster-name my-cluster \
  --addon-name amazon-cloudwatch-observability \
  --query "addon.status"
```

## Method 2: Manual Installation with Helm

If you prefer more control over the configuration, install manually.

Make sure the CloudWatch agent has permission to publish metrics and logs. One option is to attach the managed policy to your worker node IAM role:

```bash
# Allow CloudWatch agent pods to publish metrics and logs
aws iam attach-role-policy \
  --role-name my-worker-node-role \
  --policy-arn arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy
```

Install the official CloudWatch Observability Helm chart:

```bash
# Add the AWS observability Helm repository
helm repo add aws-observability https://aws-observability.github.io/helm-charts
helm repo update aws-observability

# Install the CloudWatch Observability chart
helm install --wait --create-namespace \
  --namespace amazon-cloudwatch \
  amazon-cloudwatch-observability \
  aws-observability/amazon-cloudwatch-observability \
  --set clusterName=my-cluster \
  --set region=us-west-2
```

Check that the CloudWatch agent and Fluent Bit pods are running:

```bash
kubectl get pods -n amazon-cloudwatch
```

## Viewing Container Insights Data

Once the agent is running, head to the CloudWatch console. Navigate to Container Insights under the Insights section. You'll see pre-built views for:

- **Cluster level** - overall CPU/memory utilization, number of nodes, pod counts
- **Node level** - per-node resource usage, filesystem utilization
- **Pod level** - individual pod resource consumption, restart counts
- **Container level** - container-specific metrics

## Setting Up Alarms

Create CloudWatch alarms based on Container Insights metrics to get notified when things go wrong:

```bash
# Create an alarm for high cluster CPU utilization
aws cloudwatch put-metric-alarm \
  --alarm-name "EKS-HighCPU-my-cluster" \
  --alarm-description "Alert when cluster CPU exceeds 80%" \
  --metric-name node_cpu_utilization \
  --namespace ContainerInsights \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 3 \
  --dimensions Name=ClusterName,Value=my-cluster \
  --alarm-actions arn:aws:sns:us-west-2:123456789012:ops-alerts
```

```bash
# Create an alarm for pod restart counts
aws cloudwatch put-metric-alarm \
  --alarm-name "EKS-PodRestarts-my-cluster-my-pod" \
  --alarm-description "Alert when my-pod restarts frequently" \
  --metric-name pod_number_of_container_restarts \
  --namespace ContainerInsights \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --dimensions Name=ClusterName,Value=my-cluster Name=Namespace,Value=default Name=PodName,Value=my-pod \
  --alarm-actions arn:aws:sns:us-west-2:123456789012:ops-alerts
```

## Querying Container Insights Logs

Container Insights stores performance data as structured log events. You can query them with CloudWatch Logs Insights:

```text
# Find pods using the most CPU
filter Type = "Pod"
| stats avg(pod_cpu_utilization) as avg_cpu by PodName
| sort avg_cpu desc
| limit 20
```

```text
# Find nodes with high memory pressure
fields NodeName, node_memory_utilization
| filter Type = "Node"
| filter node_memory_utilization > 80
| sort node_memory_utilization desc
```

## Cost Considerations

Container Insights isn't free. With Container Insights with enhanced observability for EKS, you pay for Container Insights observations and CloudWatch Logs usage. Older Container Insights setups are charged as custom metrics and logs. In a large cluster, this can add up quickly. Here are ways to manage costs:

- Reduce the `metrics_collection_interval` to collect less frequently
- Set log retention policies to avoid storing data indefinitely
- Filter out noisy or low-value log streams in Fluent Bit
- Consider using [Prometheus](https://oneuptime.com/blog/post/2026-02-12-set-up-prometheus-and-grafana-on-eks/view) for metrics if costs become prohibitive

```bash
# Set log retention for Container Insights logs
aws logs put-retention-policy \
  --log-group-name /aws/containerinsights/my-cluster/performance \
  --retention-in-days 14
```

For a deeper dive into cost optimization, see our guide on [monitoring EKS costs](https://oneuptime.com/blog/post/2026-02-12-monitor-eks-costs-and-optimize-spending/view).

## Verifying Data Collection

After setup, verify that metrics are flowing:

```bash
# Check that Container Insights metrics are being published
aws cloudwatch list-metrics --namespace ContainerInsights \
  --dimensions Name=ClusterName,Value=my-cluster \
  --query "Metrics[0:5].MetricName"
```

You should see metrics like `node_cpu_utilization`, `pod_memory_utilization`, and `node_filesystem_utilization`.

Container Insights gives you a solid observability foundation on EKS with minimal setup effort. It's not the most powerful monitoring solution out there, but it works well and integrates seamlessly with the rest of AWS.
