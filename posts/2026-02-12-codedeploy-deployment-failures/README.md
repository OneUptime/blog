# How to Handle CodeDeploy Deployment Failures

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CodeDeploy, Troubleshooting, DevOps

Description: A practical guide to diagnosing and fixing common AWS CodeDeploy deployment failures, including agent issues, script errors, IAM problems, and rollback strategies.

---

CodeDeploy deployments fail. It happens to everyone. Maybe a hook script exits with a non-zero code, the agent can't reach the service, or your AppSpec file has a typo. The frustrating part isn't the failure itself - it's figuring out why it failed and how to fix it.

I've debugged hundreds of CodeDeploy failures over the years, and the same issues come up repeatedly. This guide covers the most common failure modes, how to diagnose them, and what to do about it.

## Understanding Deployment Status

When a deployment fails, the first thing to check is the overall status and error information:

```bash
# Get deployment details including error info
aws deploy get-deployment \
  --deployment-id d-ABCDEF123 \
  --query 'deploymentInfo.{status:status,errorInfo:errorInformation,creator:creator,description:description}'
```

Deployment statuses you'll see:

- **Created** - Deployment is queued
- **InProgress** - Currently deploying
- **Succeeded** - Everything worked
- **Failed** - Something went wrong
- **Stopped** - Manually stopped or auto-rolled back

For more detail, check each instance's status:

```bash
# List all instances in the deployment and their status
aws deploy list-deployment-targets \
  --deployment-id d-ABCDEF123

# Get detailed info for a specific target
aws deploy get-deployment-target \
  --deployment-id d-ABCDEF123 \
  --target-id i-0abc123def456
```

## The Most Common Failures

### 1. CodeDeploy Agent Not Running

This is the number one cause of failures. If the agent isn't running on an instance, CodeDeploy can't do anything.

SSH into the instance and check:

```bash
# Check if the agent is running
sudo service codedeploy-agent status

# If it's not running, check the log for why
sudo less /var/log/aws/codedeploy-agent/codedeploy-agent.log

# Restart the agent
sudo service codedeploy-agent restart
```

Common reasons the agent stops:

- Instance ran out of disk space
- Agent was never installed (new AMI without it)
- Ruby dependency issues
- Agent crashed and didn't restart

To make the agent start on boot:

```bash
# Enable auto-start on Amazon Linux
sudo systemctl enable codedeploy-agent

# On Ubuntu
sudo systemctl enable codedeploy-agent
```

### 2. IAM Permission Errors

If you see errors about access denied or insufficient permissions, check two things:

First, the CodeDeploy service role:

```bash
# Verify the service role has the right policy
aws iam list-attached-role-policies \
  --role-name CodeDeployServiceRole
```

It should have `AWSCodeDeployRole` attached.

Second, the EC2 instance profile:

```bash
# Check what role the instance is using
aws ec2 describe-instances \
  --instance-ids i-0abc123 \
  --query 'Reservations[0].Instances[0].IamInstanceProfile'

# Verify that role has S3 access for pulling artifacts
aws iam list-attached-role-policies \
  --role-name CodeDeployEC2Role
```

### 3. Hook Script Failures

This is the most common failure during actual deployments. A lifecycle hook script returns a non-zero exit code, and CodeDeploy marks the deployment as failed.

Find out which hook failed:

```bash
# Get lifecycle events for a specific instance
aws deploy get-deployment-target \
  --deployment-id d-ABCDEF123 \
  --target-id i-0abc123 \
  --query 'deploymentTarget.instanceTarget.lifecycleEvents'
```

Then check the script output on the instance:

```bash
# Hook script logs are stored here
sudo less /opt/codedeploy-agent/deployment-root/<deployment-group-id>/<deployment-id>/logs/scripts.log

# You can also find them in the agent log
sudo grep -A 20 "LifecycleEvent" /var/log/aws/codedeploy-agent/codedeploy-agent.log
```

Common script issues:

**Script not executable:**
```bash
# Fix: Make scripts executable before bundling
chmod +x scripts/*.sh
```

**Missing shebang line:**
```bash
# Bad - no shebang, will fail on some systems
echo "Starting application"

# Good - always include the shebang
#!/bin/bash
echo "Starting application"
```

**Hidden Windows line endings:**
```bash
# If scripts were edited on Windows, convert line endings
dos2unix scripts/*.sh
# Or use sed
sed -i 's/\r$//' scripts/*.sh
```

**Script timeout:**
```yaml
# If your script takes a while, increase the timeout in appspec.yml
hooks:
  AfterInstall:
    - location: scripts/install_deps.sh
      timeout: 900  # 15 minutes instead of default 5
      runas: root
```

### 4. AppSpec File Errors

If CodeDeploy can't parse your AppSpec file, the deployment fails immediately.

Common AppSpec issues:

```yaml
# Wrong - file named appspec.yaml (should be .yml)
# Wrong - file not in bundle root
# Wrong - using tabs instead of spaces

# Correct format
version: 0.0
os: linux
files:
  - source: /
    destination: /var/www/myapp
```

Validate your AppSpec locally before deploying:

```bash
# Use yamllint to check for syntax errors
pip install yamllint
yamllint appspec.yml
```

### 5. File Already Exists at Destination

By default, CodeDeploy won't overwrite existing files. If a file exists at the destination from a previous deployment (or was manually placed there), the Install event fails.

Fix this with the `file_exists_behavior` parameter:

```bash
# Allow overwriting existing files
aws deploy create-deployment \
  --application-name MyApp \
  --deployment-group-name Production \
  --file-exists-behavior OVERWRITE \
  --s3-location bucket=my-bucket,key=myapp.zip,bundleType=zip
```

Or add cleanup to your BeforeInstall hook:

```bash
#!/bin/bash
# scripts/before_install.sh - Clean old files before install
set -e

if [ -d /var/www/myapp ]; then
    echo "Removing old deployment files..."
    rm -rf /var/www/myapp/*
fi
```

### 6. S3 Bucket Access Issues

If CodeDeploy can't download your artifact from S3:

```bash
# Test S3 access from the instance
aws s3 ls s3://my-deployment-bucket/

# If that fails, check the instance profile
curl http://169.254.169.254/latest/meta-data/iam/security-credentials/
```

Also verify the bucket is in the same region as your deployment, or that cross-region access is properly configured.

## Setting Up Automatic Rollbacks

Don't wait for manual intervention when deployments fail. Configure automatic rollbacks:

```bash
# Enable auto-rollback on deployment failure
aws deploy update-deployment-group \
  --application-name MyApp \
  --current-deployment-group-name Production \
  --auto-rollback-configuration enabled=true,events=DEPLOYMENT_FAILURE,DEPLOYMENT_STOP_ON_ALARM
```

You can also trigger rollbacks based on CloudWatch alarms:

```bash
# Add alarm-based rollback
aws deploy update-deployment-group \
  --application-name MyApp \
  --current-deployment-group-name Production \
  --auto-rollback-configuration enabled=true,events=DEPLOYMENT_FAILURE,DEPLOYMENT_STOP_ON_ALARM \
  --alarm-configuration enabled=true,alarms=[{name=HighErrorRate},{name=HighLatency}]
```

## Manual Rollback

If you need to roll back manually:

```bash
# Stop the current deployment
aws deploy stop-deployment \
  --deployment-id d-ABCDEF123 \
  --auto-rollback-enabled

# Or redeploy the previous revision
PREV_DEPLOYMENT=$(aws deploy list-deployments \
  --application-name MyApp \
  --deployment-group-name Production \
  --include-only-statuses Succeeded \
  --query 'deployments[0]' --output text)

REVISION=$(aws deploy get-deployment \
  --deployment-id $PREV_DEPLOYMENT \
  --query 'deploymentInfo.revision')

aws deploy create-deployment \
  --application-name MyApp \
  --deployment-group-name Production \
  --revision "$REVISION"
```

## Debugging Checklist

When a deployment fails, work through this list:

1. Check deployment status and error message via `get-deployment`
2. Check which lifecycle event failed via `get-deployment-target`
3. SSH to the instance and check `/opt/codedeploy-agent/deployment-root/*/logs/scripts.log`
4. Check the agent log at `/var/log/aws/codedeploy-agent/codedeploy-agent.log`
5. Verify the agent is running with `service codedeploy-agent status`
6. Verify IAM roles and instance profiles
7. Test S3 access from the instance
8. Check disk space with `df -h`

## Prevention

The best way to handle deployment failures is to prevent them:

- Always include a `ValidateService` hook that checks your app is actually working
- Test hook scripts locally before deploying
- Use `set -e` in all bash scripts so they fail fast
- Set appropriate timeouts in your AppSpec
- Monitor deployment metrics with [OneUptime](https://oneuptime.com) to catch trends before they become outages
- Enable auto-rollback from day one

For more details on writing solid AppSpec files, check our guide on [creating CodeDeploy AppSpec files](https://oneuptime.com/blog/post/2026-02-12-codedeploy-appspec-files/view). And if you're using CodePipeline, see our guide on [troubleshooting CodePipeline failures](https://oneuptime.com/blog/post/2026-02-12-troubleshoot-codepipeline-failures/view) for pipeline-level debugging.
