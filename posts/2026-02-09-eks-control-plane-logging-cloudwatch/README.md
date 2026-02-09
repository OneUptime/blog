# How to Enable EKS Control Plane Logging and Send to CloudWatch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, AWS, EKS, CloudWatch, Observability

Description: Learn how to enable and configure Amazon EKS control plane logging to CloudWatch for debugging, auditing, and monitoring Kubernetes API server activities.

---

Amazon EKS control plane logging captures detailed logs from Kubernetes components like the API server, controller manager, scheduler, and authenticator. These logs provide visibility into cluster operations, authentication attempts, and API requests. Sending these logs to CloudWatch Logs enables centralized monitoring, alerting, and compliance reporting.

## Understanding EKS Control Plane Log Types

EKS offers five types of control plane logs, each serving different purposes:

**API Server Logs**: Records all API requests to the Kubernetes API server, including who made the request, what resource was accessed, and the response. Essential for audit trails and debugging permission issues.

**Audit Logs**: Captures a chronological record of security-relevant events, tracking user activities and policy violations. Required for compliance in regulated environments.

**Authenticator Logs**: Shows authentication attempts using AWS IAM credentials, helpful for troubleshooting access issues and detecting unauthorized access attempts.

**Controller Manager Logs**: Contains output from the controller manager, which manages core control loops like replication controllers and service endpoints.

**Scheduler Logs**: Records pod scheduling decisions, including why pods were placed on specific nodes or why they remain unscheduled.

You can enable any combination of these log types based on your monitoring and compliance needs.

## Enabling Control Plane Logging

Enable control plane logging through the AWS CLI, console, or infrastructure as code tools. Here's how to enable all log types:

```bash
# Enable all control plane log types
aws eks update-cluster-config \
  --name production-cluster \
  --logging '{"clusterLogging":[{"types":["api","audit","authenticator","controllerManager","scheduler"],"enabled":true}]}' \
  --region us-east-1

# Check logging status
aws eks describe-cluster \
  --name production-cluster \
  --query 'cluster.logging' \
  --region us-east-1
```

The update takes a few minutes to apply. EKS creates a CloudWatch log group automatically at /aws/eks/production-cluster/cluster.

For selective logging, specify only the types you need:

```bash
# Enable only API server and audit logs
aws eks update-cluster-config \
  --name production-cluster \
  --logging '{"clusterLogging":[{"types":["api","audit"],"enabled":true}]}' \
  --region us-east-1
```

This approach reduces log volume and costs while still capturing essential audit information.

## Configuring CloudWatch Log Group Settings

EKS creates the log group automatically, but you should configure retention and encryption:

```bash
# Set log retention to 30 days
aws logs put-retention-policy \
  --log-group-name /aws/eks/production-cluster/cluster \
  --retention-in-days 30 \
  --region us-east-1

# Enable encryption with KMS
aws logs associate-kms-key \
  --log-group-name /aws/eks/production-cluster/cluster \
  --kms-key-id arn:aws:kms:us-east-1:123456789012:key/abcd-1234 \
  --region us-east-1
```

Default retention is indefinite, which can become expensive. Setting appropriate retention balances compliance requirements with cost management.

For high-security environments, encrypt logs with a customer-managed KMS key:

```bash
# Create KMS key for log encryption
aws kms create-key \
  --description "EKS control plane logs encryption" \
  --region us-east-1

# Add key policy allowing CloudWatch to use it
aws kms put-key-policy \
  --key-id arn:aws:kms:us-east-1:123456789012:key/abcd-1234 \
  --policy-name default \
  --policy file://kms-policy.json \
  --region us-east-1
```

The KMS policy must grant CloudWatch Logs permission to encrypt and decrypt:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "Allow CloudWatch Logs",
      "Effect": "Allow",
      "Principal": {
        "Service": "logs.amazonaws.com"
      },
      "Action": [
        "kms:Encrypt",
        "kms:Decrypt",
        "kms:ReEncrypt*",
        "kms:GenerateDataKey*",
        "kms:CreateGrant",
        "kms:DescribeKey"
      ],
      "Resource": "*",
      "Condition": {
        "ArnLike": {
          "kms:EncryptionContext:aws:logs:arn": "arn:aws:logs:us-east-1:123456789012:log-group:/aws/eks/*"
        }
      }
    }
  ]
}
```

## Querying API Server Logs

API server logs contain detailed information about every Kubernetes API request. Use CloudWatch Logs Insights to query specific activities:

```sql
# Find all pod creations in the last hour
fields @timestamp, requestURI, user.username, responseStatus.code
| filter verb == "create" and objectRef.resource == "pods"
| sort @timestamp desc
| limit 100
```

This query shows who created pods and whether the requests succeeded (status code 201) or failed.

Track failed authentication attempts:

```sql
# Identify failed auth attempts
fields @timestamp, user.username, sourceIPs, responseStatus.code, responseStatus.message
| filter responseStatus.code >= 400 and responseStatus.code < 500
| stats count() by user.username, responseStatus.code
```

High failure rates might indicate misconfigured service accounts or potential security issues.

Monitor specific resource modifications:

```sql
# Track ConfigMap and Secret changes
fields @timestamp, verb, objectRef.namespace, objectRef.name, user.username
| filter objectRef.resource in ["configmaps", "secrets"]
| filter verb in ["create", "update", "delete", "patch"]
| sort @timestamp desc
```

This helps audit configuration changes and identify who modified sensitive resources.

## Analyzing Audit Logs

Audit logs provide security-focused event tracking. They follow the Kubernetes audit policy and capture more detailed information than API server logs:

```sql
# Find privileged pod creations
fields @timestamp, user.username, objectRef.name, objectRef.namespace
| filter objectRef.resource == "pods" and verb == "create"
| filter requestObject.spec.containers.0.securityContext.privileged == true
```

Track role and rolebinding changes to monitor permission modifications:

```sql
# Monitor RBAC changes
fields @timestamp, verb, objectRef.resource, objectRef.name, user.username
| filter objectRef.resource in ["roles", "rolebindings", "clusterroles", "clusterrolebindings"]
| filter verb in ["create", "update", "delete", "patch"]
| sort @timestamp desc
```

Unexpected RBAC changes could indicate privilege escalation attempts or misconfigurations.

## Setting Up CloudWatch Alarms

Create alarms for important events detected in control plane logs. Use metric filters to extract patterns and trigger alarms:

```bash
# Create metric filter for failed API calls
aws logs put-metric-filter \
  --log-group-name /aws/eks/production-cluster/cluster \
  --filter-name FailedAPICallsFilter \
  --filter-pattern '{ $.responseStatus.code >= 400 }' \
  --metric-transformations \
    metricName=FailedAPICalls,metricNamespace=EKS/ControlPlane,metricValue=1 \
  --region us-east-1

# Create alarm on metric
aws cloudwatch put-metric-alarm \
  --alarm-name eks-failed-api-calls-high \
  --alarm-description "Alert when failed API calls exceed threshold" \
  --metric-name FailedAPICalls \
  --namespace EKS/ControlPlane \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 100 \
  --comparison-operator GreaterThanThreshold \
  --region us-east-1
```

This alarm triggers when failed API calls exceed 100 in a 5-minute period over two consecutive periods.

Monitor authentication failures:

```bash
# Create metric filter for auth failures
aws logs put-metric-filter \
  --log-group-name /aws/eks/production-cluster/cluster \
  --filter-name AuthFailuresFilter \
  --filter-pattern '{ $.responseStatus.code == 401 }' \
  --metric-transformations \
    metricName=AuthenticationFailures,metricNamespace=EKS/ControlPlane,metricValue=1 \
  --region us-east-1
```

## Integrating with Security Information and Event Management (SIEM)

Export control plane logs to SIEM systems for centralized security monitoring. Use CloudWatch Logs subscriptions to stream logs to external systems:

```bash
# Create subscription filter to Kinesis Firehose
aws logs put-subscription-filter \
  --log-group-name /aws/eks/production-cluster/cluster \
  --filter-name eks-to-firehose \
  --filter-pattern "" \
  --destination-arn arn:aws:firehose:us-east-1:123456789012:deliverystream/eks-logs-stream \
  --region us-east-1
```

The Firehose delivery stream can send logs to Splunk, Elasticsearch, or S3 for long-term archival:

```bash
# Create Firehose delivery stream to S3
aws firehose create-delivery-stream \
  --delivery-stream-name eks-logs-stream \
  --s3-destination-configuration \
    RoleARN=arn:aws:iam::123456789012:role/firehose-delivery-role,\
    BucketARN=arn:aws:s3:::eks-audit-logs,\
    Prefix=control-plane/,\
    CompressionFormat=GZIP \
  --region us-east-1
```

This setup enables compliance reporting and provides an immutable audit trail.

## Troubleshooting with Control Plane Logs

When pods fail to schedule, scheduler logs reveal the reasons:

```sql
# Find scheduling failures
fields @timestamp, @message
| filter @message like /Failed to schedule pod/
| sort @timestamp desc
| limit 50
```

The messages contain details about why scheduling failed, such as insufficient resources or unsatisfied node selectors.

Debug admission webhook failures:

```sql
# Find admission webhook denials
fields @timestamp, objectRef.name, objectRef.namespace, responseStatus.message
| filter responseStatus.code == 400
| filter responseStatus.message like /admission webhook/
```

These logs show which webhook denied the request and why, helping diagnose deployment issues.

## Managing Log Costs

Control plane logs can generate significant volume, especially audit logs. Implement cost management strategies:

```bash
# Disable verbose log types in non-production
aws eks update-cluster-config \
  --name dev-cluster \
  --logging '{"clusterLogging":[{"types":["api","authenticator"],"enabled":true},{"types":["audit","controllerManager","scheduler"],"enabled":false}]}' \
  --region us-east-1
```

Use log sampling for high-volume environments:

```bash
# Create subscription filter with sampling
aws logs put-subscription-filter \
  --log-group-name /aws/eks/production-cluster/cluster \
  --filter-name sampled-logs \
  --filter-pattern '{ $.verb == "get" && random() < 0.1 }' \
  --destination-arn arn:aws:lambda:us-east-1:123456789012:function:process-sampled-logs \
  --region us-east-1
```

This approach reduces costs while maintaining visibility into critical events.

## Terraform Configuration

Automate control plane logging configuration:

```hcl
resource "aws_eks_cluster" "main" {
  name     = "production-cluster"
  role_arn = aws_iam_role.cluster.arn

  enabled_cluster_log_types = [
    "api",
    "audit",
    "authenticator",
    "controllerManager",
    "scheduler"
  ]

  vpc_config {
    subnet_ids = var.subnet_ids
  }
}

resource "aws_cloudwatch_log_group" "eks_cluster" {
  name              = "/aws/eks/${aws_eks_cluster.main.name}/cluster"
  retention_in_days = 30
  kms_key_id        = aws_kms_key.logs.arn

  tags = {
    Environment = "production"
  }
}

resource "aws_cloudwatch_log_metric_filter" "failed_api_calls" {
  name           = "FailedAPICallsFilter"
  log_group_name = aws_cloudwatch_log_group.eks_cluster.name
  pattern        = "{ $.responseStatus.code >= 400 }"

  metric_transformation {
    name      = "FailedAPICalls"
    namespace = "EKS/ControlPlane"
    value     = "1"
  }
}
```

This infrastructure-as-code approach ensures consistent logging configuration across clusters and simplifies management at scale.

Control plane logging in EKS provides essential visibility into cluster operations and security events. Proper configuration and querying enable effective troubleshooting, compliance reporting, and security monitoring.
