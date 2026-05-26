# Validation Summary: How to Run Ansible Playbooks in AWS CodePipeline

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- AWS CodePipeline
- AWS CodeBuild
- AWS CloudFormation
- AWS Secrets Manager
- AWS Systems Manager Parameter Store
- AWS Identity and Access Management
- Amazon ECR
- Docker
- SSH

## Sources Consulted
- AWS CodeBuild buildspec reference: https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html
- AWS CodeBuild available runtimes: https://docs.aws.amazon.com/codebuild/latest/userguide/available-runtimes.html
- AWS CodeBuild EC2 compute images: https://docs.aws.amazon.com/codebuild/latest/userguide/ec2-compute-images.html
- AWS::CodeBuild::Project CloudFormation reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-codebuild-project.html
- AWS::CodeBuild::Project Artifacts CloudFormation reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-codebuild-project-artifacts.html
- AWS::CodeBuild::Project VpcConfig CloudFormation reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-codebuild-project-vpcconfig.html
- AWS CodePipeline manual approval documentation: https://docs.aws.amazon.com/codepipeline/latest/userguide/approvals-action-add.html
- Ansible release and maintenance documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/release_and_maintenance.html
- AWS CLI Secrets Manager create-secret reference: https://docs.aws.amazon.com/cli/latest/reference/secretsmanager/create-secret.html
- AWS CLI SSM put-parameter reference: https://docs.aws.amazon.com/cli/latest/reference/ssm/put-parameter.html
- Amazon ECR private registry authentication: https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html

## Issues Found
- The buildspec examples pinned `ansible==8.7.0`, but Ansible 8 is an unmaintained community package release. Updated the examples to `ansible==13.7.0`, the current package available from PyPI during validation, to avoid recommending an EOL release.
- The deployment buildspec attempted to use `/ansible/${ENVIRONMENT}/target_host` directly in `env.parameter-store`. CodeBuild's buildspec parameter-store mapping expects the literal Parameter Store name, so this dynamic per-environment path is not reliable there. Moved the lookup into `pre_build` with `aws ssm get-parameter`.
- The CloudFormation CodeBuild projects used `Source: Type: CODEPIPELINE` but omitted the required `Artifacts` property. Added `Artifacts: Type: CODEPIPELINE` to each project.
- The CloudFormation snippet claimed to create the full pipeline but only defined the CodeBuild role and projects. Adjusted the wording so it accurately describes the resources shown.
- The CodeBuild image identifier used the older `amazonlinux2` alias. Updated it to the current documented `aws/codebuild/amazonlinux-x86_64-standard:5.0` Amazon Linux 2023 image identifier.
- The VPC configuration example used placeholder subnet and security group names that are not valid ID formats. Replaced them with syntactically valid placeholder IDs.
- The tips said manual approval actions send SNS notifications. AWS documents the SNS topic as optional, so updated the statement to say approvals can send SNS notifications when an SNS topic is configured.
- The VPC guidance omitted that CodeBuild still needs outbound AWS service access. Added a note to provide NAT or VPC endpoints when running builds in private subnets.

## Review Notes
- The post remains a high-level implementation guide. It still does not include the complete `AWS::CodePipeline::Pipeline` CloudFormation resource, source action, artifact bucket, or CodePipeline service role; the wording now avoids claiming the snippet is a complete pipeline template.
- The local environment did not have the AWS CLI or Ansible installed, so CLI syntax was checked against official AWS and Ansible documentation rather than local `--help` output.
