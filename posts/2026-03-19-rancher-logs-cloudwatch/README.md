# How to Send Logs to CloudWatch from Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Logging, CloudWatch

Description: Configure Rancher to send Kubernetes cluster logs to Amazon CloudWatch Logs for centralized log management on AWS.

Amazon CloudWatch Logs is a fully managed log management service that integrates natively with AWS infrastructure. If your Kubernetes clusters run on AWS, sending logs to CloudWatch provides seamless integration with other AWS services like CloudWatch Alarms, Lambda, and CloudWatch Logs Insights. This guide covers configuring Rancher's logging stack to forward logs to CloudWatch.

## Prerequisites

- Rancher v2.6 or later with the Logging chart installed.
- An AWS account with CloudWatch Logs access.
- IAM credentials or an IAM role with `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents`, `logs:DescribeLogGroups`, and `logs:DescribeLogStreams` permissions.
- Cluster admin permissions.

## Step 1: Create IAM Policy

Create an IAM policy for CloudWatch Logs access:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLogGroups",
        "logs:DescribeLogStreams"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```

Attach this policy to an IAM user or role.

## Step 2: Create AWS Credentials Secret

If using IAM access keys:

```bash
kubectl create secret generic aws-credentials \
  --namespace cattle-logging-system \
  --from-literal=aws-access-key-id='AKIAIOSFODNN7EXAMPLE' \
  --from-literal=aws-secret-access-key='wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
```

If running on EKS with IAM Roles for Service Accounts (IRSA), you can skip this step and use the service account annotation instead.

## Step 3: Create a ClusterOutput for CloudWatch

### Using IAM Access Keys

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterOutput
metadata:
  name: cloudwatch-output
  namespace: cattle-logging-system
spec:
  cloudwatch:
    region: us-east-1
    log_group_name: /kubernetes/production-cluster
    auto_create_stream: true
    log_stream_name: "${tag}"
    aws_key_id:
      valueFrom:
        secretKeyRef:
          name: aws-credentials
          key: aws-access-key-id
    aws_sec_key:
      valueFrom:
        secretKeyRef:
          name: aws-credentials
          key: aws-secret-access-key
    buffer:
      type: file
      path: /buffers/cloudwatch
      chunk_limit_size: 2MB
      total_limit_size: 2GB
      flush_interval: 5s
      flush_thread_count: 2
      retry_max_interval: 60
      retry_forever: true
```

### Using IRSA (EKS)

First, annotate the Fluentd service account and restart the Fluentd StatefulSet so the pods pick up the IRSA environment variables:

```bash
kubectl annotate serviceaccount -n cattle-logging-system rancher-logging-root-fluentd \
  eks.amazonaws.com/role-arn=arn:aws:iam::123456789012:role/FluentdCloudWatchRole

kubectl rollout restart statefulset/rancher-logging-root-fluentd -n cattle-logging-system
```

Then use a simpler output configuration:

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterOutput
metadata:
  name: cloudwatch-output
  namespace: cattle-logging-system
spec:
  cloudwatch:
    region: us-east-1
    log_group_name: /kubernetes/production-cluster
    auto_create_stream: true
    log_stream_name: "${tag}"
    use_tag_as_stream: false
    buffer:
      type: file
      path: /buffers/cloudwatch
      chunk_limit_size: 2MB
      flush_interval: 5s
      retry_forever: true
```

## Step 4: Create a ClusterFlow

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterFlow
metadata:
  name: all-to-cloudwatch
  namespace: cattle-logging-system
spec:
  filters:
    - parser:
        parse:
          type: json
        key_name: log
        reserve_data: true
        remove_key_name_field: true
        suppress_parse_error_log: true

  globalOutputRefs:
    - cloudwatch-output
```

## Step 5: Organize Logs by Log Group and Stream

### Separate Log Groups per Namespace

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: ClusterOutput
metadata:
  name: cloudwatch-per-namespace
  namespace: cattle-logging-system
spec:
  cloudwatch:
    region: us-east-1
    log_group_name: "/kubernetes/${$.kubernetes.namespace_name}"
    log_stream_name: "${$.kubernetes.pod_name}"
    auto_create_stream: true
    aws_key_id:
      valueFrom:
        secretKeyRef:
          name: aws-credentials
          key: aws-access-key-id
    aws_sec_key:
      valueFrom:
        secretKeyRef:
          name: aws-credentials
          key: aws-secret-access-key
    buffer:
      type: file
      tags: "$.kubernetes.namespace_name,$.kubernetes.pod_name"
      path: /buffers/cloudwatch-ns
      chunk_limit_size: 2MB
      flush_interval: 5s
      retry_forever: true
```

### Use Tag as Stream Name

```yaml
spec:
  cloudwatch:
    log_group_name: /kubernetes/cluster-logs
    use_tag_as_stream: true
```

## Step 6: Configure Log Retention

CloudWatch Logs retention is configured on the log group level in AWS, not in Rancher. Use the AWS CLI:

```bash
aws logs put-retention-policy \
  --log-group-name /kubernetes/production-cluster \
  --retention-in-days 30
```

Common retention periods: 1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1096, 1827, 2192, 2557, 2922, 3288, 3653 days.

## Step 7: Configure CloudWatch Logs Insights

After logs are flowing to CloudWatch, use CloudWatch Logs Insights for querying:

```text
# Find error logs

fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 50

# Count errors by namespace
fields @timestamp, kubernetes.namespace_name
| filter @message like /ERROR/
| stats count(*) as error_count by kubernetes.namespace_name

# Find OOMKilled events
fields @timestamp, @message
| filter @message like /OOMKilled/
| sort @timestamp desc
```

## Step 8: Set Up CloudWatch Alarms

Create alarms based on log patterns:

```bash
# Create a metric filter for errors
aws logs put-metric-filter \
  --log-group-name /kubernetes/production-cluster \
  --filter-name ErrorCount \
  --filter-pattern "ERROR" \
  --metric-transformations \
    metricName=KubernetesErrors,metricNamespace=Custom/Kubernetes,metricValue=1

# Create an alarm
aws cloudwatch put-metric-alarm \
  --alarm-name KubernetesHighErrorRate \
  --metric-name KubernetesErrors \
  --namespace Custom/Kubernetes \
  --statistic Sum \
  --period 300 \
  --threshold 100 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:ops-alerts
```

## Step 9: Verify Log Delivery

Check Fluentd logs:

```bash
kubectl logs -n cattle-logging-system -l app.kubernetes.io/name=fluentd -c fluentd | grep -i cloudwatch
```

Verify in AWS Console:
1. Open the CloudWatch Console.
2. Go to **Logs > Log groups**.
3. Find your log group and verify log streams are present.
4. Click a log stream to see recent log events.

Or via AWS CLI:

```bash
aws logs get-log-events \
  --log-group-name /kubernetes/production-cluster \
  --log-stream-name '<replace-with-an-actual-stream-name>' \
  --limit 10
```

## Troubleshooting

- **Access denied**: Verify IAM permissions. Check the policy allows the required actions.
- **Region mismatch**: Ensure the region in the output matches your CloudWatch region.
- **Throttling**: CloudWatch has API rate limits. Increase `flush_interval` to reduce API calls.
- **Log group not created**: Verify `auto_create_stream: true` or create the log group manually.
- **IRSA not working**: Check the service account annotation and IAM role trust policy. If you added the annotation after Fluentd was already running, restart the `rancher-logging-root-fluentd` StatefulSet so new pods receive the IRSA environment variables.

## Summary

Sending logs to CloudWatch from Rancher involves configuring a ClusterOutput with AWS credentials (or IRSA) and CloudWatch settings. Organize logs using log groups per namespace and streams per pod. Use CloudWatch Logs Insights for querying and CloudWatch Alarms for alerting on log patterns. Configure retention policies on the AWS side to manage storage costs.
