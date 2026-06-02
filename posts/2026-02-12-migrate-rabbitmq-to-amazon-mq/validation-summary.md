# Validation Summary: How to Migrate from Self-Managed RabbitMQ to Amazon MQ

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- AWS Amazon MQ for RabbitMQ
- RabbitMQ
- RabbitMQ management HTTP API
- RabbitMQ Federation plugin
- AWS CLI
- Python requests
- Python pika
- CloudWatch metrics

## Sources Consulted
- AWS CLI Command Reference: create-broker - https://docs.aws.amazon.com/cli/latest/reference/mq/create-broker.html
- Amazon MQ for RabbitMQ engine versions - https://docs.aws.amazon.com/amazon-mq/latest/developer-guide/rabbitmq-version-management.html
- Amazon MQ for RabbitMQ broker instance types - https://docs.aws.amazon.com/amazon-mq/latest/developer-guide/rmq-broker-instance-types.html
- Amazon MQ for RabbitMQ listener ports and endpoints - https://docs.aws.amazon.com/amazon-mq/latest/developer-guide/working-with-rabbitmq.html
- Amazon MQ for RabbitMQ plugins - https://docs.aws.amazon.com/amazon-mq/latest/developer-guide/rabbitmq-basic-elements-plugins.html
- Amazon MQ for RabbitMQ CloudWatch metrics - https://docs.aws.amazon.com/amazon-mq/latest/developer-guide/rabbitmq-logging-monitoring.html
- Amazon MQ for RabbitMQ resource limits - https://docs.aws.amazon.com/amazon-mq/latest/developer-guide/rabbitmq-resource-hard-limit.html
- RabbitMQ definitions export/import - https://www.rabbitmq.com/docs/definitions
- RabbitMQ HTTP API reference - https://www.rabbitmq.com/docs/http-api-reference
- RabbitMQ Federation plugin - https://www.rabbitmq.com/docs/next/federation
- Pika connection parameters - https://pika.readthedocs.io/en/latest/modules/parameters.html

## Issues Found
- The `aws mq create-broker --users` example used lowercase JSON keys and `consoleAccess`, but AWS CLI documents PascalCase/shorthand user fields and notes `ConsoleAccess` does not apply to RabbitMQ brokers. Changed the example to the documented shorthand form with `Username` and `Password`.
- The definitions import script treated only HTTP 200 as success. RabbitMQ's management API import can succeed with no content, so the script now accepts 200, 201, and 204.
- The policy example described a TTL policy as a "ha-policy equivalent", which was inaccurate. Reworded it as a normal RabbitMQ policy for TTL, max-length, and similar settings.
- The RabbitMQ policy examples omitted `priority`, which the current RabbitMQ HTTP API policy shape documents explicitly. Added `priority: 0` to the policy payloads.
- The post said Amazon MQ RabbitMQ users are created with `aws mq create-user`. AWS documents that only the initial RabbitMQ administrative user is created during broker provisioning; subsequent RabbitMQ users are created through the RabbitMQ management API or web console. Replaced the AWS CLI snippet with RabbitMQ management API calls to create a user and grant vhost permissions.
- The federation example configured the old broker with Amazon MQ as upstream, which would reverse the intended flow. Updated it to configure Amazon MQ as the downstream broker with the old broker as upstream.
- The federation URI sample used an unescaped `@` character inside the password, which would break URI parsing. Changed the sample password to avoid reserved URI delimiters.
- The federation explanation said both brokers stay in sync. Federation does not provide general bidirectional synchronization, so the wording now describes moving matching message flow during the migration window.

## Review Notes
The sizing table is a rough heuristic rather than an AWS-published sizing rule. AWS recommends using resource limits, instance type characteristics, and workload testing for final sizing decisions.
