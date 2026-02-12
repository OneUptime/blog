# How to Fix API Gateway 'Missing Authentication Token' Error

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, API Gateway, Authentication, Troubleshooting

Description: Resolve the Missing Authentication Token error in API Gateway caused by wrong URLs, missing IAM credentials, undefined routes, and incorrect stage names.

---

You hit your API Gateway endpoint and get this response:

```json
{ "message": "Missing Authentication Token" }
```

Despite its name, this error often has nothing to do with authentication. It's one of API Gateway's most misleading error messages, and it catches developers off guard all the time. Let's go through what actually causes it.

## The Misleading Error

The "Missing Authentication Token" error is API Gateway's generic response when a request hits a URL that doesn't match any configured resource or method. It's essentially a 403 that should be a 404 in many cases.

## Cause 1: Wrong URL (Most Common)

This is the number one cause. You're hitting a URL that doesn't exist in your API. Even a small typo will trigger this error.

API Gateway URLs follow this pattern:

```
https://{api-id}.execute-api.{region}.amazonaws.com/{stage}/{resource}
```

Common URL mistakes:

```bash
# Missing the stage name
# WRONG:
curl https://abc123.execute-api.us-east-1.amazonaws.com/users

# RIGHT:
curl https://abc123.execute-api.us-east-1.amazonaws.com/prod/users
```

```bash
# Wrong stage name
# WRONG:
curl https://abc123.execute-api.us-east-1.amazonaws.com/production/users

# RIGHT (if your stage is named "prod"):
curl https://abc123.execute-api.us-east-1.amazonaws.com/prod/users
```

```bash
# Trailing slash issue
# These might be treated as different resources:
curl https://abc123.execute-api.us-east-1.amazonaws.com/prod/users
curl https://abc123.execute-api.us-east-1.amazonaws.com/prod/users/
```

Check your actual resources and stages:

```bash
# List all stages
aws apigateway get-stages \
  --rest-api-id abc123 \
  --query 'item[*].stageName'

# List all resources (endpoints)
aws apigateway get-resources \
  --rest-api-id abc123 \
  --query 'items[*].{Path:path,Methods:resourceMethods}'
```

## Cause 2: Hitting a Resource Without a Method Defined

You might be hitting the right URL but with the wrong HTTP method. If you're sending a POST to a resource that only has GET defined, you get this error.

```bash
# Check which methods are defined for a resource
aws apigateway get-resources \
  --rest-api-id abc123 \
  --query 'items[?path==`/users`].resourceMethods'
```

If the output shows `{"GET": {}}` but you're sending a POST, that's your problem.

Fix: either add the POST method to the resource, or change your request to use GET.

## Cause 3: IAM Authorization Without Signed Request

If your API method uses IAM authorization and you send an unsigned request, you get the "Missing Authentication Token" error - and in this case, it actually means what it says.

```bash
# Check if IAM auth is required
aws apigateway get-method \
  --rest-api-id abc123 \
  --resource-id def456 \
  --http-method GET \
  --query 'authorizationType'
```

If it returns `AWS_IAM`, you need to sign your request. Using the AWS CLI:

```bash
# Use awscurl for signed requests
pip install awscurl

awscurl --service execute-api \
  --region us-east-1 \
  "https://abc123.execute-api.us-east-1.amazonaws.com/prod/users"
```

Or use the AWS SDK:

```python
import boto3
import requests
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest

session = boto3.Session()
credentials = session.get_credentials().get_frozen_credentials()

url = 'https://abc123.execute-api.us-east-1.amazonaws.com/prod/users'
req = AWSRequest(method='GET', url=url)
SigV4Auth(credentials, 'execute-api', 'us-east-1').add_auth(req)

response = requests.get(url, headers=dict(req.headers))
print(response.status_code, response.json())
```

## Cause 4: API Not Deployed

You've created resources and methods in API Gateway but forgot to deploy them. Changes in API Gateway don't take effect until you create a deployment.

```bash
# Check when the stage was last deployed
aws apigateway get-stage \
  --rest-api-id abc123 \
  --stage-name prod \
  --query '{LastUpdated:lastUpdatedDate,DeploymentId:deploymentId}'

# Create a new deployment
aws apigateway create-deployment \
  --rest-api-id abc123 \
  --stage-name prod \
  --description "Deploy latest changes"
```

## Cause 5: Custom Domain Name Misconfiguration

If you're using a custom domain name, the base path mapping might be wrong:

```bash
# Check base path mappings
aws apigateway get-base-path-mappings \
  --domain-name api.mycompany.com \
  --query 'items[*].{BasePath:basePath,Stage:stage,RestApiId:restApiId}'
```

If the base path is `v1`, your URL needs to be:

```bash
# With base path mapping of "v1"
curl https://api.mycompany.com/v1/users

# Not:
curl https://api.mycompany.com/users
```

## Cause 6: OPTIONS Method Not Configured (CORS Preflight)

When a browser sends a preflight OPTIONS request and there's no OPTIONS method defined, you get the "Missing Authentication Token" error instead of a proper CORS response.

```bash
# Enable CORS on the resource (this creates the OPTIONS method)
aws apigateway put-method \
  --rest-api-id abc123 \
  --resource-id def456 \
  --http-method OPTIONS \
  --authorization-type NONE

# Set up the mock integration for OPTIONS
aws apigateway put-integration \
  --rest-api-id abc123 \
  --resource-id def456 \
  --http-method OPTIONS \
  --type MOCK \
  --request-templates '{"application/json":"{\"statusCode\": 200}"}'

# Configure CORS response headers
aws apigateway put-method-response \
  --rest-api-id abc123 \
  --resource-id def456 \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters '{
    "method.response.header.Access-Control-Allow-Headers": false,
    "method.response.header.Access-Control-Allow-Methods": false,
    "method.response.header.Access-Control-Allow-Origin": false
  }'

aws apigateway put-integration-response \
  --rest-api-id abc123 \
  --resource-id def456 \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters '{
    "method.response.header.Access-Control-Allow-Headers": "'\''Content-Type,Authorization'\''",
    "method.response.header.Access-Control-Allow-Methods": "'\''GET,POST,OPTIONS'\''",
    "method.response.header.Access-Control-Allow-Origin": "'\''*'\''"
  }'

# Don't forget to deploy
aws apigateway create-deployment --rest-api-id abc123 --stage-name prod
```

Or use the simpler console shortcut via CLI:

```bash
# This is easier - use the put-gateway-response for the DEFAULT_4XX
aws apigateway put-gateway-response \
  --rest-api-id abc123 \
  --response-type DEFAULT_4XX \
  --response-parameters '{
    "gatewayresponse.header.Access-Control-Allow-Origin": "'\''*'\''",
    "gatewayresponse.header.Access-Control-Allow-Headers": "'\''*'\''"
  }'
```

## Cause 7: HTTP API vs REST API URL Format

If you accidentally use an HTTP API URL format with a REST API or vice versa, you'll get errors:

```bash
# REST API URL format
https://{api-id}.execute-api.{region}.amazonaws.com/{stage}/{resource}

# HTTP API URL format (when using $default stage)
https://{api-id}.execute-api.{region}.amazonaws.com/{resource}
```

## Debugging Checklist

1. Verify the exact URL matches a resource in your API
2. Check you're using the correct HTTP method
3. Confirm the API has been deployed to the stage
4. Check if IAM auth is required and sign requests accordingly
5. Verify custom domain base path mappings
6. Check if OPTIONS is needed for CORS

Enable execution logs to get more details:

```bash
aws apigateway update-stage \
  --rest-api-id abc123 \
  --stage-name prod \
  --patch-operations '[{"op":"replace","path":"/*/*/logging/loglevel","value":"INFO"}]'
```

Monitor your API endpoints with [OneUptime](https://oneuptime.com/blog/post/aws-cloudwatch-alternatives/view) to catch authentication and routing errors in real-time. The "Missing Authentication Token" error is particularly important to track because it can indicate both configuration issues and potential unauthorized access attempts.
