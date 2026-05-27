# Validation Summary: Use the Spring Cloud GCP Starter for Pub/Sub to Build Event-Driven Microservices

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Pub/Sub
- Spring Cloud GCP
- Spring Boot
- Spring Integration
- Java
- Maven
- gcloud CLI

## Sources Consulted
- Spring guide: Messaging with Google Cloud Pub/Sub: https://spring.io/guides/gs/messaging-gcp-pubsub/
- Spring Framework on Google Cloud PubSubTemplate API: https://googleapis.dev/java/spring-cloud-gcp/latest/com/google/cloud/spring/pubsub/core/PubSubTemplate.html
- Spring Framework on Google Cloud PubSubInboundChannelAdapter API: https://googleapis.dev/java/spring-cloud-gcp/latest/com/google/cloud/spring/pubsub/integration/inbound/PubSubInboundChannelAdapter.html
- Spring Framework on Google Cloud PubSubMessageHandler API: https://googleapis.dev/java/spring-cloud-gcp/latest/com/google/cloud/spring/pubsub/integration/outbound/PubSubMessageHandler.html
- Spring Framework on Google Cloud GcpPubSubHeaders API: https://googleapis.dev/java/spring-cloud-gcp/latest/com/google/cloud/spring/pubsub/support/GcpPubSubHeaders.html
- Spring Framework on Google Cloud Pub/Sub reference guide: https://googlecloudplatform.github.io/spring-cloud-gcp/6.1.1/reference/html/pubsub.html
- Google Cloud Pub/Sub Spring application documentation: https://cloud.google.com/pubsub/docs/spring
- Google Cloud Pub/Sub dead-letter topics documentation: https://cloud.google.com/pubsub/docs/dead-letter-topics
- gcloud pubsub subscriptions update reference: https://cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/update

## Issues Found
- The service activator tried to read the `eventType` Pub/Sub attribute from `GcpPubSubHeaders.ORIGINAL_MESSAGE`. That header contains the original `BasicAcknowledgeablePubsubMessage`, not the custom Pub/Sub attribute. Changed the code to read `eventType` from the mapped Spring message headers.
- The flow-control configuration comment described JSON serialization. Changed the comment to describe Pub/Sub flow control.
- The dead-letter section said it created a dead-letter topic and subscription, but only created the topic. Added a subscription for the dead-letter topic so dead-lettered messages can be inspected.
- The dead-letter explanation implied exact forwarding after 5 attempts. Updated it to say forwarding happens approximately after the configured attempts and depends on the required Pub/Sub service account permissions.
- The wrap-up claimed automatic JSON serialization from the starter. The examples serialize JSON explicitly with Jackson, while Spring Cloud GCP provides payload conversion. Updated the wording to avoid implying automatic JSON serialization.

## Review Notes
The examples are version-neutral and align with the current Spring Framework on Google Cloud APIs, including `CompletableFuture` return types for `PubSubTemplate.publish`, `AckMode.MANUAL`, `setPayloadType(String.class)`, and the current success/failure callback APIs on `PubSubMessageHandler`.
