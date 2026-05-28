# Validation Summary: How to Create a Cloud Bigtable Instance and Table Using the cbt CLI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Bigtable
- `cbt` CLI
- Google Cloud CLI (`gcloud`)
- Bigtable tables, column families, reads, writes, deletes, and garbage collection policies

## Sources Consulted
- Google Cloud Bigtable cbt CLI overview: https://cloud.google.com/bigtable/docs/cbt-overview
- Google Cloud Bigtable cbt CLI reference: https://cloud.google.com/bigtable/docs/cbt-reference
- Google Cloud Bigtable create an instance guide: https://cloud.google.com/bigtable/docs/creating-instance
- Google Cloud SDK reference for `gcloud bigtable instances create`: https://cloud.google.com/sdk/gcloud/reference/bigtable/instances/create
- Google Cloud Bigtable overview and storage model: https://cloud.google.com/bigtable/docs/overview
- Google Cloud Bigtable schema design best practices: https://cloud.google.com/bigtable/docs/schema-design
- Google Cloud Bigtable reads guide: https://cloud.google.com/bigtable/docs/reads
- Go package documentation for `cloud.google.com/go/cbt`: https://pkg.go.dev/cloud.google.com/go/cbt

## Issues Found
- The post said instances must be created with `gcloud` because `cbt` only works with existing instances. Current Bigtable documentation includes `cbt createinstance`, so I updated the section to show the supported `cbt` command and kept `gcloud` for advanced settings.
- The `gcloud bigtable instances create` examples used the deprecated `--instance-type` flag and referenced development instances. Current Google Cloud CLI documentation says development instances are no longer offered and all instances are production type, so I removed the flag and updated the wording.
- The production instance explanation claimed auto-replication within the cluster. Bigtable replication is configured by adding clusters to an instance, so I changed the wording to say to add clusters when replication is needed.
- The post used `cbt read ... families=event`, but the current `cbt read` reference supports `columns=...`, not `families=...`. I changed the example to read specific columns with `columns=event:type,event:page,event:browser`.
- The column-family design explanation said Bigtable reads data at the column family level. The official guidance is to group related columns and separate data with different retention needs; reads can be filtered by columns. I corrected the explanation accordingly.
- The alternate Go install command used the older `cloud.google.com/go/bigtable/cmd/cbt` path. I updated it to the current `cloud.google.com/go/cbt` command module.

## Review Notes
The remaining `cbt` commands and `.cbtrc` format match the current official `cbt` reference. The examples are suitable for development and inspection, but production applications should still use Bigtable client libraries because the `cbt` CLI does not implement smart retries or production-grade error handling.
