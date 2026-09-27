# How to Confirm Rejected OpenSearch Telemetry Reaches the Dead-Letter Queue

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenSearch, OpenTelemetry, Troubleshooting

Description: Verify Data Prepper dead-letter delivery with a controlled OpenSearch mapping rejection, a unique marker, and a tested replay path.

---

A configured dead-letter queue is not proof that rejected telemetry reaches it. Verify the path with a deliberately invalid document, then find that exact document and its failure in the configured destination. A growing sink-error counter or an empty DLQ directory is not enough to establish the result.

This guide tests the OpenSearch sink's local `dlq_file` path in an isolated self-managed Data Prepper pipeline. Production S3 DLQs and newer failure-pipeline features need their own destination and release checks.

## Understand which failure is being tested

An OpenSearch sink DLQ captures events the sink cannot write. It cannot recover a span discarded by an SDK, a Collector filter, or a source decoder before it reaches that sink.

The sink supports `max_retries` and a DLQ destination. Permanently rejected documents and retryable connection or service failures do not necessarily follow the same timing. Configure a finite retry policy appropriate to the workload, and do not assume every mapping rejection waits through all retries. See the [OpenSearch sink reference](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/sinks/opensearch/).

For this experiment, use a mapping rejection because it is deterministic and does not require interrupting a real cluster.

## Create a disposable destination with an explicit type

In a test OpenSearch cluster, create:

```http
PUT dp-dlq-probe
{
  "mappings": {
    "properties": {
      "probe_id": { "type": "keyword" },
      "durationInNanos": { "type": "long", "ignore_malformed": false }
    }
  }
}
```

A document containing a nonnumeric duration will fail this mapping. Use a fresh diagnostic index to avoid prior dynamic mappings, and check matching index templates and inherited ingest pipelines so they do not change the test. Setting `ignore_malformed: false` explicitly ensures the invalid duration rejects the document instead of being ignored.

## Connect the test pipeline to persistent storage

Configure an isolated HTTP source and the same kind of sink used by your telemetry path:

```yaml
dlq-probe:
  source:
    http:
      port: 2025
      path: /dlq-probe
      ssl: false
  sink:
    - opensearch:
        hosts: ["https://opensearch.internal.example:9200"]
        cert: /etc/data-prepper/opensearch-ca.pem
        username: probe-writer
        password: REPLACE_WITH_SECRET
        index_type: custom
        index: dp-dlq-probe
        max_retries: 2
        dlq_file: /var/lib/data-prepper/dlq/probe-events.log
```

The plaintext source is for a protected local test environment; restrict access and use TLS and authentication for a remotely accessible source. Replace the OpenSearch connection and secret placeholders.

Create the DLQ parent directory and mount durable storage at that location. Verify that the Data Prepper process user can write it. Each replica has its own filesystem unless you explicitly provide shared storage, so inspect the node that processed the test.

The [HTTP source](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/sources/http/) accepts a JSON array of events. It is suitable for this sink-level test; it does not replace an OTLP source in the real trace pipeline.

## Send a valid control and a rejected canary

Use unique markers for the run:

```bash
curl --fail-with-body http://localhost:2025/dlq-probe \
  -H 'Content-Type: application/json' \
  --data '[
    {"probe_id":"dlq-check-20260927-good","durationInNanos":1000000},
    {"probe_id":"dlq-check-20260927-bad","durationInNanos":"not-a-number"}
  ]'
```

The source response confirms source acceptance, not OpenSearch indexing or durable DLQ storage. Wait for sink processing and inspect its logs.

Search the test index for both markers after refresh:

```http
GET dp-dlq-probe/_search
{
  "query": {
    "terms": {
      "probe_id": [
        "dlq-check-20260927-good",
        "dlq-check-20260927-bad"
      ]
    }
  }
}
```

Expect the valid control to be indexed and the invalid canary to be absent. Then search the DLQ file on the processing node for the bad marker and inspect the surrounding failure details.

## Account for writer buffering

Local DLQ output may be buffered. The referenced upstream [BulkIngester implementation](https://github.com/opensearch-project/data-prepper/blob/0c8acd7ffc0328b1f9dbd9bc7161ed673a59be42/data-prepper-plugins/opensearch/src/main/java/org/opensearch/dataprepper/plugins/sink/opensearch/BulkIngester.java) uses a buffered writer and closes it during shutdown. For a bounded test, gracefully stop the isolated pipeline process after processing has completed, then inspect the persisted file. Do not abruptly terminate a production instance to make a canary visible.

Check the actual file format in your release before using a JSON parser. Local `dlq_file` output and the S3 DLQ object envelope are different representations. A parser failure is not automatically a delivery failure.

## Repeat against the production DLQ mechanism

For S3, locate the newly written object under the configured bucket and prefix, then retrieve the canary and its failure metadata. The [DLQ documentation](https://docs.opensearch.org/latest/data-prepper/pipelines/dlq/) lists `dlqS3RecordsSuccess`, `dlqS3RecordsFailed`, `dlqS3RequestSuccess`, and `dlqS3RequestFailed`.

Metrics help locate failures, but the acceptance criterion remains the stored record. Check IAM permissions, bucket ownership expectations, encryption permissions where applicable, and destination errors if success counters do not advance.

Finally, fix the canary's duration and replay it through a controlled path. Confirm that it indexes successfully and that your replay process preserves identity or otherwise handles duplicates. Keep the original DLQ evidence until the replay is reconciled.

## Conclusion

Prove rejection, prove the exact failed event was stored, and prove a corrected event can be replayed. Those three observations establish a useful DLQ workflow beyond merely having its configuration present.
