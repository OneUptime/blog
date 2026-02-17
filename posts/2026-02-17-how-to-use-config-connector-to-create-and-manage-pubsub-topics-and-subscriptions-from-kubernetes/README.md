# How to Use Config Connector to Create and Manage Pub/Sub Topics and Subscriptions from Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Pub/Sub, Config Connector, Kubernetes, Messaging

Description: Step-by-step guide to creating and managing Google Cloud Pub/Sub topics and subscriptions using Config Connector custom resources in Kubernetes.

---

Google Cloud Pub/Sub is one of the most commonly used services for event-driven architectures on GCP. If you are running workloads on GKE and using Config Connector, you can manage your Pub/Sub infrastructure right alongside your application deployments. No more switching between kubectl and gcloud, and no more drift between what is defined in code and what actually exists.

This guide covers everything from simple topic creation to advanced subscription configurations with dead letter queues and push endpoints.

## Prerequisites

Make sure you have these in place:

- Config Connector installed on your GKE cluster
- Workload Identity configured for Config Connector
- The Config Connector service account has `roles/pubsub.admin`
- The Pub/Sub API is enabled

```bash
# Enable Pub/Sub API and grant the necessary role
gcloud services enable pubsub.googleapis.com --project=my-project-id

gcloud projects add-iam-policy-binding my-project-id \
  --member="serviceAccount:cnrm-sa@my-project-id.iam.gserviceaccount.com" \
  --role="roles/pubsub.admin"
```

## Creating a Basic Topic

The simplest Pub/Sub resource is a topic with no extra configuration.

```yaml
# basic-topic.yaml
# Creates a standard Pub/Sub topic
apiVersion: pubsub.cnrm.cloud.google.com/v1beta1
kind: PubSubTopic
metadata:
  name: user-events
  namespace: default
  annotations:
    cnrm.cloud.google.com/project-id: "my-project-id"
spec: {}
```

Apply and verify.

```bash
# Create the topic
kubectl apply -f basic-topic.yaml

# Check that it is ready
kubectl get pubsubtopic user-events
```

## Creating a Topic with Message Retention

For topics where you want to replay messages or ensure durability, configure message retention.

```yaml
# retained-topic.yaml
# Creates a topic that retains messages for 7 days
apiVersion: pubsub.cnrm.cloud.google.com/v1beta1
kind: PubSubTopic
metadata:
  name: order-events
  namespace: default
  annotations:
    cnrm.cloud.google.com/project-id: "my-project-id"
spec:
  # Retain messages for 7 days (in seconds)
  messageRetentionDuration: "604800s"
```

Message retention on the topic level is separate from subscription-level retention. Topic retention means undelivered messages stay in the topic, which is useful for creating new subscriptions that can seek back in time.

## Creating a Topic with Schema Validation

If you want to enforce message structure, use a schema.

```yaml
# schema.yaml
# Defines an Avro schema for order event messages
apiVersion: pubsub.cnrm.cloud.google.com/v1beta1
kind: PubSubSchema
metadata:
  name: order-event-schema
  namespace: default
  annotations:
    cnrm.cloud.google.com/project-id: "my-project-id"
spec:
  type: AVRO
  definition: |
    {
      "type": "record",
      "name": "OrderEvent",
      "fields": [
        {"name": "order_id", "type": "string"},
        {"name": "customer_id", "type": "string"},
        {"name": "amount", "type": "double"},
        {"name": "timestamp", "type": "long"}
      ]
    }
```

```yaml
# schema-topic.yaml
# Creates a topic that validates messages against the order event schema
apiVersion: pubsub.cnrm.cloud.google.com/v1beta1
kind: PubSubTopic
metadata:
  name: validated-order-events
  namespace: default
  annotations:
    cnrm.cloud.google.com/project-id: "my-project-id"
spec:
  schemaSettings:
    schemaRef:
      name: order-event-schema
    encoding: JSON
```

Messages published to this topic that do not match the schema will be rejected.

## Creating a Pull Subscription

Pull subscriptions are the most common type. Your application polls for messages at its own pace.

```yaml
# pull-subscription.yaml
# Creates a pull subscription with sensible production defaults
apiVersion: pubsub.cnrm.cloud.google.com/v1beta1
kind: PubSubSubscription
metadata:
  name: order-processor
  namespace: default
  annotations:
    cnrm.cloud.google.com/project-id: "my-project-id"
spec:
  topicRef:
    name: order-events
  # Time to acknowledge before the message is redelivered
  ackDeadlineSeconds: 60
  # Keep acknowledged messages for 24 hours for replay
  retainAckedMessages: true
  messageRetentionDuration: "86400s"
  # Enable exactly-once delivery
  enableExactlyOnceDelivery: true
  # Expiration policy - never expire
  expirationPolicy:
    ttl: ""
```

Setting `ttl` to an empty string disables subscription expiration. Without this, subscriptions with no active subscribers expire after 31 days by default, which can catch you off guard.

## Creating a Push Subscription

Push subscriptions send messages to an HTTP endpoint. This is useful when you have a web service that should process events.

```yaml
# push-subscription.yaml
# Creates a push subscription that delivers messages to an HTTP endpoint
apiVersion: pubsub.cnrm.cloud.google.com/v1beta1
kind: PubSubSubscription
metadata:
  name: webhook-handler
  namespace: default
  annotations:
    cnrm.cloud.google.com/project-id: "my-project-id"
spec:
  topicRef:
    name: user-events
  ackDeadlineSeconds: 30
  pushConfig:
    # The endpoint that will receive messages
    pushEndpoint: "https://my-app.example.com/webhook/user-events"
    # Use OIDC authentication for secure delivery
    oidcToken:
      serviceAccountEmail: "push-invoker@my-project-id.iam.gserviceaccount.com"
      audience: "https://my-app.example.com"
  # Retry policy for failed deliveries
  retryPolicy:
    minimumBackoff: "10s"
    maximumBackoff: "600s"
```

The OIDC token configuration adds authentication to push deliveries, so your endpoint can verify that messages are actually coming from Pub/Sub.

## Setting Up Dead Letter Queues

For messages that repeatedly fail processing, configure a dead letter queue to capture them instead of losing them.

First, create the dead letter topic.

```yaml
# dlq-topic.yaml
# Dead letter topic to capture failed messages
apiVersion: pubsub.cnrm.cloud.google.com/v1beta1
kind: PubSubTopic
metadata:
  name: order-events-dlq
  namespace: default
  annotations:
    cnrm.cloud.google.com/project-id: "my-project-id"
spec:
  messageRetentionDuration: "604800s"
```

```yaml
# dlq-subscription.yaml
# Subscription on the dead letter topic for monitoring/reprocessing
apiVersion: pubsub.cnrm.cloud.google.com/v1beta1
kind: PubSubSubscription
metadata:
  name: dlq-monitor
  namespace: default
  annotations:
    cnrm.cloud.google.com/project-id: "my-project-id"
spec:
  topicRef:
    name: order-events-dlq
  ackDeadlineSeconds: 120
  expirationPolicy:
    ttl: ""
```

Now update your main subscription to use the dead letter topic.

```yaml
# subscription-with-dlq.yaml
# Subscription with dead letter policy - moves messages here after 5 failures
apiVersion: pubsub.cnrm.cloud.google.com/v1beta1
kind: PubSubSubscription
metadata:
  name: order-processor-with-dlq
  namespace: default
  annotations:
    cnrm.cloud.google.com/project-id: "my-project-id"
spec:
  topicRef:
    name: order-events
  ackDeadlineSeconds: 60
  deadLetterPolicy:
    deadLetterTopicRef:
      name: order-events-dlq
    # After 5 delivery attempts, move to the dead letter topic
    maxDeliveryAttempts: 5
  retryPolicy:
    minimumBackoff: "10s"
    maximumBackoff: "300s"
```

You also need to grant Pub/Sub the permission to publish to the dead letter topic and acknowledge messages from the source subscription.

```yaml
# dlq-iam.yaml
# Grant Pub/Sub service agent permission to forward messages to DLQ
apiVersion: iam.cnrm.cloud.google.com/v1beta1
kind: IAMPolicyMember
metadata:
  name: pubsub-dlq-publisher
  namespace: default
  annotations:
    cnrm.cloud.google.com/project-id: "my-project-id"
spec:
  member: "serviceAccount:service-PROJECT_NUMBER@gcp-sa-pubsub.iam.gserviceaccount.com"
  role: roles/pubsub.publisher
  resourceRef:
    apiVersion: pubsub.cnrm.cloud.google.com/v1beta1
    kind: PubSubTopic
    name: order-events-dlq
```

## Creating a BigQuery Subscription

Pub/Sub can write messages directly to BigQuery without any application code.

```yaml
# bq-subscription.yaml
# Writes messages directly to a BigQuery table
apiVersion: pubsub.cnrm.cloud.google.com/v1beta1
kind: PubSubSubscription
metadata:
  name: events-to-bigquery
  namespace: default
  annotations:
    cnrm.cloud.google.com/project-id: "my-project-id"
spec:
  topicRef:
    name: user-events
  bigqueryConfig:
    tableRef:
      external: "my-project-id.analytics.user_events"
    writeMetadata: true
    dropUnknownFields: true
```

## Monitoring Your Resources

Keep an eye on your Pub/Sub resources managed by Config Connector.

```bash
# List all topics and their status
kubectl get pubsubtopics

# List all subscriptions
kubectl get pubsubsubscriptions

# Get detailed status of a specific subscription
kubectl describe pubsubsubscription order-processor

# Check for any resources that are not ready
kubectl get pubsubtopics,pubsubsubscriptions -o custom-columns=NAME:.metadata.name,READY:.status.conditions[0].status
```

## Cleanup Considerations

Remember that deleting a Kubernetes resource deletes the corresponding GCP resource by default. If you want to keep the GCP resource when removing it from Config Connector management, add the abandon annotation before deleting.

```bash
# Annotate to prevent GCP resource deletion, then remove from K8s
kubectl annotate pubsubtopic order-events \
  cnrm.cloud.google.com/deletion-policy=abandon

kubectl delete pubsubtopic order-events
```

## Summary

Config Connector makes Pub/Sub management feel like managing any other Kubernetes resource. You define topics and subscriptions in YAML, reference them with standard Kubernetes references, and let Config Connector handle the API calls. The dead letter queue pattern, schema validation, and push subscription configurations all translate cleanly into declarative resources. Combined with GitOps tooling, this gives you a fully auditable, version-controlled messaging infrastructure.
