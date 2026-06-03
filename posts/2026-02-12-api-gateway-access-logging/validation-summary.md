# Validation Summary: How to Set Up API Gateway Access Logging

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon API Gateway REST APIs
- Amazon API Gateway HTTP APIs
- Amazon CloudWatch Logs
- CloudWatch Logs Insights
- CloudWatch metric filters and alarms
- AWS IAM
- AWS CLI
- AWS CloudFormation
- Terraform AWS provider

## Sources Consulted
- AWS API Gateway Developer Guide: Set up CloudWatch logging for REST APIs in API Gateway - https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-logging.html
- AWS API Gateway Developer Guide: Variables for access logging for API Gateway - https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-variables-for-access-logging.html
- AWS API Gateway Developer Guide: Configure logging for HTTP APIs in API Gateway - https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-logging.html
- AWS API Gateway Developer Guide: Customize HTTP API access logs - https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-logging-variables.html
- AWS CloudFormation Reference: AWS::ApiGateway::Stage AccessLogSetting - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-apigateway-stage-accesslogsetting.html
- AWS CLI Command Reference: apigateway update-stage - https://docs.aws.amazon.com/cli/latest/reference/apigateway/update-stage.html
- AWS CLI Command Reference: apigatewayv2 update-stage - https://awscli.amazonaws.com/v2/documentation/api/latest/reference/apigatewayv2/update-stage.html
- Amazon CloudWatch Logs User Guide: Filter pattern syntax - https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html
- Amazon CloudWatch Logs User Guide: stats command and aggregation functions - https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax-Stats.html
- Terraform Registry: aws_api_gateway_stage - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_stage

## Issues Found
- The post described the API Gateway CloudWatch logging IAM role setting as a global, once-per-account configuration. AWS documents `cloudWatchRoleArn` for REST API logging as a setting that must be configured separately for each AWS Region. Updated the wording to say it is once per AWS account and Region, and applies to REST APIs in that account and Region.
- The CloudWatch Logs Insights percentile query used `percentile(responseLatency, ...)`. CloudWatch Logs Insights documents the percentile aggregation function as `pct(fieldName, percent)`. Updated the example to use `pct(responseLatency, 50)`, `pct(responseLatency, 90)`, and `pct(responseLatency, 99)`.

## Review Notes
- The AWS CLI was not installed in the local environment, so CLI command validation was performed against the official AWS CLI command reference and AWS service documentation.
- The REST API access logging examples include `$context.requestId`, satisfying AWS's requirement that access log formats include at least `$context.requestId`.
- The CloudWatch Logs metric filter examples are valid for JSON log fields, but teams may prefer adding metric filter default values if they need continuous zero-valued datapoints for periods with no matches.
