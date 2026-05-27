# Validation Summary: How to Use the community.aws.aws_ssm Lookup Plugin

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible lookup plugins
- amazon.aws Ansible collection
- AWS Systems Manager Parameter Store
- AWS CLI
- AWS IAM
- AWS KMS
- YAML

## Sources Consulted
- Ansible `amazon.aws.ssm_parameter` lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ssm_parameter_lookup.html
- Ansible `amazon.aws.aws_ssm` redirect documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/aws_ssm_lookup.html
- Ansible `community.aws` collection index: https://docs.ansible.com/projects/ansible/latest/collections/community/aws/index.html
- AWS Systems Manager Parameter Store parameter types: https://docs.aws.amazon.com/systems-manager/latest/userguide/what-is-a-parameter.html
- AWS Systems Manager `PutParameter` API reference: https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_PutParameter.html
- AWS Systems Manager `GetParametersByPath` API reference: https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_GetParametersByPath.html
- AWS Systems Manager Parameter Store access control documentation: https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-paramstore-access.html
- AWS KMS integration for Parameter Store `SecureString`: https://docs.aws.amazon.com/kms/latest/developerguide/services-parameter-store.html
- AWS Systems Manager Parameter Store tiers documentation: https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store-advanced-parameters.html

## Issues Found
- The post used `community.aws.aws_ssm` as a lookup plugin, but the current lookup is in the `amazon.aws` collection as `amazon.aws.ssm_parameter`. Updated the title, description, installation command, lookup examples, and conclusion to use `amazon.aws.ssm_parameter` and `ansible-galaxy collection install amazon.aws`.
- The introduction described Parameter Store as free. Updated it to say the standard tier is available at no additional charge, because AWS also has advanced parameters and higher-throughput options that can incur charges.
- The first debug example defined `db_password` without using it, so the lookup might not be evaluated as the example claimed. Changed it to use `ansible.builtin.set_fact` with `no_log: true`, followed by a non-secret confirmation debug task.
- The multiple-parameter example used `lookup()` for multiple terms. Changed it to `query()` so the result is consistently a list of parameter values.
- The missing-parameter default example omitted the second `true` argument to the Jinja `default` filter. Added it, matching the Ansible lookup documentation for `on_missing='skip'`.
- The rate-limit tip claimed `bypath` retrieves many parameters in a single API call. Reworded it to "one lookup expression" because AWS `GetParametersByPath` can paginate and may require multiple API calls.

## Review Notes
The AWS CLI command shapes, Parameter Store types, `region`, `profile`, `bypath`, `recursive`, `decrypt` default behavior, IAM actions, and customer-managed KMS key decryption note were consistent with the official documentation. Local `ansible-doc`, `ansible`, and `aws` commands were not available in this environment, so verification was performed against official online documentation.
