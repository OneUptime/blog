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

First, create the service account with the necessary permissions:

```bash
# Create IRSA for the CloudWatch agent
eksctl create iamserviceaccount \
  --cluster my-cluster \
  --namespace amazon-cloudwatch \
  --name cloudwatch-agent \
  --attach-policy-arn arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy \
  --approve

# Create IRSA for Fluent Bit
eksctl create iamserviceaccount \
  --cluster my-cluster \
  --namespace amazon-cloudwatch \
  --name fluent-bit \
  --attach-policy-arn arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy \
  --approve
```

Install the Amazon CloudWatch Observability add-on:

```bash
# Install the CloudWatch Observability EKS add-on
aws eks create-addon \
  --cluster-name my-cluster \
  --addon-name amazon-cloudwatch-observability \
  --addon-version v1.5.0-eksbuild.1
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

Create the namespace:

```bash
# Create the CloudWatch namespace
kubectl create namespace amazon-cloudwatch
```

Deploy the CloudWatch Agent as a DaemonSet:

```yaml
# cloudwatch-agent-config.yaml - Agent configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: cwagentconfig
  namespace: amazon-cloudwatch
data:
  cwagentconfig.json: |
    {
      "logs": {
        "metrics_collected": {
          "kubernetes": {
            "cluster_name": "my-cluster",
            "metrics_collection_interval": 60
          }
        },
        "force_flush_interval": 5
      }
    }
```

```yaml
# cloudwatch-agent-daemonset.yaml - CloudWatch Agent DaemonSet
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: cloudwatch-agent
  namespace: amazon-cloudwatch
spec:
  selector:
    matchLabels:
      name: cloudwatch-agent
  template:
    metadata:
      labels:
        name: cloudwatch-agent
    spec:
      serviceAccountName: cloudwatch-agent
      containers:
        - name: cloudwatch-agent
          image: public.ecr.aws/cloudwatch-agent/cloudwatch-agent:1.300032.2b361
          resources:
            limits:
              cpu: 200m
              memory: 200Mi
            requests:
              cpu: 200m
              memory: 200Mi
          env:
            - name: HOST_IP
              valueFrom:
                fieldRef:
                  fieldPath: status.hostIP
            - name: HOST_NAME
              valueFrom:
                fieldRef:
                  fieldPath: spec.nodeName
            - name: K8S_NAMESPACE
              valueFrom:
                fieldRef:
                  fieldPath: metadata.namespace
          volumeMounts:
            - name: cwagentconfig
              mountPath: /etc/cwagentconfig
            - name: rootfs
              mountPath: /rootfs
              readOnly: true
            - name: dockersock
              mountPath: /var/run/docker.sock
              readOnly: true
            - name: varlibdocker
              mountPath: /var/lib/docker
              readOnly: true
            - name: containerdsock
              mountPath: /run/containerd/containerd.sock
              readOnly: true
            - name: sys
              mountPath: /sys
              readOnly: true
            - name: devdisk
              mountPath: /dev/disk
              readOnly: true
      volumes:
        - name: cwagentconfig
          configMap:
            name: cwagentconfig
        - name: rootfs
          hostPath:
            path: /
        - name: dockersock
          hostPath:
            path: /var/run/docker.sock
        - name: varlibdocker
          hostPath:
            path: /var/lib/docker
        - name: containerdsock
          hostPath:
            path: /run/containerd/containerd.sock
        - name: sys
          hostPath:
            path: /sys
        - name: devdisk
          hostPath:
            path: /dev/disk/
      tolerations:
        - operator: Exists
```

```bash
# Deploy the CloudWatch agent
kubectl apply -f cloudwatch-agent-config.yaml
kubectl apply -f cloudwatch-agent-daemonset.yaml

# Verify pods are running on each node
kubectl get pods -n amazon-cloudwatch -l name=cloudwatch-agent
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
  --alarm-name "EKS-PodRestarts-my-cluster" \
  --alarm-description "Alert when pods restart frequently" \
  --metric-name pod_number_of_container_restarts \
  --namespace ContainerInsights \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --dimensions Name=ClusterName,Value=my-cluster \
  --alarm-actions arn:aws:sns:us-west-2:123456789012:ops-alerts
```

## Querying Container Insights Logs

Container Insights stores performance data as structured log events. You can query them with CloudWatch Logs Insights:

```
# Find pods using the most CPU
STATS avg(pod_cpu_utilization) as avg_cpu by PodName
| filter Type = "Pod"
| sort avg_cpu desc
| limit 20
```

```
# Find nodes with high memory pressure
fields NodeName, node_memory_utilization
| filter Type = "Node"
| filter node_memory_utilization > 80
| sort node_memory_utilization desc
```

## Cost Considerations

Container Insights isn't free. You pay for CloudWatch metrics (custom metrics pricing) and CloudWatch Logs (ingestion and storage). In a large cluster, this can add up quickly. Here are ways to manage costs:

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
