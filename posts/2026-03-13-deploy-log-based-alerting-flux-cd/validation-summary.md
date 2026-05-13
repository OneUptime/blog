# Validation Summary: How to Deploy Log-Based Alerting with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- HelmRelease and HelmRepository custom resources
- ElastAlert2
- Elasticsearch and OpenSearch
- Slack and PagerDuty alerting
- Kubernetes Secrets and ConfigMaps

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- ElastAlert2 rule types documentation: https://elastalert2.readthedocs.io/en/stable/ruletypes.html
- ElastAlert2 global configuration documentation: https://elastalert2.readthedocs.io/en/latest/configuration.html
- ElastAlert2 alert types documentation: https://elastalert2.readthedocs.io/en/latest/alerts.html
- ElastAlert2 2.18.0 Helm chart values and templates: https://github.com/jertel/elastalert2/tree/2.18.0/chart/elastalert2
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- The original HelmRelease used `elastalertConfig`, `envFrom`, and a list-shaped `rules` value. These are not supported by the ElastAlert2 2.18.0 Helm chart, which uses fields such as `elasticsearch`, `runIntervalMins`, `bufferTimeMins`, `writebackIndex`, `alertRetryLimitMins`, `optEnv`, and a map-shaped `rules` value. Updated the HelmRelease to use supported chart values.
- The original rule ConfigMap attempted to mount rule files directly with `extraVolumes` and `extraVolumeMounts`. The ElastAlert2 chart already manages the rules volume from Helm values, and the original configuration would not populate chart-managed rules correctly. Changed the rule ConfigMap to provide Helm values through Flux `valuesFrom`.
- The original Secret keys used lowercase names with hyphens while the rules referenced uppercase environment variables such as `${SLACK_WEBHOOK_URL}`. Updated the Secret keys and Helm values to inject valid environment variable names with `optEnv` and the chart's Elasticsearch credentials secret support.
- The PagerDuty rule used `pagerduty_client`, but ElastAlert2 documents the required field as `pagerduty_client_name`. Updated the rule accordingly.
- The high-error-rate rule formatted alert text with `alert_text_args: [num_events]`, but ElastAlert2 frequency matches are based on the triggering event and do not provide a `num_events` match field for formatting. Replaced the formatted value with static threshold text.
- The Flux Kustomization health check targeted the generated Deployment. Flux recommends checking the HelmRelease when a Kustomization applies HelmRelease objects. Updated the health check to target the HelmRelease.
- The `elastalert-test-rule` example did not specify the chart-mounted config file. Added `--config /opt/elastalert/config.yaml` to make the command explicit.

## Review Notes
- The examples assume the `logging` namespace and Elasticsearch objects already exist.
- The sample log field names such as `level`, `kubernetes.reason`, `kubernetes.namespace_name`, and `response` are schema-dependent and may need adjustment for a specific log pipeline.
