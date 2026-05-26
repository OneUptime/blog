# Validation Summary: How to Use Ansible to Create AWS ECR Repositories

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- community.aws Ansible collection
- Amazon Elastic Container Registry (ECR)
- AWS CLI
- Docker
- AWS IAM repository policies
- AWS KMS and ECR encryption

## Sources Consulted
- Ansible community.aws.ecs_ecr module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/aws/ecs_ecr_module.html
- Ansible community.aws collection documentation: https://docs.ansible.com/projects/ansible/13/collections/community/aws/index.html
- Amazon ECR lifecycle policy properties: https://docs.aws.amazon.com/AmazonECR/latest/userguide/lifecycle_policy_parameters.html
- Amazon ECR lifecycle policies: https://docs.aws.amazon.com/AmazonECR/latest/userguide/LifecyclePolicies.html
- Amazon ECR private repository policies: https://docs.aws.amazon.com/AmazonECR/latest/userguide/repository-policies.html
- AWS CLI ecr get-login-password command reference: https://docs.aws.amazon.com/cli/latest/reference/ecr/get-login-password.html
- AWS CLI ecr describe-image-scan-findings command reference: https://docs.aws.amazon.com/cli/latest/reference/ecr/describe-image-scan-findings.html
- Amazon ECR image scanning documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-scanning.html
- Amazon ECR encryption at rest documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/encryption-at-rest.html

## Issues Found
- The prerequisites listed Ansible 2.14+ and generic boto3. Updated this to Ansible 2.17+ and boto3/botocore 1.34.0+ to match the current community.aws collection requirements.
- The lifecycle policy used `tagPrefixList` with both `dev-` and `feature-` in one rule. Amazon ECR treats multiple tag prefixes in one rule as a combined match, not an OR condition, so this would not expire either prefix as described. Split it into separate `dev-` and `feature-` rules.
- The text described untagged images as intermediate build layers. ECR lifecycle policies expire untagged images, which are not necessarily intermediate build layers. Reworded this to avoid the inaccurate explanation.
- The repository policy section omitted the separate `ecr:GetAuthorizationToken` IAM requirement for private registry authentication. Added a note that cross-account principals still need this IAM permission.
- The Docker login example passed the ECR token with `docker login --password`. Updated it to the AWS-documented `aws ecr get-login-password | docker login --password-stdin` form.
- The encryption section said ECR defaults to AWS-managed keys. Amazon ECR defaults to server-side encryption with Amazon S3-managed encryption keys unless KMS encryption is configured. Corrected the wording.

## Review Notes
The examples are syntactically valid YAML. The `scan_on_push` examples are valid for the Ansible module, but ECR also supports registry-level basic and enhanced scanning configurations that may be preferable for broader production governance.
