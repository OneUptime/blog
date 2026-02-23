# How to Create Lambda Function URLs in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Lambda, Function URLs, Serverless, HTTP

Description: Learn how to create AWS Lambda Function URLs with Terraform to expose Lambda functions over HTTPS without API Gateway, including authentication, CORS, and custom domains.

---

Lambda Function URLs give your function a dedicated HTTPS endpoint without needing API Gateway. No additional infrastructure, no extra cost, no configuration complexity. You get a URL like `https://abc123.lambda-url.us-east-1.on.aws/` that maps directly to your function. For simple webhooks, internal APIs, or quick prototypes, this is often all you need.

Function URLs were introduced as a simpler alternative to API Gateway for cases where you do not need the full feature set of routing, request transformation, or usage plans. This guide shows you how to set them up in Terraform with both public and IAM-authenticated access.

## Basic Function URL

```hcl
# Lambda function
resource "aws_lambda_function" "webhook" {
  function_name = "webhook-handler"
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  role          = aws_iam_role.lambda_exec.arn
  timeout       = 30

  filename         = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256

  tags = {
    Name = "webhook-handler"
  }
}

data "archive_file" "lambda" {
  type        = "zip"
  source_dir  = "${path.module}/lambda"
  output_path = "${path.module}/lambda.zip"
}

# Function URL with no authentication (public)
resource "aws_lambda_function_url" "webhook" {
  function_name      = aws_lambda_function.webhook.function_name
  authorization_type = "NONE"
  # NONE = public access, anyone can call the URL
  # AWS_IAM = requires IAM authentication

  cors {
    allow_credentials = true
    allow_headers     = ["Content-Type", "Authorization"]
    allow_methods     = ["GET", "POST", "PUT", "DELETE"]
    allow_origins     = ["https://myapp.com"]
    expose_headers    = ["X-Request-Id"]
    max_age           = 3600
  }
}

# IAM role
resource "aws_iam_role" "lambda_exec" {
  name = "webhook-handler-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
```

## IAM-Authenticated Function URL

For internal services or service-to-service communication, use IAM authentication:

```hcl
# Function URL with IAM authentication
resource "aws_lambda_function_url" "internal_api" {
  function_name      = aws_lambda_function.internal.function_name
  authorization_type = "AWS_IAM"
}

# Resource-based policy allowing specific IAM roles to invoke
resource "aws_lambda_permission" "allow_caller" {
  statement_id           = "AllowCallerInvoke"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.internal.function_name
  principal              = var.caller_role_arn
  function_url_auth_type = "AWS_IAM"
}
```

The calling service needs to sign requests with SigV4. Most AWS SDKs handle this automatically:

```python
# Calling an IAM-authenticated function URL
import boto3
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest
import requests

def call_function_url(url, payload):
    session = boto3.Session()
    credentials = session.get_credentials()
    creds = credentials.get_frozen_credentials()

    request = AWSRequest(method='POST', url=url, data=payload)
    SigV4Auth(creds, 'lambda', 'us-east-1').add_auth(request)

    response = requests.post(
        url,
        data=payload,
        headers=dict(request.headers)
    )
    return response.json()
```

## The Lambda Handler for Function URLs

Function URLs send a different event format than API Gateway. The payload format is similar to API Gateway v2:

```javascript
// index.js - Lambda handler for function URL
exports.handler = async (event) => {
    // Request details
    const method = event.requestContext.http.method;
    const path = event.requestContext.http.path;
    const queryParams = event.queryStringParameters || {};
    const headers = event.headers;

    // Body handling
    let body = null;
    if (event.body) {
        body = event.isBase64Encoded
            ? Buffer.from(event.body, 'base64').toString()
            : event.body;

        if (headers['content-type'] === 'application/json') {
            body = JSON.parse(body);
        }
    }

    console.log(`${method} ${path}`, { queryParams, body });

    // Route handling (simple example)
    if (method === 'GET' && path === '/health') {
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'healthy' })
        };
    }

    if (method === 'POST' && path === '/webhook') {
        // Process the webhook
        await processWebhook(body);
        return {
            statusCode: 200,
            body: JSON.stringify({ received: true })
        };
    }

    return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Not found' })
    };
};

async function processWebhook(data) {
    console.log('Processing webhook:', data);
    // Your logic here
}
```

## Function URL with Alias

You can create function URLs on specific aliases, which is useful for versioned deployments:

```hcl
# Lambda alias for the live version
resource "aws_lambda_alias" "live" {
  name             = "live"
  function_name    = aws_lambda_function.webhook.function_name
  function_version = aws_lambda_function.webhook.version
}

# Function URL on the alias
resource "aws_lambda_function_url" "live" {
  function_name      = aws_lambda_function.webhook.function_name
  qualifier          = aws_lambda_alias.live.name
  authorization_type = "NONE"

  cors {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST"]
  }
}
```

## Streaming Response

Function URLs support response streaming, which is useful for large responses:

```hcl
resource "aws_lambda_function_url" "streaming" {
  function_name      = aws_lambda_function.streaming_handler.function_name
  authorization_type = "NONE"

  # Enable streaming responses
  invoke_mode = "RESPONSE_STREAM"
  # Default is BUFFERED, which waits for the full response
}
```

The Lambda function then writes to the response stream:

```javascript
// Handler with response streaming (Node.js)
exports.handler = awslambda.streamifyResponse(
    async (event, responseStream, context) => {
        responseStream.setContentType('application/json');

        // Write data incrementally
        responseStream.write('{"items": [');

        for (let i = 0; i < 100; i++) {
            const item = JSON.stringify({ id: i, data: `item-${i}` });
            responseStream.write(i > 0 ? `,${item}` : item);
            // Each write is sent to the client immediately
        }

        responseStream.write(']}');
        responseStream.end();
    }
);
```

## Throttling and Rate Limiting

Function URLs do not have built-in throttling like API Gateway. You control concurrency through Lambda reserved concurrency:

```hcl
# Limit concurrent executions to prevent overload
resource "aws_lambda_function" "webhook" {
  function_name = "webhook-handler"
  # ... other config ...

  # Reserve concurrency to limit simultaneous invocations
  reserved_concurrent_executions = 100
}
```

If you need proper rate limiting, request validation, or API keys, use API Gateway instead of function URLs.

## Custom Domain with CloudFront

Function URLs do not support custom domains directly. To use your own domain, put CloudFront in front:

```hcl
# CloudFront distribution in front of the function URL
resource "aws_cloudfront_distribution" "api" {
  origin {
    # Extract the domain from the function URL
    domain_name = replace(
      replace(aws_lambda_function_url.webhook.function_url, "https://", ""),
      "/", ""
    )
    origin_id = "lambda-function-url"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  enabled = true
  aliases = ["api.myapp.com"]

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "lambda-function-url"

    # Do not cache API responses
    cache_policy_id          = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"  # CachingDisabled
    origin_request_policy_id = "b689b0a8-53d0-40ab-baf2-68738e2966ac"  # AllViewerExceptHostHeader

    viewer_protocol_policy = "redirect-to-https"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = var.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Name = "api-distribution"
  }
}
```

## Outputs

```hcl
output "function_url" {
  description = "The Lambda Function URL"
  value       = aws_lambda_function_url.webhook.function_url
}

output "function_url_id" {
  description = "The Function URL unique identifier"
  value       = aws_lambda_function_url.webhook.url_id
}
```

## Function URLs vs API Gateway

Choose Function URLs when:
- You need a simple HTTP endpoint for webhooks or callbacks
- You want minimal setup and no extra costs
- You do not need request routing, transformation, or API keys
- Response streaming is required

Choose API Gateway when:
- You need request routing to multiple Lambda functions
- You need rate limiting, API keys, or usage plans
- You need request/response transformation
- You need WebSocket support
- You need WAF integration

## Summary

Lambda Function URLs in Terraform are created with `aws_lambda_function_url` - just one resource plus the function itself. Set `authorization_type` to `"NONE"` for public endpoints or `"AWS_IAM"` for authenticated access. Configure CORS directly on the function URL resource. For custom domains, put CloudFront in front. Function URLs are the simplest way to expose a Lambda function over HTTP, but they trade simplicity for the advanced features that API Gateway provides.
