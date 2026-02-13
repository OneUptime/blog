# How to Set Up API Gateway Access Logging

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, API Gateway, Logging, Monitoring

Description: Step-by-step guide to configuring API Gateway access logging with CloudWatch Logs including custom log formats and analysis queries.

---

Without access logging, you're blind to how your API is actually being used. You can't see which endpoints get the most traffic, which clients generate the most errors, or how latency varies throughout the day. API Gateway access logging sends detailed request/response data to CloudWatch Logs, giving you full visibility into every API call.

## Access Logs vs Execution Logs

API Gateway has two types of logging, and they serve different purposes:

- **Access logs** - One log entry per request. Contains client IP, request path, status code, latency, and other request metadata. This is what you want for analytics and monitoring.
- **Execution logs** - Detailed trace of what API Gateway did internally for each request. Useful for debugging integration issues but very verbose and expensive at scale.

This post focuses on access logs since they're what you need for production monitoring.

## Prerequisites: IAM Role for Logging

API Gateway needs permission to write to CloudWatch. You need to set up a global IAM role for this - it's a one-time configuration per AWS account.

Create the logging role:

```bash
# Create the trust policy
cat > trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "apigateway.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create the role
aws iam create-role \
  --role-name APIGatewayCloudWatchRole \
  --assume-role-policy-document file://trust-policy.json

# Attach the logging policy
aws iam attach-role-policy \
  --role-name APIGatewayCloudWatchRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs

# Set the role on the API Gateway account settings
aws apigateway update-account \
  --patch-operations \
    op=replace,path=/cloudwatchRoleArn,value=arn:aws:iam::123456789012:role/APIGatewayCloudWatchRole
```

This role setting is account-wide. You only need to do it once, and all APIs in the account can use it.

## Creating the Log Group

Create a CloudWatch log group for your API's access logs:

```bash
# Create a dedicated log group
aws logs create-log-group \
  --log-group-name "/aws/apigateway/my-api/access-logs"

# Set retention to avoid runaway costs
aws logs put-retention-policy \
  --log-group-name "/aws/apigateway/my-api/access-logs" \
  --retention-in-days 30
```

## Configuring Access Logging

Now enable access logging on your API stage with a custom log format.

Enable access logging with a JSON format:

```bash
# Enable access logging on the stage
aws apigateway update-stage \
  --rest-api-id abc123api \
  --stage-name prod \
  --patch-operations \
    op=replace,path=/accessLogSettings/destinationArn,value=arn:aws:logs:us-east-1:123456789012:log-group:/aws/apigateway/my-api/access-logs \
    op=replace,path=/accessLogSettings/format,value='{"requestId":"$context.requestId","ip":"$context.identity.sourceIp","caller":"$context.identity.caller","user":"$context.identity.user","requestTime":"$context.requestTime","httpMethod":"$context.httpMethod","resourcePath":"$context.resourcePath","status":"$context.status","protocol":"$context.protocol","responseLength":"$context.responseLength","integrationLatency":"$context.integrationLatency","responseLatency":"$context.responseLatency"}'
```

## Log Format Variables

API Gateway provides dozens of context variables you can include in your log format. Here are the most useful ones:

```json
{
  "requestId": "$context.requestId",
  "extendedRequestId": "$context.extendedRequestId",
  "ip": "$context.identity.sourceIp",
  "userAgent": "$context.identity.userAgent",
  "httpMethod": "$context.httpMethod",
  "resourcePath": "$context.resourcePath",
  "path": "$context.path",
  "status": "$context.status",
  "protocol": "$context.protocol",
  "responseLength": "$context.responseLength",
  "requestTime": "$context.requestTime",
  "requestTimeEpoch": "$context.requestTimeEpoch",
  "integrationLatency": "$context.integrationLatency",
  "responseLatency": "$context.responseLatency",
  "integrationStatus": "$context.integrationStatus",
  "apiKey": "$context.identity.apiKey",
  "error.message": "$context.error.message",
  "error.responseType": "$context.error.responseType",
  "authorizer.claims.sub": "$context.authorizer.claims.sub",
  "authorizer.error": "$context.authorizer.error",
  "waf.error": "$context.waf.error",
  "waf.status": "$context.waf.status"
}
```

A few notes on these:
- `integrationLatency` is the time your backend took to respond
- `responseLatency` is the total time including API Gateway overhead
- The difference between them is API Gateway's processing time
- `error.message` captures why a request failed, which is invaluable for debugging

## CloudFormation Configuration

Here's how to set up access logging in CloudFormation:

```yaml
Resources:
  AccessLogGroup:
    Type: AWS::Logs::LogGroup
    Properties:
      LogGroupName: !Sub "/aws/apigateway/${MyApi}/access-logs"
      RetentionInDays: 30

  ProdStage:
    Type: AWS::ApiGateway::Stage
    Properties:
      RestApiId: !Ref MyApi
      StageName: prod
      DeploymentId: !Ref ApiDeployment
      AccessLogSetting:
        DestinationArn: !GetAtt AccessLogGroup.Arn
        Format: >-
          {"requestId":"$context.requestId",
          "ip":"$context.identity.sourceIp",
          "httpMethod":"$context.httpMethod",
          "resourcePath":"$context.resourcePath",
          "status":"$context.status",
          "responseLatency":"$context.responseLatency",
          "integrationLatency":"$context.integrationLatency",
          "responseLength":"$context.responseLength",
          "requestTime":"$context.requestTime",
          "userAgent":"$context.identity.userAgent",
          "errorMessage":"$context.error.message"}
```

## Terraform Configuration

The equivalent in Terraform:

```hcl
resource "aws_cloudwatch_log_group" "api_access_logs" {
  name              = "/aws/apigateway/${aws_api_gateway_rest_api.main.name}/access-logs"
  retention_in_days = 30
}

resource "aws_api_gateway_stage" "prod" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  stage_name    = "prod"
  deployment_id = aws_api_gateway_deployment.main.id

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_access_logs.arn
    format = jsonencode({
      requestId          = "$context.requestId"
      ip                 = "$context.identity.sourceIp"
      httpMethod         = "$context.httpMethod"
      resourcePath       = "$context.resourcePath"
      status             = "$context.status"
      responseLatency    = "$context.responseLatency"
      integrationLatency = "$context.integrationLatency"
      responseLength     = "$context.responseLength"
    })
  }
}
```

## HTTP API Access Logging

HTTP API (v2) has a slightly different configuration but the same concept:

```bash
# Enable access logging on HTTP API stage
aws apigatewayv2 update-stage \
  --api-id httpapi123 \
  --stage-name '$default' \
  --access-log-settings '{
    "DestinationArn": "arn:aws:logs:us-east-1:123456789012:log-group:/aws/apigateway/my-http-api/access-logs",
    "Format": "{\"requestId\":\"$context.requestId\",\"ip\":\"$context.identity.sourceIp\",\"method\":\"$context.httpMethod\",\"path\":\"$context.path\",\"status\":\"$context.status\",\"latency\":\"$context.responseLatency\"}"
  }'
```

## Analyzing Access Logs with CloudWatch Insights

Once logs are flowing, use CloudWatch Logs Insights to query them. Here are some useful queries.

Find the slowest API calls in the last hour:

```
# Top 10 slowest requests
fields @timestamp, httpMethod, resourcePath, status, responseLatency
| sort responseLatency desc
| limit 10
```

Count requests by status code:

```
# Request count by status code
fields status
| stats count(*) as requestCount by status
| sort requestCount desc
```

Calculate latency percentiles by endpoint:

```
# P50, P90, P99 latency per endpoint
fields resourcePath, responseLatency
| stats
    avg(responseLatency) as avgLatency,
    percentile(responseLatency, 50) as p50,
    percentile(responseLatency, 90) as p90,
    percentile(responseLatency, 99) as p99,
    count(*) as requests
  by resourcePath
| sort requests desc
```

Find error patterns:

```
# Errors by endpoint and error message
fields httpMethod, resourcePath, status, errorMessage
| filter status >= 400
| stats count(*) as errorCount by httpMethod, resourcePath, status, errorMessage
| sort errorCount desc
```

Track requests from a specific client:

```
# All requests from a specific IP
fields @timestamp, httpMethod, resourcePath, status, responseLatency
| filter ip = "203.0.113.42"
| sort @timestamp desc
| limit 50
```

## Setting Up CloudWatch Alarms on Access Logs

Create metric filters and alarms based on your access logs:

```bash
# Create a metric filter for 5xx errors
aws logs put-metric-filter \
  --log-group-name "/aws/apigateway/my-api/access-logs" \
  --filter-name "5xxErrors" \
  --filter-pattern '{ $.status = 5* }' \
  --metric-transformations \
    metricName=5xxErrorCount,metricNamespace=MyAPI,metricValue=1

# Create an alarm when 5xx errors exceed threshold
aws cloudwatch put-metric-alarm \
  --alarm-name "api-5xx-errors" \
  --namespace MyAPI \
  --metric-name 5xxErrorCount \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:alerts

# Create a metric filter for high latency
aws logs put-metric-filter \
  --log-group-name "/aws/apigateway/my-api/access-logs" \
  --filter-name "HighLatency" \
  --filter-pattern '{ $.responseLatency > 3000 }' \
  --metric-transformations \
    metricName=HighLatencyCount,metricNamespace=MyAPI,metricValue=1
```

## Cost Considerations

Access logs can generate significant data volume on high-traffic APIs. A few tips to manage costs:

- Set retention policies. 30 days is plenty for most use cases.
- Use JSON format for structured queries, but keep the fields to what you actually need.
- Consider archiving older logs to S3 using CloudWatch Logs subscription filters if you need long-term retention.
- Monitor your log group size with CloudWatch metrics.

For a more comprehensive approach to monitoring your APIs beyond just access logs, check out our guide on [API monitoring best practices](https://oneuptime.com/blog/post/2026-01-26-restful-api-best-practices/view).

## Wrapping Up

API Gateway access logging is one of those things that's easy to set up and immediately valuable. The hardest part is the one-time IAM role setup. After that, you're a couple of CLI commands away from full visibility into your API traffic. Use CloudWatch Insights for ad-hoc analysis and metric filters for ongoing alerting. Start with a comprehensive log format - it's easier to ignore fields you don't need than to add them later and lose historical data.
