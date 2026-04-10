# Validation Summary: How to Configure Bucket Notifications to Kafka in Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Apache Kafka
- AWS CLI (used against RGW's S3/SNS-compatible API)
- S3-compatible bucket notifications
- SNS-compatible topic management
- SASL/SSL authentication for Kafka

## Sources Consulted
- Ceph official documentation: https://docs.ceph.com/en/latest/radosgw/notifications/ — Bucket notifications configuration, supported endpoints, topic attributes, and SASL/SSL attribute names
- Ceph official documentation: https://docs.ceph.com/en/latest/radosgw/s3/bucketops.rst — S3 bucket operations including notification configuration format
- Ceph source (doc/radosgw/notifications.rst) — Verified attribute names for Kafka endpoints (`push-endpoint`, `kafka-ack-level`, `use-ssl`, `mechanism`, `user-name`, `password`)

## Issues Found

1. **"RabbitMQ" changed to "AMQP (e.g., RabbitMQ)"** — The overview stated RGW supports "Kafka, RabbitMQ, and HTTP" endpoints. The official Ceph documentation specifies AMQP 0.9.1 as the supported protocol, not RabbitMQ specifically. While RabbitMQ is the most common AMQP 0.9.1 broker, the Ceph support is protocol-level, not broker-specific. Changed to "Kafka, AMQP (e.g., RabbitMQ), and HTTP" for accuracy.

2. **"include credentials in the endpoint URL" changed to "include credentials in the topic attributes"** — The Kafka Authentication (SASL) section stated to "include credentials in the endpoint URL," but the example actually shows credentials passed as topic attributes in the `--attributes` parameter, not in the endpoint URL itself. The `push-endpoint` URL remains `kafka://kafka.example.com:9092` without embedded credentials. Fixed the text to match the actual approach shown.

## Review Notes
- The topic ARN format `arn:aws:sns:default::s3-events` is a valid example for a default zone group with no tenant. The general format is `arn:aws:sns:<zone-group>:<tenant>:<topic>`. The example is correct for typical single-zone-group setups.
- The notification configuration JSON uses the AWS CLI JSON format (`TopicConfigurations`, `TopicArn`, `Events` array), which is the correct input format for `aws s3api put-bucket-notification-configuration`. The Ceph docs show the underlying XML representation, but the AWS CLI handles the JSON-to-XML translation.
- The `kafka-ack-level: broker` value is the default per Ceph docs, which is a good choice for the example since it provides delivery confirmation.
- The Kafka topic defaulting to the SNS topic name (`s3-events`) is implied behavior but not explicitly documented for Kafka in the Ceph docs. It is well-established in practice.
- The post could mention the `ca-location` attribute for specifying a CA certificate file when using SSL, but this is optional additional information, not an error.
