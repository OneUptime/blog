# Validation Summary: How to Use Ansible to Manage AWS SNS Topics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- community.aws Ansible collection
- AWS Simple Notification Service (SNS)
- AWS Simple Queue Service (SQS)
- AWS Lambda
- AWS CLI
- AWS KMS
- boto3 / botocore

## Sources Consulted
- Ansible `community.aws.sns_topic` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/aws/sns_topic_module.html
- Ansible `community.aws.sns` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/aws/sns_module.html
- Ansible `community.aws` collection index and supported ansible-core version: https://docs.ansible.com/projects/ansible/latest/collections/community/aws/index.html
- AWS SNS Subscribe API reference: https://docs.aws.amazon.com/sns/latest/api/API_Subscribe.html
- AWS SNS FIFO topic message delivery documentation: https://docs.aws.amazon.com/sns/latest/dg/fifo-message-delivery.html
- AWS SNS message attributes documentation: https://docs.aws.amazon.com/sns/latest/dg/sns-message-attributes.html
- AWS SNS message filtering documentation: https://docs.aws.amazon.com/sns/latest/dg/sns-message-filtering.html
- AWS SNS applying subscription filter policy documentation: https://docs.aws.amazon.com/sns/latest/dg/message-filtering-apply.html
- AWS SNS SetTopicAttributes API reference: https://docs.aws.amazon.com/sns/latest/api/API_SetTopicAttributes.html

## Issues Found
- The prerequisite listed `Ansible 2.14+`, but current `community.aws` documentation lists ansible-core 2.17.0 or newer for the latest collection. Updated the wording to require an ansible-core version supported by the installed collection.
- The subscription confirmation explanation said HTTP/HTTPS subscriptions are confirmed automatically. AWS SNS requires endpoint-owner confirmation for email and HTTP/S endpoints, and also for cross-account subscriptions. Updated the explanation.
- The FIFO topic example used `content_based_deduplication: true`, but `community.aws.sns_topic` documents string choices `enabled` and `disabled`. Changed it to `enabled`.
- The FIFO topic explanation said FIFO topics can only deliver to SQS FIFO queues. Current AWS SNS documentation says FIFO topics can deliver to SQS standard and FIFO queues, with strict ordering and deduplication requiring SQS FIFO queues. Updated the comment and explanation.
- The `community.aws.sns` message attributes example omitted `message_structure: string`. The module documentation states message attributes require string message structure, so the example now sets it explicitly.
- The subscription filtering example set `FilterPolicy` under `community.aws.sns_topic` subscription attributes, but the module only documents subscription attributes support for SQS raw message delivery. Reworked the example to create subscriptions with `community.aws.sns_topic` and apply `FilterPolicy` through AWS CLI `set-subscription-attributes`.
- The server-side encryption example used unsupported `community.aws.sns_topic` parameter `kms_master_key_id`. Reworked it to create the topic and set SNS `KmsMasterKeyId` through AWS CLI `set-topic-attributes`, which matches the SNS API.

## Review Notes
The post remains a practical Ansible-focused guide, but the filtering and encryption examples now depend on AWS CLI because the current `community.aws.sns_topic` module does not expose those SNS attributes directly. Ansible was not installed in the local environment, so I could not run `ansible-playbook --syntax-check`; the snippets were reviewed against official module and AWS API documentation instead.
