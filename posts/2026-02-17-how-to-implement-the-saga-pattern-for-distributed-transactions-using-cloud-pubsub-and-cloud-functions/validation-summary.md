# Validation Summary: How to Use the Saga Pattern for Distributed Transactions Using Cloud Pub/Sub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Pub/Sub
- Cloud Functions
- Cloud Scheduler
- Cloud Firestore
- Node.js
- Saga pattern
- Distributed transactions

## Sources Consulted
- Google Cloud Functions Pub/Sub tutorial: https://cloud.google.com/functions/docs/tutorials/pubsub
- Google Cloud Functions 1st gen Pub/Sub tutorial: https://cloud.google.com/functions/1stgendocs/tutorials/pubsub-1st-gen
- Google Cloud Functions runtime support: https://cloud.google.com/functions/docs/runtime-support
- Google Cloud Pub/Sub Node.js client publishing reference: https://cloud.google.com/nodejs/docs/reference/pubsub/latest/pubsub/topic#publishmessage
- Google Cloud Pub/Sub subscriber delivery guarantees: https://cloud.google.com/pubsub/docs/subscriber
- Cloud Firestore transactions documentation: https://cloud.google.com/firestore/docs/transactions
- Cloud Scheduler HTTP job documentation: https://cloud.google.com/scheduler/docs/http-target-auth

## Issues Found
- The setup section created manual subscriptions and described them as Cloud Functions trigger subscriptions. Cloud Functions creates trigger subscriptions during deployment with `--trigger-topic`, so the manual subscription commands were removed and the prose was corrected.
- The Pub/Sub-triggered Cloud Functions examples called `message.ack()`. Cloud Functions acknowledges Pub/Sub events based on function completion, and the background event object is not a subscriber client message with an `ack()` method. The manual acknowledgements were removed.
- The payment failure path published to a `payment-failed` topic that had no deployed consumer, which would leave the order in `PENDING`. It now publishes to the saga compensation topic with no rollback steps so the compensation handler marks the saga failed.
- The inventory reservation code read and updated Firestore documents outside a transaction, which could oversell stock under concurrent orders. It now performs the stock checks and updates inside a Firestore transaction.
- Deployment examples used the `nodejs20` runtime. The post now uses `nodejs22`, which is the current non-deprecated Node.js Cloud Functions runtime as of the validation date.
- The Cloud Scheduler sample URL placeholder used `REGION-PROJECT`, which was ambiguous. It now uses `REGION-PROJECT_ID` to match the documented Cloud Functions URL shape.

## Review Notes
The post is technically relevant and the corrected examples are suitable as a tutorial-level implementation. A production implementation should also add explicit idempotency keys, retry handling, authentication for the HTTP function and Scheduler job, and real payment/refund and inventory compensation logic.
