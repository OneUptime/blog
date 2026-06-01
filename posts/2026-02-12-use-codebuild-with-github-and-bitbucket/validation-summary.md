# Validation Summary: How to Use CodeBuild with GitHub and Bitbucket

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CodeBuild
- AWS CodeConnections
- AWS CLI
- GitHub
- Bitbucket
- Webhooks
- Buildspec YAML
- CI/CD build badges and status checks

## Sources Consulted
- AWS CLI CodeBuild create-project command reference: https://docs.aws.amazon.com/cli/latest/reference/codebuild/create-project.html
- AWS CLI CodeBuild create-webhook command reference: https://docs.aws.amazon.com/cli/latest/reference/codebuild/create-webhook.html
- AWS CLI CodeBuild update-project command reference: https://docs.aws.amazon.com/cli/latest/reference/codebuild/update-project.html
- AWS CLI CodeConnections create-connection command reference: https://docs.aws.amazon.com/cli/latest/reference/codeconnections/create-connection.html
- AWS CodeBuild GitHub access token documentation: https://docs.aws.amazon.com/codebuild/latest/userguide/access-tokens-github.html
- AWS CodeBuild GitHub App connections documentation: https://docs.aws.amazon.com/codebuild/latest/userguide/connections-github-app.html
- AWS CodeBuild Bitbucket App connections documentation: https://docs.aws.amazon.com/codebuild/latest/userguide/connections-bitbucket-app.html
- AWS CodeBuild webhook filter documentation: https://docs.aws.amazon.com/codebuild/latest/userguide/github-webhook-events-sdk.html
- AWS CodeBuild environment variables documentation: https://docs.aws.amazon.com/codebuild/latest/userguide/build-env-ref-env-vars.html
- AWS CodeBuild build badges documentation: https://docs.aws.amazon.com/codebuild/latest/userguide/access-badges.html
- AWS CodeBuild EC2 compute images documentation: https://docs.aws.amazon.com/codebuild/latest/userguide/ec2-compute-images.html
- AWS CodeBuild available runtimes documentation: https://docs.aws.amazon.com/codebuild/latest/userguide/available-runtimes.html
- AWS announcement for CodeConnections rename: https://aws.amazon.com/about-aws/whats-new/2024/03/aws-codeconnections-formerly-codestar-connections/

## Issues Found
- The post used the old CodeStar Connections service name, CLI namespace, and ARN prefix. Updated these to AWS CodeConnections, `aws codeconnections`, and `arn:aws:codeconnections` because AWS renamed the service and announced that old APIs/CLI names would not be available after April 2025.
- The CodeBuild environment examples used `aws/codebuild/amazonlinux2-x86_64-standard:5.0`. Updated them to `aws/codebuild/amazonlinux-x86_64-standard:5.0`, which is the current documented Amazon Linux 2023 standard 5.0 image identifier.
- The GitHub personal access token scope guidance omitted `repo:status`. Added it because CodeBuild requires status permissions when reporting build statuses, and clarified that `admin:repo_hook` is not required if a classic token already has `repo`.
- The build badge example used `codebuild.us-east-1.amazonaws.com`. Updated it to the currently documented `codebuild.us-east-1.amazon.com` badge URL format.
- The buildspec PR/main-branch conditional used a substring `grep` against `refs/heads/main`, which would also match branches like `refs/heads/main-feature`. Replaced it with an exact string comparison.

## Review Notes
- The local environment did not have the AWS CLI installed, so CLI verification was performed against the official AWS CLI and AWS CodeBuild documentation rather than local `aws --help` output.
- CodeConnections requires the CodeBuild service role to have permissions to use the connection; the examples assume the placeholder service role has the required permissions.
