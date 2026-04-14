# How to Send Dapr Logs to AWS CloudWatch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, AWS, CloudWatch, Logging, EKS

Description: Learn how to forward Dapr sidecar and application logs to AWS CloudWatch Logs using the CloudWatch Agent or Fluent Bit on Amazon EKS.

---

## Overview

AWS CloudWatch Logs is the standard log management service for workloads running on AWS. For Dapr applications on Amazon EKS, you can ship logs to CloudWatch using the CloudWatch Container Insights add-on or the Fluent Bit DaemonSet with the CloudWatch output plugin.

## Enabling CloudWatch Container Insights on EKS

Enable Container Insights to automatically forward pod logs to CloudWatch:

```bash
# Enable Container Insights using the EKS add-on
aws eks create-addon \
  --cluster-name my-eks-cluster \
  --addon-name amazon-cloudwatch-observability \
  --region us-east-1

# Verify the add-on is active
aws eks describe-addon \
  --cluster-name my-eks-cluster \
  --addon-name amazon-cloudwatch-observability \
  --query "addon.status"
```

## Enabling Dapr JSON Logging

Configure Dapr pods to emit structured JSON logs:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "notification-service"
  dapr.io/app-port: "8080"
  dapr.io/log-as-json: "true"
  dapr.io/log-level: "info"
```

## Using Fluent Bit for Fine-Grained Control

Deploy Fluent Bit with the CloudWatch Logs output plugin for more control over log groups:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
  namespace: amazon-cloudwatch
data:
  fluent-bit.conf: |
    [SERVICE]
        Parsers_File parsers.conf
        Flush 5

    [INPUT]
        Name tail
        Path /var/log/containers/*daprd*.log
        Parser cri
        Tag dapr.sidecar
        DB /var/log/flb_dapr.db
        Mem_Buf_Limit 5MB

    [FILTER]
        Name kubernetes
        Match dapr.*
        Kube_URL https://kubernetes.default.svc:443
        Merge_Log On
        Keep_Log Off
        Labels Off
        Annotations Off

    [OUTPUT]
        Name cloudwatch_logs
        Match dapr.sidecar
        region us-east-1
        log_group_name /eks/dapr/sidecar-logs
        log_stream_prefix dapr-
        log_stream_template $kubernetes['namespace_name']/$kubernetes['pod_name']
        auto_create_group true
```

## IAM Permissions for CloudWatch Logs

Attach the required IAM policy to the EKS node role or Fluent Bit service account:

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
        "logs:DescribeLogStreams"
      ],
      "Resource": "arn:aws:logs:us-east-1:*:log-group:/eks/dapr/*:*"
    }
  ]
}
```

## Querying Dapr Logs with CloudWatch Insights

Use CloudWatch Logs Insights to query Dapr JSON logs:

```sql
-- Error logs from all Dapr sidecars
fields @timestamp, app_id, level, msg
| filter level = "error"
| sort @timestamp desc
| limit 50

-- Error count by Dapr service in 5-minute buckets
fields @timestamp, app_id, level
| filter level = "error"
| stats count(*) as errorCount by app_id, bin(5m)
| sort errorCount desc

-- Circuit breaker activations
fields @timestamp, app_id, msg
| filter msg like /circuit breaker/
| stats count(*) as cbCount by app_id
```

## Setting Up a CloudWatch Alarm

Create a CloudWatch metric alarm to notify on high Dapr error rates:

```bash
# Create a metric filter to count Dapr errors
aws logs put-metric-filter \
  --log-group-name /eks/dapr/sidecar-logs \
  --filter-name DaprErrors \
  --filter-pattern '{ $.level = "error" }' \
  --metric-transformations \
    metricName=DaprErrorCount,metricNamespace=Dapr,metricValue=1

# Create an alarm on the metric
aws cloudwatch put-metric-alarm \
  --alarm-name DaprHighErrorRate \
  --metric-name DaprErrorCount \
  --namespace Dapr \
  --statistic Sum \
  --period 300 \
  --threshold 50 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:dapr-alerts
```

## Summary

Shipping Dapr logs to AWS CloudWatch on EKS can be achieved via the CloudWatch Container Insights add-on for quick setup or Fluent Bit for fine-grained log group control. Enable Dapr JSON logging, configure IAM permissions, and use CloudWatch Logs Insights to query structured log fields. Metric filters and CloudWatch Alarms provide automated alerting for Dapr error conditions.
