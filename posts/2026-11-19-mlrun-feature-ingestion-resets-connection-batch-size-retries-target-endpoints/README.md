# MLRun Feature Ingestion Resets the Connection: How to Tune Batch Size, Retries, and Target Endpoints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MLOps, Feature Store, Data Ingestion, Troubleshooting

Description: Diagnose MLRun ingestion connection resets by identifying the failing endpoint, tuning Storey Parquet buffers, and applying retries only at the correct layer.

A connection reset during feature ingestion tells you that a connection ended unexpectedly. It does not tell you which component failed, whether a remote job stopped, or whether the target already accepted some data. Increasing retries before answering those questions can turn a network incident into duplicate feature data.

Start by separating the ingestion path, then change one setting at a time. The examples below use APIs documented in the current MLRun documentation; check their signatures against your installed MLRun and Storey versions before applying them.

## Locate the failing connection

Batch ingestion can run in the notebook process or in an MLRun job. Real-time ingestion runs through a deployed Nuclio function, with sources such as HTTP or Kafka. An offline Parquet target can be written by either path, so “offline target” does not necessarily mean “batch job.” [MLRun ingestion guide](https://docs.mlrun.org/en/stable/data-prep/ingest-data-fs.html)

Record the timestamp, run or function identifier, first exception, and destination hostname, with credentials removed. Classify the failure before tuning:

| Connection | Evidence to inspect |
|---|---|
| Notebook to MLRun API | Submission, metadata, or log-fetching traceback; remote run status |
| Ingestion process to source | Source-reader exception and source service logs |
| Ingestion process to storage target | Writer exception, target path, storage errors, partial output |
| HTTP producer to ingestion function | Producer timeout, ingress response, function logs, request identifier |

For a remote job, inspect its status separately when the notebook loses contact. For an HTTP ingestion service, inspect downstream processing as well as the HTTP response. A successful request is not sufficient evidence that every asynchronous target write completed.

Correlate the failure with container restarts, memory pressure, storage latency, and proxy logs. Treat these as hypotheses to verify: a reset alone does not prove that the input batch was too large.

## Verify the target from the process that writes it

`MLRUN_DBPATH` identifies the MLRun API. For V3IO-backed storage, `V3IO_API` identifies the data Web API and `V3IO_ACCESS_KEY` supplies authentication. They serve different purposes. Use your installation's remote settings and datastore configuration rather than deriving one hostname from another. [Client environment guide](https://docs.mlrun.org/en/stable/setup-guide.html), [V3IO datastore configuration](https://docs.mlrun.org/en/stable/store/datastore.html#v3io)

Inspect the feature set's configured targets and their resolved paths. Then test a small permitted read or write from the same notebook, job, or serving environment that failed. A laptop reaching the storage hostname does not establish that a Kubernetes job has the same DNS, network access, identity, or certificate trust.

Keep authentication failures, missing paths, storage-capacity errors, and connection resets separate. Repeating a request cannot correct an invalid credential or a full destination. If several targets are configured, use disposable feature sets and paths to isolate each target without removing destinations from the production pipeline.

## Tune the buffer that actually writes Parquet

The documented `FeatureSet.ingest()` API has no universal `batch_size` or `retries` argument. Inspect your installed signatures when an example proposes one:

```python
import inspect
from mlrun.datastore import ParquetTarget

# feature_set is the feature set you are diagnosing.
print(inspect.signature(feature_set.ingest))
print(inspect.signature(ParquetTarget))
```

The [feature-store API reference](https://docs.mlrun.org/en/stable/api/mlrun.feature_store/index.html) documents the ingestion arguments. `ParquetTarget` separately exposes `max_events` and `flush_after_seconds`: an event-count threshold and a maximum buffering interval, with remaining events flushed during normal flow termination. A crash or failed write does not guarantee that flush completes. The documented defaults are 10,000 events and 900 seconds. [ParquetTarget reference](https://docs.mlrun.org/en/stable/api/mlrun.datastore/index.html#mlrun.datastore.ParquetTarget)

For a **new disposable feature set using the Storey engine**, this configuration illustrates a smaller write buffer. Replace the project and path with an authorized scratch location; `sample_dataframe` must match that feature set's entities and schema.

```python
from mlrun.datastore import ParquetTarget

# diagnostic_set is a separate, disposable Storey feature set.
diagnostic_set.set_targets(
    targets=[
        ParquetTarget(
            name="offline",
            path="v3io:///projects/your-project/reset-probe/offline/",
            partitioned=False,
            max_events=1000,
            flush_after_seconds=30,
        )
    ],
    with_defaults=False,
)
diagnostic_set.save()
diagnostic_set.ingest(sample_dataframe)
```

Use a fresh scratch path for each comparison. This deliberately tests only Parquet; it does not exercise an online target. `set_targets()` replaces the configured target list.

MLRun passes these buffer settings to its Storey writer. They do not set an HTTP request-body limit, NoSQL request size, source chunk size, or Spark partition size. [Target implementation](https://docs.mlrun.org/en/stable/_modules/mlrun/datastore/targets.html)

Storey groups rows according to configured partitions and writes those partitions separately. Smaller buffers can reduce individual write size, but may increase file counts and request overhead. Compare throughput, memory, file sizes, and errors with the same immutable input before adopting the change. [Partitioning behavior](https://docs.mlrun.org/en/stable/feature-store/sources-targets.html)

## Apply retries at the correct layer

An MLRun API retry does not configure storage retries. The HTTP database client even restricts which POST operations it retries because repeating a creation request may create another object. [HTTP client implementation](https://docs.mlrun.org/en/stable/_modules/mlrun/db/httpdb.html)

For a job whose entire ingestion operation is safe to replay, MLRun documents a `retry` policy on `project.run_function()`. For example:

```python
from mlrun.model import Retry, RetryBackoff

retry_policy = Retry(
    count=2,
    backoff=RetryBackoff(base_delay="1m"),
)
# Add retry=retry_policy to the existing project.run_function(...) call.
```

This permits two additional run attempts; it does not retry an individual Parquet write. Confirm that the delay meets your deployment's configured minimum. [Run-function API](https://docs.mlrun.org/en/stable/api/mlrun.projects/index.html), [Retry configuration](https://docs.mlrun.org/en/stable/_modules/mlrun/model.html#RetryBackoff)

For storage-client or HTTP-producer retries, use that component's documented policy for your installed version. Bound attempts and delays. Before replaying, inspect partial progress and establish whether repeated events overwrite safely, append duplicates, or update aggregations again. Also check `ingest(overwrite=...)`: the documented default deletes the targets being ingested before a non-scheduled ingestion, while scheduled ingestion defaults to retaining their data. Deterministic entity keys alone do not make every transformation idempotent. [Ingestion API](https://docs.mlrun.org/en/stable/api/mlrun.feature_store/index.html#mlrun.feature_store.FeatureSet.ingest)

Verify recovery by reading the expected records from each target and checking freshness, duplicate events, and aggregation results. Track failure rate and ingestion lag alongside job status so a successful retry cannot hide accumulating data errors.
