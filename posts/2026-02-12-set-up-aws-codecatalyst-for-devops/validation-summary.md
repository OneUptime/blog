# Validation Summary: How to Set Up AWS CodeCatalyst for DevOps

## Status
validated

## Post Type
Tutorial / setup guide

## Technologies Covered
- Amazon CodeCatalyst
- AWS CLI
- AWS IAM roles and trust policies
- CodeCatalyst workflows
- AWS CDK deploy workflow action
- CodeCatalyst source repositories
- CodeCatalyst environments
- CodeCatalyst Dev Environments
- Git
- Node.js / Express

## Sources Consulted
- Amazon CodeCatalyst User Guide: Creating a space - https://docs.aws.amazon.com/codecatalyst/latest/userguide/spaces-create.html
- Amazon CodeCatalyst User Guide: Creating a project - https://docs.aws.amazon.com/codecatalyst/latest/userguide/projects-create.html
- Amazon CodeCatalyst User Guide: Setting up to use the AWS CLI with CodeCatalyst - https://docs.aws.amazon.com/codecatalyst/latest/userguide/set-up-cli.html
- Amazon CodeCatalyst User Guide: Understanding the CodeCatalyst trust model - https://docs.aws.amazon.com/codecatalyst/latest/userguide/trust-model.html
- Amazon CodeCatalyst User Guide: Workflow YAML definition - https://docs.aws.amazon.com/codecatalyst/latest/userguide/workflow-reference.html
- Amazon CodeCatalyst User Guide: Build and test actions YAML - https://docs.aws.amazon.com/codecatalyst/latest/userguide/build-action-ref.html
- Amazon CodeCatalyst User Guide: AWS CDK deploy action YAML - https://docs.aws.amazon.com/codecatalyst/latest/userguide/cdk-dep-action-ref.html
- Amazon CodeCatalyst User Guide: Creating an environment - https://docs.aws.amazon.com/codecatalyst/latest/userguide/deploy-environments-creating-environment.html
- Amazon CodeCatalyst User Guide: Creating a Dev Environment - https://docs.aws.amazon.com/codecatalyst/latest/userguide/devenvironment-create.html
- AWS CLI Command Reference: codecatalyst create-project - https://docs.aws.amazon.com/cli/latest/reference/codecatalyst/create-project.html
- AWS CLI Command Reference: codecatalyst create-source-repository - https://docs.aws.amazon.com/cli/latest/reference/codecatalyst/create-source-repository.html
- AWS CLI Command Reference: codecatalyst create-dev-environment - https://docs.aws.amazon.com/cli/latest/reference/codecatalyst/create-dev-environment.html
- AWS CLI Command Reference: codecatalyst command list - https://docs.aws.amazon.com/cli/latest/reference/codecatalyst/

## Issues Found
- CodeCatalyst availability was outdated. Added a note that Amazon CodeCatalyst is no longer open to new customers and that the guide applies to existing customers.
- The AWS CLI verification example implied account connection verification from the AWS account side. Updated it to match the documented CodeCatalyst CLI setup flow using SSO and `aws codecatalyst list-spaces`.
- The IAM trust policy example used only `codecatalyst.amazonaws.com` and `aws:SourceAccount`. Updated it to include the documented CodeCatalyst service principals and `aws:SourceArn` trust condition.
- The source repository section incorrectly said every project gets a repository. Updated it to reflect that projects can use CodeCatalyst repositories or linked GitHub, Bitbucket, and GitLab repositories.
- The workflow trigger used `Push`; CodeCatalyst workflow YAML uses `PUSH`. Updated the trigger value.
- The CDK deploy actions used `aws/cdk-deploy@v1`, which runs on older tooling. Updated them to `aws/cdk-deploy@v2`.
- The staging CDK deploy action provided both a source and an artifact, but the CDK deploy action allows only one input. Removed the artifact input and used `WorkflowSource`.
- The production CDK deploy action was missing an input. Added `WorkflowSource`.
- The environment creation CLI example used a non-existent `aws codecatalyst create-environment` command. Replaced it with the documented console flow.
- The Dev Environment CLI example used the wrong storage flag and omitted the required IDE configuration. Updated it to use `--persistent-storage sizeInGiB=16`, `--ides name=VSCode`, and a repository/branch mapping.
- Dev Environment IDE references omitted Visual Studio Code. Updated the feature list and diagram to include VS Code.
- The best-practice note described production and non-production environments as deployment gates. Updated it to match AWS documentation, which says the environment type primarily affects the UI badge.

## Review Notes
The local workspace did not have the AWS CLI installed, so CLI verification was performed against the official AWS CLI command reference instead of local `aws codecatalyst --help` output. Internal OneUptime cross-links and the CodeCatalyst landing URL were checked and are plausible.
