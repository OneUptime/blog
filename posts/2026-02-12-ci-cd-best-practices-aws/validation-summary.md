# Validation Summary: How to Implement CI/CD Best Practices on AWS

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS CodePipeline
- AWS CodeBuild
- AWS CodeDeploy
- AWS CodeConnections
- Amazon ECS blue/green deployments
- Terraform AWS provider
- Buildspec YAML
- Node.js and npm
- Trivy
- Checkov
- detect-secrets
- Amazon EventBridge and Slack webhook notifications

## Sources Consulted
- AWS CodePipeline CodeStarSourceConnection action reference: https://docs.aws.amazon.com/codepipeline/latest/userguide/action-reference-CodestarConnectionSource.html
- AWS CodePipeline CodeDeploy action reference: https://docs.aws.amazon.com/codepipeline/latest/userguide/action-reference-CodeDeploy.html
- AWS CodePipeline ECS and CodeDeploy blue/green action reference: https://docs.aws.amazon.com/codepipeline/latest/userguide/action-reference-ECSbluegreen.html
- AWS CodeBuild buildspec reference: https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html
- AWS CodeBuild EC2 compute images reference: https://docs.aws.amazon.com/codebuild/latest/userguide/ec2-compute-images.html
- AWS CodeBuild available runtimes reference: https://docs.aws.amazon.com/codebuild/latest/userguide/available-runtimes.html
- AWS Developer Tools CodeConnections rename summary: https://docs.aws.amazon.com/dtconsole/latest/userguide/rename.html
- AWS CodePipeline EventBridge event monitoring reference: https://docs.aws.amazon.com/codepipeline/latest/userguide/detect-state-changes-cloudwatch-events.html
- Terraform AWS provider `aws_codedeploy_deployment_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/codedeploy_deployment_group
- Terraform AWS provider `aws_codeconnections_connection` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/codeconnections_connection
- Checkov CLI command reference: https://www.checkov.io/2.Basics/CLI%20Command%20Reference.html
- Trivy container image scanning documentation: https://www.trivy.dev/docs/latest/guide/target/container_image/
- Trivy installation and container image usage documentation: https://www.trivy.dev/docs/latest/getting-started/installation/

## Issues Found
- The CodePipeline deploy actions used the `CodeDeploy` provider while the deployment group example is for Amazon ECS blue/green. Changed the staging and production deploy actions to `CodeDeployToECS` and added the required task definition and AppSpec template artifact/path configuration.
- The security scan stage consumed `build_output`, but the scan commands inspect source files such as `package-lock.json`, `Dockerfile`, and `terraform/`. Changed the stage input to `source_output` and updated the description to say it scans the source artifact.
- The build artifact omitted `taskdef.json`, which is needed by the ECS blue/green deploy action. Added `taskdef.json` to the artifact files.
- The CodeBuild report `file-format` values used mixed-case names. Updated them to the documented `JUNITXML` and `CLOVERXML` values.
- The Trivy Docker command attempted to scan a locally built image without mounting the Docker socket into the Trivy container. Added the `/var/run/docker.sock` mount required for scanning local Docker Engine images from the Trivy container.
- The CodeBuild project image used the older `amazonlinux2` alias for the Amazon Linux 2023 standard 5.0 image. Updated it to the documented `aws/codebuild/amazonlinux-x86_64-standard:5.0` image identifier.
- The connection resource reference used the older CodeStar Connections Terraform naming. Updated it to `aws_codeconnections_connection` to match the current AWS CodeConnections service naming.

## Review Notes
- The snippets are representative and still assume omitted resources exist, including S3/KMS artifacts, CodeBuild projects, ECS services, CodeDeploy applications, task definition/AppSpec files, IAM policies, and EventBridge/Lambda wiring.
- Docker image scanning in CodeBuild requires Docker support in the scan project. The post already notes enabling privileged mode when building Docker images, but a production implementation should scope that to the specific CodeBuild project that performs Docker builds.
