# Validation Summary: How to Filter and Format gcloud CLI Output for Scripting and Automation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud CLI (`gcloud`)
- Compute Engine VM, disk, image, and firewall rule commands
- GKE cluster describe output
- Shell scripting
- `jq`

## Sources Consulted
- Google Cloud CLI reference: https://docs.cloud.google.com/sdk/gcloud/reference
- `gcloud topic formats`: https://docs.cloud.google.com/sdk/gcloud/reference/topic/formats
- `gcloud topic filters`: https://docs.cloud.google.com/sdk/gcloud/reference/topic/filters
- `gcloud topic projections`: https://cloud.google.com/sdk/gcloud/reference/topic/projections
- `gcloud compute instances list`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/instances/list
- `gcloud compute instances stop`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/instances/stop
- `gcloud compute firewall-rules list`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/list
- `gcloud compute images describe-from-family`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/images/describe-from-family
- `gcloud config get`: https://docs.cloud.google.com/sdk/gcloud/reference/config/get
- GKE Cluster REST resource reference: https://docs.cloud.google.com/kubernetes-engine/docs/reference/rest/v1/projects.locations.clusters

## Issues Found
- Replaced `gcloud config get-value project` with the current documented `gcloud config get project` command.
- Changed zone filters to use `zone.basename()` where exact zone names are intended, avoiding ambiguity from full URI fields.
- Updated the `name:web` description from "contains substring" to "word or simple pattern match" because the `:` operator is not a general substring operator and its behavior is changing in gcloud.
- Updated a complex zone filter from `zone:us-central1-*` to a regex on `zone.basename()` so it reliably matches zones with the `us-central1-` prefix.
- Corrected the labels example. `--flatten` flattens list fields, while labels are a map; the example now uses `labels.list()` to display key/value labels.
- Updated scripting examples to emit `zone.basename()` before passing the value to `--zone`.
- Fixed the cross-resource firewall rule script so it iterates VM names with their actual zones instead of assuming `us-central1-a`.
- Changed tag extraction to `tags.items.list()` so multi-tag values are formatted as a comma-separated list suitable for `targetTags:(...)` filtering.
- Replaced `selfLink` with the documented `uri()` transform in the URI output example.

## Review Notes
The examples rely on field names from current gcloud output. For future updates, verify representative fields with `--format=yaml --limit=1`, as recommended by the gcloud filter documentation.
