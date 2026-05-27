# Validation Summary: How to Publish Ordered Messages to Pub/Sub from a Node.js Express Application

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Pub/Sub
- Node.js
- Express
- @google-cloud/pubsub
- Pub/Sub ordering keys

## Sources Consulted
- Google Cloud Pub/Sub ordered delivery documentation: https://docs.cloud.google.com/pubsub/docs/ordering
- Google Cloud Pub/Sub publisher documentation: https://docs.cloud.google.com/pubsub/docs/publisher
- Google Cloud Pub/Sub batch messaging documentation: https://docs.cloud.google.com/pubsub/docs/batch-messaging
- @google-cloud/pubsub Node.js Topic API reference: https://docs.cloud.google.com/nodejs/docs/reference/pubsub/latest/pubsub/topic
- @google-cloud/pubsub 5.3.0 TypeScript declarations from npm package

## Issues Found
- The post incorrectly said that a Pub/Sub topic must have message ordering enabled and used a `messageOrderingEnabled` field in `createTopic`. Pub/Sub ordering is enabled on subscriptions for delivery, and the Node publisher object uses the `messageOrdering` publish option. I changed the topic creation sample to create a normal topic and clarified that the topic itself does not store an ordering setting.
- The publisher examples included both `enableMessageOrdering` and `messageOrdering`. The current Node.js `PublishOptions` type uses `messageOrdering`; `enableMessageOrdering` is not part of that type. I removed `enableMessageOrdering` from publisher examples.
- The standalone subscription creation snippet referenced `pubsub` without defining it. I added the `PubSub` import and client initialization.
- A few ordering claims said messages arrive in exactly the order they were published. Google Cloud's documentation frames the guarantee as delivery in the order Pub/Sub receives messages for the same ordering key in a region. I adjusted those statements to match the documented guarantee.

## Review Notes
The post remains a valid tutorial after the corrections. For production use, the examples could also mention configuring a locational endpoint when multiple publishers publish ordered messages, because Pub/Sub's ordering guarantee applies when publishes for an ordering key are in the same region.
