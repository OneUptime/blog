# Validation Summary: How to Validate CloudFormation Templates Before Deployment

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS CloudFormation
- AWS CLI
- cfn-lint
- AWS CloudFormation Guard
- YAML and JSON validation
- GitHub Actions
- Bash pre-commit hooks
- VS Code, Vim/Neovim, and JetBrains editor integrations

## Sources Consulted
- AWS CLI Command Reference: `cloudformation validate-template` - https://docs.aws.amazon.com/cli/latest/reference/cloudformation/validate-template.html
- AWS CloudFormation API Reference: `CreateChangeSet` - https://docs.aws.amazon.com/AWSCloudFormation/latest/APIReference/API_CreateChangeSet.html
- AWS CLI Command Reference: `cloudformation wait change-set-create-complete` - https://awscli.amazonaws.com/v2/documentation/api/2.34.7/reference/cloudformation/wait/change-set-create-complete.html
- AWS CloudFormation Template Reference: `AWS::S3::Bucket PublicAccessBlockConfiguration` - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-s3-bucket-publicaccessblockconfiguration.html
- AWS CloudFormation Guard User Guide: validating input data - https://docs.aws.amazon.com/cfn-guard/latest/ug/validating-rules.html
- AWS CloudFormation Guard User Guide: writing rules - https://docs.aws.amazon.com/cfn-guard/latest/ug/writing-rules.html
- AWS CloudFormation Guard GitHub repository installation instructions - https://github.com/aws-cloudformation/cloudformation-guard
- AWS CloudFormation cfn-lint GitHub repository configuration and CLI reference - https://github.com/aws-cloudformation/cfn-lint

## Issues Found
- The cfn-lint configuration filename was shown as `.cfn-lintrc`; changed it to `.cfnlintrc`, which is the supported config filename documented by cfn-lint.
- The command described as "only check for errors" used `--include-checks E`; changed it to `--ignore-checks W I` so warnings and informational rules are skipped.
- The Python YAML syntax example omitted that `yaml` comes from PyYAML; added a short PyYAML requirement note.
- The `validate-template` limitations said wrong references are not caught; changed this to say it does not catch every logical error, because CloudFormation validation can catch some reference/dependency problems.
- The S3 public access Guard rule checked only two of the four CloudFormation `PublicAccessBlockConfiguration` settings; added `IgnorePublicAcls` and `RestrictPublicBuckets`.
- The RDS Guard rule comment mentioned Multi-AZ, but the rule only checked storage encryption; corrected the comment to match the rule.
- The SSH Guard rule only matched rules whose `FromPort` or `ToPort` was exactly 22; changed it to catch ingress ranges that include port 22, and verified the Guard syntax with `cfn-guard parse-tree`.
- The change set example omitted `--change-set-type`, which defaults to `UPDATE`; added it and noted that new stacks require `CREATE`.
- The change set explanation overstated what change set creation catches; narrowed the wording to avoid implying every runtime permission or service quota failure is detected before execution.
- The GitHub Actions cfn-guard install step moved `cfn-guard` from the wrong path; updated it to move `cfn-guard-v3-ubuntu-latest/cfn-guard`, matching the current release archive layout.
- The GitHub Actions `cfn-guard validate --data templates/**/*.yaml` command could expand to multiple positional arguments rather than a supported data directory; changed it to `--data templates`.
- The complete validation script interpolated `$TEMPLATE` inside Python code; changed it to pass the path through `sys.argv[1]`, which handles quotes and special characters safely.

## Review Notes
The CloudFormation and AWS CLI examples still require configured AWS credentials and a target region where applicable. The cfn-lint informational example is valid as a severity category, but informational rules are not included by default unless configured.
