# Validation Summary: How to Implement Service Discovery in Prometheus

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus service discovery
- Prometheus relabeling and metric relabeling
- Kubernetes service discovery
- File-based service discovery
- Consul service discovery
- AWS EC2 service discovery
- DNS service discovery
- Python target generation

## Sources Consulted
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus Kubernetes example configuration: https://github.com/prometheus/prometheus/blob/main/documentation/examples/prometheus-kubernetes.yml
- Consul API filtering documentation: https://developer.hashicorp.com/consul/api-docs/features/filtering

## Issues Found
- The Kubernetes node scrape example used `bearer_token_file`, which is not present in the current Prometheus HTTP client configuration reference. Changed it to `authorization.credentials_file`.
- The Kubernetes endpoint example used the `endpoints` role. Prometheus documents that the Kubernetes Endpoints API is deprecated in Kubernetes v1.33+ and recommends EndpointSlices. Changed the example to `role: endpointslice` and updated the heading/job name.
- The Consul example used the deprecated `tags` field. Changed it to `filter` and `health_filter`, using the documented Catalog API `ServiceTags` and Health API `Service.Tags` fields.
- The file-SD generator wrote directly to the target file. Prometheus file-SD supports atomic renaming and only applies well-formed target groups, so the script now writes to a temporary file and uses `os.replace()`.

## Review Notes
- The remaining Prometheus service discovery fields, relabel actions, file-SD JSON/YAML formats, DNS SD configuration, EC2 SD configuration, and metric relabeling examples match the current Prometheus configuration reference.
- `promtool` was not installed in the local environment, so validation was performed against official documentation plus JSON/YAML syntax checks where applicable.
