# How to Configure API Gateway Canary Deployments with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, API Gateway, Canary Deployment, Gradual Rollout, Blue-Green, Infrastructure as Code

Description: Learn how to configure API Gateway canary deployments with OpenTofu to gradually roll out API changes to a percentage of traffic while monitoring for errors before full promotion.

## Introduction

API Gateway canary deployments allow you to send a configurable percentage of traffic to a new API deployment while the stable version serves the remainder. This enables gradual rollouts with real traffic, allowing you to validate new behavior, monitor error rates, and roll back instantly if issues arise.

## Prerequisites

- OpenTofu v1.6+
- An existing API Gateway REST API with a deployed stage
- An API Gateway CloudWatch Logs role configured for the Region if you want to enable access logging
- AWS credentials with API Gateway permissions

## Step 1: Create a New Deployment for Canary

```hcl
# New deployment representing the canary version

resource "aws_api_gateway_deployment" "canary" {
  rest_api_id = var.api_gateway_id
  description = "Canary deployment v2.1.0"

  triggers = {
    redeployment = var.api_configuration_hash
  }

  lifecycle {
    create_before_destroy = true
  }
}
```

## Step 2: Configure Canary Release on Stage

```hcl
resource "aws_api_gateway_stage" "prod" {
  deployment_id = var.current_deployment_id  # Stable version
  rest_api_id   = var.api_gateway_id
  stage_name    = "prod"

  # Canary settings - 10% of traffic goes to canary deployment
  canary_settings {
    percent_traffic          = 10.0  # 0-100% traffic to canary
    deployment_id            = aws_api_gateway_deployment.canary.id
    use_stage_cache          = false  # Don't use stage cache for canary

    # Canary-specific stage variables (overrides for testing)
    stage_variable_overrides = {
      lambdaAlias = "canary"  # Route canary traffic to canary Lambda alias
    }
  }

  access_log_settings {
    destination_arn = var.cloudwatch_log_group_arn
    format = jsonencode({
      requestId         = "$context.requestId"
      extendedRequestId = "$context.extendedRequestId"
      requestTime       = "$context.requestTime"
      httpMethod        = "$context.httpMethod"
      resourcePath      = "$context.resourcePath"
      status            = "$context.status"
    })
  }

  tags = {
    Name = "${var.project_name}-api-prod"
  }
}
```

## Step 3: Monitor Rollout Metrics

```hcl
# Alarm on stage-level 5XX error rate during the rollout
resource "aws_cloudwatch_metric_alarm" "canary_errors" {
  alarm_name          = "${var.project_name}-api-canary-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "5XXError"
  namespace           = "AWS/ApiGateway"
  period              = 60
  statistic           = "Average"
  threshold           = 0.05  # Alert if stage 5XX error rate > 5%

  dimensions = {
    ApiName = var.api_name
    Stage   = "prod"
  }

  # Trigger rollback procedure
  alarm_actions = [var.rollback_sns_topic_arn]
  treat_missing_data = "notBreaching"
}
```

## Step 4: Promote or Roll Back Canary

```bash
# To send 100% of traffic to the canary temporarily
aws apigateway update-stage \
  --rest-api-id <api-id> \
  --stage-name prod \
  --patch-operations op=replace,path=/canarySettings/percentTraffic,value=100.0

# Promote canary (copies the canary deployment and stage variables to the stage)
aws apigateway update-stage \
  --rest-api-id <api-id> \
  --stage-name prod \
  --patch-operations '[{"op":"replace","path":"/canarySettings/percentTraffic","value":"0.0"},{"op":"copy","from":"/canarySettings/stageVariableOverrides","path":"/variables"},{"op":"copy","from":"/canarySettings/deploymentId","path":"/deploymentId"}]'

# Delete canary settings after promotion
aws apigateway update-stage \
  --rest-api-id <api-id> \
  --stage-name prod \
  --patch-operations '[{"op":"remove","path":"/canarySettings"}]'

# To stop sending traffic to the canary immediately
aws apigateway update-stage \
  --rest-api-id <api-id> \
  --stage-name prod \
  --patch-operations op=replace,path=/canarySettings/percentTraffic,value=0.0
```

## Step 5: Schedule Canary Progression

```hcl
# EventBridge rule to trigger a Lambda function that progressively increases canary traffic
resource "aws_cloudwatch_event_rule" "canary_progression" {
  name                = "${var.project_name}-canary-progression"
  description         = "Progressively increase canary traffic every 10 minutes"
  schedule_expression = "rate(10 minutes)"
  is_enabled          = false  # Enable manually when starting a canary

  tags = {
    Name = "${var.project_name}-canary-progression"
  }
}
```

## Step 6: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

API Gateway canary deployments provide risk mitigation for API changes by allowing real-traffic validation before full rollout. Start with 5-10% traffic, monitor stage-level error rates and latency for 15-30 minutes, and review the canary-specific `/Canary` access and execution logs before gradually increasing traffic. Use stage variable overrides to route canary traffic to a different Lambda alias for testing new code independently. Always have rollback procedures ready before starting any canary deployment.
