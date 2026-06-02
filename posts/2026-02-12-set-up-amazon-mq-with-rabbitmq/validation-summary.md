# Validation Summary: How to Set Up Amazon MQ with RabbitMQ

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon MQ for RabbitMQ
- AWS CLI
- AWS CloudWatch metrics and alarms
- AWS CDK / CloudFormation `AWS::AmazonMQ::Broker`
- RabbitMQ AMQP 0-9-1, exchanges, queues, bindings, TTL, dead-letter exchanges, acknowledgements
- Python, Pika, and TLS connections
- Node.js and amqplib

## Sources Consulted
- AWS CLI `mq create-broker` command reference: https://docs.aws.amazon.com/cli/latest/reference/mq/create-broker.html
- Amazon MQ for RabbitMQ engine version management: https://docs.aws.amazon.com/amazon-mq/latest/developer-guide/rabbitmq-version-management.html
- Amazon MQ for RabbitMQ deployment options: https://docs.aws.amazon.com/amazon-mq/latest/developer-guide/rabbitmq-broker-architecture.html
- Using Amazon MQ for RabbitMQ, endpoints, and ports: https://docs.aws.amazon.com/amazon-mq/latest/developer-guide/working-with-rabbitmq.html
- Amazon MQ for RabbitMQ CloudWatch metrics: https://docs.aws.amazon.com/amazon-mq/latest/developer-guide/rabbitmq-logging-monitoring.html
- Amazon MQ for RabbitMQ best practices: https://docs.aws.amazon.com/amazon-mq/latest/developer-guide/best-practices-rabbitmq.html
- Amazon MQ for RabbitMQ message durability and reliability: https://docs.aws.amazon.com/amazon-mq/latest/developer-guide/best-practices-message-reliability.html
- AWS CDK `aws_amazonmq.CfnBroker` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_amazonmq.CfnBroker.html
- RabbitMQ AMQP 0-9-1 concepts: https://www.rabbitmq.com/tutorials/amqp-concepts
- RabbitMQ dead-letter exchanges: https://www.rabbitmq.com/docs/3.13/dlx
- RabbitMQ consumer acknowledgements and publisher confirms: https://www.rabbitmq.com/docs/3.13/confirms
- RabbitMQ TTL documentation: https://www.rabbitmq.com/docs/ttl
- amqplib channel API reference: https://amqp-node.github.io/amqplib/channel_api.html
- Pika connection parameters documentation: https://pika.readthedocs.io/en/stable/modules/parameters.html
- Python `datetime` documentation: https://docs.python.org/3/library/datetime.html

## Issues Found
- The production AWS CLI example used `--publicly-accessible false`. AWS CLI boolean flags for this option use `--publicly-accessible` or `--no-publicly-accessible`, so the command was corrected to `--no-publicly-accessible`.
- The RabbitMQ broker user examples set `ConsoleAccess` / `consoleAccess`. AWS documents this field as applying to ActiveMQ console access, not RabbitMQ brokers, so those fields were removed from the CLI and CDK examples.
- The production CLI logging example included `"Audit": false`. AWS documents audit logging as not applying to RabbitMQ brokers, so the RabbitMQ example now only sets general logging.
- The post claimed Amazon MQ provides RabbitMQ brokers with backups and later said it has all open-source RabbitMQ features. Official Amazon MQ documentation describes managed maintenance, durable storage, replication, and specific unsupported RabbitMQ features such as streams, so those statements were narrowed.
- The publishing example used `datetime.utcnow()`, which is deprecated in current Python. It now uses `datetime.now(timezone.utc).isoformat()`.

## Review Notes
- RabbitMQ `3.13` remains supported on `mq.m5.large`; current AWS documentation recommends RabbitMQ `4.2` as the latest supported version, but `4.2` requires `mq.m7g` instance types. The post explicitly targets `3.13`, so no version change was made.
- The AWS CLI is not installed in this workspace, so command verification was performed against the current official AWS CLI reference rather than local `--help` output.
- Local checks: all Python code blocks compiled with `python3`, the JavaScript block parsed with Node.js, embedded AWS CLI JSON payloads parsed successfully, and `validation.json` was validated with `jq`.
