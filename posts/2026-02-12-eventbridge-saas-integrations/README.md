# Use EventBridge with SaaS Integrations

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EventBridge, SaaS, Integration, Serverless

Description: Learn how to connect third-party SaaS applications to your AWS architecture using Amazon EventBridge partner event sources and API destinations.

---

One of the most powerful things about EventBridge is that it doesn't just work with AWS services. It can receive events from dozens of SaaS partners like Shopify, Zendesk, Twilio, Auth0, Datadog, and others. It can also send events to any HTTP endpoint using API destinations. This turns EventBridge into a bridge between your SaaS tools and your AWS infrastructure.

## Two Ways to Integrate SaaS

There are two main approaches. Partner event sources let SaaS providers push events directly into your EventBridge bus. API destinations let you send events from EventBridge to any external HTTP API.

```mermaid
graph LR
    subgraph "Inbound - Partner Events"
        Shopify[Shopify] --> PES[Partner Event Source]
        PES --> EB1[EventBridge Bus]
        EB1 --> Lambda1[Lambda]
    end
    subgraph "Outbound - API Destinations"
        EB2[EventBridge Bus] --> AD[API Destination]
        AD --> Slack[Slack API]
    end
```

## Setting Up Partner Event Sources

Partner event sources are pre-built integrations maintained by the SaaS provider. The setup involves configuring the SaaS side to send events and linking that to an EventBridge bus on your side.

Here's the general flow:

1. Go to the SaaS provider's dashboard and enable EventBridge integration
2. Provide your AWS account ID and region
3. The provider creates a partner event source in your account
4. You associate that event source with an event bus
5. Create rules on that bus to process events

This associates a partner event source with a new event bus:

```bash
# List available partner event sources
aws events list-event-sources

# Create an event bus from the partner event source
aws events create-event-bus \
  --name shopify-events \
  --event-source-name aws.partner/shopify.com/store-12345/orders
```

Once associated, events from the partner start flowing into your bus automatically.

## Processing SaaS Events

Partner events arrive in a standard EventBridge format with the partner's data in the `detail` field.

This rule matches Shopify order events:

```bash
aws events put-rule \
  --name shopify-new-orders \
  --event-bus-name shopify-events \
  --event-pattern '{
    "source": ["aws.partner/shopify.com"],
    "detail-type": ["orders/create"]
  }' \
  --description "Process new Shopify orders"
```

The Lambda function that handles these events:

```javascript
// processShopifyOrder.js - Handles incoming Shopify order events
exports.handler = async (event) => {
  // The Shopify order data is in event.detail
  const order = event.detail;

  console.log(`New Shopify order: ${order.id}`);
  console.log(`Customer: ${order.customer.email}`);
  console.log(`Total: ${order.total_price} ${order.currency}`);

  // Sync to your internal systems
  await syncToInventory(order.line_items);
  await syncToCRM(order.customer);
  await createInternalOrder(order);

  return { processed: true, orderId: order.id };
};

async function syncToInventory(lineItems) {
  for (const item of lineItems) {
    console.log(`Updating inventory for ${item.sku}: -${item.quantity}`);
    // Update your inventory system
  }
}

async function syncToCRM(customer) {
  console.log(`Syncing customer ${customer.email} to CRM`);
  // Update your CRM
}

async function createInternalOrder(order) {
  console.log(`Creating internal order record for ${order.id}`);
  // Create in DynamoDB or other data store
}
```

## API Destinations for Outbound Events

API destinations let you send events to any HTTP endpoint. This is how you integrate with services that don't have partner event sources, or when you want to push events outbound.

First, create a connection with authentication credentials:

```bash
# Create a connection with API key auth
aws events create-connection \
  --name slack-connection \
  --authorization-type API_KEY \
  --auth-parameters '{
    "ApiKeyAuthParameters": {
      "ApiKeyName": "Authorization",
      "ApiKeyValue": "Bearer xoxb-your-slack-bot-token"
    }
  }'
```

Then create the API destination:

```bash
aws events create-api-destination \
  --name slack-notifications \
  --connection-arn arn:aws:events:us-east-1:123456789:connection/slack-connection \
  --invocation-endpoint "https://slack.com/api/chat.postMessage" \
  --http-method POST \
  --invocation-rate-limit-per-second 10
```

Now use it as a rule target with input transformation:

```bash
aws events put-targets \
  --rule high-value-order \
  --targets '[{
    "Id": "slack-alert",
    "Arn": "arn:aws:events:us-east-1:123456789:api-destination/slack-notifications",
    "RoleArn": "arn:aws:iam::123456789:role/EventBridgeApiDestRole",
    "InputTransformer": {
      "InputPathsMap": {
        "orderId": "$.detail.orderId",
        "total": "$.detail.total",
        "customer": "$.detail.customerName"
      },
      "InputTemplate": "{ \"channel\": \"#sales-alerts\", \"text\": \"New high-value order <orderId> from <customer> for $<total>\" }"
    }
  }]'
```

## Authentication Types

API destinations support three authentication methods:

**API Key** - Sends a key-value pair in the header. Good for simple API tokens:

```json
{
  "ApiKeyAuthParameters": {
    "ApiKeyName": "x-api-key",
    "ApiKeyValue": "your-api-key-here"
  }
}
```

**Basic Auth** - Sends username and password as Base64:

```json
{
  "BasicAuthParameters": {
    "Username": "api-user",
    "Password": "api-password"
  }
}
```

**OAuth** - Handles the full OAuth client credentials flow:

```json
{
  "OAuthParameters": {
    "AuthorizationEndpoint": "https://auth.example.com/oauth/token",
    "HttpMethod": "POST",
    "ClientParameters": {
      "ClientID": "your-client-id",
      "ClientSecret": "your-client-secret"
    },
    "OAuthHttpParameters": {
      "BodyParameters": [
        {
          "Key": "grant_type",
          "Value": "client_credentials",
          "IsValueSecret": false
        }
      ]
    }
  }
}
```

EventBridge handles token refresh automatically with OAuth connections.

## Webhook Integration Pattern

Many SaaS tools send webhooks. You can receive these through API Gateway and forward them to EventBridge.

This Lambda function receives webhooks and publishes them as EventBridge events:

```javascript
// webhookReceiver.js - Converts incoming webhooks to EventBridge events
const { EventBridgeClient, PutEventsCommand }
  = require('@aws-sdk/client-eventbridge');
const crypto = require('crypto');

const ebClient = new EventBridgeClient({});

exports.handler = async (event) => {
  const body = JSON.parse(event.body);
  const source = event.headers['x-webhook-source'] || 'unknown';

  // Verify webhook signature if provided
  const signature = event.headers['x-webhook-signature'];
  if (signature) {
    const expectedSig = crypto
      .createHmac('sha256', process.env.WEBHOOK_SECRET)
      .update(event.body)
      .digest('hex');

    if (signature !== expectedSig) {
      return { statusCode: 401, body: 'Invalid signature' };
    }
  }

  // Publish to EventBridge
  await ebClient.send(new PutEventsCommand({
    Entries: [{
      EventBusName: 'saas-events',
      Source: `webhook.${source}`,
      DetailType: body.event || body.type || 'WebhookEvent',
      Detail: JSON.stringify(body)
    }]
  }));

  return {
    statusCode: 200,
    body: JSON.stringify({ received: true })
  };
};
```

## Real-World Example: Multi-SaaS Event Pipeline

Here's a practical architecture that aggregates events from multiple SaaS tools.

This SAM template sets up a multi-source event pipeline:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Resources:
  SaasEventBus:
    Type: AWS::Events::EventBus
    Properties:
      Name: saas-events

  # Process Zendesk ticket events
  ZendeskTicketRule:
    Type: AWS::Events::Rule
    Properties:
      EventBusName: !Ref SaasEventBus
      EventPattern:
        source:
          - prefix: "webhook.zendesk"
        detail-type:
          - ticket.created
          - ticket.updated
      Targets:
        - Id: process-ticket
          Arn: !GetAtt TicketProcessorFunction.Arn

  # Send alerts to Slack for critical events
  CriticalAlertRule:
    Type: AWS::Events::Rule
    Properties:
      EventBusName: !Ref SaasEventBus
      EventPattern:
        detail:
          priority:
            - critical
            - urgent
      Targets:
        - Id: slack-alert
          Arn: !GetAtt SlackDestination.Arn
          RoleArn: !GetAtt ApiDestRole.Arn

  # Sync all events to analytics
  AnalyticsRule:
    Type: AWS::Events::Rule
    Properties:
      EventBusName: !Ref SaasEventBus
      EventPattern:
        source:
          - prefix: "webhook"
      Targets:
        - Id: analytics-queue
          Arn: !GetAtt AnalyticsQueue.Arn

  SlackConnection:
    Type: AWS::Events::Connection
    Properties:
      AuthorizationType: API_KEY
      AuthParameters:
        ApiKeyAuthParameters:
          ApiKeyName: Authorization
          ApiKeyValue: !Sub "Bearer {{resolve:secretsmanager:slack-token}}"

  SlackDestination:
    Type: AWS::Events::ApiDestination
    Properties:
      ConnectionArn: !GetAtt SlackConnection.Arn
      InvocationEndpoint: https://slack.com/api/chat.postMessage
      HttpMethod: POST
      InvocationRateLimitPerSecond: 5

  TicketProcessorFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: processTicket.handler
      Runtime: nodejs20.x

  AnalyticsQueue:
    Type: AWS::SQS::Queue
```

## Rate Limiting and Error Handling

API destinations have built-in rate limiting (configurable per destination) and retry logic. If the external API returns a 429 or 5xx error, EventBridge retries with backoff.

You can also configure a dead letter queue on the rule target to capture events that fail after all retries:

```bash
aws events put-targets \
  --rule slack-alert-rule \
  --targets '[{
    "Id": "slack",
    "Arn": "arn:aws:events:us-east-1:123456789:api-destination/slack-notifications",
    "RoleArn": "arn:aws:iam::123456789:role/ApiDestRole",
    "DeadLetterConfig": {
      "Arn": "arn:aws:sqs:us-east-1:123456789:failed-notifications"
    },
    "RetryPolicy": {
      "MaximumRetryAttempts": 5,
      "MaximumEventAgeInSeconds": 3600
    }
  }]'
```

## Monitoring SaaS Integrations

Monitor your partner event sources and API destinations through CloudWatch. Watch for `FailedInvocations` on your rules and check your DLQ regularly for events that couldn't be delivered. For broader monitoring practices, check out our guide on [EventBridge archive and replay for debugging](https://oneuptime.com/blog/post/2026-02-12-eventbridge-archive-replay-event-debugging/view).

## Wrapping Up

EventBridge's SaaS integrations let you build event-driven systems that span your entire technology stack, not just AWS. Partner event sources bring third-party events in. API destinations push events out. And the webhook receiver pattern fills the gaps for services that don't have native integrations. The result is a unified event backbone that connects your SaaS tools, AWS services, and custom applications.
