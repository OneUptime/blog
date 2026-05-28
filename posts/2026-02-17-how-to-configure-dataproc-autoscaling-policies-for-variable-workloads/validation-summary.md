# Validation Summary: How to Configure Dataproc Autoscaling Policies for Variable Workloads

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Google Cloud Dataproc
- Dataproc autoscaling policies
- Apache Hadoop YARN
- Apache Spark
- Google Cloud CLI
- Cloud Logging
- Cloud Monitoring

## Sources Consulted
- Google Cloud Dataproc autoscaling documentation: https://cloud.google.com/dataproc/docs/concepts/configuring-clusters/autoscaling
- Google Cloud SDK reference for `gcloud dataproc clusters create`: https://cloud.google.com/sdk/gcloud/reference/dataproc/clusters/create
- Google Cloud Dataproc secondary workers documentation: https://cloud.google.com/dataproc/docs/concepts/compute/preemptible-vms
- Google Cloud Monitoring metric descriptors for Dataproc: https://cloud.google.com/monitoring/api/metrics_gcp_d_h

## Issues Found
- The post described autoscaling as using the ratio of pending memory and available memory. Updated this to reflect the official YARN resource metrics used by Dataproc autoscaling, including pending, available, allocated, and reserved resources, and noted the image-version behavior for memory and cores.
- The explanation of `scaleUpMinWorkerFraction` incorrectly described it as a minimum number of workers to add. Updated it to describe the official threshold behavior for whether a scaling event is large enough to apply.
- The aggressive scale-up example comment repeated the incorrect `scaleUpMinWorkerFraction` meaning. Updated the comment to match the corrected behavior.
- The Cloud Logging command included `--region`, which is not a `gcloud logging read` flag. Removed it and changed the query to filter the Dataproc autoscaler log.
- The Cloud Monitoring metric names used an incorrect prefix and outdated/nonexistent memory metric names. Replaced them with current `dataproc.googleapis.com/...` metric type names.
- The short-lived jobs guidance suggested reducing cooldown below the documented minimum/default behavior. Revised it to emphasize `scaleUpFactor` and making sure new workers have enough pending work to justify scaling.

## Review Notes
- The post uses Dataproc image `2.1-debian11` in one example. That remains valid for the post's example, but Dataproc 2.2 and later autoscaling evaluates both YARN memory and cores by default.
- The use of secondary workers for burst capacity is technically valid. Current Google Cloud documentation distinguishes standard preemptible, spot, and non-preemptible secondary worker types; the examples remain workable with `preemptible`, while `spot` is the newer explicit spot option.
