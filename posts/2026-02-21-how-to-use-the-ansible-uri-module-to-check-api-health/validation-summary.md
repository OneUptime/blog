# Validation Summary: How to Use the Ansible uri Module to Check API Health

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- `ansible.builtin.uri` module
- Ansible retries, loops, registered variables, and `failed_when`
- Slack incoming webhooks
- PagerDuty Events API v2
- Elasticsearch cluster health API
- RabbitMQ management HTTP API health checks

## Sources Consulted
- Ansible `ansible.builtin.uri` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible loops and `until` retry documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_loops.html
- Ansible error handling and `failed_when` documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_error_handling.html
- Slack incoming webhooks documentation: https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/
- PagerDuty Events API v2 reference: https://developer.pagerduty.com/api-reference/368ae3d938c9e-send-an-event-to-pager-duty
- Elasticsearch cluster health API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-health
- RabbitMQ HTTP API health check documentation: https://www.rabbitmq.com/docs/4.1/http-api-reference#health-check-endpoints

## Issues Found
- The Slack incoming webhook example included `channel: "#alerts"` in the webhook body. Slack documents that incoming webhooks post to the channel selected during installation and cannot override the default channel. Removed the `channel` field so the example matches supported webhook behavior.
- The RabbitMQ health check example validated `rmq_health.json.status != 'ok'`. RabbitMQ documents `/api/health/checks/alarms` in terms of HTTP status, returning `200 OK` when healthy and `503 Service Unavailable` when unhealthy. Replaced the JSON body assertion with `status_code: 200`.
- The pre-deployment health gate used `https://database.internal:5432/health` and `https://redis.internal:6379/health`, which suggests sending HTTPS requests to native database/cache protocol ports. Replaced them with HTTP health endpoint-style hostnames so the `uri` examples remain plausible.

## Review Notes
The examples are syntactically valid YAML. Ansible itself was not installed in the local environment, so validation used documentation review plus YAML parsing rather than `ansible-playbook --syntax-check`.
