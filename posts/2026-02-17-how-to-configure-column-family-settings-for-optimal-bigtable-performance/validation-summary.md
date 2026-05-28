# Validation Summary: How to Configure Column Family Settings for Optimal Bigtable Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Bigtable
- Bigtable column families
- Bigtable garbage collection policies
- `cbt` CLI
- Google Cloud CLI
- Python Bigtable client library
- Cloud Monitoring

## Sources Consulted
- Google Cloud Bigtable schema design best practices: https://cloud.google.com/bigtable/docs/schema-design
- Google Cloud Bigtable garbage collection overview: https://cloud.google.com/bigtable/docs/garbage-collection
- Google Cloud Bigtable configure garbage collection: https://cloud.google.com/bigtable/docs/configuring-garbage-collection
- Google Cloud Bigtable cbt CLI reference: https://cloud.google.com/bigtable/docs/cbt-reference
- Google Cloud Bigtable table stats documentation: https://cloud.google.com/bigtable/docs/table-stats
- Google Cloud Bigtable metrics documentation: https://cloud.google.com/bigtable/docs/metrics
- Python Bigtable `column_family` reference: https://cloud.google.com/python/docs/reference/bigtable/latest/google.cloud.bigtable.column_family

## Issues Found
- The post said schemas should typically use 1 to 10 column families and that more than about 10 families starts to degrade performance. Google Cloud's current schema guidance says to create up to about 100 column families and warns that more than 100 may degrade performance. Updated the guidance and Mermaid decision point accordingly.
- The post said column family names are stored in every row. Google Cloud's schema guidance says names are included in data transferred for each request. Updated the wording to avoid the inaccurate storage claim.
- The post said GC-marked data may still appear in reads "briefly." Google Cloud documents that garbage collection normally takes a few days and can take up to a week, and applications should use filters if reads must exclude data matching GC rules. Updated the note.
- The monitoring section said `cbt ls` checks table and column family sizes. The `cbt` reference says `cbt ls <table-id>` lists column families and GC policies. Updated that command description and added the official `gcloud bigtable instances tables describe --view=stats` command for column-family stats including `logicalDataBytes`.
- The post referenced `bigtable.googleapis.com/disk/bytes_used` as broken down by table. Current metrics distinguish cluster-level `disk/bytes_used` from table-level `table/bytes_used`. Updated the metric name and description.
- The post said no GC policy always means Bigtable keeps every version forever. Google Cloud documents an HBase-client exception where only the most recent cell is retained by default. Updated the statement to apply to the console, `cbt`, `gcloud`, and most client libraries.

## Review Notes
The Python examples use current `google.cloud.bigtable.column_family` GC rule classes, and the `cbt createtable`, `createfamily`, and `setgcpolicy` examples match the current official CLI reference.
