# How to Fix API Gateway 502 Bad Gateway Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, API Gateway, Lambda, Troubleshooting

Description: Diagnose and fix API Gateway 502 Bad Gateway errors caused by malformed Lambda responses, integration issues, and timeout misconfigurations.

---

You're calling an API Gateway endpoint and getting a 502 Bad Gateway error. The response body might say something like:

```json
{ "message": "Internal server error" }
```

Not very helpful, is it? A 502 from API Gateway almost always means the backend (usually Lambda) returned a response that API Gateway couldn't understand, or the backend failed entirely. Let's go through the most common causes.

## Cause 1: Malformed Lambda Response

This is the most common cause by far. API Gateway expects Lambda to return a response in a very specific format. If your function returns anything else, you get a 502.

The required format for REST API Lambda proxy integration, and HTTP APIs using payload format version 1.0:

```json
{
  "statusCode": 200,
  "headers": {
    "Content-Type": "application/json"
  },
  "body": "{\"message\": \"Hello\"}"
}
```

Key requirements:
- `statusCode` must be an integer (not a string)
- `body` must be a string (not an object)
- `headers` must be an object with string values

For HTTP APIs using payload format version 2.0, API Gateway can infer a response from valid JSON, but if you return this response envelope yourself, `body` still needs to be a string.

### Common Mistakes in Python

```python
# WRONG: body is not a string

def lambda_handler(event, context):
    return {
        'statusCode': 200,
        'body': {'message': 'Hello'}  # This causes a 502!
    }

# WRONG: statusCode is a string
def lambda_handler(event, context):
    return {
        'statusCode': '200',  # Must be an integer
        'body': '{"message": "Hello"}'
    }

# CORRECT
import json

def lambda_handler(event, context):
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json'
        },
        'body': json.dumps({'message': 'Hello'})
    }
```

### Common Mistakes in Node.js

```javascript
// WRONG: Returning undefined (forgetting to return)
exports.handler = async (event) => {
  const data = await fetchData();
  // No return statement!
};

// WRONG: body is an object
exports.handler = async (event) => {
  return {
    statusCode: 200,
    body: { message: 'Hello' }, // Must be a string!
  };
};

// CORRECT
exports.handler = async (event) => {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Hello' }),
  };
};
```

## Cause 2: Lambda Function Throwing an Unhandled Exception

If your Lambda function throws an error that isn't caught, Lambda returns an error response that API Gateway can't parse, resulting in a 502.

Always wrap your handler in try-catch:

```python
import json
import traceback

def lambda_handler(event, context):
    try:
        # Your business logic here
        result = process_event(event)

        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps(result)
        }
    except ValueError as e:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': str(e)})
        }
    except Exception as e:
        # Log the full traceback for debugging
        print(f"Unhandled error: {traceback.format_exc()}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Internal server error'})
        }
```

```javascript
exports.handler = async (event) => {
  try {
    const result = await processEvent(event);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('Unhandled error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
```

## Cause 3: Lambda Timeout

If Lambda takes longer than API Gateway's integration timeout, API Gateway usually returns a 504 Gateway Timeout rather than a 502. It's still worth checking during 502 investigations because timeout errors often show up in the same deployment or integration debugging flow. The default REST API integration timeout is 29 seconds, and the maximum HTTP API integration timeout is 30 seconds. Regional and private REST APIs can request an integration timeout increase beyond 29 seconds, but AWS might reduce the account-level throttle quota.

Check your Lambda timeout:

```bash
# Check Lambda timeout
aws lambda get-function-configuration \
  --function-name my-function \
  --query 'Timeout'
```

If your Lambda timeout is longer than the API Gateway integration timeout, either reduce the Lambda timeout, optimize the function, use an asynchronous workflow, or increase the REST API integration timeout if your API type supports it.

For more on fixing Lambda timeouts, see our guide on [Lambda Task Timed Out errors](https://oneuptime.com/blog/post/2026-02-12-fix-lambda-task-timed-out-errors/view).

## Cause 4: Response Body Too Large

API Gateway has a payload size limit:
- REST API: 10 MB
- HTTP API: 10 MB
- WebSocket API: 128 KB per message, with a 32 KB frame size

For Lambda proxy integrations, also remember that synchronous Lambda invocation responses are limited to 6 MB. If your Lambda returns a response larger than these limits, the request can fail before the client receives your intended response:

```python
import json

def lambda_handler(event, context):
    result = get_large_data()
    response_body = json.dumps(result)

    # Check size before returning
    size_mb = len(response_body.encode('utf-8')) / (1024 * 1024)
    if size_mb > 5:  # Leave some buffer below Lambda's 6MB synchronous response limit
        # Paginate or compress instead
        return {
            'statusCode': 413,
            'body': json.dumps({'error': 'Response too large', 'size_mb': round(size_mb, 2)})
        }

    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json'},
        'body': response_body
    }
```

## Cause 5: Integration Configuration Issues

If you're using a non-Lambda integration (HTTP proxy, VPC link, etc.), the backend might be returning a response that API Gateway can't handle.

Check the integration:

```bash
# Get the integration details for a REST API
aws apigateway get-integration \
  --rest-api-id abc123 \
  --resource-id xyz789 \
  --http-method GET

# For HTTP APIs
aws apigatewayv2 get-integration \
  --api-id abc123 \
  --integration-id def456
```

For HTTP proxy integrations, the backend must return valid HTTP responses with proper headers.

## Debugging with CloudWatch Logs

Enable execution logging on API Gateway to see exactly what's happening:

```bash
# For REST APIs, enable logging on the stage
aws apigateway update-stage \
  --rest-api-id abc123 \
  --stage-name prod \
  --patch-operations '[
    {"op":"replace","path":"/accessLogSettings/destinationArn","value":"arn:aws:logs:us-east-1:123456789012:log-group:api-gateway-logs"},
    {"op":"replace","path":"/accessLogSettings/format","value":"$context.requestId $context.extendedRequestId $context.status $context.integrationStatus $context.error.message"},
    {"op":"replace","path":"/*/*/logging/loglevel","value":"INFO"}
  ]'
```

Then check the execution logs. They'll show you the exact response your Lambda returned, making it easy to spot formatting issues:

```bash
# Search for 502 errors in the logs
aws logs filter-log-events \
  --log-group-name API-Gateway-Execution-Logs_abc123/prod \
  --filter-pattern "502" \
  --start-time $(date -d '1 hour ago' +%s000)
```

## Quick Debugging Checklist

When you get a 502 from API Gateway:

1. Check Lambda logs first - is the function erroring out?
2. Verify the response format - `statusCode` is an integer, `body` is a string
3. Check for unhandled exceptions in your function code
4. Verify Lambda timeout is not longer than the API Gateway integration timeout
5. Check response payload size (under 6 MB for buffered Lambda proxy responses)
6. Enable API Gateway execution logs for more detail

## Helper Function for Consistent Responses

Create a response helper to avoid formatting issues:

```python
import json

def response(status_code, body, headers=None):
    """Create a properly formatted API Gateway response."""
    resp = {
        'statusCode': int(status_code),
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            **(headers or {})
        },
        'body': json.dumps(body) if not isinstance(body, str) else body
    }
    return resp

def lambda_handler(event, context):
    try:
        result = process(event)
        return response(200, result)
    except Exception as e:
        return response(500, {'error': str(e)})
```

Set up monitoring for your API Gateway endpoints with [OneUptime](https://oneuptime.com/blog/post/2026-02-06-aws-cloudwatch-logs-exporter-opentelemetry-collector/view) to catch 502 errors as soon as they start occurring. A spike in 502s usually indicates a code deployment that broke the response format.
