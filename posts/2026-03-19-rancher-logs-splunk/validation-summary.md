# Validation Summary: How to Send Logs to Splunk from Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher logging
- Kubernetes
- Logging operator (Fluentd `ClusterOutput` and `ClusterFlow` CRDs)
- Splunk HTTP Event Collector (HEC)
- Splunk Enterprise
- Splunk Cloud Platform
- `kubectl`

## Sources Consulted
- SUSE Rancher Manager: Outputs and ClusterOutputs: https://documentation.suse.com/cloudnative/rancher-manager/v2.14/en/observability/logging/custom-resource-configuration/outputs-and-clusteroutputs.html
- SUSE Rancher Manager: Rancher Integration with Logging Services: https://ranchermanager.docs.rancher.com/v2.14/integrations-in-rancher/logging
- Logging operator: Splunk via HEC output plugin for Fluentd: https://kube-logging.dev/5.3/docs/configuration/plugins/outputs/splunk_hec/
- Logging operator: ClusterFlow CRD: https://kube-logging.dev/docs/configuration/crds/v1beta1/clusterflow_types/
- Logging operator: Routing your logs with Fluentd match directives: https://kube-logging.dev/docs/configuration/log-routing/
- Logging operator: Parser filter: https://kube-logging.dev/docs/configuration/plugins/filters/parser/
- Logging operator: Troubleshooting Fluentd: https://kube-logging.dev/5.2/docs/operation/troubleshooting/fluentd/
- Splunk Docs: Set up and use HTTP Event Collector in Splunk Web: https://help.splunk.com/en/splunk-enterprise/get-data-in/get-started-with-getting-data-in/9.3/get-data-with-http-event-collector/set-up-and-use-http-event-collector-in-splunk-web
- Splunk Docs: About HTTP Event Collector Indexer Acknowledgment: https://help.splunk.com/en/data-management/get-data-in/get-data-into-splunk-cloud-platform/10.2.2510/get-data-with-http-event-collector/about-http-event-collector-indexer-acknowledgment
- Splunk `fluent-plugin-splunk-hec` README: https://github.com/splunk/fluent-plugin-splunk-hec

## Issues Found
- Limited the HEC global-settings instructions to Splunk Enterprise. Splunk Cloud enables HEC by default and does not use the same global-settings flow.
- Changed `retry_max_interval: 60` to `retry_max_interval: 60s` so the buffer example uses the documented time syntax.
- Replaced `suppress_parse_error_log: true` with `emit_invalid_record_to_error: false` because the current Fluentd/Logging operator parser filter no longer supports `suppress_parse_error_log`.
- Clarified that Splunk Cloud HEC hostnames vary by deployment. AWS commonly uses `http-inputs-<host>.splunkcloud.com`, while GCP and GovCloud use `http-inputs.<host>...`.
- Reworked the metadata-enrichment example to use `host_key`, `source_key`, and `sourcetype_key`. Simply adding `host`, `source`, and `sourcetype` fields to the event record does not set Splunk HEC metadata.
- Removed the unsupported `use_ack` and `channel` example. Those fields are not exposed by Rancher/Logging operator’s `splunkHec` output; HEC indexer acknowledgment is configured on the Splunk side, and Splunk Cloud only supports it for AWS Kinesis Firehose.
- Replaced the Fluentd verification command with a pod lookup that does not assume a specific chart label selector.

## Review Notes
- The post remains technically relevant and the Rancher-specific `logging.banzaicloud.io/v1beta1` CRDs shown in the article are still documented by Rancher and the Logging operator.
- Splunk has marked `fluent-plugin-splunk-hec` end-of-support/deprecated, but the Logging operator still documents and exposes the Fluentd `splunkHec` output. Readers should watch for future migration guidance if Rancher changes its supported forwarder path.
- Local checks: all YAML code blocks in the post parsed successfully, the Bash code blocks passed `bash -n`, and `validation.json` was validated with `jq`.
- Runtime validation against a live Rancher-managed cluster or Splunk deployment was not performed in this workspace. `kubectl` is not installed here, so command semantics were verified against official documentation rather than local CLI help.
