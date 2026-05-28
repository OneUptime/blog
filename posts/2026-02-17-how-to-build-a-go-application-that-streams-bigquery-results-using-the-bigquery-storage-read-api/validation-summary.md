# Validation Summary: How to Build a Go App That Streams BigQuery Results Using the BigQuery Storage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google BigQuery Storage Read API
- Google Cloud BigQuery
- Go
- Apache Arrow Go
- gRPC

## Sources Consulted
- Google Cloud BigQuery Storage Read API overview: https://docs.cloud.google.com/bigquery/docs/reference/storage
- Google Cloud BigQuery Storage RPC reference: https://docs.cloud.google.com/bigquery/docs/reference/storage/rpc/google.cloud.bigquery.storage.v1
- Google Cloud BigQuery Storage API Go client libraries and sample: https://cloud.google.com/bigquery/docs/reference/storage/libraries
- Google Cloud Go BigQuery Storage `storagepb` package reference: https://pkg.go.dev/cloud.google.com/go/bigquery/storage/apiv1/storagepb
- Apache Arrow Go v18.5.2 release notes: https://arrow.apache.org/blog/2026/03/04/arrow-go-18.5.2/
- Apache Arrow Go v18 module metadata: https://raw.githubusercontent.com/apache/arrow-go/v18.5.2/go.mod
- Apache Arrow Go IPC package reference: https://pkg.go.dev/github.com/apache/arrow-go/v18/arrow/ipc

## Issues Found
- The post described both Apache Arrow and Avro as columnar formats. Avro is a binary serialization format but not the columnar format in this context, so the wording was corrected to say the Storage Read API streams a binary format, with Arrow or Avro as options.
- The dependency list used the older `github.com/apache/arrow/go/v15` module path and did not include packages needed by the snippets. Updated the commands to use the current Apache Arrow Go v18 module path and include `memory`, `gax-go`, and `grpc`.
- The `ReadRows` example did not configure a large enough gRPC receive message size for Storage Read API row blocks. Added the same 129 MiB receive-size pattern used in Google's Go sample.
- The Arrow decoding example incorrectly created an IPC reader from only the serialized schema and never used the serialized record batch. Updated it to read the session schema, prefix each batch with that schema, and decode the batch with `ipc.WithSchema`.
- The Arrow decoding imports included an unused `arrow` import and omitted reader error checking. Removed the unused import and added `reader.Err()` handling.
- The final example counted bytes as rows and did not decode or print the result rows despite the surrounding text saying it prints results. Updated the callback to decode batches with the session schema, count decoded rows, and log each row.
- The sample row filter compared a likely TIMESTAMP field with a plain string literal. Updated it to use an explicit GoogleSQL TIMESTAMP literal.
- The performance tip stated that Arrow is faster than Avro for most Go applications because of zero-copy memory layout. That claim is too broad without workload-specific benchmarking, so it was softened to recommend Arrow for columnar batch processing and benchmarking against Avro for row-oriented use cases.

## Review Notes
The post remains a practical tutorial, but the examples are still presented as multiple snippets rather than a single copy-paste Go file. Local compilation was not possible because the workspace does not have the `go` tool installed, so syntax and API checks were performed against official documentation and package references.
