# Validation Summary: How to Create Ansible Callback Plugins

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible callback plugins
- Python
- Ansible configuration
- Slack incoming webhooks
- Generic HTTP webhooks
- Prometheus node exporter textfile collector
- OpenTelemetry OTLP/HTTP metrics

## Sources Consulted
- Ansible callback plugin documentation: https://docs.ansible.com/projects/ansible/latest/plugins/callback.html
- Ansible configuration settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- ansible-core 2.21 local source for callback loading behavior
- Slack incoming webhooks documentation: https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry Protocol Exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- Prometheus Python client textfile collector documentation: https://prometheus.github.io/client_python/exporting/textfile/

## Issues Found
- The post used the older `callback_whitelist` configuration and `CALLBACK_NEEDS_WHITELIST` plugin attribute. Updated these to current `callbacks_enabled` and `CALLBACK_NEEDS_ENABLED` usage.
- The setup example configured `stdout_callback = my_callback` for a notification callback. Removed that setting and enabled the notification callback through `callbacks_enabled`.
- The integration test command used `ANSIBLE_STDOUT_CALLBACK=my_callback` for a notification callback. Changed it to `ANSIBLE_CALLBACKS_ENABLED=my_callback`.
- The Slack webhook example attempted to override `channel`, `username`, and `icon_emoji` in the webhook payload. Modern Slack app incoming webhooks inherit those values from the webhook configuration, so those fields were removed.
- The OpenTelemetry sum metrics omitted `aggregationTemporality` and start timestamps. Added cumulative aggregation temporality and `startTimeUnixNano` values to the OTLP JSON payload.
- The unit test set `start_time` to a `Mock`, which would fail when subtracting it from `datetime.now()`. Updated it to use a real `datetime` value.

## Review Notes
- All Python code blocks were checked with Python AST parsing after edits.
- The YAML playbook block was parsed successfully after review.
- Some examples use direct object attributes such as `playbook._file_name`, `result._result`, and `result._task`, which is common in Ansible callback examples but relies on Ansible internals.
