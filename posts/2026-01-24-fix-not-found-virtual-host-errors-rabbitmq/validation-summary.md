# Validation Summary: How to Fix 'Not Found' Virtual Host Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- RabbitMQ virtual hosts
- RabbitMQ CLI tools (`rabbitmqctl`)
- RabbitMQ definitions import/export
- Pika Python client
- AMQP connection URLs
- Kubernetes Deployments and environment variables
- Bash automation

## Sources Consulted
- RabbitMQ Virtual Hosts documentation: https://www.rabbitmq.com/docs/vhosts
- RabbitMQ `rabbitmqctl` manual: https://www.rabbitmq.com/docs/man/rabbitmqctl.8
- RabbitMQ Authentication, Authorisation, Access Control documentation: https://www.rabbitmq.com/docs/access-control
- RabbitMQ Schema Definition Export and Import documentation: https://www.rabbitmq.com/docs/definitions
- Pika URLParameters documentation: https://pika.readthedocs.io/en/stable/examples/using_urlparameters.html
- Pika Connection Parameters documentation: https://pika.readthedocs.io/en/stable/modules/parameters.html
- Kubernetes environment variable documentation: https://kubernetes.io/docs/tasks/inject-data-application/define-environment-variable-container/

## Issues Found
- The introduction described `NOT_FOUND - no vhost` as caused by either a missing vhost or missing user permissions. RabbitMQ distinguishes these cases during connection setup, so I changed the wording to identify missing vhosts as the `NOT_FOUND` case and describe permission failures as related access refused errors.
- `rabbitmqctl list_vhosts --verbose` is not a documented command form. I replaced it with `rabbitmqctl list_vhosts name tracing description tags default_queue_type`, matching the documented vhost info fields.
- `rabbitmqctl list_permissions --vhost /myapp` used an unsupported option. I changed it to the documented `rabbitmqctl list_permissions -p /myapp`.
- The RabbitMQ definitions snippet was fenced as YAML while showing a JSON definitions file, and the block included comments that would make it invalid JSON. I changed the fence to `json` and removed the comments inside the JSON block.
- The definitions import comment said existing resources are updated. RabbitMQ definitions import is better described as not duplicating existing resources, so I adjusted the wording.
- The Bash automation script used `--quiet` and loose `grep` matching for parseable checks. I changed the vhost and user checks to use `--silent`, exact matching, and column extraction where needed.
- The Bash script embedded the vhost directly into a Python one-liner, which could break for vhost names containing quotes. I changed it to pass the vhost through an environment variable before URL encoding.
- The Kubernetes example referenced `$(RABBITMQ_PASSWORD)` before the variable was defined. Kubernetes environment variable expansion is order-sensitive, so I moved `RABBITMQ_PASSWORD` before `RABBITMQ_URL`.
- The Kubernetes example used `rabbitmq:3.12-management`; I updated it to `rabbitmq:4-management` to avoid pinning the example to an older release series.
- The Python diagnostic script printed literal `{vhost}` and `{username}` placeholders in two suggested fix commands. I changed those lines to f-strings.

## Review Notes
The Pika connection examples and URL-encoding guidance are consistent with Pika's documented `URLParameters` behavior. I verified the Python snippets compile, the Bash snippets parse with `bash -n`, and the RabbitMQ definitions JSON parses successfully.
