# Validation Summary: How to Create a Complete AWS CodeBuild + ArgoCD Pipeline

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS CodeBuild
- AWS CodePipeline
- Amazon ECR
- Amazon EKS
- Argo CD
- Argo CD Image Updater
- Kubernetes manifests
- IAM Roles for Service Accounts (IRSA)
- CloudFormation
- CloudWatch
- SNS

## Sources Consulted
- AWS CodeBuild buildspec reference: https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html
- AWS CodeBuild available runtimes: https://docs.aws.amazon.com/codebuild/latest/userguide/available-runtimes.html
- AWS CloudFormation AWS::CodeBuild::Project reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-codebuild-project.html
- AWS CloudFormation AWS::CodeBuild::Project ProjectTriggers reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-codebuild-project-projecttriggers.html
- AWS CLI ECR examples: https://docs.aws.amazon.com/cli/latest/userguide/cli_ecr_code_examples.html
- AWS CloudFormation AWS::CodePipeline::Pipeline reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-codepipeline-pipeline.html
- AWS CodePipeline GitHub OAuth action reference: https://docs.aws.amazon.com/codepipeline/latest/userguide/appendix-github-oauth.html
- AWS CodePipeline valid action providers: https://docs.aws.amazon.com/codepipeline/latest/userguide/actions-valid-providers.html
- Amazon EKS IRSA documentation: https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html
- Amazon EKS service account role association: https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Argo CD automated sync policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD Image Updater image annotations: https://argocd-image-updater.readthedocs.io/en/stable/configuration/images/
- Argo CD Image Updater update strategies: https://argocd-image-updater.readthedocs.io/en/stable/basics/update-strategies/
- Argo CD Image Updater authentication: https://argocd-image-updater.readthedocs.io/en/stable/basics/authentication/
- AWS CLI CloudWatch put-metric-data reference: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-data.html
- AWS CloudFormation SNS Topic Subscription reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-sns-topic-subscription.html

## Issues Found
- The CodeBuild project used `aws/codebuild/amazonlinux2-x86_64-standard:5.0` while the buildspec requested Node.js 20. AWS lists Node.js 20 support for Amazon Linux 2023 standard images, so the image was changed to `aws/codebuild/amazonlinux2023-x86_64-standard:5.0`.
- The ECR login command authenticated Docker against `$ECR_REPO`, which includes the repository path. AWS examples authenticate against the registry host, so `ECR_REGISTRY` was added and the login command now uses that value.
- The CodeBuild role showed CloudWatch Logs permissions but the post later publishes a custom CloudWatch metric. Added `cloudwatch:PutMetricData` to the role policy.
- The Argo CD Image Updater section implied Image Updater was required even though the primary pipeline already edits manifests from CodeBuild. The text now clarifies that Image Updater is an alternative path.
- The Image Updater example used the older `latest` strategy name. Updated it to the current `newest-build` strategy name.
- The CodePipeline CloudFormation example omitted the required artifact store and used unresolved references for external roles, projects, and the approval topic. Added an S3 artifact bucket and parameters for the external resources.
- The CodePipeline source action used the older GitHub OAuth action. Updated the example to the recommended `CodeStarSourceConnection` action shape for GitHub.

## Review Notes
- The post remains a high-level production pipeline example; it still assumes supporting AWS resources exist, such as ECR repositories, IAM trust policies, GitHub deploy keys, CodeBuild source credentials, and the referenced CodeBuild deployment projects.
- If the optional Argo CD Image Updater path is used with private ECR, the Image Updater deployment also needs registry credential configuration, commonly using an external script or another supported credential source.
