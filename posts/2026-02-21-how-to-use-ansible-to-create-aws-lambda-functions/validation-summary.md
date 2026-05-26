# Validation Summary: How to Use Ansible to Create AWS Lambda Functions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- amazon.aws Ansible collection
- community.general Ansible collection
- AWS Lambda
- AWS S3
- AWS IAM
- Python
- boto3 and botocore

## Sources Consulted
- Ansible amazon.aws.lambda module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/lambda_module.html
- Ansible amazon.aws.lambda_event module documentation: https://docs.ansible.com/projects/ansible/12/collections/amazon/aws/lambda_event_module.html
- Ansible amazon.aws.lambda_alias module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/lambda_alias_module.html
- Ansible amazon.aws.lambda_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/lambda_info_module.html
- Ansible amazon.aws.lambda_layer module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/lambda_layer_module.html
- Ansible community.general.archive module documentation: https://docs.ansible.com/ansible/latest/collections/community/general/archive_module.html
- AWS Lambda Python deployment package documentation: https://docs.aws.amazon.com/lambda/latest/dg/python-package.html
- AWS Lambda Python layers documentation: https://docs.aws.amazon.com/lambda/latest/dg/python-layers.html
- AWS Lambda runtimes documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- amazon.aws collection source for current lambda and lambda_layer return behavior: https://github.com/ansible-collections/amazon.aws

## Issues Found
- The post used `community.general.archive` but did not list or install the `community.general` collection. Added it to the prerequisites and install command.
- The archive examples zipped the source directories themselves. AWS Lambda expects Python handler code and dependencies at the root of the deployment zip, so the archive paths now use `*` to package the directory contents.
- The S3 example referenced an undefined `version` variable. Added a sample `version` value to the playbook variables.
- The Lambda layer example used `zip_file` at the top level of `amazon.aws.lambda_layer`, but current documentation requires it under `content`. Updated the snippet to use `content.zip_file`.
- The Lambda layer reference used a non-existent `layer_result.layer_version_arn` return value. Updated it to use the current `layer_result.layer_versions[0].layer_version_arn` return structure.
- The event source mapping examples used `function_arn`. The current module parameter is `lambda_function_arn`, with compatibility aliases. Updated the examples to the documented parameter name.
- The alias example referenced `lambda_result` from a previous, separate snippet and did not register the version-publishing task. Added `register: lambda_version_result` and used that result for the alias version.
- The alias example passed the version as a string expression, while `amazon.aws.lambda_alias.function_version` is documented as an integer. Added `| int`.
- The Lambda info example used the deprecated `func_info.function` dictionary as if it were a single function object. Updated it to use the current `func_info.functions[0]` list return.

## Review Notes
The local environment did not have Ansible, ansible-galaxy, boto3, or botocore installed, so validation was performed against official documentation and collection source rather than by executing the playbooks against AWS.
