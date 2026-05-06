# Validation Summary: How to Create Cloud Dataproc Clusters with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu / HCL
- Google Cloud Dataproc
- Google Cloud Platform
- Apache Spark
- Apache Hadoop
- Dataproc autoscaling
- Dataproc Component Gateway

## Sources Consulted
- Google provider `google_dataproc_cluster` resource docs: https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/dataproc_cluster.html.markdown
- Google provider `google_dataproc_autoscaling_policy` resource docs: https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/dataproc_autoscaling_policy.html.markdown
- Dataproc Jupyter component docs: https://cloud.google.com/dataproc/docs/concepts/components/jupyter
- Dataproc autoscaling docs: https://cloud.google.com/dataproc/docs/concepts/configuring-clusters/autoscaling
- Dataproc cluster image version support matrix: https://cloud.google.com/dataproc/docs/concepts/versioning/dataproc-version-clusters
- Dataproc `ClusterConfig` REST reference: https://cloud.google.com/dataproc/docs/reference/rest/v1/ClusterConfig

## Issues Found
- The `google_dataproc_cluster` example used `software_config.properties`, but the current Google provider documents `override_properties` for user-supplied cluster property overrides. I changed the snippet to use `override_properties`.
- The standard cluster example enabled the `JUPYTER` optional component without enabling Component Gateway. Google documents that Jupyter installation requires `EndpointConfig.enableHttpPortAccess = true`, so I added `endpoint_config { enable_http_port_access = true }`.
- Both examples pinned `image_version = "2.1-debian11"`. As of `2026-05-06`, Dataproc `2.1-debian11` reached end of support on `2026-03-31`, so I updated the examples to `2.2-debian12`, which is currently supported.
- The standard cluster example referenced `google_storage_bucket.dataproc_staging.name` without defining that resource, which made the snippet incomplete. I removed the invalid reference and noted that Dataproc can auto-create a staging bucket when `staging_bucket` is omitted.
- The summary said autoscaling is based on YARN queue utilization. Dataproc autoscaling is documented in terms of YARN pending and available resources, and on image version `2.2` it evaluates both YARN memory and YARN cores by default. I corrected the explanation.

## Review Notes
- `google_dataproc_cluster.cluster_config.endpoint_config` is documented in the provider as a Beta block, but it is part of the current provider docs and is required here for a technically correct Jupyter example.
