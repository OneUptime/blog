# How to Configure Flagger Metrics Analysis with CloudWatch

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux, flagger, CloudWatch, AWS, Canary, Metrics, Kubernetes, GitOps

Description: A practical guide to integrating AWS CloudWatch metrics with Flagger for automated canary analysis in Flux-managed Kubernetes clusters.

---

## Introduction

Flagger is a progressive delivery operator for Kubernetes that automates canary deployments, A/B testing, and blue-green releases. One of its most powerful features is the ability to query external metrics providers to decide whether a canary deployment should be promoted or rolled back. AWS CloudWatch is a widely used monitoring service that collects metrics from AWS resources and applications.

In this guide, you will learn how to configure Flagger to use CloudWatch as a metrics provider for canary analysis. This setup allows Flagger to query CloudWatch metrics such as request latency, error rates, and custom application metrics to make informed promotion decisions.

## Prerequisites

Before you begin, make sure you have:

- A Kubernetes cluster with Flux installed
- Flagger installed via Flux
- AWS credentials configured for CloudWatch access
- An application deployed with a Flagger Canary resource
- kubectl and flux CLI tools installed

## Step 1: Install Flagger with CloudWatch Support

First, ensure Flagger is installed in your cluster. Create a HelmRelease for Flagger using Flux.

```yaml
# flagger-helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: flagger
  namespace: flagger-system
spec:
  interval: 1h
  chart:
    spec:
      chart: flagger
      version: "1.x"
      sourceRef:
        kind: HelmRepository
        name: flagger
        namespace: flagger-system
  values:
    # Enable the metrics server
    metricsServer: "https://monitoring.example.com"
    # Set the mesh provider
    meshProvider: "istio"
```

## Step 2: Create AWS Credentials Secret

Flagger needs AWS credentials to access CloudWatch. Create a Kubernetes secret with your AWS access key and secret key.

```yaml
# aws-credentials-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: cloudwatch-credentials
  namespace: flagger-system
type: Opaque
stringData:
  # Replace with your actual AWS credentials
  AWS_ACCESS_KEY_ID: "your-access-key-id"
  AWS_SECRET_ACCESS_KEY: "your-secret-access-key"
  AWS_REGION: "us-east-1"
```

Apply the secret to your cluster:

```bash
kubectl apply -f aws-credentials-secret.yaml
```

For production environments, consider using IAM Roles for Service Accounts (IRSA) instead of static credentials. This approach is more secure and avoids storing long-lived credentials.

## Step 3: Configure the CloudWatch Metrics Template

Flagger uses MetricTemplate resources to define how to query external metrics providers. Create a MetricTemplate that queries CloudWatch.

```yaml
# cloudwatch-metric-template.yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: cloudwatch-request-duration
  namespace: flagger-system
spec:
  provider:
    # Specify CloudWatch as the provider type
    type: cloudwatch
    # AWS region where your metrics are stored
    region: us-east-1
    # Reference to the credentials secret
    secretRef:
      name: cloudwatch-credentials
  query: |
    [
      {
        "Id": "request_duration",
        "MetricStat": {
          "Metric": {
            "Namespace": "MyApplication",
            "MetricName": "RequestDuration",
            "Dimensions": [
              {
                "Name": "ServiceName",
                "Value": "{{ target }}"
              }
            ]
          },
          "Period": 60,
          "Stat": "Average"
        }
      }
    ]
```

The `{{ target }}` placeholder is automatically replaced by Flagger with the name of the canary target deployment.

## Step 4: Create an Error Rate Metric Template

In addition to latency, you should monitor error rates. Create another MetricTemplate for error rate analysis.

```yaml
# cloudwatch-error-rate-template.yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: cloudwatch-error-rate
  namespace: flagger-system
spec:
  provider:
    type: cloudwatch
    region: us-east-1
    secretRef:
      name: cloudwatch-credentials
  query: |
    [
      {
        "Id": "error_count",
        "MetricStat": {
          "Metric": {
            "Namespace": "MyApplication",
            "MetricName": "5xxErrorCount",
            "Dimensions": [
              {
                "Name": "ServiceName",
                "Value": "{{ target }}"
              }
            ]
          },
          "Period": 60,
          "Stat": "Sum"
        }
      },
      {
        "Id": "request_count",
        "MetricStat": {
          "Metric": {
            "Namespace": "MyApplication",
            "MetricName": "RequestCount",
            "Dimensions": [
              {
                "Name": "ServiceName",
                "Value": "{{ target }}"
              }
            ]
          },
          "Period": 60,
          "Stat": "Sum"
        }
      },
      {
        "Id": "error_rate",
        "Expression": "error_count / request_count * 100",
        "Label": "ErrorRate"
      }
    ]
```

This template uses CloudWatch Metric Math to calculate the error rate as a percentage.

## Step 5: Reference Metrics in Your Canary Resource

Now, reference these metric templates in your Canary resource definition.

```yaml
# canary.yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: my-app
  namespace: default
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  # Service mesh or ingress configuration
  service:
    port: 80
    targetPort: 8080
  analysis:
    # Total number of analysis iterations
    interval: 1m
    # Maximum number of failed checks before rollback
    threshold: 5
    # Maximum traffic percentage routed to canary
    maxWeight: 50
    # Traffic increment step
    stepWeight: 10
    metrics:
      # Built-in metric for request success rate
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
      # CloudWatch request duration metric
      - name: cloudwatch-request-duration
        templateRef:
          name: cloudwatch-request-duration
          namespace: flagger-system
        # Maximum acceptable request duration in milliseconds
        thresholdRange:
          max: 500
        interval: 1m
      # CloudWatch error rate metric
      - name: cloudwatch-error-rate
        templateRef:
          name: cloudwatch-error-rate
          namespace: flagger-system
        # Maximum acceptable error rate percentage
        thresholdRange:
          max: 1
        interval: 1m
```

## Step 6: Using IRSA for Secure Authentication

For production environments, use IRSA instead of static credentials. First, create an IAM policy for CloudWatch read access.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudwatch:GetMetricData",
        "cloudwatch:GetMetricStatistics",
        "cloudwatch:ListMetrics"
      ],
      "Resource": "*"
    }
  ]
}
```

Then annotate the Flagger service account:

```yaml
# flagger-serviceaccount-patch.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: flagger
  namespace: flagger-system
  annotations:
    # Replace with your IAM role ARN
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/flagger-cloudwatch-role
```

When using IRSA, you can omit the `secretRef` field in the MetricTemplate since credentials are injected automatically.

## Step 7: Verify the Configuration

After applying all resources, verify that Flagger can query CloudWatch metrics.

```bash
# Check the Canary status
kubectl get canary my-app -n default

# Describe the Canary for detailed status
kubectl describe canary my-app -n default

# Check Flagger logs for metric query results
kubectl logs -n flagger-system deployment/flagger -f | grep cloudwatch
```

## Step 8: Test the Canary Deployment

Trigger a canary deployment by updating the container image:

```bash
# Update the deployment image to trigger a canary rollout
kubectl set image deployment/my-app my-app=my-app:2.0.0 -n default
```

Monitor the canary progression:

```bash
# Watch the canary status
kubectl get canary my-app -n default -w
```

You should see Flagger querying CloudWatch metrics at each analysis interval and making promotion decisions based on the defined thresholds.

## Troubleshooting

If Flagger fails to query CloudWatch metrics, check the following:

1. Verify AWS credentials are correct and have the necessary permissions
2. Ensure the CloudWatch namespace and metric names match your application metrics
3. Check that the AWS region is correct
4. Review Flagger logs for detailed error messages

```bash
# Check for errors in Flagger logs
kubectl logs -n flagger-system deployment/flagger --tail=100 | grep -i error
```

Common errors include:

- **AccessDeniedException**: The IAM user or role lacks the required CloudWatch permissions
- **InvalidParameterValue**: The metric query JSON format is incorrect
- **MetricNotFound**: The specified metric namespace or name does not exist in CloudWatch

## Conclusion

You have successfully configured Flagger to use AWS CloudWatch for canary metrics analysis. This integration allows Flagger to make data-driven decisions about canary promotions based on real application metrics from CloudWatch. By combining Flux GitOps workflows with Flagger and CloudWatch, you get a fully automated and observable progressive delivery pipeline.
