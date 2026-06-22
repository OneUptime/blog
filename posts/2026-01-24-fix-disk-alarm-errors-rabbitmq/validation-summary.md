# Validation Summary: How to Fix 'Disk Alarm' Errors in RabbitMQ

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- RabbitMQ
- rabbitmqctl
- RabbitMQ Management HTTP API
- RabbitMQ configuration files
- Prometheus alerting rules
- Linux shell commands

## Sources Consulted
- RabbitMQ Free Disk Space Alarms documentation: https://www.rabbitmq.com/docs/disk-alarms
- RabbitMQ Memory and Disk Alarms documentation: https://www.rabbitmq.com/docs/alarms
- RabbitMQ rabbitmqctl manual: https://www.rabbitmq.com/docs/man/rabbitmqctl.8
- RabbitMQ HTTP API reference: https://www.rabbitmq.com/docs/http-api-reference
- RabbitMQ Monitoring with Prometheus and Grafana documentation: https://www.rabbitmq.com/docs/prometheus
- RabbitMQ Monitoring documentation: https://www.rabbitmq.com/docs/monitoring
- RabbitMQ Time-To-Live and Expiration documentation: https://www.rabbitmq.com/docs/ttl
- RabbitMQ Queue Length Limit documentation: https://www.rabbitmq.com/docs/maxlength
- RabbitMQ Dead Letter Exchanges documentation: https://www.rabbitmq.com/docs/dlx
- RabbitMQ Configuration documentation: https://www.rabbitmq.com/docs/configure

## Issues Found
- The Management HTTP API health check was described as returning detailed alarm information in JSON. RabbitMQ documents `/api/health/checks/alarms` as a health check endpoint that returns HTTP 200 when no alarms are active and HTTP 503 when alarms are active, so the wording and comments were corrected.
- The `set_disk_free_limit` comment suggested a relative value format like `"mem_relative,1.0"`, but the official CLI syntax uses `rabbitmqctl set_disk_free_limit mem_relative 1.0`. The comment was corrected while keeping the already-correct command example.
- The temporary threshold adjustment section said to lower the limit, but the example can raise or lower the limit depending on the existing setting. The wording was changed to "adjust it temporarily."
- The `rabbitmq.conf` relative disk limit comment referred to total system memory. The RabbitMQ CLI manual describes the relative limit as based on available RAM, so the comment was corrected.
- The `advanced.config` comment said the `disk_free_limit` value was specified in bytes while the example used `{mem_relative, 1.5}`. The comment was corrected to match the example.
- The TTL policy comment said the command creates a queue, but `rabbitmqctl set_policy` applies a policy to matching queues. The comment was corrected.

## Review Notes
The core explanation is technically accurate: RabbitMQ raises disk alarms when free disk space drops below `disk_free_limit`, blocks producers/publishing connections, and uses a 50MB default that RabbitMQ itself says is too low for production. The Prometheus metric name used in the examples is consistent with RabbitMQ Prometheus plugin output, but production alert thresholds should be aligned with the deployment's configured `disk_free_limit` and disk capacity.
