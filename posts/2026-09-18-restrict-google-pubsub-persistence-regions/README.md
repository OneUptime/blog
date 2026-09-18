# How to Restrict Google Cloud Pub/Sub Storage to Allowed Persistence Regions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Google Cloud, Pub/Sub, Data Residency, Messaging, Security

Description: Configure Pub/Sub message storage and in-transit enforcement, select true regional endpoints, and account for existing messages and downstream copies.

---

Pub/Sub topics have global resource names, but you can constrain where their message contents are stored. The relevant control is a message storage policy on the topic, expressed as an allowlist of Google Cloud regions.

For stricter processing boundaries, combine the policy with in-transit enforcement and a regional endpoint. Also inspect subscriptions and consumers: a topic policy does not govern every downstream copy of a message.

## Understand What the Policy Covers

The policy applies to message contents. Topic names, labels, and IAM settings are outside that scope. Use region identifiers such as `europe-west1`, not zones or multiregion names such as `eu`.

Updating an organization policy does not automatically update existing topics. Updating a topic policy affects newly published messages and does not relocate messages already stored under the previous policy. These limitations are documented in [Configure message storage policies](https://docs.cloud.google.com/pubsub/docs/resource-location-restriction).

Record the currently allowed regions and the age of retained messages before making a change. A tightened policy is not evidence that every historical message has moved.

## Inspect and Configure the Topic

Use an identity with permission to read or update the topic, and select the intended project explicitly. These examples use placeholder resource names and two example approved regions:

```bash
gcloud pubsub topics describe regional-orders \
  --project=YOUR_PROJECT_ID \
  --format='json(name,messageStoragePolicy)'

gcloud pubsub topics update regional-orders \
  --project=YOUR_PROJECT_ID \
  --message-storage-policy-allowed-regions=europe-west1,europe-west4 \
  --message-storage-policy-enforce-in-transit
```

The current [topics update command](https://docs.cloud.google.com/sdk/gcloud/reference/pubsub/topics/update) documents both flags. Setting the allowlist replaces its configured value; confirm that every necessary allowed region is present. Supply both policy flags on subsequent edits too: the CLI reference warns that omitted message-storage-policy settings revert to defaults, which can disable in-transit enforcement. Coordinate the change with publishers and subscribers because the in-transit setting can reject requests that previously worked.

For a new topic, set the policy at creation:

```bash
gcloud pubsub topics create regional-orders-new \
  --project=YOUR_PROJECT_ID \
  --message-storage-policy-allowed-regions=europe-west1,europe-west4 \
  --message-storage-policy-enforce-in-transit
```

See the [topics create reference](https://docs.cloud.google.com/sdk/gcloud/reference/pubsub/topics/create). Read the topic back after either operation and check the actual `messageStoragePolicy`, including `enforceInTransit`, instead of treating command success as the entire verification.

## Use a Regional Endpoint Deliberately

Pub/Sub distinguishes global, locational, and regional endpoints. A true regional endpoint uses this form:

```text
pubsub.europe-west1.rep.googleapis.com:443
```

Configure this endpoint in both the publisher and subscriber client according to the client library's endpoint setting. Changing a CLI management endpoint does not automatically reconfigure application clients.

Google documents that regional endpoints keep requests in their specified region and do not reroute them to another region. Locational endpoints use a different format and do not provide the same strict behavior. See [Pub/Sub service APIs and endpoints](https://docs.cloud.google.com/pubsub/docs/reference/service_apis_overview).

With in-transit enforcement enabled, publish, pull, and streaming-pull requests received in a disallowed region are rejected. Use explicit approved regional endpoints to avoid depending on where the global endpoint sends a request. The allowlist must include the endpoint's target region.

## Plan Availability and Delivery Together

If the selected regional endpoint is unavailable, an application can retry against another approved regional endpoint only if the policy and application design permit it. Never make an unapproved global fallback the default response to a regional failure.

Check regional quotas, ordering behavior, and delivery semantics during the rehearsal. A request timeout can have an ambiguous publish outcome; consumers still need the duplicate-handling strategy required by their subscription and application contract.

For push subscriptions, examine the delivery location constraints and endpoint. In-transit enforcement can pause delivery when the permitted locations cannot satisfy the delivery path. Pull consumers and export destinations also create copies outside the topic itself. The [MessageStoragePolicy API definition](https://docs.cloud.google.com/pubsub/docs/reference/rest/v1/projects.topics#MessageStoragePolicy) is useful when auditing the stored policy through automation.

## Inspect Related Resources and Historical Data

Review dead-letter topics, retry paths, snapshots, message retention, BigQuery or Cloud Storage exports, and consumer logs. A dead-letter topic needs its own appropriate policy. A consumer can write a message to another service even if Pub/Sub stored it correctly.

For a stricter boundary, establish when new publishing begins under the updated policy and how older retained messages expire or are otherwise handled. Do not delete retained data solely to produce a clean compliance report without evaluating the application's recovery requirements.

Test an allowed endpoint and a deliberately disallowed one in a nonproduction project. Confirm successful delivery in the approved path and the expected rejection outside it. Record the topic configuration, client endpoints, destination locations, and observed outcomes as separate evidence. Those checks establish what the policy actually controls and where additional controls are still needed.
