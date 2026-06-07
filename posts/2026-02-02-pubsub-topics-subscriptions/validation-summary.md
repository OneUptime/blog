# Validation Summary: How to Create Topics and Subscriptions in Google Pub/Sub

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Google Cloud Pub/Sub
- gcloud CLI
- Node.js (`@google-cloud/pubsub` library)
- Python (`google-cloud-pubsub` library)
- Terraform (`hashicorp/google` provider)
- Google Cloud Monitoring

## Sources Consulted
- gcloud Pub/Sub topics reference: https://cloud.google.com/sdk/gcloud/reference/pubsub/topics/delete
- Subscription detachment docs: https://cloud.google.com/pubsub/docs/detach-subscriptions
- Node.js Pub/Sub library reference (Subscription class): https://cloud.google.com/nodejs/docs/reference/pubsub/latest/pubsub/subscription-class
- Node.js synchronous pull sample: https://cloud.google.com/pubsub/docs/samples/pubsub-subscriber-sync-pull
- Python Pub/Sub PublisherClient reference: https://cloud.google.com/python/docs/reference/pubsub/latest/google.cloud.pubsub_v1.publisher.client.Client
- Terraform google_pubsub_subscription resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/pubsub_subscription
- Pub/Sub REST API PushConfig: https://cloud.google.com/pubsub/docs/reference/rest/v1/projects.subscriptions#PushConfig
- gcloud subscriptions create reference: https://cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/create

## Issues Found

1. **Incorrect claim about topic deletion behavior.** The comment on `gcloud pubsub topics delete orders` said "(also removes all subscriptions)". This is false — when a topic is deleted, its subscriptions are not deleted; they become orphaned with their topic field set to the literal `_deleted-topic_` and must be deleted separately. Updated the comment to reflect the actual behavior.

2. **Node.js synchronous pull used a non-existent API.** The `pullMessages` function called `subscription.pull({ maxMessages })` and `subscription.acknowledge(ackIds)` on the high-level `Subscription` object returned by `pubsub.subscription(name)`. Neither method exists on that class — the high-level API is streaming/event-based. Rewrote the function to use `v1.SubscriberClient.pull()` and `v1.SubscriberClient.acknowledge()`, which is the documented way to do synchronous pull in `@google-cloud/pubsub`. Also added the `v1` import and the `subscriberClient` instance at the top of the file.

3. **Python `publish_message` passed attributes incorrectly.** The Python `PublisherClient.publish()` signature is `publish(topic, data, ordering_key="", **attrs)` — attributes are passed as individual keyword arguments collected via `**attrs`. The original code did `publish_kwargs['attributes'] = attributes` and then `publisher.publish(topic_path, **publish_kwargs)`, which would cause `attributes` to be treated as a single attribute literally named `"attributes"` whose value is a dict (invalid — attribute values must be strings/bytes). Fixed by unpacking the attributes dict with `**attrs` when calling `publish()`.

4. **Terraform push_config.attributes used an invalid attribute name.** The Pub/Sub API documents that the only currently supported `push_config.attributes` key is `x-goog-version` (with allowed values `v1beta1`, `v1`, `v1beta2`) — it selects the push payload format and is not a mechanism for arbitrary custom HTTP headers. The original example used `x-custom-header = "pubsub-push"` with a misleading comment claiming it added a custom HTTP request header. Replaced with `"x-goog-version" = "v1"` and updated the comment to explain the actual purpose.

## Review Notes

- The `gcloud pubsub topics create --message-retention-duration=7d` shorthand duration format is valid, as is `--ack-deadline=120` (within the 10–600 second range) and `--max-delivery-attempts=5` (within the 5–100 range).
- The `topic.publishMessage()`, `topic.resumePublishing()`, and `subscription.on('message', ...)` calls in the Node.js streaming sample are all current and correct.
- The Python streaming subscriber (`subscribe_with_streaming`) and synchronous pull (`pull_messages_sync`) both use current, idiomatic APIs.
- The Terraform configuration is otherwise correct: `dead_letter_policy`, `retry_policy`, `enable_exactly_once_delivery`, `expiration_policy { ttl = "" }` for "never expire", and the IAM bindings (publisher on the dead-letter topic and subscriber on the main subscription) all follow Google's documented dead-letter setup.
- The `gcloud alpha monitoring policies create` command uses the alpha command surface — flags are subject to change without notice, but the flag set used here is consistent with the current alpha CLI.
- One minor consideration not changed: the Python `publish_with_retry` example uses `predicate=retry.if_exception_type(Exception)`, which retries on any exception. This is overly broad in production code (it would retry on programming errors like `TypeError`), but it is syntactically and semantically valid and the post is illustrating the mechanism rather than recommending the predicate.
