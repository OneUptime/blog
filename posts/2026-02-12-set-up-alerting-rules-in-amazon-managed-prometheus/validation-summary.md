# Validation Summary: How to Set Up Alerting Rules in Amazon Managed Prometheus

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Managed Service for Prometheus
- AWS CLI
- Prometheus alerting rules
- PromQL
- Alertmanager
- Amazon SNS
- Amazon Managed Grafana
- Kubernetes / kube-state-metrics

## Sources Consulted
- Amazon Managed Service for Prometheus: Create a rules file: https://docs.aws.amazon.com/prometheus/latest/userguide/AMP-ruler-rulesfile.html
- Amazon Managed Service for Prometheus: Upload a rules configuration file: https://docs.aws.amazon.com/prometheus/latest/userguide/AMP-rules-upload.html
- Amazon Managed Service for Prometheus: Managing and forwarding alerts with alert manager: https://docs.aws.amazon.com/prometheus/latest/userguide/AMP-alert-manager.html
- Amazon Managed Service for Prometheus: Create an alert manager configuration: https://docs.aws.amazon.com/prometheus/latest/userguide/AMP-alertmanager-config.html
- Amazon Managed Service for Prometheus: Configure alert manager to send messages to SNS: https://docs.aws.amazon.com/prometheus/latest/userguide/AMP-alertmanager-receiver-config.html
- Amazon Managed Service for Prometheus: Use awscurl with Prometheus-compatible APIs: https://docs.aws.amazon.com/prometheus/latest/userguide/AMP-compatible-APIs.html
- Amazon Managed Service for Prometheus: Troubleshoot rule evaluations: https://docs.aws.amazon.com/prometheus/latest/userguide/troubleshoot-rule-evaluations.html
- Amazon Managed Service for Prometheus: Integrate alerts with Amazon Managed Grafana or open source Grafana: https://docs.aws.amazon.com/prometheus/latest/userguide/integrating-grafana.html
- AWS CLI v2 Command Reference: create-rule-groups-namespace: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/amp/create-rule-groups-namespace.html
- Amazon Managed Grafana: Contact points: https://docs.aws.amazon.com/grafana/latest/userguide/v10-alerting-explore-contacts.html
- Prometheus documentation: Alerting rules: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus documentation: HTTP API: https://prometheus.io/docs/prometheus/latest/querying/api/

## Issues Found
- The post described AMP-created alerts as being routed through Amazon Managed Grafana's built-in alert manager and showed Grafana contact point provisioning snippets for SNS and Slack. AWS documentation describes AMP alerting rules as feeding AMP alert manager, with Amazon SNS as the supported receiver in the AMP alert manager configuration. I replaced that section with an AMP alert manager definition using SNS receivers and clarified that Managed Grafana can be configured with an Alertmanager data source to view AMP alerts.
- The post said some CLI versions may accept raw YAML and showed `fileb://alerting-rules.yaml` for AWS CLI uploads. AWS documentation for AMP rule and alert manager blob parameters instructs AWS CLI v2 users to pass base64-encoded content, commonly with `file://` for an encoded file. I updated the rule creation and update examples to use base64-encoded data.
- The deployment replica mismatch rule used `kube_deployment_status_available_replicas`, which is not the kube-state-metrics deployment availability metric name. I changed it to `kube_deployment_status_replicas_available`.
- The same deployment rule annotation referenced `{{ $labels.spec_replicas }}`, but the expression did not create that label. I changed the expression to calculate the difference between spec and available replicas and updated the annotation to describe that value.
- The introductory diagram and wrapping text mentioned Slack and PagerDuty as direct AMP alert routing targets. I corrected the flow to AMP alert manager to SNS and described downstream fan-out through SNS subscribers.

## Review Notes
- The remaining PromQL examples are metric-name dependent and assume common application metrics and kube-state-metrics/node-exporter metrics are present with the shown labels.
- The `base64 -w0` examples are Linux/GNU coreutils oriented. macOS users may need a different base64 invocation, but the AWS CLI data handling is now technically correct.
