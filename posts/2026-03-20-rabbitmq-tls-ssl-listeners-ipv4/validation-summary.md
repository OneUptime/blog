# Validation Summary: How to Configure RabbitMQ TLS/SSL Listeners on IPv4

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RabbitMQ
- TLS/SSL
- OpenSSL
- UFW
- Python `pika`
- Node.js `amqplib`

## Sources Consulted
- RabbitMQ Networking guide: https://www.rabbitmq.com/docs/networking
- RabbitMQ TLS guide: https://www.rabbitmq.com/docs/ssl
- RabbitMQ troubleshooting TLS guide: https://www.rabbitmq.com/docs/4.1/troubleshooting-ssl
- RabbitMQ `rabbitmq-diagnostics` manual: https://www.rabbitmq.com/docs/man/rabbitmq-diagnostics.8
- RabbitMQ `rabbitmqctl` manual: https://www.rabbitmq.com/docs/4.1/man/rabbitmqctl.8
- Pika TLS example: https://pika.readthedocs.io/en/latest/examples/tls_server_authentication.html
- Pika connection parameters: https://pika.readthedocs.io/en/latest/modules/parameters.html
- amqplib Channel API reference: https://amqp-node.github.io/amqplib/channel_api.html
- amqplib SSL guide: https://amqp-node.github.io/amqplib/ssl.html
- Python `ssl` module documentation: https://docs.python.org/3/library/ssl.html
- OpenSSL `req` documentation: https://docs.openssl.org/3.4/man1/openssl-req/
- OpenSSL `x509` documentation: https://docs.openssl.org/3.3/man1/openssl-x509/
- OpenSSL `s_client` documentation: https://docs.openssl.org/3.4/man1/openssl-s_client/
- Erlang SSL reference: https://www.erlang.org/docs/26/man/ssl
- Local `ufw(8)` man page and `ufw --help`

## Issues Found
- The original certificate example only set `CN=10.0.0.5` for the server certificate. That is not sufficient for reliable IP-based peer verification with modern clients, so I added an IP `subjectAltName` and explicit CA/server certificate extensions.
- The RabbitMQ configuration enabled both TLS 1.2 and TLS 1.3 but only listed TLS 1.2 cipher suites. I added TLS 1.3 cipher suites so both configured protocol versions can negotiate correctly.
- The post used `rabbitmq-diagnostics tls_status`, which is not a documented RabbitMQ diagnostics command. I replaced it with `rabbitmq-diagnostics certificates`.
- The Node.js `amqplib` example did not follow the documented `connect([url, [socketOptions]])` form and did not show the promise-based API correctly. I replaced it with `await amqp.connect('amqps://...')` plus a separate TLS socket-options object.
- The OpenSSL verification example checked the CA chain but did not verify the server IP identity. I added `-verify_ip 10.0.0.5`.
- The commented UFW example used incorrect rule syntax for the remote AMQP deny case and did not match the surrounding localhost-only AMQP listener example. I corrected the syntax and clarified when that rule applies.
- The RabbitMQ listener/connection verification examples were too imprecise. I updated the listener note to match documented `amqp/ssl` output and expanded `list_connections` to include TLS protocol and cipher details.

## Review Notes
- TLS 1.3 support in RabbitMQ depends on the Erlang/OpenSSL build. Current RabbitMQ docs note that TLS 1.3 support requires a recent Erlang/OpenSSL runtime.
- The client examples assume the CA certificate has been copied to the client host at the referenced path.
- UFW evaluates rules in order and the first match wins, so the subnet-specific allow rule must remain above the general deny rule.
