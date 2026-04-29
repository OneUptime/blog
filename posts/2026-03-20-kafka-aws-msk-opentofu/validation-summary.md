# Validation Summary: How to Deploy Kafka on AWS MSK with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Terraform HCL
- AWS MSK
- Apache Kafka
- AWS VPC and Security Groups
- AWS KMS
- Amazon CloudWatch Logs
- Prometheus open monitoring

## Sources Consulted
- AWS provider `aws_msk_cluster` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/v5.30.0/website/docs/r/msk_cluster.html.markdown
- Amazon MSK port information: https://docs.aws.amazon.com/msk/latest/developerguide/port-info.html
- Amazon MSK metadata management: https://docs.aws.amazon.com/msk/latest/developerguide/metadata-management.html
- Using TLS security with Apache ZooKeeper: https://docs.aws.amazon.com/msk/latest/developerguide/zookeeper-security-tls.html
- Set up automatic scaling for your Amazon MSK cluster: https://docs.aws.amazon.com/msk/latest/developerguide/msk-autoexpand-setup.html
- Provision storage throughput for Standard brokers in a Amazon MSK cluster: https://docs.aws.amazon.com/msk/latest/developerguide/msk-provision-throughput.html
- Supported Apache Kafka versions: https://docs.aws.amazon.com/msk/latest/developerguide/supported-kafka-versions.html
- Mutual TLS client authentication for Amazon MSK: https://docs.aws.amazon.com/msk/latest/developerguide/msk-authentication.html
- Update security settings of a Amazon MSK cluster: https://docs.aws.amazon.com/msk/latest/developerguide/msk-update-security.html

## Issues Found
- The post used Terraform-incompatible `encryption_info.encryption_at_rest` syntax. I changed it to `encryption_at_rest_kms_key_arn`, which is the argument supported by the `aws_msk_cluster` resource.
- The post placed broker log delivery under a top-level `broker_logs` block. I changed it to `logging_info { broker_logs { ... } }` to match the AWS provider schema.
- The security-group example opened `9092-9094` and `2181`, which did not match the cluster's TLS + IAM configuration. I changed the rules to `9094` for TLS clients, `9098` for IAM-authenticated clients, and `2182` for TLS ZooKeeper access used only by legacy admin tooling on ZooKeeper-based clusters.
- The storage comment incorrectly described provisioned throughput as automatic storage scaling, and the instance-size guidance conflicted with MSK throughput requirements. I updated the comments to reflect provisioned throughput, noted the `kafka.m5.4xlarge` minimum broker size for that feature, and noted the `10 GiB` minimum storage requirement when it is enabled.
- The output exposed the plaintext ZooKeeper connection string. I changed it to `zookeeper_connect_string_tls` so it aligns with TLS-enabled ZooKeeper endpoints and the corrected security-group example.
- The best-practices section implied storage auto scaling is part of cluster creation. I corrected that note to reflect AWS guidance that automatic storage scaling is configured separately after cluster creation via Application Auto Scaling.

## Review Notes
- Apache Kafka `3.6.0` is still supported by Amazon MSK as of 2026-04-29, but AWS currently marks `3.9.x` as the recommended version and lists `3.6.0` end of support as 2026-06-01.
- Because the post pins Kafka `3.6.0`, the ZooKeeper-related guidance remains applicable. Newer MSK versions can use KRaft, which changes the relevance of ZooKeeper outputs and ports.
