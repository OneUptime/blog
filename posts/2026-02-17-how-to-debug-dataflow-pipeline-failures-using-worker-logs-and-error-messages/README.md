# How to Debug Dataflow Pipeline Failures Using Worker Logs and Error Messages

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Google Cloud Dataflow, Debugging, Cloud Logging, Troubleshooting

Description: A practical guide to debugging Google Cloud Dataflow pipeline failures by navigating worker logs, interpreting error messages, and using diagnostic tools effectively.

---

Your Dataflow pipeline just failed. The job status says "Failed" and there is a cryptic error message in the console. Now what? Debugging distributed data pipelines is fundamentally different from debugging a regular application. Your code runs on multiple workers simultaneously, errors might only occur for specific data elements, and the relevant logs are scattered across several workers.

Over the years I have developed a systematic approach to debugging Dataflow failures. Let me share what works.

## Step 1: Check the Job Status and Error Summary

Start with the Dataflow console or CLI. The job-level error message often points you in the right direction.

```bash
# Get the job status and error messages
gcloud dataflow jobs describe JOB_ID \
  --region=us-central1 \
  --format="yaml(currentState, currentStateTime, type, stageStates)"

# Get the job's error messages specifically
gcloud dataflow jobs describe JOB_ID \
  --region=us-central1 \
  --format="value(currentState)"
```

Common job-level states and what they mean:

- **JOB_STATE_FAILED**: The pipeline encountered an unrecoverable error
- **JOB_STATE_CANCELLED**: Someone manually cancelled the job
- **JOB_STATE_DRAINED**: The streaming pipeline was drained (intentional shutdown)
- **JOB_STATE_UPDATED**: The job was replaced by an updated version

## Step 2: Read the Pipeline Logs

Dataflow writes logs to Cloud Logging. The most useful logs come from the workers where your code actually runs.

```bash
# Get error-level logs from Dataflow workers
gcloud logging read 'resource.type="dataflow_step" AND severity>=ERROR AND
  resource.labels.job_id="JOB_ID"' \
  --project=my-project \
  --limit=50 \
  --format="table(timestamp, jsonPayload.message)"
```

For more context, include warning-level logs too.

```bash
# Get warnings and errors with step information
gcloud logging read 'resource.type="dataflow_step" AND severity>=WARNING AND
  resource.labels.job_id="JOB_ID"' \
  --project=my-project \
  --limit=100 \
  --format="table(timestamp, severity, resource.labels.step_id, jsonPayload.message)"
```

Pay attention to the `step_id` label. It tells you which pipeline step generated the log message. If all errors come from the same step, that is where your bug lives.

## Step 3: Navigate Worker Logs

Worker logs contain the actual Java or Python stack traces from your code. These are the most detailed and most useful.

```bash
# Get worker logs with stack traces
gcloud logging read 'resource.type="dataflow_step" AND
  resource.labels.job_id="JOB_ID" AND
  jsonPayload.message:"Exception"' \
  --project=my-project \
  --limit=20 \
  --format="json(timestamp, jsonPayload.message)"
```

When you find a stack trace, read it from bottom to top. The root cause is usually in the "Caused by" chain at the bottom.

## Common Error Patterns and Solutions

Here are the errors I see most frequently and how to fix them.

**java.lang.OutOfMemoryError: Java heap space**

Your workers ran out of memory. This happens with large GroupByKey operations, big side inputs, or memory leaks in custom code.

```bash
# Increase worker memory by using a highmem machine type
gcloud dataflow jobs run my-job \
  --gcs-location=gs://my-bucket/templates/my-template \
  --region=us-central1 \
  --worker-machine-type=n1-highmem-4
```

**com.google.api.client.googleapis.json.GoogleJsonResponseException: 403 Forbidden**

Permission issue. The Dataflow service account does not have access to a resource.

```bash
# Check what service account the job is using
gcloud dataflow jobs describe JOB_ID \
  --region=us-central1 \
  --format="value(environment.serviceAccountEmail)"

# Grant the necessary role
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:SA_EMAIL" \
  --role="roles/bigquery.dataEditor"
```

**org.apache.beam.sdk.util.UserCodeException**

This wraps an exception thrown by your code. The real error is in the "Caused by" section.

```bash
# Search for UserCodeException details
gcloud logging read 'resource.type="dataflow_step" AND
  resource.labels.job_id="JOB_ID" AND
  jsonPayload.message:"UserCodeException"' \
  --project=my-project \
  --limit=10 \
  --format="json"
```

**Workflow failed. Causes: The Dataflow job appears to be stuck**

The pipeline is not making progress. Workers might be in a deadlock, waiting on an external service that is down, or hitting a hot key.

## Step 4: Check for Hot Keys

Hot keys cause performance problems because one worker gets a disproportionate amount of data. Dataflow logs a warning when it detects this.

```bash
# Search for hot key warnings
gcloud logging read 'resource.type="dataflow_step" AND
  resource.labels.job_id="JOB_ID" AND
  jsonPayload.message:"hot key"' \
  --project=my-project \
  --limit=20
```

If you have hot keys, consider:
- Adding a random prefix to the key and aggregating in two stages
- Using Combiner functions which can be parallelized
- Filtering out the hot key for separate processing

```java
// Two-stage aggregation to handle hot keys
PCollection<KV<String, Long>> counts = events
    // Step 1: Add a random shard to the key
    .apply("AddShard", ParDo.of(new DoFn<KV<String, Long>, KV<String, Long>>() {
        @ProcessElement
        public void processElement(ProcessContext c) {
            String key = c.element().getKey();
            int shard = ThreadLocalRandom.current().nextInt(10);
            // Append shard number to create sub-keys
            c.output(KV.of(key + "#" + shard, c.element().getValue()));
        }
    }))
    // Step 2: Partial aggregation across shards
    .apply("PartialSum", Sum.longsPerKey())
    // Step 3: Remove shard and do final aggregation
    .apply("RemoveShard", ParDo.of(new DoFn<KV<String, Long>, KV<String, Long>>() {
        @ProcessElement
        public void processElement(ProcessContext c) {
            String originalKey = c.element().getKey().split("#")[0];
            c.output(KV.of(originalKey, c.element().getValue()));
        }
    }))
    .apply("FinalSum", Sum.longsPerKey());
```

## Step 5: Use the Dataflow Diagnostics Tab

The Dataflow console has a diagnostics tab that surfaces common issues automatically. Check it for:

- Worker disk space warnings
- Autoscaling issues
- Stale watermark warnings
- Worker startup failures

## Step 6: Enable Debug Logging

For tough bugs, temporarily increase the log level to get more detail.

```java
// Add this to your pipeline code to enable debug logging for a specific class
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class MyDoFn extends DoFn<String, String> {
    private static final Logger LOG = LoggerFactory.getLogger(MyDoFn.class);

    @ProcessElement
    public void processElement(ProcessContext c) {
        LOG.debug("Processing element: {}", c.element());
        // ... your processing logic
    }
}
```

Set the log level when launching the job.

```bash
# Set worker log level to DEBUG for your package
--defaultWorkerLogLevel=WARN \
--workerLogLevelOverrides='{"com.example.pipeline":"DEBUG"}'
```

Be careful with debug logging in production. The volume can be enormous and expensive.

## Step 7: Reproduce Locally

When possible, reproduce the issue locally with the DirectRunner. Take a sample of the failing data and run it through your pipeline locally where you can use a debugger.

```java
// Run locally with DirectRunner for debugging
PipelineOptions options = PipelineOptionsFactory.create();
options.setRunner(DirectRunner.class);

Pipeline pipeline = Pipeline.create(options);

// Use a small sample of the problematic data
pipeline
    .apply("ReadSample", TextIO.read()
        .from("/tmp/sample_failing_data.json"))
    .apply("Process", ParDo.of(new MyDoFn()));

pipeline.run().waitUntilFinish();
```

## Step 8: Check Resource Quotas

Sometimes failures are not about code but about hitting GCP resource limits.

```bash
# Check Compute Engine quotas in your region
gcloud compute regions describe us-central1 \
  --format="table(quotas.metric, quotas.usage, quotas.limit)" \
  --filter="quotas.metric:CPUS OR quotas.metric:IN_USE_ADDRESSES"
```

If you are hitting CPU or IP address quotas, the pipeline cannot start enough workers.

## Building a Debugging Checklist

When a pipeline fails, work through this checklist.

1. Read the job-level error message
2. Check worker error logs for stack traces
3. Identify which step is failing
4. Check for hot keys, OOM errors, or permission issues
5. Verify resource quotas and service availability
6. Reproduce locally if possible
7. Enable debug logging as a last resort

Systematic debugging saves time. Most Dataflow failures fall into a handful of categories, and once you have seen each type a few times, you can diagnose them quickly. Keep a log of failures you encounter and their solutions - it becomes an invaluable reference for your team.
