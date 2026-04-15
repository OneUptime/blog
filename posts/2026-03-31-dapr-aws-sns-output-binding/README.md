# How to Use Dapr AWS SNS Output Binding for Notifications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, AWS, SNS, Binding, Notification

Description: Learn how to configure and use the Dapr AWS SNS output binding to send push notifications, SMS, and fan-out messages to multiple subscribers from your microservices.

---

## What Is the Dapr AWS SNS Output Binding?

Amazon Simple Notification Service (SNS) is a managed pub/sub messaging service that supports email, SMS, push notifications, HTTP endpoints, and SQS queue fan-out. The Dapr AWS SNS output binding lets your microservices publish messages to SNS topics using a simple binding call, without managing the AWS SDK directly.

## Setting Up the SNS Binding Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: notification-hub
  namespace: default
spec:
  type: bindings.aws.sns
  version: v1
  metadata:
    - name: topicArn
      value: "arn:aws:sns:us-east-1:123456789012:application-alerts"
    - name: region
      value: "us-east-1"
    - name: accessKey
      secretKeyRef:
        name: aws-secrets
        key: accessKey
    - name: secretKey
      secretKeyRef:
        name: aws-secrets
        key: secretKey
```

Create the SNS topic:

```bash
aws sns create-topic \
  --name application-alerts \
  --region us-east-1
```

## Publishing a Message to SNS

The Dapr SNS binding expects the data payload to contain a `message` field (the SNS message body) and an optional `subject` field. To include structured data, serialize it as a JSON string inside the `message` field:

```javascript
const { DaprClient } = require("@dapr/dapr");
const client = new DaprClient();

async function sendAlert(alertType, alertMessage, severity) {
  await client.binding.send("notification-hub", "create", {
    message: JSON.stringify({
      alertType,
      message: alertMessage,
      severity,
      timestamp: new Date().toISOString(),
      source: "order-service",
    }),
    subject: `Alert: ${alertType}`,
  });

  console.log(`Alert published: ${alertType}`);
}

await sendAlert("PAYMENT_FAILED", "Payment declined for order ORD-001", "HIGH");
```

## Filtering Messages by Attribute

SNS supports message attributes for subscription filtering. However, the Dapr SNS output binding does not currently pass through message attributes from invoke metadata to the SNS API. To use SNS message attributes for filtering, you need to use the AWS SDK directly:

```javascript
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");
const snsClient = new SNSClient({ region: "us-east-1" });

async function publishEvent(event) {
  await snsClient.send(
    new PublishCommand({
      TopicArn: "arn:aws:sns:us-east-1:123456789012:application-alerts",
      Message: JSON.stringify(event),
      MessageAttributes: {
        eventType: {
          DataType: "String",
          StringValue: event.type,
        },
        severity: {
          DataType: "String",
          StringValue: event.severity || "INFO",
        },
        region: {
          DataType: "String",
          StringValue: event.region || "us-east-1",
        },
      },
    })
  );
}
```

## Fan-Out to SQS Queues

A common pattern is SNS + SQS fan-out, where one SNS topic delivers to multiple SQS queues:

```bash
# Create subscriber queues
aws sqs create-queue --queue-name orders-processor-queue
aws sqs create-queue --queue-name orders-audit-queue
aws sqs create-queue --queue-name orders-analytics-queue

# Subscribe each queue to the SNS topic
TOPIC_ARN="arn:aws:sns:us-east-1:123456789012:order-events"

aws sns subscribe \
  --topic-arn $TOPIC_ARN \
  --protocol sqs \
  --notification-endpoint arn:aws:sqs:us-east-1:123456789012:orders-processor-queue

aws sns subscribe \
  --topic-arn $TOPIC_ARN \
  --protocol sqs \
  --notification-endpoint arn:aws:sqs:us-east-1:123456789012:orders-audit-queue
```

Now publish once to SNS and it delivers to all queues:

```javascript
await client.binding.send("notification-hub", "create", {
  message: JSON.stringify({
    orderId: "ORD-001",
    status: "PLACED",
    customerId: "CUST-42",
  }),
  subject: "Order Event",
});
```

## Sending SMS via SNS

The Dapr SNS output binding does not support direct SMS publishing via a phone number. To send SMS through SNS, create an SNS topic with SMS subscriptions and publish to that topic using the Dapr binding, or use the AWS SDK directly for phone-number-targeted SMS:

```javascript
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");
const snsClient = new SNSClient({ region: "us-east-1" });

async function sendSMSAlert(phoneNumber, message) {
  await snsClient.send(
    new PublishCommand({
      PhoneNumber: phoneNumber,
      Message: message,
      MessageAttributes: {
        "AWS.SNS.SMS.SMSType": {
          DataType: "String",
          StringValue: "Transactional",
        },
      },
    })
  );
}

await sendSMSAlert("+15551234567", "Critical alert: Database is down. Check ops channel immediately.");
```

## FIFO Topics for Ordered Delivery

SNS supports FIFO topics for ordered message delivery. However, the Dapr SNS output binding does not currently support the required `MessageGroupId` and `MessageDeduplicationId` parameters. Publishing to a FIFO topic through Dapr will fail because these fields are mandatory for FIFO topics. To use FIFO topics, use the AWS SDK directly:

```javascript
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");
const snsClient = new SNSClient({ region: "us-east-1" });

await snsClient.send(
  new PublishCommand({
    TopicArn: "arn:aws:sns:us-east-1:123456789012:payment-events.fifo",
    Message: JSON.stringify(payload),
    MessageGroupId: `order-${orderId}`,
    MessageDeduplicationId: `${orderId}-${eventType}-${Date.now()}`,
  })
);
```

## Summary

The Dapr AWS SNS output binding provides a straightforward way to publish notifications, alerts, and events to SNS topics from any microservice. SNS's fan-out capability means a single publish reaches multiple SQS queues, email addresses, SMS numbers, or HTTP endpoints simultaneously. Combined with message attributes and filtering, this builds flexible notification architectures with minimal code.
