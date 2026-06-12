# Validation Summary: How to Secure RabbitMQ with TLS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RabbitMQ TLS and mTLS
- RabbitMQ `rabbitmq.conf` and `rabbitmq-env.conf`
- RabbitMQ inter-node TLS / Erlang distribution TLS
- RabbitMQ Management UI HTTPS
- OpenSSL certificate generation and diagnostics
- Docker Compose
- Kubernetes StatefulSet and Service manifests
- Python `ssl` and Pika
- Node.js `amqplib`

## Sources Consulted
- RabbitMQ TLS Support: https://www.rabbitmq.com/docs/ssl
- RabbitMQ Securing Cluster and CLI Communication with TLS: https://www.rabbitmq.com/docs/clustering-ssl
- RabbitMQ Configuration: https://www.rabbitmq.com/docs/configure
- RabbitMQ Management Plugin HTTPS configuration: https://www.rabbitmq.com/docs/management
- RabbitMQ Authentication and Authorization / x.509 authentication: https://www.rabbitmq.com/docs/access-control
- RabbitMQ Release Information: https://www.rabbitmq.com/release-information
- Pika TLS mutual authentication example: https://pika.readthedocs.io/en/stable/examples/tls_mutual_authentication.html
- Pika Connection Parameters reference: https://pika.readthedocs.io/en/stable/modules/parameters.html
- amqplib SSL guide: https://amqp-node.github.io/amqplib/ssl.html
- amqplib Channel API reference: https://amqp-node.github.io/amqplib/channel_api.html
- Local OpenSSL help output for `openssl req` options

## Issues Found
- The CA generation script referenced `openssl.cnf` and `v3_ca` without creating or supplying that config file. Replaced that dependency with explicit `openssl req -addext` CA extensions so the script can generate a usable CA certificate.
- The server certificate script wrote to `server/...` without creating the `server` directory. Added `mkdir -p server`.
- The server key comment referred to `-nodes`, but the command used `openssl genrsa` without that flag. Corrected the comment.
- The article described `rabbitmq.conf` as Erlang-style and used Erlang comment syntax in `rabbitmq.conf` snippets. Updated the description to sysctl-style, changed the code fences to `ini`, and replaced `%%` comments with `#` in `rabbitmq.conf` snippets.
- The Docker Compose example published port `15671` but the RabbitMQ configuration did not enable HTTPS for the Management UI/API. Added `management.ssl.*` settings using the same certificate paths.
- The `rabbitmq-env.conf` example used `RABBITMQ_NODENAME`, `RABBITMQ_CONFIG_FILE`, and `RABBITMQ_SERVER_ADDITIONAL_ERL_ARGS`, but Unix `rabbitmq-env.conf` drops the `RABBITMQ_` prefix for those variables. Changed them to `NODENAME`, `CONFIG_FILE`, and `SERVER_ADDITIONAL_ERL_ARGS`.
- The mTLS configuration omitted the required `rabbitmq_auth_mechanism_ssl` plugin and did not mention that the mapped RabbitMQ user still needs to exist and have permissions. Added comments to the snippet.
- The inter-node TLS `rabbitmq.conf` snippet implied that cluster formation settings enable TLS. Clarified that TLS for Erlang distribution is enabled via runtime flags in `rabbitmq-env.conf`.
- The inter-node TLS environment snippet duplicated `RABBITMQ_SERVER_ADDITIONAL_ERL_ARGS` and omitted the documented SSL application path flag. Replaced it with `SERVER_ADDITIONAL_ERL_ARGS` and `RABBITMQ_CTL_ERL_ARGS` including `-pa $ERL_SSL_PATH`.
- The Docker and Kubernetes examples used `rabbitmq:3.12-management`, which is no longer supported as of June 12, 2026. Updated them to `rabbitmq:4.3-management`.
- The Kubernetes StatefulSet titled as inter-node TLS mounted TLS files but did not pass inter-node TLS runtime flags and used an incomplete node name. Added pod metadata environment variables, a long-form `RABBITMQ_NODENAME`, inter-node TLS runtime flags, and headless service ports for EPMD, AMQPS, management, and clustering.

## Review Notes
- Python and JavaScript code blocks were syntax checked locally. Bash code blocks passed `bash -n`.
- Pika was not installed in the local environment, so Pika API usage was verified against official Pika documentation instead of importing the package locally.
- The Kubernetes manifest remains an illustrative example; a production-ready cluster would also need a complete ConfigMap, Secret, Erlang cookie, permissions/RBAC choices, storage, and readiness/liveness probes.
