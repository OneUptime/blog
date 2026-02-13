# How to Use Lambda Function URLs for Simple HTTP Endpoints

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, Function URLs, HTTP, Serverless

Description: Learn how to use Lambda Function URLs to create HTTP endpoints without API Gateway, including setup, authentication options, CORS configuration, and when to use them.

---

API Gateway is powerful, but sometimes it's more than you need. If you just want a simple HTTPS endpoint that triggers a Lambda function - no rate limiting, no request validation, no usage plans - Lambda Function URLs give you exactly that with zero extra infrastructure.

Function URLs were introduced in 2022, and they provide a dedicated HTTPS endpoint for your Lambda function. No API Gateway, no ALB, no CloudFront. Just a URL that maps directly to your function. Let's see how to set them up and when they make sense.

## Creating a Function URL

You can add a Function URL to any Lambda function through the console, CLI, or Infrastructure as Code.

Using the AWS CLI:

```bash
# Create a Function URL with no authentication (publicly accessible)
aws lambda create-function-url-config \
  --function-name my-api-handler \
  --auth-type NONE

# The response includes the URL
# {
#   "FunctionUrl": "https://abc123xyz.lambda-url.us-east-1.on.aws/",
#   "AuthType": "NONE"
# }
```

You also need to add a resource-based policy to allow public access:

```bash
# Allow public invocations via the Function URL
aws lambda add-permission \
  --function-name my-api-handler \
  --statement-id FunctionURLPublicAccess \
  --action lambda:InvokeFunctionUrl \
  --principal "*" \
  --function-url-auth-type NONE
```

Using CloudFormation:

```yaml
# Lambda function with a public Function URL
Resources:
  MyFunction:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: my-api-handler
      Runtime: nodejs20.x
      Handler: index.handler
      Code:
        ZipFile: |
          exports.handler = async (event) => {
            return {
              statusCode: 200,
              body: JSON.stringify({ message: 'Hello from Function URL!' }),
            };
          };

  # Create the Function URL
  MyFunctionUrl:
    Type: AWS::Lambda::Url
    Properties:
      TargetFunctionArn: !Ref MyFunction
      AuthType: NONE
      Cors:
        AllowOrigins:
          - "*"
        AllowMethods:
          - GET
          - POST

  # Permission for public access
  MyFunctionUrlPermission:
    Type: AWS::Lambda::Permission
    Properties:
      FunctionName: !Ref MyFunction
      Action: lambda:InvokeFunctionUrl
      Principal: "*"
      FunctionUrlAuthType: NONE
```

## Handling HTTP Requests

When a request hits your Function URL, Lambda receives an event object with the HTTP request details. The format is similar to API Gateway v2 (HTTP API) payloads:

```javascript
// Handle HTTP requests from a Function URL
exports.handler = async (event) => {
  // Request details are in the event object
  const method = event.requestContext.http.method;
  const path = event.rawPath;
  const queryParams = event.queryStringParameters || {};
  const headers = event.headers;

  // Parse the body for POST/PUT requests
  let body = null;
  if (event.body) {
    body = event.isBase64Encoded
      ? JSON.parse(Buffer.from(event.body, 'base64').toString())
      : JSON.parse(event.body);
  }

  console.log(`${method} ${path}`, { queryParams, body });

  // Route based on method and path
  if (method === 'GET' && path === '/health') {
    return {
      statusCode: 200,
      body: JSON.stringify({ status: 'ok', timestamp: Date.now() }),
    };
  }

  if (method === 'POST' && path === '/webhook') {
    await processWebhook(body);
    return { statusCode: 202, body: JSON.stringify({ accepted: true }) };
  }

  // Return 404 for unmatched routes
  return {
    statusCode: 404,
    body: JSON.stringify({ error: 'Not found' }),
  };
};
```

## Simple Routing

For a Function URL that handles multiple routes, you can build a lightweight router:

```javascript
// Minimal router for Function URL handlers
class Router {
  constructor() {
    this.routes = [];
  }

  get(path, handler) { this.routes.push({ method: 'GET', path, handler }); }
  post(path, handler) { this.routes.push({ method: 'POST', path, handler }); }
  put(path, handler) { this.routes.push({ method: 'PUT', path, handler }); }
  delete(path, handler) { this.routes.push({ method: 'DELETE', path, handler }); }

  async handle(event) {
    const method = event.requestContext.http.method;
    const path = event.rawPath;

    const route = this.routes.find(r => r.method === method && r.path === path);

    if (!route) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Not found' }) };
    }

    return route.handler(event);
  }
}

// Set up routes
const router = new Router();

router.get('/users', async (event) => {
  const users = await getUsers();
  return { statusCode: 200, body: JSON.stringify(users) };
});

router.post('/users', async (event) => {
  const body = JSON.parse(event.body);
  const user = await createUser(body);
  return { statusCode: 201, body: JSON.stringify(user) };
});

router.get('/health', async () => {
  return { statusCode: 200, body: JSON.stringify({ status: 'healthy' }) };
});

exports.handler = (event) => router.handle(event);
```

## CORS Configuration

If your Function URL is called from a browser, you need to configure CORS:

```bash
# Update Function URL with CORS settings
aws lambda update-function-url-config \
  --function-name my-api-handler \
  --cors '{
    "AllowOrigins": ["https://myapp.com"],
    "AllowMethods": ["GET", "POST", "PUT", "DELETE"],
    "AllowHeaders": ["content-type", "authorization"],
    "MaxAge": 86400
  }'
```

Lambda handles the preflight OPTIONS requests automatically when CORS is configured on the Function URL. You don't need to handle them in your code.

## Response Streaming

Function URLs support response streaming, which is useful for large responses or server-sent events:

```javascript
// Stream a large response instead of buffering it
const { pipeline } = require('stream/promises');

exports.handler = awslambda.streamifyResponse(async (event, responseStream, context) => {
  // Set the content type via metadata
  const metadata = {
    statusCode: 200,
    headers: { 'Content-Type': 'text/plain' },
  };

  responseStream = awslambda.HttpResponseStream.from(responseStream, metadata);

  // Stream data in chunks
  for (let i = 0; i < 100; i++) {
    responseStream.write(`Line ${i}: Processing batch ${i}...\n`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  responseStream.end();
});
```

## When to Use Function URLs vs API Gateway

Function URLs are great for:

- **Webhooks** - Simple endpoints that receive callbacks from external services
- **Health checks** - Quick status endpoints for monitoring
- **Internal microservices** - Services that communicate within your infrastructure
- **Prototyping** - Quick HTTP endpoints without the API Gateway overhead
- **Single-function APIs** - When you only need one or two endpoints

Stick with API Gateway when you need:

- Rate limiting and throttling
- Request validation
- API keys and usage plans
- Custom domain names with multiple routes
- Request/response transformations
- WAF integration

Here's a quick comparison:

| Feature | Function URL | API Gateway |
|---|---|---|
| Cost | Free (pay only for Lambda) | ~$1 per million requests |
| Custom domains | Not directly supported | Built-in |
| Rate limiting | No | Yes |
| Auth | IAM or none | IAM, Cognito, API keys, custom |
| Response streaming | Yes | Limited |
| Latency | Lower | Slightly higher |

## Using Function URLs as Webhook Endpoints

One of the most common uses is receiving webhooks from services like Stripe, GitHub, or Slack:

```javascript
// Webhook handler with signature verification (Stripe example)
const crypto = require('crypto');

exports.handler = async (event) => {
  const signature = event.headers['stripe-signature'];
  const body = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString()
    : event.body;

  // Verify the webhook signature
  const expectedSig = crypto
    .createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  if (!crypto.timingSafeEqual(
    Buffer.from(signature.split(',')[1].split('=')[1]),
    Buffer.from(expectedSig)
  )) {
    return { statusCode: 401, body: 'Invalid signature' };
  }

  const webhookEvent = JSON.parse(body);

  // Process the webhook
  switch (webhookEvent.type) {
    case 'payment_intent.succeeded':
      await handlePaymentSuccess(webhookEvent.data.object);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionCanceled(webhookEvent.data.object);
      break;
    default:
      console.log(`Unhandled event type: ${webhookEvent.type}`);
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
```

For securing Function URLs with IAM authentication instead, see our post on [securing Lambda Function URLs with IAM Auth](https://oneuptime.com/blog/post/2026-02-12-secure-lambda-function-urls-with-iam-auth/view).

## Testing Function URLs

You can test your Function URL with curl:

```bash
# Test a GET endpoint
curl https://abc123xyz.lambda-url.us-east-1.on.aws/health

# Test a POST endpoint with JSON body
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User", "email": "test@example.com"}' \
  https://abc123xyz.lambda-url.us-east-1.on.aws/users
```

## Wrapping Up

Lambda Function URLs are the simplest way to expose a Lambda function over HTTP. No additional services, no extra costs, no configuration complexity. They're perfect for webhooks, health checks, internal services, and simple APIs. For anything that needs rate limiting, custom domains, or advanced authentication, API Gateway is still the right choice. But for straightforward HTTP endpoints, Function URLs get you up and running in minutes.
