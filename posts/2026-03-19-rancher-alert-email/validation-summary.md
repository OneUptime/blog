# Validation Summary: How to Configure Alert Notifications via Email in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Monitoring
- Kubernetes
- Prometheus Alertmanager
- Prometheus Operator
- Helm
- SMTP

## Sources Consulted
- Rancher: Alertmanager Configuration https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/monitoring-v2-configuration-guides/advanced-configuration/alertmanager
- Rancher: Receiver Configuration https://ranchermanager.docs.rancher.com/v2.13/reference-guides/monitoring-v2-configuration/receivers
- Rancher: Enable Monitoring https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/monitoring-alerting-guides/enable-monitoring
- Prometheus: Alertmanager Configuration https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus: Notification Template Reference https://prometheus.io/docs/alerting/latest/notifications/
- Prometheus Operator: API Reference https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Operator: Alerting Guide https://prometheus-operator.dev/docs/developer/alerting/
- Kubernetes: `kubectl logs` Reference https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes: `kubectl` Quick Reference https://v1-33.docs.kubernetes.io/docs/reference/kubectl/quick-reference/
- Prometheus Community Helm Chart values https://raw.githubusercontent.com/prometheus-community/helm-charts/main/charts/kube-prometheus-stack/values.yaml
- Prometheus Community Helm Chart Alertmanager secret template https://raw.githubusercontent.com/prometheus-community/helm-charts/main/charts/kube-prometheus-stack/templates/alertmanager/secret.yaml
- Google: App Passwords https://support.google.com/mail/answer/185833?hl=en
- AWS: Connecting to an Amazon SES SMTP endpoint https://docs.aws.amazon.com/ses/latest/dg/smtp-connect.html
- SendGrid Support: How to Connect SendGrid with ClickFunnels via SMTP https://support.sendgrid.com/hc/en-us/articles/1260803088929-How-to-Connect-SendGrid-with-ClickFunnels-via-SMTP

## Issues Found
- The Rancher UI navigation was inaccurate. The post said `Monitoring > Advanced > Alertmanager Configs`, but Rancher documents `Monitoring > Alerting > AlertManagerConfigs` for v2.6.5+ and `Monitoring > Receiver` for earlier v2.6 releases. I corrected the step and added the version caveat.
- The UI section implied that full SMTP file-based configuration was handled the same way as a receiver form. I clarified that full Alertmanager YAML and `smtp_auth_password_file` should be configured through the monitoring chart values in the next step.
- The custom email template example used `html` for a plain-text message body. Alertmanager has separate `html` and `text` fields, so I changed the example to `text` to match the template content.
- The template labeled any `EndsAt` value as `Resolved`, which is incorrect because Prometheus alerts can include `EndsAt` while still firing. I changed the template to print `Resolved` only when the per-alert `.Status` is `resolved`.
- The troubleshooting advice for SMTP on port `465` suggested disabling TLS with `smtp_require_tls: false`, which is outdated for current Alertmanager. I replaced it with the current implicit-TLS guidance and pointed to `smtp_force_implicit_tls: true` when needed.
- The `kubectl logs` example did not specify a container, even though Alertmanager pods are multi-container in Prometheus Operator deployments. I updated the command to use `-c alertmanager`.

## Review Notes
- Rancher's Routes/Receivers UI does not cover every Alertmanager configuration shape. If the generated Alertmanager Secret is not in a format the UI supports, direct chart-value or secret-based edits are still required.
