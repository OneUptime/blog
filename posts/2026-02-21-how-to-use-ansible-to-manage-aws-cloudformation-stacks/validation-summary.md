# Validation Summary: How to Use Ansible to Manage AWS CloudFormation Stacks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- amazon.aws Ansible collection
- AWS CloudFormation
- AWS CloudFormation templates
- boto3 and botocore
- YAML

## Sources Consulted
- Ansible `amazon.aws.cloudformation` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/cloudformation_module.html
- Ansible `amazon.aws.cloudformation_info` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/cloudformation_info_module.html
- Ansible `amazon.aws` collection documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/index.html
- AWS CloudFormation template format documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-formats.html
- AWS CloudFormation `Ref` intrinsic function documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-ref.html

## Issues Found
- The prerequisites listed Ansible 2.14+ and generic boto3. Current `amazon.aws` documentation lists ansible-core 2.16+ support and module requirements of boto3/botocore 1.34.0 or newer, so the prerequisites and pip command were updated.
- Several examples used the deprecated `template` parameter for local CloudFormation template files. The current `amazon.aws.cloudformation` documentation marks `template` as deprecated and recommends `template_body` with a lookup plugin, so those examples now use `template_body: "{{ lookup('file', 'templates/...') }}"`.

## Review Notes
The CloudFormation inline template syntax, `template_url` usage, `template_parameters`, stack outputs, `create_timeout`, stack updates, deletion, and termination protection examples match the current official module documentation. The S3 `template_url` example is syntactically valid; in real deployments, the S3 object must be accessible to CloudFormation and meet the module's same-region and template-size constraints.
