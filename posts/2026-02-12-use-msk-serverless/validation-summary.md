# Validation Summary: How to Use MSK Serverless

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon MSK Serverless
- Apache Kafka
- AWS CLI
- IAM access control for MSK
- kafka-python
- AWS MSK IAM SASL Signer for Python
- aws-msk-iam-auth for Java clients
- Amazon CloudWatch metrics

## Sources Consulted
- Amazon MSK Serverless overview: https://docs.aws.amazon.com/msk/latest/developerguide/serverless.html
- Amazon MSK Serverless getting started and topic creation: https://docs.aws.amazon.com/msk/latest/developerguide/serverless-getting-started.html and https://docs.aws.amazon.com/msk/latest/developerguide/msk-serverless-create-topic.html
- AWS CLI create-cluster-v2 reference: https://docs.aws.amazon.com/cli/latest/reference/kafka/create-cluster-v2.html
- Amazon MSK quotas: https://docs.aws.amazon.com/msk/latest/developerguide/limits.html
- Amazon MSK Serverless configuration properties: https://docs.aws.amazon.com/msk/latest/developerguide/serverless-config.html
- Amazon MSK port information: https://docs.aws.amazon.com/msk/latest/developerguide/port-info.html
- Amazon MSK Serverless monitoring: https://docs.aws.amazon.com/msk/latest/developerguide/serverless-monitoring.html
- Amazon MSK pricing: https://aws.amazon.com/msk/pricing/
- AWS MSK IAM auth Java library: https://github.com/aws/aws-msk-iam-auth
- AWS MSK IAM SASL signer for Python: https://github.com/aws/aws-msk-iam-sasl-signer-python

## Issues Found
- The quota table used outdated Serverless limits: 120 partitions, 5 consumer groups, and 24-hour retention. Updated to current AWS quotas: 2,400 non-compacted topic partitions, 120 compacted topic partitions, 500 consumer groups, 8 MiB message size, and unlimited retention with a 7-day default.
- The migration guidance said retention was capped at 24 hours. Replaced that with the current compacted-partition limitation and limited topic-configuration guidance.
- The cost model described storage as GB-hour and used incorrect data-out pricing. Updated storage to GB-month and adjusted the example to split data-in and data-out charges using current AWS pricing dimensions.
- The Java dependency version was outdated. Updated `aws-msk-iam-auth` from `2.0.3` to `2.3.6`.
- The Python `kafka-python` IAM examples did not inherit from `AbstractTokenProvider` as shown by the AWS signer library examples. Added the import and inheritance, and removed an unused `os` import.
- The topic section incorrectly said MSK Serverless supports auto topic creation. Updated it to say topics should be created explicitly because broker-level auto topic creation is not configurable for Serverless.
- Example ARNs used a 9-digit account ID. Updated examples to use a 12-digit AWS account ID.
- The CloudWatch command omitted the `Topic` dimension required for MSK Serverless `BytesInPerSec` metrics and used BSD `date -v`, which fails on common Linux AWS client hosts. Added the topic dimension and changed the example to GNU `date -d`.

## Review Notes
- The post is technically relevant and contains implementation commands, client code, IAM policy examples, and configuration snippets.
- Pricing remains an illustrative estimate. Actual totals vary by AWS Region, retention configuration, data volume, consumer read volume, and any additional AWS data transfer charges.
