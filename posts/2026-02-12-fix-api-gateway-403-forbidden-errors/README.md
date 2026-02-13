# How to Fix API Gateway 403 Forbidden Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, API Gateway, IAM, Security, Troubleshooting

Description: Debug and resolve API Gateway 403 Forbidden errors caused by missing API keys, WAF rules, resource policies, IAM authorization, and usage plan throttling.

---

Getting a 403 Forbidden from API Gateway is maddening because there are so many different things that can cause it. The error might say `"Missing Authentication Token"`, `"Forbidden"`, `"Access Denied"`, or just `{"message": "Forbidden"}` with no further explanation.

Let's go through every possible cause and how to fix each one.

## Quick Diagnosis

The exact error message gives you a clue about what's wrong:

| Error Message | Likely Cause |
|---------------|-------------|
| `{"message": "Forbidden"}` | WAF, resource policy, or API key issue |
| `{"message": "Missing Authentication Token"}` | Wrong URL, missing auth, or missing method |
| `{"message": "Access Denied"}` | IAM authorization failure |
| `{"message": "User is not authorized"}` | Lambda authorizer denied access |

## Cause 1: Missing or Invalid API Key

If your API requires an API key and you're not sending one, you get a 403.

Check if your API method requires a key:

```bash
# Check if the method requires an API key
aws apigateway get-method \
  --rest-api-id abc123 \
  --resource-id xyz789 \
  --http-method GET \
  --query 'apiKeyRequired'
```

If it returns `true`, you need to send the key in the `x-api-key` header:

```bash
# Test with the API key
curl -H "x-api-key: YOUR_API_KEY_HERE" \
  https://abc123.execute-api.us-east-1.amazonaws.com/prod/my-resource
```

Make sure:
1. The API key exists and is enabled
2. The key is associated with a usage plan
3. The usage plan is linked to the API stage

```bash
# Check API keys
aws apigateway get-api-keys --include-values \
  --query 'items[*].{Name:name,Id:id,Enabled:enabled}'

# Check usage plans
aws apigateway get-usage-plans \
  --query 'items[*].{Name:name,Id:id,ApiStages:apiStages}'
```

## Cause 2: Resource Policy Blocking Access

REST APIs can have resource policies that restrict who can call them. If the policy doesn't include your caller, you get a 403.

```bash
# Check the API's resource policy
aws apigateway get-rest-api \
  --rest-api-id abc123 \
  --query 'policy'
```

A common resource policy might restrict access to specific IP ranges or VPCs:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "execute-api:Invoke",
      "Resource": "arn:aws:execute-api:us-east-1:123456789012:abc123/*",
      "Condition": {
        "IpAddress": {
          "aws:SourceIp": ["10.0.0.0/8", "203.0.113.0/24"]
        }
      }
    }
  ]
}
```

If you're calling from an IP not in the allowed list, you'll be blocked. Fix the policy or add your IP:

```bash
# Update the resource policy
aws apigateway update-rest-api \
  --rest-api-id abc123 \
  --patch-operations '[{
    "op": "replace",
    "path": "/policy",
    "value": "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":\"*\",\"Action\":\"execute-api:Invoke\",\"Resource\":\"arn:aws:execute-api:us-east-1:123456789012:abc123/*\"}]}"
  }]'

# Important: Redeploy the API for policy changes to take effect
aws apigateway create-deployment \
  --rest-api-id abc123 \
  --stage-name prod
```

## Cause 3: WAF (Web Application Firewall) Blocking the Request

If your API Gateway has an AWS WAF web ACL attached, WAF might be blocking your request. WAF rules can block based on IP, geographic location, request patterns, or rate limits.

```bash
# Check if WAF is attached to the API stage
aws wafv2 get-web-acl-for-resource \
  --resource-arn arn:aws:apigateway:us-east-1::/restapis/abc123/stages/prod
```

To see what WAF is blocking:

```bash
# Check WAF logs (if logging is enabled)
aws wafv2 get-logging-configuration \
  --resource-arn arn:aws:wafv2:us-east-1:123456789012:regional/webacl/my-acl/abc123
```

If WAF is the issue, you can either modify the WAF rules or add your IP to an allow list.

## Cause 4: IAM Authorization Failure

If your API uses IAM authorization, the caller must sign the request with valid AWS credentials:

```bash
# Check if the method uses IAM auth
aws apigateway get-method \
  --rest-api-id abc123 \
  --resource-id xyz789 \
  --http-method GET \
  --query 'authorizationType'
```

If it returns `AWS_IAM`, you need to sign your requests with Signature V4:

```python
import boto3
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest
import requests

session = boto3.Session()
credentials = session.get_credentials()
creds = credentials.get_frozen_credentials()

# Create a signed request
url = 'https://abc123.execute-api.us-east-1.amazonaws.com/prod/my-resource'
request = AWSRequest(method='GET', url=url, headers={'Host': 'abc123.execute-api.us-east-1.amazonaws.com'})
SigV4Auth(creds, 'execute-api', 'us-east-1').add_auth(request)

# Send the signed request
response = requests.get(url, headers=dict(request.headers))
print(response.json())
```

The IAM user or role must also have the `execute-api:Invoke` permission:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "execute-api:Invoke",
      "Resource": "arn:aws:execute-api:us-east-1:123456789012:abc123/prod/GET/my-resource"
    }
  ]
}
```

## Cause 5: Lambda Authorizer Denying Access

If your API uses a Lambda authorizer (custom authorizer), the authorizer function might be denying the request.

```bash
# Check the authorizer configuration
aws apigateway get-authorizers \
  --rest-api-id abc123 \
  --query 'items[*].{Name:name,Type:type,AuthorizerUri:authorizerUri}'
```

Check the authorizer Lambda's logs for errors:

```bash
# Get the authorizer function name from the URI, then check logs
aws logs filter-log-events \
  --log-group-name /aws/lambda/my-authorizer \
  --start-time $(date -d '30 minutes ago' +%s000) \
  --filter-pattern "ERROR"
```

A common issue is the authorizer not returning the correct policy document format.

## Cause 6: Usage Plan Throttling

If you've exceeded your API key's usage plan limits, you'll get a 429 (throttled), but some configurations can return 403 instead.

```bash
# Check usage for a specific API key
aws apigateway get-usage \
  --usage-plan-id abc123 \
  --key-id xyz789 \
  --start-date 2024-01-01 \
  --end-date 2024-01-31
```

## Cause 7: Private API Without VPC Endpoint

If your API is a private REST API, it can only be accessed from within your VPC through a VPC endpoint:

```bash
# Check if the API is private
aws apigateway get-rest-api \
  --rest-api-id abc123 \
  --query 'endpointConfiguration.types'
```

If it shows `["PRIVATE"]`, make sure you're calling it from within the VPC and have the proper VPC endpoint set up.

## Debugging Steps

1. Enable CloudWatch Logs for API Gateway execution:

```bash
aws apigateway update-stage \
  --rest-api-id abc123 \
  --stage-name prod \
  --patch-operations '[{"op":"replace","path":"/*/*/logging/loglevel","value":"INFO"}]'
```

2. Check CloudTrail for execute-api events
3. Test with curl using verbose output to see all headers

```bash
curl -v -X GET \
  -H "x-api-key: YOUR_KEY" \
  https://abc123.execute-api.us-east-1.amazonaws.com/prod/resource
```

Set up monitoring with [OneUptime](https://oneuptime.com/blog/post/2026-02-06-aws-cloudwatch-logs-exporter-opentelemetry-collector/view) to track 403 error rates across your APIs. A sudden spike in 403s usually indicates a configuration change or a WAF rule that's being too aggressive.
