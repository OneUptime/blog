# Validation Summary: How to Set Up Amazon MQ with ActiveMQ

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS Amazon MQ
- Apache ActiveMQ Classic
- AWS CLI
- Terraform AWS provider security groups
- Java JMS
- Python
- stomp.py
- Amazon CloudWatch
- AWS KMS

## Sources Consulted
- Amazon MQ ActiveMQ version management: https://docs.aws.amazon.com/amazon-mq/latest/developer-guide/activemq-version-management.html
- AWS CLI `mq create-broker` command reference: https://docs.aws.amazon.com/cli/latest/reference/mq/create-broker.html
- Amazon MQ ActiveMQ broker endpoints and supported protocols: https://docs.aws.amazon.com/amazon-mq/latest/developer-guide/amazon-mq-basic-elements.html
- Amazon MQ ActiveMQ deployment options: https://docs.aws.amazon.com/amazon-mq/latest/developer-guide/amazon-mq-broker-architecture.html
- Amazon MQ ActiveMQ best practices: https://docs.aws.amazon.com/amazon-mq/latest/developer-guide/best-practices-activemq.html
- Amazon MQ data protection and KMS encryption: https://docs.aws.amazon.com/amazon-mq/latest/developer-guide/data-protection.html
- Amazon MQ ActiveMQ CloudWatch metrics: https://docs.aws.amazon.com/amazon-mq/latest/developer-guide/activemq-logging-monitoring.html
- Amazon MQ ActiveMQ broker instance types: https://docs.aws.amazon.com/amazon-mq/latest/developer-guide/broker-instance-types.html
- Apache ActiveMQ `ActiveMQSslConnectionFactory` Javadocs: https://activemq.apache.org/components/classic/documentation/maven/apidocs/org/apache/activemq/ActiveMQSslConnectionFactory.html
- stomp.py documentation and PyPI project page: https://stomppy.readthedocs.io/en/latest/stomp.html and https://pypi.org/project/stomp.py/
- Python `ssl` documentation: https://docs.python.org/3/library/ssl.html
- Terraform AWS provider `aws_security_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group

## Issues Found
- The post explicitly used ActiveMQ engine version `5.17.6` and stated that `5.17.x` was well supported. Amazon MQ documentation now lists ActiveMQ 5.17 end of support as June 16, 2025 and recommends ActiveMQ 5.19. I removed the stale `--engine-version` flags so Amazon MQ defaults to the latest available ActiveMQ version, and updated the note to show how to list supported versions.
- The Python STOMP consumer subscribed with `ack="client-individual"` but never acknowledged messages. I changed the example to `ack="auto"` so messages are acknowledged automatically in this simple listener.
- The production failover explanation said the connection URL stays the same because it uses a failover transport. Amazon MQ provides two wire-level endpoints for active/standby brokers, and applications should configure the ActiveMQ failover transport with both endpoints. I corrected the wording.
- The password requirements were inaccurate. Amazon MQ requires at least 12 characters, at least 4 unique characters, and disallows commas, colons, and equal signs. I updated the pitfall note accordingly.
- The encryption-at-rest pitfall implied encryption had to be enabled. Amazon MQ always encrypts data at rest, but the KMS key choice is made at broker creation. I corrected the note to focus on choosing the encryption key intentionally.
- The Python STOMP examples used Python's deprecated `ssl.PROTOCOL_TLSv1_2` constant. Current stomp.py uses `set_ssl()` to configure TLS and builds an `SSLContext` internally, so I removed the deprecated constant and the now-unused `ssl` import.

## Review Notes
- The Terraform security group snippet uses inline `ingress` and `egress` blocks, which are still valid, but the current Terraform AWS provider documentation recommends standalone `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` resources for new configurations.
- The STOMP examples enable TLS but do not specify CA bundle handling. For production, configure certificate validation according to your runtime trust store and organizational requirements.
