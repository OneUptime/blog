# Validation Summary: How to Use AWS Control Tower Customizations (CfCT)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Control Tower
- Customizations for AWS Control Tower (CfCT)
- AWS CloudFormation and StackSets
- AWS CodePipeline and CodeBuild
- Amazon S3
- AWS CodeCommit and GitHub source integrations
- AWS Organizations service control policies (SCPs)
- AWS Security Hub
- AWS IAM
- Amazon SNS
- AWS CLI

## Sources Consulted
- AWS Control Tower User Guide: Template and source code: https://docs.aws.amazon.com/controltower/latest/userguide/cfct-template.html
- AWS Control Tower User Guide: Step 1. Launch the stack: https://docs.aws.amazon.com/controltower/latest/userguide/step1.html
- AWS Control Tower User Guide: Deployment considerations: https://docs.aws.amazon.com/controltower/latest/userguide/cfct-considerations.html
- AWS Control Tower User Guide: Code pipeline overview: https://docs.aws.amazon.com/controltower/latest/userguide/cfct-codepipeline-overview.html
- AWS Control Tower User Guide: The CfCT manifest file: https://docs.aws.amazon.com/controltower/latest/userguide/the-manifest-file.html
- AWS Control Tower User Guide: Set up a configuration package for CloudFormation StackSets: https://docs.aws.amazon.com/controltower/latest/userguide/cfcn-byo-cfn-stacksets.html
- AWS Control Tower User Guide: Set up GitHub as the configuration source: https://docs.aws.amazon.com/controltower/latest/userguide/cfct-github-configuration-source.html
- AWS Solutions GitHub repository for CfCT: https://github.com/aws-solutions/aws-control-tower-customizations
- AWS CloudFormation resource reference for AWS::SecurityHub::Hub: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-securityhub-hub.html
- AWS CloudFormation IAM resource type reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/AWS_IAM.html
- AWS CLI Command Reference for cloudformation list-stack-instances: https://docs.aws.amazon.com/cli/latest/reference/cloudformation/list-stack-instances.html
- AWS IAM User Guide for account password policy: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_passwords_account-policy.html
- AWS Organizations User Guide for service control policies: https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html
- AWS IAM User Guide for global condition key aws:PrincipalArn: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html

## Issues Found
- The architecture diagram showed account-level CloudFormation customizations deploying as standalone CloudFormation stacks. CfCT deploys CloudFormation resources through StackSets for account and OU targets, so the diagram was corrected to show CloudFormation StackSet instances.
- The source description only mentioned S3 and CodeCommit. Current CfCT also supports GitHub via CodeConnections, so the source list was updated.
- The deployment command used an outdated S3 template URL pattern and an invalid `CodePipelineSource` value of `Amazon_S3`. The command now downloads the current AWS Solutions template from GitHub and uses the supported value `Amazon S3`.
- The CloudFormation example included `AWS::IAM::AccountPasswordPolicy`, which is not a supported AWS CloudFormation IAM resource type. That resource block was removed from the sample template.
- The S3 upload command used the wrong default CfCT configuration bucket prefix, `custom-control-tower-config`. It was corrected to `custom-control-tower-configuration-ACCOUNT_ID-REGION`.
- The Git versioning best practice implied CfCT always uses S3. It was narrowed to the S3 pipeline source case because CfCT can also use CodeCommit or GitHub.

## Review Notes
- The SCP example is syntactically valid and uses `aws:PrincipalArn` in a way AWS documents as supported for SCPs, but region-restriction SCPs should be tested carefully because additional global services may need to be exempted depending on the organization.
- The AWS CLI was not installed in the local environment, so CLI syntax was verified against AWS CLI documentation and AWS template parameters rather than local `aws --help` output.
