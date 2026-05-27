# Validation Summary: How to Publish and Receive Pub/Sub Messages in a Go Application

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Pub/Sub
- Google Cloud CLI
- Go
- Google Cloud Pub/Sub Go client library
- Pub/Sub publisher and subscriber flow control
- Pub/Sub message ordering, acknowledgments, nacks, and dead-letter topics

## Sources Consulted
- Google Cloud Pub/Sub Go v2 package documentation: https://pkg.go.dev/cloud.google.com/go/pubsub/v2
- Google Cloud Pub/Sub Go v1 package documentation: https://pkg.go.dev/cloud.google.com/go/pubsub
- Google Cloud SDK `gcloud pubsub topics create` reference: https://cloud.google.com/sdk/gcloud/reference/pubsub/topics/create
- Google Cloud SDK `gcloud pubsub subscriptions create` reference: https://cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/create
- Google Cloud Pub/Sub create pull subscriptions documentation: https://cloud.google.com/pubsub/docs/create-subscription
- Google Cloud Pub/Sub message ordering documentation: https://cloud.google.com/pubsub/docs/ordering
- Google Cloud Pub/Sub v2 module go.mod: https://github.com/googleapis/google-cloud-go/blob/pubsub/v2.6.0/pubsub/v2/go.mod

## Issues Found
- The post used the deprecated `cloud.google.com/go/pubsub` v1 package. Updated the dependency and import path to `cloud.google.com/go/pubsub/v2`, and changed the code from `client.Topic` / `client.Subscription` to the current v2 `client.Publisher` / `client.Subscriber` APIs.
- The prerequisite Go version was too old for the current Pub/Sub v2 module. Updated it from Go 1.21 or later to Go 1.25 or later.
- The subscriber example set `NumGoroutines` to 2 without enabling per-stream flow control. Added `EnablePerStreamFlowControl: true`, matching the v2 guidance for multiple StreamingPull streams.
- The tuning tip said slow processing causes messages to be nacked. Changed this to redelivery caused by ack deadline handling and pointed readers toward subscriber ack deadline extension settings.
- The ordering tip implied that setting subscriber `NumGoroutines` to 1 plus publisher ordering keys is sufficient. Updated it to require message ordering on the subscription and ordering keys on published messages.
- The nack example said nacks trigger redelivery after the ack deadline. Updated it to say nacks ask Pub/Sub to redeliver sooner.

## Review Notes
The `gcloud` topic and subscription creation commands match the current Google Cloud SDK documentation. Local command verification was limited because this environment does not have `go` or `gcloud` installed, so code and CLI validation were performed against official documentation.
