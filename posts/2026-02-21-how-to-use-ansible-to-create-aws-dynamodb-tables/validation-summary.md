# Validation Summary: How to Use Ansible to Create AWS DynamoDB Tables

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible `community.aws` collection
- Ansible `amazon.aws` collection
- AWS DynamoDB
- DynamoDB tables, primary keys, global secondary indexes, capacity modes, and TTL
- YAML playbooks

## Sources Consulted
- Ansible Community AWS collection documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/aws/index.html
- Ansible `community.aws.dynamodb_table` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/aws/dynamodb_table_module.html
- Ansible `community.aws.dynamodb_ttl` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/aws/dynamodb_ttl_module.html
- AWS DynamoDB core components documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.CoreComponents.html
- AWS DynamoDB throughput capacity documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/capacity-mode.html
- AWS DynamoDB read and write operations documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/read-write-operations.html
- AWS DynamoDB TTL documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html
- AWS DynamoDB point-in-time recovery documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Point-in-time-recovery.html

## Issues Found
- The prerequisites said Ansible 2.9+ was sufficient for the current collection examples. Updated this to ansible-core 2.17+ and added the documented boto3/botocore 1.34.0+ dependency for current `community.aws` 10.1.0 documentation.
- The GSI example debug task referenced `products_table.global_indexes`, which is not a documented return field for `community.aws.dynamodb_table`. Changed it to `products_table.indexes`, which the module returns in its compatibility result.
- The provisioned capacity example file comment mentioned auto-scaling, but the playbook does not configure Application Auto Scaling. Removed the auto-scaling wording.
- The TTL explanation said expired items are typically deleted within 48 hours. AWS currently documents TTL deletion as typically within a few days, so the wording was updated.
- The microservice loop example defined GSI entries using `hash_key`, `hash_type`, `range_key`, and `range_type`, and omitted the required `type` field. Updated the GSI dictionary to use the module's required index fields: `type`, `hash_key_name`, `hash_key_type`, `range_key_name`, and `range_key_type`.

## Review Notes
The corrected examples match the current `community.aws.dynamodb_table` and `community.aws.dynamodb_ttl` module parameter names. The examples were reviewed for syntax and API correctness, but not executed against AWS because this review environment does not have Ansible installed or AWS credentials configured.
