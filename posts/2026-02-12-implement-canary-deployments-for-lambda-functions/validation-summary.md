# Validation Summary: How to Implement Canary Deployments for Lambda Functions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Lambda
- AWS CodeDeploy
- AWS Serverless Application Model (SAM)
- AWS CloudFormation
- Amazon CloudWatch alarms and dashboards
- AWS CLI
- Node.js with AWS SDK for JavaScript v3

## Sources Consulted
- AWS SAM `DeploymentPreference` documentation: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-property-function-deploymentpreference.html
- AWS SAM generated resources for `AWS::Serverless::Function`: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-specification-generated-resources-function.html
- AWS CodeDeploy predefined Lambda deployment configurations: https://docs.aws.amazon.com/codedeploy/latest/userguide/deployment-configurations.html
- AWS CodeDeploy SAM tutorial template: https://docs.aws.amazon.com/codedeploy/latest/userguide/tutorial-lambda-sam-template.html
- AWS CodeDeploy lifecycle hook API: https://docs.aws.amazon.com/codedeploy/latest/APIReference/API_PutLifecycleEventHookExecutionStatus.html
- AWS Lambda weighted alias routing: https://docs.aws.amazon.com/lambda/latest/dg/configuring-alias-routing.html
- AWS CLI `deploy create-deployment-config`: https://docs.aws.amazon.com/cli/latest/reference/deploy/create-deployment-config.html
- AWS CLI `cloudwatch get-metric-statistics`: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/get-metric-statistics.html
- AWS CLI `cloudwatch put-dashboard`: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-dashboard.html
- AWS CloudFormation `AWS::Lambda::Version` return values: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-lambda-version.html

## Issues Found
- The post showed a custom CodeDeploy deployment configuration being referenced directly from SAM. AWS's CodeDeploy SAM tutorial states that custom deployment configurations cannot be specified in a SAM template, so I replaced that snippet with guidance that custom configurations are for non-SAM CodeDeploy deployments and SAM should use predefined deployment preference types.
- The main SAM example referenced both `PreTrafficHook` and `PostTrafficHook`, but the hook resource snippet only defined `PreTrafficHook`. I added a matching `PostTrafficHook` resource so the referenced logical ID exists.
- The manual AWS CLI example used `date -u -v-5M`, which is BSD/macOS-specific and fails on typical Linux environments. I changed it to compute `START_TIME` and `END_TIME` with ISO 8601 UTC timestamps before passing them to `aws cloudwatch get-metric-statistics`.

## Review Notes
The AWS CLI is not installed in this workspace, so CLI behavior was verified against official AWS CLI documentation rather than local `--help` output. The JavaScript lifecycle hook snippet was checked locally with `node --check`.
