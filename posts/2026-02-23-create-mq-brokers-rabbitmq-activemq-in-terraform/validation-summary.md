# Validation Summary: How to Create MQ Brokers (RabbitMQ ActiveMQ) in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AWS provider
- HashiCorp Random provider
- AWS Amazon MQ
- Amazon MQ for ActiveMQ
- Amazon MQ for RabbitMQ
- AWS KMS
- AWS Secrets Manager
- AWS Security Groups
- CloudWatch logging

## Sources Consulted
- Terraform AWS provider `aws_mq_broker` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/mq_broker
- Terraform AWS provider `aws_mq_configuration` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/mq_configuration
- Terraform Random provider `random_password` resource documentation: https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/password
- Amazon MQ for ActiveMQ engine version documentation: https://docs.aws.amazon.com/amazon-mq/latest/developer-guide/activemq-version-management.html
- Amazon MQ for RabbitMQ engine version documentation: https://docs.aws.amazon.com/amazon-mq/latest/developer-guide/rabbitmq-version-management.html
- Amazon MQ for ActiveMQ broker configuration documentation: https://docs.aws.amazon.com/amazon-mq/latest/developer-guide/amazon-mq-broker-configuration-parameters.html
- Amazon MQ broker port and connectivity documentation: https://docs.aws.amazon.com/amazon-mq/latest/developer-guide/general.html
- Amazon MQ for ActiveMQ broker instance types: https://docs.aws.amazon.com/amazon-mq/latest/developer-guide/broker-instance-types.html
- Amazon MQ for RabbitMQ broker instance types: https://docs.aws.amazon.com/amazon-mq/latest/developer-guide/rmq-broker-instance-types.html
- Amazon MQ API broker user password requirements: https://docs.aws.amazon.com/amazon-mq/latest/api-reference/brokers.html

## Issues Found
- The ActiveMQ examples used `engine_version = "5.17.6"`, but Amazon MQ lists ActiveMQ 5.17 as past end of support. Updated the ActiveMQ broker and configuration examples to `5.19`, the currently recommended supported minor version.
- The RabbitMQ examples used RabbitMQ `3.13` on `mq.m5.large`. This is still supported, but Amazon MQ currently recommends RabbitMQ `4.2`, which is supported only on `mq.m7g` instance types. Updated the RabbitMQ examples to `engine_version = "4.2"` and `host_instance_type = "mq.m7g.large"`.
- The provider setup pinned the AWS provider to `~> 5.0` while current official examples use `~> 6.0`. Updated the AWS provider constraint and added the missing explicit `hashicorp/random` provider declaration for the `random_password` resource.
- The ActiveMQ high-availability example referenced `var.activemq_producer_password` and `var.activemq_consumer_password`, but the variables section did not define them. Added both sensitive variables.
- The generated password example used Terraform Random's default special-character set, which can include characters Amazon MQ broker passwords reject, such as `:` and `=`. Added `override_special` with characters compatible with Amazon MQ password restrictions.

## Review Notes
The examples still assume existing VPC, subnet, and KMS resources such as `aws_vpc.main`, `aws_subnet.private`, and `aws_kms_key.mq`. That is acceptable for a focused tutorial, but a future expanded version could include a complete minimal VPC example or link to an existing network module.
