# How to Apply the Operational Excellence Pillar on AWS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Well-Architected, Operational Excellence, DevOps

Description: Practical strategies for implementing the Operational Excellence pillar of the AWS Well-Architected Framework, covering automation, observability, and incident management.

---

Operational Excellence is the first pillar of the AWS Well-Architected Framework, and there's a reason for that. If you can't deploy reliably, monitor effectively, and respond to incidents quickly, nothing else matters. Your beautifully architected system is useless if your team can't operate it confidently.

This pillar focuses on five areas: organization, preparation, operation, evolution, and - most importantly - treating everything as code. Let's walk through how to implement each area with specific AWS services and patterns.

## Design Principles

The Operational Excellence pillar has five design principles:

1. Perform operations as code
2. Make frequent, small, reversible changes
3. Refine operations procedures frequently
4. Anticipate failure
5. Learn from all operational failures

These aren't abstract ideals. Each one maps to concrete practices and AWS services.

## Operations as Code

The most fundamental shift. Every manual process should become automated:

**Infrastructure as Code** - Use Terraform or CloudFormation for all infrastructure. No exceptions. Even "temporary" resources should be codified.

```hcl
# Example: even a simple test environment should be in code
module "test_environment" {
  source = "./modules/environment"

  environment = "test"
  instance_count = 1
  instance_type  = "t3.small"

  auto_shutdown = true  # automatically stop at night
}
```

**Runbooks as Code** - Use AWS Systems Manager Automation for operational procedures. Instead of a wiki page that says "SSH to the server and restart the service", create an automation document:

```yaml
# SSM Automation document for service restart
description: "Restart application service on EC2 instances"
schemaVersion: "0.3"
mainSteps:
  - name: getInstances
    action: aws:executeAwsApi
    inputs:
      Service: ec2
      Api: DescribeInstances
      Filters:
        - Name: "tag:Service"
          Values: ["web-api"]
        - Name: "instance-state-name"
          Values: ["running"]
    outputs:
      - Name: InstanceIds
        Selector: "$.Reservations..Instances..InstanceId"
        Type: StringList

  - name: restartService
    action: aws:runCommand
    inputs:
      DocumentName: AWS-RunShellScript
      InstanceIds: "{{ getInstances.InstanceIds }}"
      Parameters:
        commands:
          - "systemctl restart web-api"
          - "sleep 10"
          - "systemctl status web-api"
```

**Deployment as Code** - Use CodePipeline, CodeDeploy, or similar for all deployments:

```hcl
resource "aws_codepipeline" "app" {
  name     = "app-pipeline"
  role_arn = aws_iam_role.pipeline.arn

  stage {
    name = "Source"
    action {
      name     = "Source"
      category = "Source"
      owner    = "AWS"
      provider = "CodeStarSourceConnection"
      version  = "1"
      output_artifacts = ["source_output"]
      configuration = {
        ConnectionArn    = aws_codestarconnections_connection.github.arn
        FullRepositoryId = "myorg/myapp"
        BranchName       = "main"
      }
    }
  }

  stage {
    name = "Deploy"
    action {
      name     = "Deploy"
      category = "Deploy"
      owner    = "AWS"
      provider = "ECS"
      version  = "1"
      input_artifacts = ["source_output"]
      configuration = {
        ClusterName = aws_ecs_cluster.main.name
        ServiceName = aws_ecs_service.app.name
      }
    }
  }
}
```

## Observability

You can't operate what you can't see. Build observability into everything:

**Structured Logging** - Don't log unstructured text. Use JSON with consistent fields:

```json
{
  "timestamp": "2026-02-12T10:30:00Z",
  "level": "ERROR",
  "service": "payment-api",
  "trace_id": "abc123",
  "message": "Payment processing failed",
  "error_code": "GATEWAY_TIMEOUT",
  "customer_id": "cust_456",
  "duration_ms": 30000
}
```

**Centralized Monitoring** - Use CloudWatch for metrics, logs, and alarms. Create dashboards that show the health of your system at a glance:

```hcl
resource "aws_cloudwatch_dashboard" "operations" {
  dashboard_name = "operations-overview"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title   = "API Error Rate"
          metrics = [
            ["MyApp", "ErrorCount", "Service", "api", { stat = "Sum", period = 300 }],
            ["MyApp", "RequestCount", "Service", "api", { stat = "Sum", period = 300 }]
          ]
          view    = "timeSeries"
          region  = "us-east-1"
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title   = "API Latency"
          metrics = [
            ["MyApp", "Latency", "Service", "api", { stat = "p99", period = 300 }],
            ["MyApp", "Latency", "Service", "api", { stat = "p50", period = 300 }]
          ]
          view    = "timeSeries"
        }
      }
    ]
  })
}
```

**Distributed Tracing** - Use AWS X-Ray to trace requests across services. When a request touches your API Gateway, Lambda, DynamoDB, and SQS, X-Ray shows you exactly where time is spent and where errors occur.

For comprehensive monitoring strategies, take a look at our post on [AWS infrastructure monitoring](https://oneuptime.com/blog/post/monitor-aws-infrastructure/view).

## Incident Management

When things go wrong (and they will), you need a well-defined process:

**Alarms** - Set up CloudWatch Alarms for business-critical metrics. An alarm should correspond to an action, not just a notification:

```hcl
resource "aws_cloudwatch_metric_alarm" "error_rate" {
  alarm_name          = "high-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  threshold           = 5

  metric_query {
    id          = "error_rate"
    expression  = "errors/requests*100"
    label       = "Error Rate %"
    return_data = true
  }

  metric_query {
    id = "errors"
    metric {
      metric_name = "5XXError"
      namespace   = "AWS/ApplicationELB"
      period      = 300
      stat        = "Sum"
      dimensions = {
        LoadBalancer = aws_lb.main.arn_suffix
      }
    }
  }

  metric_query {
    id = "requests"
    metric {
      metric_name = "RequestCount"
      namespace   = "AWS/ApplicationELB"
      period      = 300
      stat        = "Sum"
      dimensions = {
        LoadBalancer = aws_lb.main.arn_suffix
      }
    }
  }

  alarm_actions = [aws_sns_topic.pagerduty.arn]
}
```

**Automated Response** - Use EventBridge to trigger automated responses to operational events:

```hcl
# Automatically remediate when an instance fails health checks
resource "aws_cloudwatch_event_rule" "instance_unhealthy" {
  name = "ec2-instance-unhealthy"

  event_pattern = jsonencode({
    source      = ["aws.ec2"]
    detail-type = ["EC2 Instance State-change Notification"]
    detail = {
      state = ["stopping", "stopped"]
    }
  })
}

resource "aws_cloudwatch_event_target" "remediation" {
  rule = aws_cloudwatch_event_rule.instance_unhealthy.name
  arn  = aws_lambda_function.remediation.arn
}
```

## Change Management

Small, frequent, reversible changes are safer than big-bang releases:

**Feature Flags** - Deploy code dark and enable features gradually. If something breaks, disable the flag instead of rolling back the deployment.

**Blue-Green Deployments** - Run two identical environments and switch traffic between them:

```hcl
resource "aws_lb_listener_rule" "blue_green" {
  listener_arn = aws_lb_listener.main.arn
  priority     = 100

  action {
    type = "forward"
    forward {
      target_group {
        arn    = aws_lb_target_group.blue.arn
        weight = var.blue_weight  # 100 or 0
      }
      target_group {
        arn    = aws_lb_target_group.green.arn
        weight = var.green_weight  # 0 or 100
      }
    }
  }

  condition {
    path_pattern {
      values = ["/*"]
    }
  }
}
```

## Learning from Failures

Every incident should produce actionable improvements:

1. **Blameless postmortems** - Focus on what happened and how to prevent it, not who caused it
2. **Document everything** - Keep a timeline, contributing factors, and remediation actions
3. **Track action items** - Postmortems without follow-up are just storytelling
4. **Share learnings** - Other teams benefit from your incidents

## Summary

Operational Excellence isn't about having zero incidents. It's about being prepared for them, responding effectively, learning from them, and continuously improving. Automate everything, observe everything, and treat your operations as a product that gets better over time. Start with the basics - infrastructure as code and monitoring - and build toward fully automated runbooks and self-healing systems.
