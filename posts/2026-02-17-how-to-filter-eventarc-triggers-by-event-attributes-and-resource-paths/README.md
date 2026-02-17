# How to Filter Eventarc Triggers by Event Attributes and Resource Paths

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Eventarc, Event Filtering, Triggers, Event-Driven

Description: Learn how to use event filters in Google Cloud Eventarc triggers to route events based on attributes, resource paths, and custom criteria for precise event routing.

---

When you set up Eventarc triggers, you do not want to receive every event from every source. A single Google Cloud project can generate thousands of events per minute from audit logs, storage operations, and Pub/Sub messages. Event filtering lets you narrow down exactly which events reach your Cloud Run service, reducing noise and processing costs.

In this post, I will explain how Eventarc event filtering works and show practical examples for different filtering scenarios.

## How Event Filtering Works

Every Eventarc trigger has one or more event filters. Filters are specified as key-value pairs, and a trigger only fires when all filters match (logical AND). The available filter keys depend on the event source type.

For Google Cloud audit log events, the filter keys are:
- `type`: The CloudEvents type (e.g., `google.cloud.audit.log.v1.written`)
- `serviceName`: The Google Cloud service that generated the event
- `methodName`: The specific API method
- `resourceName`: Path-pattern matching on the resource

For direct events (like Cloud Storage), the filter keys are:
- `type`: The CloudEvents type (e.g., `google.cloud.storage.object.v1.finalized`)
- `bucket`: The specific bucket name (for storage events)

## Basic Filtering Examples

### Filter by Service and Method

The most common pattern for audit logs is filtering by service and method.

```bash
# Only trigger on Compute Engine instance creation
gcloud eventarc triggers create vm-create-trigger \
  --location=us-central1 \
  --destination-run-service=my-handler \
  --destination-run-region=us-central1 \
  --event-filters="type=google.cloud.audit.log.v1.written" \
  --event-filters="serviceName=compute.googleapis.com" \
  --event-filters="methodName=v1.compute.instances.insert" \
  --service-account=trigger-sa@PROJECT.iam.gserviceaccount.com
```

This trigger will only fire when someone creates a new Compute Engine instance. It will not fire for instance deletions, updates, or any other Compute action.

### Filter by Cloud Storage Bucket

For direct Cloud Storage events, filter by the specific bucket.

```bash
# Only trigger on uploads to a specific bucket
gcloud eventarc triggers create upload-trigger \
  --location=us-central1 \
  --destination-run-service=file-processor \
  --destination-run-region=us-central1 \
  --event-filters="type=google.cloud.storage.object.v1.finalized" \
  --event-filters="bucket=production-uploads" \
  --service-account=trigger-sa@PROJECT.iam.gserviceaccount.com
```

## Path Pattern Filtering

Eventarc supports path pattern matching on the `resourceName` filter. This lets you match events based on resource hierarchy.

### Matching Specific Resources

```bash
# Only trigger on changes to a specific BigQuery dataset
gcloud eventarc triggers create bq-dataset-trigger \
  --location=us-central1 \
  --destination-run-service=my-handler \
  --destination-run-region=us-central1 \
  --event-filters="type=google.cloud.audit.log.v1.written" \
  --event-filters="serviceName=bigquery.googleapis.com" \
  --event-filters="methodName=google.iam.v1.IAMPolicy.SetIamPolicy" \
  --event-filters-path-pattern="resourceName=/projects/my-project/datasets/sensitive-data/*" \
  --service-account=trigger-sa@PROJECT.iam.gserviceaccount.com
```

### Using Wildcards in Resource Paths

The path pattern filter supports two wildcards:
- `*` matches a single path segment
- `**` matches zero or more path segments

```bash
# Match any Compute instance in the us-central1-a zone
gcloud eventarc triggers create zone-specific-trigger \
  --location=us-central1 \
  --destination-run-service=my-handler \
  --destination-run-region=us-central1 \
  --event-filters="type=google.cloud.audit.log.v1.written" \
  --event-filters="serviceName=compute.googleapis.com" \
  --event-filters="methodName=v1.compute.instances.delete" \
  --event-filters-path-pattern="resourceName=/projects/*/zones/us-central1-a/instances/*" \
  --service-account=trigger-sa@PROJECT.iam.gserviceaccount.com
```

```bash
# Match any resource under a specific project with double wildcard
gcloud eventarc triggers create project-wide-trigger \
  --location=us-central1 \
  --destination-run-service=my-handler \
  --destination-run-region=us-central1 \
  --event-filters="type=google.cloud.audit.log.v1.written" \
  --event-filters="serviceName=storage.googleapis.com" \
  --event-filters="methodName=storage.setIamPermissions" \
  --event-filters-path-pattern="resourceName=/projects/_/buckets/prod-**" \
  --service-account=trigger-sa@PROJECT.iam.gserviceaccount.com
```

## Creating Multiple Triggers for Granular Routing

When you need different handlers for different event patterns, create separate triggers.

```bash
# Trigger 1: Route IAM changes to the security handler
gcloud eventarc triggers create iam-to-security \
  --location=us-central1 \
  --destination-run-service=security-handler \
  --destination-run-region=us-central1 \
  --event-filters="type=google.cloud.audit.log.v1.written" \
  --event-filters="serviceName=iam.googleapis.com" \
  --event-filters="methodName=SetIamPolicy" \
  --service-account=trigger-sa@PROJECT.iam.gserviceaccount.com

# Trigger 2: Route Compute changes to the infra handler
gcloud eventarc triggers create compute-to-infra \
  --location=us-central1 \
  --destination-run-service=infra-handler \
  --destination-run-region=us-central1 \
  --event-filters="type=google.cloud.audit.log.v1.written" \
  --event-filters="serviceName=compute.googleapis.com" \
  --event-filters="methodName=v1.compute.instances.insert" \
  --service-account=trigger-sa@PROJECT.iam.gserviceaccount.com

# Trigger 3: Route Storage changes to the data handler
gcloud eventarc triggers create storage-to-data \
  --location=us-central1 \
  --destination-run-service=data-handler \
  --destination-run-region=us-central1 \
  --event-filters="type=google.cloud.storage.object.v1.finalized" \
  --event-filters="bucket=data-lake-raw" \
  --service-account=trigger-sa@PROJECT.iam.gserviceaccount.com
```

## Filtering Custom Events by Type

For custom events published to channels, filter by the custom event type.

```bash
# Only route specific custom event types
gcloud eventarc triggers create user-signup-trigger \
  --location=us-central1 \
  --destination-run-service=onboarding-service \
  --destination-run-region=us-central1 \
  --event-filters="type=custom.myapp.user.signup" \
  --channel=app-events \
  --service-account=trigger-sa@PROJECT.iam.gserviceaccount.com

gcloud eventarc triggers create user-upgrade-trigger \
  --location=us-central1 \
  --destination-run-service=billing-service \
  --destination-run-region=us-central1 \
  --event-filters="type=custom.myapp.user.plan_upgrade" \
  --channel=app-events \
  --service-account=trigger-sa@PROJECT.iam.gserviceaccount.com
```

## Implementing Application-Level Filtering

Eventarc filters determine which events reach your handler. But sometimes you need finer-grained filtering within the handler itself. Combine Eventarc filters for coarse routing with application code for fine filtering.

```javascript
// server.js
// Handler with additional application-level filtering
const express = require("express");
const app = express();
app.use(express.json());

app.post("/", async (req, res) => {
  const eventType = req.headers["ce-type"];
  const protoPayload = req.body.protoPayload;

  if (!protoPayload) {
    res.status(200).send("No payload");
    return;
  }

  const principal = protoPayload.authenticationInfo?.principalEmail || "";
  const resource = protoPayload.resourceName || "";
  const method = protoPayload.methodName || "";

  // Application-level filter: ignore service account actions
  // (only alert on human user actions)
  if (principal.endsWith(".iam.gserviceaccount.com")) {
    console.log(`Ignoring service account action by ${principal}`);
    res.status(200).json({ filtered: "service_account" });
    return;
  }

  // Application-level filter: only alert on production resources
  if (!resource.includes("production") && !resource.includes("prod-")) {
    console.log(`Ignoring non-production resource: ${resource}`);
    res.status(200).json({ filtered: "non_production" });
    return;
  }

  // Application-level filter: ignore read-only operations
  const readOnlyMethods = ["get", "list", "describe"];
  if (readOnlyMethods.some((m) => method.toLowerCase().includes(m))) {
    console.log(`Ignoring read-only method: ${method}`);
    res.status(200).json({ filtered: "read_only" });
    return;
  }

  // This event passed all filters - process it
  console.log(`Processing event: ${method} on ${resource} by ${principal}`);
  await processSecurityEvent(principal, method, resource, protoPayload);

  res.status(200).json({ status: "processed" });
});
```

## Listing Available Event Types

To discover what event types and filters are available, use the gcloud CLI.

```bash
# List all available event types in your location
gcloud eventarc providers list --location=us-central1

# Get details about a specific provider's event types
gcloud eventarc providers describe compute.googleapis.com \
  --location=us-central1

# List event types for Cloud Storage
gcloud eventarc providers describe storage.googleapis.com \
  --location=us-central1
```

## Viewing and Updating Trigger Filters

```bash
# View the current filters on a trigger
gcloud eventarc triggers describe my-trigger \
  --location=us-central1 \
  --format="yaml(eventFilters)"

# You cannot update filters on an existing trigger
# Instead, delete and recreate with new filters
gcloud eventarc triggers delete my-trigger --location=us-central1

gcloud eventarc triggers create my-trigger \
  --location=us-central1 \
  --destination-run-service=my-handler \
  --destination-run-region=us-central1 \
  --event-filters="type=google.cloud.audit.log.v1.written" \
  --event-filters="serviceName=compute.googleapis.com" \
  --event-filters="methodName=v1.compute.instances.stop" \
  --service-account=trigger-sa@PROJECT.iam.gserviceaccount.com
```

## Filter Design Patterns

Here are some proven approaches to organizing your event filters.

### Pattern 1: One Trigger Per Security Concern

```bash
# Dedicated triggers for each security scenario
# Makes it clear what each trigger monitors
gcloud eventarc triggers create monitor-public-buckets ...
gcloud eventarc triggers create monitor-iam-escalation ...
gcloud eventarc triggers create monitor-firewall-open ...
gcloud eventarc triggers create monitor-key-creation ...
```

### Pattern 2: Service-Level Routing

```bash
# Route all events from a service to one handler
# The handler does fine-grained filtering
gcloud eventarc triggers create all-iam-events \
  --event-filters="type=google.cloud.audit.log.v1.written" \
  --event-filters="serviceName=iam.googleapis.com" ...

gcloud eventarc triggers create all-compute-events \
  --event-filters="type=google.cloud.audit.log.v1.written" \
  --event-filters="serviceName=compute.googleapis.com" ...
```

### Pattern 3: Environment-Based Filtering

Use resource path patterns to separate production from non-production events.

```bash
# Only monitor production project resources
gcloud eventarc triggers create prod-monitoring \
  --event-filters="type=google.cloud.audit.log.v1.written" \
  --event-filters="serviceName=compute.googleapis.com" \
  --event-filters-path-pattern="resourceName=/projects/my-prod-project/**" ...
```

## Wrapping Up

Event filtering in Eventarc is your primary tool for controlling which events reach your handlers. Use `event-filters` for exact matches on type, service name, and method name. Use `event-filters-path-pattern` for wildcard matching on resource paths. Combine Eventarc-level filtering for coarse routing with application-level filtering for fine-grained logic. The goal is to have your handler receive only the events it needs to process, reducing both cost and noise.
