# How to Fix API Gateway 'Execution failed due to configuration error'

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, API Gateway, Lambda, Troubleshooting

Description: Resolve the API Gateway execution failed due to configuration error by fixing Lambda permissions, integration settings, and mapping template issues.

---

You hit your API Gateway endpoint and get a 500 error with this in the execution logs:

```
Execution failed due to configuration error: Invalid permissions on Lambda function
```

or

```
Execution failed due to configuration error: Malformed Lambda proxy response
```

This error means API Gateway can't properly communicate with its backend integration. The integration itself is misconfigured, not your application code. Let's work through the common configurations that cause this.

## Cause 1: Missing Lambda Invoke Permission

This is the most common cause. API Gateway needs explicit permission to invoke your Lambda function. Even if you created the integration through the console or CLI, the permission might be missing or incorrect.

Check if the permission exists:

```bash
# Check Lambda's resource policy for API Gateway permissions
aws lambda get-policy \
  --function-name my-function \
  --query 'Policy' \
  --output text | python3 -m json.tool
```

If you get "ResourceNotFoundException", there's no policy at all, which means API Gateway can't invoke the function.

Add the permission:

```bash
# For REST APIs
aws lambda add-permission \
  --function-name my-function \
  --statement-id apigateway-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-east-1:123456789012:abc123/*/GET/my-resource"

# For a broader permission (all methods and resources in the API)
aws lambda add-permission \
  --function-name my-function \
  --statement-id apigateway-invoke-all \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-east-1:123456789012:abc123/*"
```

### Permission for Lambda Aliases and Versions

If your API points to a Lambda alias or version, the permission must be on the alias or version, not just the function:

```bash
# Add permission to a specific alias
aws lambda add-permission \
  --function-name my-function \
  --qualifier prod \
  --statement-id apigateway-invoke-alias \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-east-1:123456789012:abc123/*"
```

## Cause 2: Integration URI Points to Non-Existent Lambda

The integration might reference a Lambda function that was deleted, renamed, or is in a different region.

```bash
# Check the integration URI
aws apigateway get-integration \
  --rest-api-id abc123 \
  --resource-id def456 \
  --http-method GET \
  --query 'uri'
```

The URI should look like:

```
arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:123456789012:function:my-function/invocations
```

Verify the function exists:

```bash
# Check if the function exists
aws lambda get-function --function-name my-function --query 'Configuration.FunctionArn'
```

If the function was deleted, either recreate it or update the integration:

```bash
# Update the integration to point to a new function
aws apigateway put-integration \
  --rest-api-id abc123 \
  --resource-id def456 \
  --http-method GET \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:123456789012:function:new-function/invocations"

# Deploy the change
aws apigateway create-deployment --rest-api-id abc123 --stage-name prod
```

## Cause 3: Wrong Integration Type

API Gateway supports several integration types, and using the wrong one causes configuration errors.

For Lambda proxy integration (the most common), the type must be `AWS_PROXY` and the HTTP method must be `POST`:

```bash
# Check the integration type
aws apigateway get-integration \
  --rest-api-id abc123 \
  --resource-id def456 \
  --http-method GET \
  --query '{Type:type,HttpMethod:httpMethod}'
```

For Lambda proxy integration:
- `type` should be `AWS_PROXY`
- `httpMethod` should be `POST` (this is the method API Gateway uses to call Lambda, not the client's method)

```bash
# Fix the integration
aws apigateway put-integration \
  --rest-api-id abc123 \
  --resource-id def456 \
  --http-method GET \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:123456789012:function:my-function/invocations"
```

## Cause 4: Mapping Template Errors (Non-Proxy Integration)

If you're using a non-proxy integration (type `AWS`) with mapping templates, a malformed template will cause this error.

```bash
# Check the request mapping template
aws apigateway get-integration \
  --rest-api-id abc123 \
  --resource-id def456 \
  --http-method GET \
  --query 'requestTemplates'
```

A common mapping template issue is invalid VTL (Velocity Template Language) syntax:

```json
// BROKEN: Missing closing brace
{
  "userId": "$input.params('id')"
  "action": "getUser"
}

// FIXED: Valid JSON with correct VTL
{
  "userId": "$input.params('id')",
  "action": "getUser"
}
```

## Cause 5: HTTP Backend Integration Issues

If your integration is an HTTP proxy pointing to an external URL, the configuration error might mean:

- The URL is unreachable
- The URL doesn't have a valid SSL certificate
- The VPC link is misconfigured

```bash
# Check HTTP integration details
aws apigateway get-integration \
  --rest-api-id abc123 \
  --resource-id def456 \
  --http-method GET \
  --query '{Type:type,Uri:uri,ConnectionType:connectionType,ConnectionId:connectionId}'
```

For VPC Link integrations, verify the VPC Link is active:

```bash
# Check VPC Link status
aws apigateway get-vpc-links \
  --query 'items[*].{Id:id,Name:name,Status:status,TargetArns:targetArns}'
```

The status should be `AVAILABLE`. If it's `FAILED` or `DELETING`, that's your problem.

## Cause 6: Stage Variables Reference Errors

If your integration uses stage variables that don't exist, you'll get a configuration error:

```bash
# Check stage variables
aws apigateway get-stage \
  --rest-api-id abc123 \
  --stage-name prod \
  --query 'variables'
```

If your integration URI contains `${stageVariables.functionName}` but the stage variable `functionName` isn't defined, the integration will fail.

```bash
# Set the missing stage variable
aws apigateway update-stage \
  --rest-api-id abc123 \
  --stage-name prod \
  --patch-operations '[{"op":"replace","path":"/variables/functionName","value":"my-function"}]'
```

## Debugging with Execution Logs

Enable detailed execution logging to see exactly what's failing:

```bash
# Enable execution logging
aws apigateway update-stage \
  --rest-api-id abc123 \
  --stage-name prod \
  --patch-operations '[
    {"op":"replace","path":"/*/*/logging/loglevel","value":"INFO"},
    {"op":"replace","path":"/*/*/logging/dataTrace","value":"true"}
  ]'
```

Then check CloudWatch Logs for the detailed error:

```bash
# Search execution logs
aws logs filter-log-events \
  --log-group-name "API-Gateway-Execution-Logs_abc123/prod" \
  --filter-pattern "Execution failed" \
  --start-time $(date -d '1 hour ago' +%s000) \
  --query 'events[*].message'
```

## Complete Fix Checklist

1. Verify the Lambda function exists and is in the correct region
2. Check that API Gateway has `lambda:InvokeFunction` permission
3. Confirm the integration type is `AWS_PROXY` with `POST` HTTP method
4. If using aliases or versions, verify permissions are on the right target
5. Check for stage variable references that don't exist
6. For HTTP integrations, verify the backend URL and VPC Link status
7. For non-proxy integrations, validate mapping templates
8. Always redeploy after making changes

Monitor your API Gateway integrations with [OneUptime](https://oneuptime.com/blog/post/aws-cloudwatch-alternatives/view) to catch configuration errors immediately after deployments. A configuration error that slips through can take down your entire API.
