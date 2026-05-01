# Validation Summary: How to Deploy RabbitMQ via Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- RabbitMQ
- Docker Compose
- AMQP 0-9-1
- RabbitMQ Management UI

## Sources Consulted
- Portainer Documentation, "Add a new stack": https://docs.portainer.io/user/docker/stacks/add
- Portainer Documentation, "How Relative Path Support works in Portainer": https://docs.portainer.io/advanced/relative-paths
- RabbitMQ Documentation, "Schema Definition Export and Import": https://www.rabbitmq.com/docs/definitions
- RabbitMQ Documentation, "Management Plugin": https://www.rabbitmq.com/docs/management
- RabbitMQ Documentation, "Configuration" (3.13): https://www.rabbitmq.com/docs/3.13/configure
- RabbitMQ Documentation, "Credentials and Passwords" (3.13): https://www.rabbitmq.com/docs/3.13/passwords
- RabbitMQ Documentation, "RabbitMQ URI Specification" (3.13): https://www.rabbitmq.com/docs/3.13/uri-spec
- RabbitMQ Documentation, "`rabbitmqctl` man page" (3.13): https://www.rabbitmq.com/docs/3.13/man/rabbitmqctl.8
- RabbitMQ Documentation, "`rabbitmq-diagnostics` man page" (3.13): https://www.rabbitmq.com/docs/3.13/man/rabbitmq-diagnostics.8
- Docker Docs, "Version and name top-level elements": https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs, "Control startup order in Compose": https://docs.docker.com/compose/how-tos/startup-order/

## Issues Found
- The compose example used the top-level `version: "3.8"` field. Docker now documents that field as obsolete and only retained for backward compatibility, so I removed it.
- The stack used relative bind mounts (`./rabbitmq.conf` and `./definitions.json`). Portainer documents relative path volumes as a Business Edition feature for Git-based stack deployments, so I changed the example to use absolute host paths to keep the "Add Stack" workflow technically valid.
- The RabbitMQ config used `management.load_definitions`. RabbitMQ now documents that setting as deprecated in favor of core definitions loading, so I replaced it with `definitions.import_backend = local_filesystem` and `definitions.local.path = /etc/rabbitmq/definitions.json`.
- The post mixed boot-time definitions import with `RABBITMQ_DEFAULT_USER`, `RABBITMQ_DEFAULT_PASS`, and `RABBITMQ_DEFAULT_VHOST`. RabbitMQ documents that a blank node importing definitions on boot does not create the default user and vhost, so those environment variables would not produce the documented admin login. I removed them and created the admin user directly in `definitions.json`.
- The definitions example used a placeholder `password_hash` and a user with no management tag, which made the sample unusable for actual login to the management UI. I replaced the placeholder with a valid RabbitMQ SHA-256 password hash for `secure-rabbitmq-password` and set the user's tags to `["administrator"]`.
- The worker connection string used `amqp://...@rabbitmq:5672/`, which RabbitMQ's URI specification interprets as an empty vhost path, not the default `/` vhost. I corrected it to `amqp://...@rabbitmq:5672/%2f`.

## Review Notes
- RabbitMQ 3.13 is still documented, but RabbitMQ's 3.13 documentation states that the series is out of community support and that new patch releases are only available to paying customers through December 30, 2027.
- The healthcheck command `rabbitmq-diagnostics check_port_connectivity` is valid and current, but RabbitMQ documents it as a listener connectivity check rather than a full protocol handshake or authentication check.
- `depends_on.condition: service_healthy` is valid in Docker Compose for services in the same compose application. If a worker is deployed outside the same stack, application-level retry logic is still needed.
