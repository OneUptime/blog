# Validation Summary: How to implement Fluentd filters for log enrichment with Kubernetes metadata

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Fluentd
- fluent-plugin-kubernetes_metadata_filter
- fluent-plugin-record-modifier
- fluent-plugin-sampling-filter
- Kubernetes metadata enrichment
- Fluentd grep, parser, and record_transformer filters
- EFK stack concepts

## Sources Consulted
- Fluentd configuration file syntax: https://docs.fluentd.org/configuration/config-file
- Fluentd filter plugin overview: https://docs.fluentd.org/filter
- Fluentd grep filter documentation: https://docs.fluentd.org/filter/grep
- Fluentd parser filter documentation: https://docs.fluentd.org/filter/parser
- Fluentd record_transformer documentation: https://docs.fluentd.org/filter/record_transformer
- fluent-plugin-kubernetes_metadata_filter README: https://github.com/fluent-plugins-nursery/fluent-plugin-kubernetes_metadata_filter
- fluent-plugin-record-modifier README: https://github.com/repeatedly/fluent-plugin-record-modifier
- fluent-plugin-sampling-filter documentation: https://rubydoc.info/gems/fluent-plugin-sampling-filter/1.0.0

## Issues Found
- The `kubernetes_url` example omitted the URL scheme. The kubernetes metadata filter expects a URL when this option is set, so the example now uses `https://#{ENV['KUBERNETES_SERVICE_HOST']}:#{ENV['KUBERNETES_SERVICE_PORT']}`.
- The introduction said the Kubernetes metadata filter adds "resource details." The documented plugin metadata covers pod, namespace, labels, annotations, and container details such as image fields, not Kubernetes CPU/memory resource requests or limits. Updated the wording to "container details."
- The filtering overview and namespace section described routing with filters. Fluentd filters mutate or drop records in the filter chain; routing is handled through tags and match directives. Updated the wording to "filter" records/logs.
- The `annotation_match` comment incorrectly described adding label fields. The option matches annotation field names, so the comment now says it includes matching annotations.
- A `record_transformer` expression called `=~` directly on a possibly missing namespace. Updated it to call `.to_s` before matching so the expression does not fail on records without Kubernetes metadata.
- The sampling example used `sampling_rate 10`, which is not the documented option for `fluent-plugin-sampling-filter`. Updated it to `interval 10` with `sample_unit all`.
- The sampling section claimed a following grep filter would "Always keep error logs." Because filters are applied in order, a later grep cannot recover records already dropped by sampling. Updated the comment to describe what the grep filter actually does.
- The parser failure marker would have labeled successful parses as failures because `reserve_data true` plus `remove_key_name_field false` preserves the `log` field after successful parsing. Updated the parser to `remove_key_name_field true` and `emit_invalid_record_to_error false`, making the subsequent `record_modifier` success/failure marker consistent.
- The cost allocation `billing_tag` expression could raise an error if namespace or app label values were missing. Added fallback values and string conversion.
- The best practice "Filter early" was too broad for Kubernetes-field filters, which require metadata to exist first. Updated it to distinguish cheap early exclusions from Kubernetes-field filters after enrichment.

## Review Notes
- The examples assume the referenced non-core plugins are installed in the Fluentd image: `fluent-plugin-kubernetes_metadata_filter`, `fluent-plugin-record-modifier`, and `fluent-plugin-sampling-filter`.
- The Kubernetes metadata filter can use in-cluster `KUBERNETES_SERVICE_HOST` and `KUBERNETES_SERVICE_PORT` automatically if `kubernetes_url` is omitted; specifying it explicitly is valid when formatted as a URL.
