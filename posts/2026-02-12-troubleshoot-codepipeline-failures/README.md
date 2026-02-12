# How to Troubleshoot CodePipeline Failures

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CodePipeline, Troubleshooting, CI/CD, DevOps

Description: A practical guide to diagnosing and fixing AWS CodePipeline failures across source, build, deploy, and approval stages with real-world examples.

---

CodePipeline failures are inevitable. A deployment that worked yesterday might fail today because of a dependency update, an expired token, or a misconfigured IAM role. The trick is knowing where to look and how to fix things quickly.

This guide covers the most common failures at each pipeline stage and how to resolve them. I've organized it by stage since that's usually the first thing you see when something breaks.

## Getting Started: Where to Look

Before diving into specific failures, here's how to get the basic info:

```bash
# Get the current pipeline state showing which stage failed
aws codepipeline get-pipeline-state \
  --name my-app-pipeline \
  --query 'stageStates[*].{Stage:stageName,Status:latestExecution.status}'

# Get details about the latest execution
aws codepipeline list-pipeline-executions \
  --pipeline-name my-app-pipeline \
  --max-items 5 \
  --query 'pipelineExecutionSummaries[*].{Id:pipelineExecutionId,Status:status,Start:startTime}'
```

For a specific failed execution:

```bash
# Get the execution details including the failure reason
aws codepipeline get-pipeline-execution \
  --pipeline-name my-app-pipeline \
  --pipeline-execution-id abc-123-def

# Get action execution details to see exactly which action failed
aws codepipeline list-action-executions \
  --pipeline-name my-app-pipeline \
  --filter pipelineExecutionId=abc-123-def
```

## Source Stage Failures

### CodeStar Connection Issues

The most common source stage failure is a broken or expired CodeStar Connection.

**Symptoms:** Source action fails with "Could not access the GitHub repository" or "Connection is not available."

**Fix:**
```bash
# Check connection status
aws codestar-connections list-connections \
  --query 'Connections[*].{Name:ConnectionName,Status:ConnectionStatus}'
```

If the status is "PENDING" or "ERROR", you need to reauthorize:

1. Go to the AWS Console > Developer Tools > Settings > Connections
2. Find the connection and click "Update pending connection"
3. Reauthorize the GitHub app

### Branch Not Found

**Symptoms:** "Branch 'main' does not exist in the repository."

**Fix:** Verify the branch name in your pipeline configuration matches what's in GitHub:

```bash
# Check what branch the pipeline expects
aws codepipeline get-pipeline \
  --name my-app-pipeline \
  --query 'pipeline.stages[?stageName==`Source`].actions[0].configuration.BranchName'
```

### Repository Access

**Symptoms:** "Repository not found" or 403 errors.

**Fix:** The CodeStar Connection might not have access to the specific repository. Go to your GitHub settings and verify the AWS Connector app has access to the repo.

## Build Stage Failures

### CodeBuild Project Errors

Most build failures come from the build itself - tests failing, dependencies not installing, Docker builds breaking. Check the build logs:

```bash
# Get the build ID from the action execution
BUILD_ID=$(aws codepipeline list-action-executions \
  --pipeline-name my-app-pipeline \
  --filter pipelineExecutionId=abc-123-def \
  --query 'actionExecutionDetails[?stageName==`Build`].output.executionResult.externalExecutionId' \
  --output text)

# Get the build logs link
aws codebuild batch-get-builds \
  --ids $BUILD_ID \
  --query 'builds[0].logs.deepLink'
```

### Common Build Failures

**Out of memory:**
```bash
# Bump up the compute type in your CodeBuild project
aws codebuild update-project \
  --name my-build-project \
  --environment '{"type":"LINUX_CONTAINER","computeType":"BUILD_GENERAL1_MEDIUM","image":"aws/codebuild/amazonlinux2-x86_64-standard:4.0"}'
```

**Docker permission denied:**
```bash
# Enable privileged mode for Docker builds
aws codebuild update-project \
  --name my-build-project \
  --environment '{"type":"LINUX_CONTAINER","computeType":"BUILD_GENERAL1_SMALL","image":"aws/codebuild/amazonlinux2-x86_64-standard:4.0","privilegedMode":true}'
```

**Artifact not found:**

If CodePipeline says the build produced no artifacts, check your buildspec:

```yaml
# Make sure the artifacts section is correct
artifacts:
  files:
    - '**/*'           # Include all files
  base-directory: dist  # From this directory
```

### Build Timeout

```bash
# Increase the build timeout (default is 60 minutes)
aws codebuild update-project \
  --name my-build-project \
  --timeout-in-minutes 120
```

## Deploy Stage Failures

### CodeDeploy Failures

For CodeDeploy deployment failures, check the deployment status:

```bash
# Get the deployment ID from the action execution
DEPLOYMENT_ID=$(aws codepipeline list-action-executions \
  --pipeline-name my-app-pipeline \
  --filter pipelineExecutionId=abc-123-def \
  --query 'actionExecutionDetails[?stageName==`Deploy`].output.executionResult.externalExecutionId' \
  --output text)

# Check what went wrong
aws deploy get-deployment \
  --deployment-id $DEPLOYMENT_ID \
  --query 'deploymentInfo.{status:status,error:errorInformation}'
```

For detailed CodeDeploy debugging, see our guide on [handling CodeDeploy deployment failures](https://oneuptime.com/blog/post/codedeploy-deployment-failures/view).

### CloudFormation Failures

When a CloudFormation deploy action fails:

```bash
# Check stack events for the error
aws cloudformation describe-stack-events \
  --stack-name my-app-stack \
  --query 'StackEvents[?ResourceStatus==`CREATE_FAILED` || ResourceStatus==`UPDATE_FAILED`].{Resource:LogicalResourceId,Status:ResourceStatus,Reason:ResourceStatusReason}' \
  --max-items 10
```

Common CloudFormation issues:

- **Resource limit exceeded** - You've hit an AWS service quota
- **Circular dependency** - Templates reference each other incorrectly
- **IAM insufficient permissions** - The CloudFormation execution role is missing required permissions

### ECS Deploy Failures

For ECS blue/green deployments:

```bash
# Check ECS service events
aws ecs describe-services \
  --cluster my-cluster \
  --services my-service \
  --query 'services[0].events[0:5]'

# Check if tasks are starting
aws ecs list-tasks \
  --cluster my-cluster \
  --service-name my-service \
  --desired-status STOPPED \
  --query 'taskArns[0:5]'
```

## Approval Stage Issues

### Approval Timeout

Approvals time out after 7 days by default. If your pipeline keeps timing out:

1. Set up proper notifications so approvers know when action is needed (see our guide on [CodePipeline notifications](https://oneuptime.com/blog/post/codepipeline-notifications/view))
2. Consider whether you really need the approval gate
3. Automate approval for non-production environments

### Wrong Person Trying to Approve

```bash
# Check who has permission to approve
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::123456789012:user/developer \
  --action-names codepipeline:PutApprovalResult \
  --resource-arns "arn:aws:codepipeline:us-east-1:123456789:my-app-pipeline/*"
```

## IAM Issues (The Usual Suspect)

IAM problems cause a disproportionate number of pipeline failures. Here's a systematic way to check:

```bash
# Check the pipeline service role
PIPELINE_ROLE=$(aws codepipeline get-pipeline \
  --name my-app-pipeline \
  --query 'pipeline.roleArn' --output text)

echo "Pipeline role: $PIPELINE_ROLE"

# List attached policies
ROLE_NAME=$(echo $PIPELINE_ROLE | cut -d'/' -f2)
aws iam list-attached-role-policies --role-name $ROLE_NAME
aws iam list-role-policies --role-name $ROLE_NAME
```

Verify the role has permissions for every service the pipeline touches: S3 for artifacts, CodeBuild, CodeDeploy, CloudFormation, and any cross-account roles.

## Superseded Executions

When multiple pushes happen quickly, CodePipeline can supersede older executions. This is normal behavior, not a failure - but it can be confusing.

```bash
# Check if the execution was superseded
aws codepipeline list-pipeline-executions \
  --pipeline-name my-app-pipeline \
  --query 'pipelineExecutionSummaries[?status==`Superseded`]'
```

Superseded executions are fine. The latest execution will deploy the most recent code.

## Pipeline Debugging Checklist

When something breaks, work through this:

1. Check which stage and action failed using `get-pipeline-state`
2. Get the error message from `list-action-executions`
3. Check the external service logs (CodeBuild logs, CodeDeploy status, CloudFormation events)
4. Verify IAM permissions for the pipeline role
5. Check if the artifact bucket is accessible
6. Look at CloudTrail for access denied events
7. Retry the failed stage if it was a transient issue

```bash
# Retry the failed stage
aws codepipeline retry-stage-execution \
  --pipeline-name my-app-pipeline \
  --stage-name Deploy \
  --pipeline-execution-id abc-123-def \
  --retry-mode FAILED_ACTIONS
```

## Prevention

The best debugging is the debugging you don't have to do:

- Set up [pipeline notifications](https://oneuptime.com/blog/post/codepipeline-notifications/view) so you catch failures immediately
- Use [manual approvals](https://oneuptime.com/blog/post/codepipeline-manual-approval/view) before production
- Monitor your pipeline's success rate over time
- Use [OneUptime](https://oneuptime.com) to correlate pipeline events with application health, so you know when a deployment caused a problem

Don't treat pipeline failures as emergencies to solve one at a time. Track them, find patterns, and fix the systemic issues.
