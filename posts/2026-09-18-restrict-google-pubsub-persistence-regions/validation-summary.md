# Validation Summary: How to Restrict Google Cloud Pub/Sub Storage to Allowed Persistence Regions

## Status
validated

## Post Type
Technical configuration guide with Google Cloud CLI commands and a regional endpoint example.

## Technologies Covered
- Google Cloud Pub/Sub topics, subscriptions, and message storage policies
- Google Cloud CLI (`gcloud`) and Pub/Sub REST API fields
- Regional, locational, and global service endpoints
- Data residency, in-transit enforcement, organization policies, and IAM
- Message retention, snapshots, dead-letter topics, ordering, and delivery guarantees
- BigQuery and Cloud Storage export subscriptions

## Sources Consulted
- [Configure message storage policies](https://docs.cloud.google.com/pubsub/docs/resource-location-restriction)
- [gcloud pubsub topics describe](https://docs.cloud.google.com/sdk/gcloud/reference/pubsub/topics/describe)
- [gcloud pubsub topics update](https://docs.cloud.google.com/sdk/gcloud/reference/pubsub/topics/update)
- [gcloud pubsub topics create](https://docs.cloud.google.com/sdk/gcloud/reference/pubsub/topics/create)
- [gcloud output formats](https://docs.cloud.google.com/sdk/gcloud/reference/topic/formats)
- [Pub/Sub APIs and endpoints](https://docs.cloud.google.com/pubsub/docs/reference/service_apis_overview)
- [Topic resource and MessageStoragePolicy API definition](https://docs.cloud.google.com/pubsub/docs/reference/rest/v1/projects.topics#MessageStoragePolicy)
- [Pub/Sub access control](https://docs.cloud.google.com/pubsub/docs/access-control)
- [Pub/Sub quotas and limits](https://docs.cloud.google.com/pubsub/quotas)
- [Order messages](https://docs.cloud.google.com/pubsub/docs/ordering)
- [Publishing best practices](https://docs.cloud.google.com/pubsub/docs/publish-best-practices)
- [Retry requests](https://docs.cloud.google.com/pubsub/docs/retry-requests)
- [Exactly-once delivery](https://docs.cloud.google.com/pubsub/docs/exactly-once-delivery)
- [Subscription overview](https://docs.cloud.google.com/pubsub/docs/subscription-overview)
- [Dead-letter topics](https://docs.cloud.google.com/pubsub/docs/dead-letter-topics)
- [Replay and purge messages with seek](https://docs.cloud.google.com/pubsub/docs/replay-overview)

## Issues Found
No technical issues found.

## Review Notes
- Reviewed the complete README against official documentation. No README changes were necessary.
- Confirmed that the storage policy covers message contents rather than topic metadata, accepts region identifiers rather than zones or multiregions, and does not relocate previously published messages. Organization-policy changes do not automatically update existing topics.
- Verified the describe, update, and create command forms, explicit project selection, JSON field projection, comma-separated region list, and both message-storage-policy flags. The update reference explicitly warns that omitted policy fields revert to defaults when updating that policy. The examples supply both fields correctly.
- Confirmed the API field names `messageStoragePolicy`, `allowedPersistenceRegions`, and `enforceInTransit`. The topic resource name is project-scoped and does not include a region.
- Verified the documented regional hostname for `europe-west1` and the distinction from locational endpoints. Regional endpoints do not reroute requests across regions. Their publish requirements include an explicit policy, in-transit enforcement, and the target region in the allowlist; the post's configuration meets these requirements.
- Confirmed rejection of publish, pull, and streaming-pull requests received in disallowed regions, and the possibility that restricted push delivery locations pause delivery. The documented rejection is `FAILED_PRECONDITION`.
- Verified regional quotas, same-region requirements for ordered publishing, and the possibility of duplicate publications when a successful publish response arrives too late. Exactly-once subscription delivery does not eliminate separate publish-side duplicates.
- Confirmed that dead-letter forwarding publishes a new message to another topic, export subscriptions write to destination services, and snapshots and retention affect replayable data. Reviewing these resources separately is appropriate.
- All documentation links in the post resolved to the intended resources. The author link also resolved to the named GitHub profile.
- No version pins or deprecated commands were found. Commands were reviewed against current documentation, without executing cloud operations. Actual endpoint rejection, organization-policy compatibility, permissions, and delivery behavior still require the nonproduction rehearsal described in the post.
