# Validation Summary: How to Create MSK Clusters with Terraform

## Status
validated

## Post Type
Tutorial / Infrastructure-as-code guide

## Technologies Covered
- Amazon MSK
- Apache Kafka
- Terraform AWS provider
- AWS KMS
- AWS Secrets Manager
- AWS IAM
- Amazon CloudWatch

## Sources Consulted
- Terraform AWS provider documentation for `aws_msk_cluster`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/msk_cluster
- Terraform AWS provider documentation for `aws_msk_serverless_cluster`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/msk_serverless_cluster
- Terraform AWS provider documentation for `aws_msk_scram_secret_association`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/msk_scram_secret_association
- AWS MSK port information: https://docs.aws.amazon.com/msk/latest/developerguide/port-info.html
- AWS MSK IAM authorization policy resources and actions: https://docs.aws.amazon.com/msk/latest/developerguide/kafka-actions.html
- AWS MSK IAM policy examples: https://docs.aws.amazon.com/msk/latest/developerguide/create-iam-access-control-policies.html
- AWS MSK CloudWatch metrics for Standard brokers: https://docs.aws.amazon.com/msk/latest/developerguide/metrics-details.html
- AWS MSK Serverless overview and authentication notes: https://docs.aws.amazon.com/msk/latest/developerguide/serverless.html
- AWS MSK quotas, including Serverless quotas: https://docs.aws.amazon.com/msk/latest/developerguide/limits.html

## Issues Found
- The basic cluster example enabled EBS provisioned throughput on `kafka.m5.large`. The Terraform AWS provider documents provisioned throughput as requiring `kafka.m5.4xlarge` or larger, so the `provisioned_throughput` block was removed from that small-broker example.
- The security group description said the snippet allowed plaintext Kafka traffic, but the ingress rules did not include plaintext port `9092`. The wording was corrected to describe TLS, SASL/SCRAM, IAM, and ZooKeeper traffic.
- The SASL/SCRAM example associated a Secrets Manager secret but did not include the explicit `aws_secretsmanager_secret_policy` recommended by the Terraform provider to prevent persistent drift. Added the matching policy document and secret policy resource, and made the association depend on it.
- The IAM producer policy used `${aws_msk_cluster.iam_auth.arn}/*`, which is not a valid topic or consumer group ARN format for MSK IAM authorization. Split the policy into cluster, topic, and group statements and generated topic/group ARNs by replacing the ARN resource type.
- The CloudWatch alarms used only the `Cluster Name` dimension for `UnderReplicatedPartitions` and `KafkaDataLogsDiskUsed`, but AWS documents these as broker-level metrics with `Cluster Name` and `Broker ID` dimensions. Updated the examples to create per-broker alarms and include `Broker ID`.
- The monitoring text said MSK publishes metrics at three levels of detail. AWS currently documents multiple levels, including `DEFAULT`, `PER_BROKER`, `PER_TOPIC_PER_BROKER`, and `PER_TOPIC_PER_PARTITION`, so the wording was generalized.

## Review Notes
The examples remain illustrative and still assume surrounding variables/resources such as VPC subnets, SNS topic, and security groups are defined elsewhere. The per-broker CloudWatch alarm example hard-codes broker IDs for the three-broker tutorial cluster; future production examples could parameterize broker IDs if cluster size changes.
