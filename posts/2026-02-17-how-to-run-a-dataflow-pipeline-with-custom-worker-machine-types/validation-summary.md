# Validation Summary: How to Run a Dataflow Pipeline with Custom Worker Machine Types

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Google Cloud Dataflow
- Apache Beam Python SDK
- Apache Beam Java SDK
- Compute Engine machine types
- Persistent Disk worker configuration
- Dataflow Shuffle
- Dataflow networking
- Dataflow custom containers
- Dataflow autoscaling and FlexRS
- Docker

## Sources Consulted
- Google Cloud Dataflow pipeline options reference: https://docs.cloud.google.com/dataflow/docs/reference/pipeline-options
- Google Cloud Dataflow worker VM configuration guide: https://docs.cloud.google.com/dataflow/docs/guides/configure-worker-vm
- Google Cloud Dataflow Shuffle for batch jobs: https://docs.cloud.google.com/dataflow/docs/shuffle-for-batch
- Google Cloud run a Dataflow job in a custom container: https://docs.cloud.google.com/dataflow/docs/guides/run-custom-container
- Google Cloud build custom container images for Dataflow: https://docs.cloud.google.com/dataflow/docs/guides/build-container-image
- Google Cloud Flexible Resource Scheduling guide: https://docs.cloud.google.com/dataflow/docs/guides/flexrs
- Google Cloud Compute Engine general-purpose machine family: https://docs.cloud.google.com/compute/docs/general-purpose-machines
- Google Cloud Compute Engine compute-optimized machine family: https://docs.cloud.google.com/compute/docs/compute-optimized-machines
- Apache Beam Dataflow runner documentation: https://beam.apache.org/documentation/runners/dataflow/

## Issues Found
- The post listed fixed default worker machine types for batch and streaming jobs. Google Cloud documentation says Dataflow chooses the machine type based on the job, and the pipeline options reference documents autoscaling defaults separately. I changed the default configuration section to describe Dataflow-selected machine types and current autoscaling defaults.
- The Python `worker_disk_type` examples used invalid placeholder URIs with empty project and zone segments. I replaced them with valid example URIs using `projects/my-project/zones/us-central1-b/diskTypes/pd-ssd`.
- The post described manually enabling Dataflow Shuffle with `--experiments=shuffle_mode=service`. Current Google Cloud documentation says batch jobs use Dataflow Shuffle by default. I updated the explanation and removed the experiment flag from the example.
- The networking example used both `--no_use_public_ips` and `--use_public_ips=false`. The documented Python command-line flag for internal IPs is `--no_use_public_ips`; I removed the redundant second flag.
- The custom container examples used the `:latest` tag. Google Cloud custom container documentation advises against `:latest` for Dataflow custom images, so I changed the image examples to a dated immutable tag.
- The cost optimization section recommended `--use_preemptible_workers`. Current Google Cloud guidance for discounted batch execution is FlexRS, which uses a mix of preemptible and regular workers. I replaced that recommendation and code sample with `--flexrs_goal=COST_OPTIMIZED`.
- The post called N2 the current generation general-purpose family. Compute Engine documentation now includes newer general-purpose families such as N4, so I changed that wording to avoid an outdated claim.

## Review Notes
- The examples are illustrative and still require users to substitute real project IDs, regions, zones, bucket names, subnetworks, and Artifact Registry repositories.
- The custom container section correctly uses `--sdk_container_image` for modern Python SDKs and notes Runner v2. For Python SDK versions 2.45.0 and later, Runner v2 is the only Dataflow runner available, but the explicit experiment remains acceptable for the illustrated batch custom-container case.
