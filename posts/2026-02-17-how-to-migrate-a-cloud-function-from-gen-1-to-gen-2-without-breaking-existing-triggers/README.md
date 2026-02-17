# How to Migrate a Cloud Function from Gen 1 to Gen 2 Without Breaking Existing Triggers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Functions, Migration, Serverless, Google Cloud

Description: A practical walkthrough for migrating Google Cloud Functions from Gen 1 to Gen 2 while keeping existing triggers, endpoints, and integrations intact.

---

Google Cloud Functions Gen 2 brings a lot of improvements over Gen 1 - longer request timeouts, bigger instance sizes, concurrency support, and the entire Cloud Run platform underneath. But when you have production functions running on Gen 1 with triggers that other services depend on, migrating feels risky. I have gone through this process several times now, and there is a safe path forward if you plan it right.

## Why Migrate to Gen 2?

Before diving into the how, let me quickly cover what you get with Gen 2. The most impactful changes are:

- **Concurrency**: A single instance can handle up to 1000 concurrent requests instead of just 1. This dramatically reduces cold starts and cost.
- **Longer timeouts**: HTTP functions can run up to 60 minutes (vs 9 minutes in Gen 1). Event-driven functions get up to 9 minutes (vs 9 minutes, same here).
- **Larger instances**: Up to 16 GB of memory and 4 vCPUs.
- **Traffic splitting**: Since Gen 2 runs on Cloud Run, you get revision-based traffic splitting for free.
- **Eventarc integration**: Gen 2 uses Eventarc for event triggers, which supports over 90 event sources.

## Understanding the Key Differences

The migration is not just a flag change. There are real architectural differences between Gen 1 and Gen 2 that you need to account for.

### Trigger Model Changes

Gen 1 uses native trigger bindings. When you deploy a function with a Cloud Storage trigger, the trigger is tightly coupled to the function. Gen 2 uses Eventarc, which creates a separate trigger resource that routes events to your function.

This is the biggest source of breakage during migration. If you just redeploy a Gen 1 function as Gen 2, the old trigger gets destroyed and a new Eventarc trigger is created. Any external references to that trigger configuration will break.

### HTTP Endpoint Changes

For HTTP functions, the URL format changes. Gen 1 URLs look like:

```
https://REGION-PROJECT_ID.cloudfunctions.net/FUNCTION_NAME
```

Gen 2 URLs look like:

```
https://FUNCTION_NAME-HASH-REGION.a.run.app
```

If anything is calling your HTTP function URL directly, this is a breaking change you need to handle.

## Step 1: Audit Your Existing Function

Start by documenting everything about your Gen 1 function. Run the following gcloud command to get the full configuration:

```bash
# Get complete function details including trigger configuration
gcloud functions describe my-function \
  --region=us-central1 \
  --format=yaml
```

Pay attention to these fields:
- `entryPoint` - Your function entry point
- `eventTrigger` - The trigger type and resource
- `environmentVariables` - All env vars
- `serviceAccountEmail` - The service account in use
- `vpcConnector` - Any VPC connector attached

Write all of this down. You will need it when configuring the Gen 2 deployment.

## Step 2: Update Your Function Code

The code changes for Gen 2 are minimal but important. Here is a Gen 1 Cloud Storage trigger function:

```javascript
// Gen 1 - Cloud Storage trigger handler
// The function signature receives (file, context) parameters
exports.processFile = (file, context) => {
  console.log(`Processing file: ${file.name}`);
  console.log(`Event type: ${context.eventType}`);
  console.log(`Bucket: ${file.bucket}`);
};
```

And here is the same function rewritten for Gen 2 using CloudEvent format:

```javascript
// Gen 2 - Cloud Storage trigger handler using CloudEvents
// The function receives a single CloudEvent object
const functions = require('@google-cloud/functions-framework');

functions.cloudEvent('processFile', (cloudEvent) => {
  const file = cloudEvent.data;
  console.log(`Processing file: ${file.name}`);
  console.log(`Event type: ${cloudEvent.type}`);
  console.log(`Bucket: ${file.bucket}`);
});
```

The key differences are:
1. You need the `@google-cloud/functions-framework` package
2. Event functions use `functions.cloudEvent()` instead of exporting directly
3. The event data is wrapped in a CloudEvent envelope

For HTTP functions, the changes are smaller:

```javascript
// Gen 2 - HTTP function (mostly the same as Gen 1)
const functions = require('@google-cloud/functions-framework');

// Register the HTTP handler
functions.http('myHttpFunction', (req, res) => {
  res.send('Hello from Gen 2!');
});
```

## Step 3: Deploy Gen 2 Alongside Gen 1

This is the critical step. Do not replace your Gen 1 function. Deploy the Gen 2 version with a different name first.

```bash
# Deploy the Gen 2 version with a temporary name
gcloud functions deploy my-function-v2 \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=. \
  --entry-point=processFile \
  --trigger-event-filters="type=google.cloud.storage.object.v1.finalized" \
  --trigger-event-filters="bucket=my-bucket" \
  --memory=256Mi \
  --min-instances=0
```

Now you have both versions running. The Gen 2 function will also receive events from the same bucket because Eventarc creates its own subscription.

## Step 4: Validate the Gen 2 Function

Test the Gen 2 function thoroughly. Upload test files to your storage bucket and verify that both functions process them correctly. Check the logs for both:

```bash
# Check Gen 2 function logs
gcloud functions logs read my-function-v2 \
  --gen2 \
  --region=us-central1 \
  --limit=50
```

Compare the output with your Gen 1 function logs to make sure the behavior is identical.

## Step 5: Handle the HTTP URL Migration

If your function is HTTP-triggered, you need to handle the URL change. The safest approach is to put a load balancer in front of both functions and use it as the stable endpoint.

```bash
# Create a serverless NEG pointing to the Gen 2 function (Cloud Run service)
gcloud compute network-endpoint-groups create my-function-neg \
  --region=us-central1 \
  --network-endpoint-type=serverless \
  --cloud-run-service=my-function-v2

# Add it to your existing backend service
gcloud compute backend-services add-backend my-backend \
  --global \
  --network-endpoint-group=my-function-neg \
  --network-endpoint-group-region=us-central1
```

Alternatively, if you cannot use a load balancer, set up a simple redirect or proxy in the Gen 1 function that forwards requests to the Gen 2 URL during the transition period.

## Step 6: Switch Traffic and Decommission Gen 1

Once you are confident the Gen 2 function works correctly:

1. Update all clients pointing to the Gen 1 URL to use the Gen 2 URL (or the load balancer URL)
2. Monitor error rates for 24-48 hours
3. Delete the Gen 1 function

```bash
# Delete the old Gen 1 function after validation
gcloud functions delete my-function \
  --region=us-central1 \
  --quiet

# Optionally rename the Gen 2 function
# (requires delete and redeploy since rename is not supported)
```

## Common Pitfalls to Watch For

**Duplicate event processing**: During the overlap period where both Gen 1 and Gen 2 are running, both functions will process the same events. Make sure your function logic is idempotent, or temporarily disable one.

**IAM permissions**: Gen 2 functions run as Cloud Run services, so the service account needs the `run.invoker` role in addition to any existing permissions.

**Eventarc permissions**: The Eventarc service agent needs the `eventarc.eventReceiver` role on the function's service account.

**VPC connector**: If your Gen 1 function uses a VPC connector, make sure it is also configured on the Gen 2 deployment. The flag syntax is slightly different.

**Environment variables**: Double-check that all environment variables from Gen 1 are set in the Gen 2 deployment. They do not carry over automatically.

## Monitoring the Migration

Set up monitoring for both functions during the transition period. OneUptime can help you track error rates, latency, and throughput across both versions so you can catch issues before they impact users. Having visibility into both the old and new function performance side by side makes the cutover decision much easier.

## Wrapping Up

Migrating from Gen 1 to Gen 2 is not a one-click operation, but it does not have to be scary either. The key is running both versions in parallel, validating thoroughly, and handling the URL change gracefully. Take it step by step, and you will end up with a function that is faster, more capable, and cheaper to run.
