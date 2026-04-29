# Validation Summary: How to Deploy Apache Kafka on AWS MSK with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- AWS Provider for OpenTofu/Terraform
- Amazon MSK
- Apache Kafka
- AWS IAM
- AWS VPC security groups
- Amazon CloudWatch Logs
- Amazon S3

## Sources Consulted
- AWS provider `aws_msk_cluster` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/msk_cluster
- AWS provider `aws_msk_configuration` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/msk_configuration
- Amazon MSK supported Kafka versions: https://docs.aws.amazon.com/msk/latest/developerguide/supported-kafka-versions.html
- Amazon MSK port information: https://docs.aws.amazon.com/msk/latest/developerguide/port-info.html
- Amazon MSK bootstrap brokers for IAM access control: https://docs.aws.amazon.com/msk/latest/developerguide/get-bootstrap-cli.html
- Amazon MSK IAM action/resource semantics: https://docs.aws.amazon.com/msk/latest/developerguide/kafka-actions.html
- Amazon MSK IAM policy examples: https://docs.aws.amazon.com/msk/latest/developerguide/create-iam-access-control-policies.html
- Amazon MSK IAM client authorization use cases: https://docs.aws.amazon.com/msk/latest/developerguide/iam-access-control-use-cases.html
- Amazon MSK metadata management: https://docs.aws.amazon.com/msk/latest/developerguide/metadata-management.html
- Amazon MSK best practices for Standard brokers: https://docs.aws.amazon.com/msk/latest/developerguide/bestpractices.html
- Custom Amazon MSK configurations: https://docs.aws.amazon.com/msk/latest/developerguide/msk-configuration-properties.html

## Issues Found
- The post pinned the AWS provider to `~> 5.0`. Updated it to `~> 6.0` so the example reflects the current provider line while still matching the documented `aws_msk_cluster` and `aws_msk_configuration` syntax.
- The post used Kafka version `3.5.1`, which AWS documents as reaching end of support on 2025-10-23. Updated both the cluster and configuration snippets to `3.9.x`, which AWS marks as the recommended MSK version as of 2026-04-29.
- The security group opened port `9094`, but AWS documents `9098` as the in-VPC listener for IAM access control. Updated the ingress rule to `9098`.
- The output exported `bootstrap_brokers_tls`, but AWS documents `BootstrapBrokerStringSaslIam`/`bootstrap_brokers_sasl_iam` for IAM-authenticated clients. Updated the output and conclusion accordingly.
- The IAM policy example relied on undeclared `var.region` and `data.aws_caller_identity.current` references and mixed cluster/topic resource types in one statement. Reworked it to use the cluster ARN directly for `Connect` and derive the topic ARN from that cluster ARN for topic-level actions.
- The ZooKeeper note implied it was for “older clients” and used port `2181`. Updated it to describe ZooKeeper-mode admin access only and switched it to TLS port `2182`, which matches AWS guidance when ZooKeeper access is needed.
- The broker count comment said the value must be a multiple of Availability Zones. Updated it to the provider’s more precise rule: a multiple of the number of client subnets.

## Review Notes
- The snippets still reference supporting resources such as VPCs, subnets, KMS keys, log groups, and buckets that are not defined in this post. That is acceptable for a focused infrastructure example, but it is not a complete standalone module.
- The producer IAM policy shown is valid for the basic “Produce data” use case. If a client requires idempotent or transactional production, AWS documents additional permissions such as `kafka-cluster:WriteDataIdempotently` and transactional ID access.
- Kafka 4.0.x and 4.1.x are also supported on Amazon MSK as of 2026-04-29, but 3.9.x is the AWS-recommended version and the last line that supports both ZooKeeper and KRaft metadata modes, which makes it a safer update for this post’s scope.
