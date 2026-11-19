# MLRun Real-Time Ingestion Failed but the Notebook Succeeded: How to Inspect Error Streams and Nuclio Logs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MLOps, Feature Store, Nuclio, Troubleshooting

Description: Diagnose MLRun real-time ingestion failures by comparing notebook and deployed runtimes, reading V3IO error streams, and correlating failures with Nuclio processor logs.

A notebook transforms a sample DataFrame correctly. You deploy the feature set, send an event, and receive a successful response, but the expected feature never appears. The next useful evidence is usually in the deployed ingestion function, not the notebook cell.

MLRun's feature-store guide explains that real-time ingestion uses a Nuclio function and that asynchronous processing errors are logged and sent to a configured error stream. Request acceptance therefore does not prove that every transformation and target write succeeded. [MLRun ingestion guide](https://docs.mlrun.org/en/stable/data-prep/ingest-data-fs.html)

## Establish what the notebook actually tested

Separate a preview, local ingestion, and deployed ingestion. A preview exercises sample data and infers metadata; local ingestion runs inside the notebook environment; the real-time service handles events in another runtime. Also compare engines: MLRun documents Storey for real-time processing and pandas for batch testing. A pandas result does not establish that a Storey deployment behaves identically. [Ingestion modes and engines](https://docs.mlrun.org/en/stable/data-prep/ingest-data-fs.html)

Record the feature-set version, graph, target paths, deployment time, and one failing event. Compare its actual JSON types, entity fields, and timestamp representation with the notebook input. A DataFrame may already contain parsed timestamps or numeric values that arrive as strings over HTTP.

Check package versions in the notebook:

```python
from importlib.metadata import PackageNotFoundError, version

for package in ("mlrun", "storey"):
    try:
        print(package, version(package))
    except PackageNotFoundError:
        print(package, "not installed in this interpreter")
```

Compare these with the deployed image's recorded dependencies. Packages and custom modules available in the notebook must be included in the function's build or source configuration. [MLRun image builds](https://docs.mlrun.org/en/stable/runtimes/image-build.html)

## Find the deployed error destination

Inspect the ingestion function definition in the intended project. Check its error-stream URI, image, source trigger, and storage credentials. Do not infer the stream path from the feature-set name.

MLRun documents the error destination on the serving function's specification. In the deployment code for a diagnostic service, the relevant setting is:

```python
# ingestion_function is the serving runtime supplied through RunConfig.
# Replace this with a V3IO stream destination your runtime can write.
ingestion_function.spec.error_stream = (
    "v3io:///projects/your-project/ingestion-errors"
)
```

Apply the setting before deploying the diagnostic service. Editing a Python object after deployment does not reconfigure the running processor. The error stream needs working storage access independently of the feature targets. [Graph error-stream configuration](https://docs.mlrun.org/en/stable/serving/pipelines-error-handling.html), [Deployment and stream credentials example](https://docs.mlrun.org/en/stable/serving/distributed-graph.html)

Check your release's deployment API. The current feature-set reference documents `deploy_ingestion_service()` returning an invocation URL and the deployed runtime; that runtime differs from the one supplied through `RunConfig`. Some ingestion guides use `deploy_ingestion_service_v2()`. Consult the API matching your installed version, and inspect the returned deployed runtime when comparing configuration. [FeatureSet API](https://docs.mlrun.org/en/stable/api/mlrun.feature_store/index.html#mlrun.feature_store.FeatureSet.deploy_ingestion_service)

## Read the V3IO error stream

From an environment with read access to the configured V3IO destination, start a separate notebook or console:

```python
from mlrun.platforms import watch_stream

error_stream = "v3io:///projects/your-project/ingestion-errors"

watch_stream(
    error_stream,
    shard_ids=[0],  # Replace with every shard ID in this stream.
    seek_to="EARLIEST",
    interval=2,
    is_json=True,
)
```

This continuously prints records until interrupted. `EARLIEST` starts at the earliest available records, which is useful when investigating a failure that already happened. For a new isolated test, start a watcher at `LATEST` before sending the event. `interval=0` performs one polling pass and returns; it should not be treated as a complete backlog export. See the [watch_stream API](https://docs.mlrun.org/en/stable/api/mlrun.platforms/index.html).

The helper defaults to shard zero. If the stream has multiple shards, supply all relevant IDs; otherwise, silence may simply mean you inspected the wrong shard. The [watcher implementation](https://docs.mlrun.org/en/stable/_modules/mlrun/platforms.html) shows this default and its per-shard reads. These commands are specific to V3IO streams; use the appropriate consumer tooling for another configured backend.

Inspect an actual record before building a parser. MLRun's published formatter includes `function_uri`, `host`, `worker`, `source`, `event.id`, `event.body`, and `message`. Use those fields where present to connect a failed step and event to its processor. The same implementation logs failures to publish an error record, so an empty error stream does not establish successful ingestion. Search processor logs for `failed to write to error stream` as well. [Error-record implementation](https://docs.mlrun.org/en/latest/_modules/mlrun/serving/server.html)

Error records can contain the input body. Redact sensitive fields before copying them into an incident report.

## Read the processor logs for the same interval

Discover the function's actual processor pods and containers. Use their labels and ownership to distinguish them from the Nuclio dashboard or controller. Replace the uppercase placeholders below:

```bash
kubectl -n YOUR_NAMESPACE get pods --show-labels
kubectl -n YOUR_NAMESPACE get pod YOUR_PROCESSOR_POD \
  -o jsonpath='{.spec.containers[*].name}'

kubectl -n YOUR_NAMESPACE logs YOUR_PROCESSOR_POD \
  -c YOUR_CONTAINER --since=30m --timestamps=true

# When this container restarted and its previous logs remain available:
kubectl -n YOUR_NAMESPACE logs YOUR_PROCESSOR_POD \
  -c YOUR_CONTAINER --previous --timestamps=true
```

Repeat the log check across replicas, especially the host identified in the error record. `--previous` retrieves the previous container instance in that pod; it does not recover an already deleted pod's logs. Use retained centralized logs for older deployments. [kubectl logs reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)

In Iguazio, web-shell access to pod listings and logs requires the documented Log Reader service account or higher. [Iguazio logging guide](https://www.iguazio.com/docs/latest-release/cluster-mgmt/logging-n-debugging/)

If stdout lacks expected application logs, inspect the configured log sink and level. Nuclio distinguishes system logging, function logging, and per-function overrides, so dashboard logs and processor logs can have different destinations. [Nuclio log-sink configuration](https://docs.nuclio.io/en/stable/tasks/configuring-a-platform.html#log-sinks-logger)

## Follow the first failing operation

Use the earliest exception associated with the test event to choose the next check:

| Evidence | Next check |
|---|---|
| Missing module or custom transformation | Deployed source and image dependencies |
| Missing entity, conversion, or timestamp error | Actual event body and graph input assumptions |
| Storage authorization or connection error | Target URI and access from the function runtime |
| Error-stream write failure | Error destination, credentials, and connectivity |
| Restart without an application traceback | Container termination reason and Kubernetes events |

Reproduce with one known event in a diagnostic deployment using separate targets. After fixing the cause, verify its expected values in every required target, allowing for configured buffering. Then confirm no matching processing errors occurred. Preserve the event identifier, deployment revision, and failure window in your incident record so future ingestion alerts lead directly to the relevant evidence.
