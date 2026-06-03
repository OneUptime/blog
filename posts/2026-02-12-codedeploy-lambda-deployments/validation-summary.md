# Validation Summary: How to Set Up CodeDeploy for Lambda Deployments

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS CodeDeploy
- AWS Lambda
- AWS Lambda aliases and versions
- AWS CLI
- AWS IAM
- Amazon CloudWatch alarms
- AWS Serverless Application Model (AWS SAM)
- Python and boto3

## Sources Consulted
- AWS Lambda: Manage Lambda function versions: https://docs.aws.amazon.com/lambda/latest/dg/configuration-versions.html
- AWS Lambda: Implement Lambda canary deployments using a weighted alias: https://docs.aws.amazon.com/lambda/latest/dg/configuring-alias-routing.html
- AWS CodeDeploy: Deployment configurations on an AWS Lambda compute platform: https://docs.aws.amazon.com/codedeploy/latest/userguide/deployment-configurations.html
- AWS CodeDeploy: AppSpec file example for an AWS Lambda deployment: https://docs.aws.amazon.com/codedeploy/latest/userguide/reference-appspec-file-example.html
- AWS CodeDeploy: AppSpec hooks section for AWS Lambda deployments: https://docs.aws.amazon.com/codedeploy/latest/userguide/reference-appspec-file-structure-hooks.html
- AWS CLI: create-deployment-group command reference: https://docs.aws.amazon.com/cli/latest/reference/deploy/create-deployment-group.html
- AWS CLI: create-deployment command reference: https://docs.aws.amazon.com/cli/latest/reference/deploy/create-deployment.html
- AWS managed policy: AWSCodeDeployRoleForLambda: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSCodeDeployRoleForLambda.html
- AWS SAM: DeploymentPreference property: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-property-function-deploymentpreference.html
- AWS Lambda: CloudWatch Lambda metric dimensions: https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-view.html

## Issues Found
- The opening description implied that `aws lambda update-function-code` always sends 100% of production traffic to the new code. Updated it to clarify that `update-function-code` updates `$LATEST`, so this immediate-traffic risk applies when triggers invoke the unqualified function or `$LATEST`.
- The CodeDeploy Lambda service-role managed policy ARN was missing the `service-role/` path. Changed it to `arn:aws:iam::aws:policy/service-role/AWSCodeDeployRoleForLambda`, matching AWS documentation.
- The pre-traffic validation hook claimed to invoke the new version directly, but it used `Qualifier='live'`, which invokes the alias rather than the target version and may still hit the old version before traffic shifting. Changed the example to invoke a `TARGET_VERSION` value and added a note to set it from the AppSpec target version.
- The sample hook Lambda ARNs used a 9-digit account ID. Changed them to the valid 12-digit example account ID `123456789012`.
- The hook function names did not match the default `AWSCodeDeployRoleForLambda` permission scope, which allows invocation of hook functions named `CodeDeployHook_*`. Renamed the sample hooks to use that prefix.
- The inline `create-deployment` AppSpec revision omitted the hook definitions shown in the AppSpec file example. Added the `Hooks` entries so the deployment command matches the earlier AppSpec example.

## Review Notes
The AWS CLI was not installed in the local environment, so CLI syntax was checked against the official AWS CLI command reference rather than local `--help` output. The SAM example uses the currently documented `DeploymentPreference` shape; `nodejs18.x` remains a valid Lambda runtime at review time, though future runtime support windows should be checked before publishing long-lived deployment templates.
