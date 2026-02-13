# How to Troubleshoot Elastic Beanstalk Deployment Failures

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Elastic Beanstalk, Troubleshooting, DevOps

Description: Practical guide to diagnosing and fixing common AWS Elastic Beanstalk deployment failures, including health check failures, timeout errors, permission issues, and log analysis.

---

There are few things more frustrating than watching an Elastic Beanstalk deployment sit at "Updating" for 20 minutes, only to roll back with a vague error message. The good news is that most deployment failures fall into a handful of categories, and once you know where to look, they're usually straightforward to fix.

This guide covers the most common deployment failures, how to diagnose them, and how to fix them quickly.

## The First Step: Check the Logs

Before you do anything else, pull the logs. Most deployment problems are immediately obvious once you see the actual error message.

```bash
# Get the last 100 lines of all logs
eb logs

# Get full logs (downloaded as a zip)
eb logs --all

# Stream logs in real-time during deployment
eb logs --stream
```

If the environment is in a bad state and the EB CLI isn't cooperating, go through the AWS Console: Elastic Beanstalk > Your Environment > Logs > Request Logs > Full Logs.

The most useful log files are:

- `/var/log/eb-engine.log` - Deployment engine logs (start here)
- `/var/log/web.stdout.log` - Your application's stdout output
- `/var/log/nginx/error.log` - Nginx reverse proxy errors
- `/var/log/eb-hooks/` - Hook script output

## Health Check Failures

This is the most common deployment failure. Your application deploys successfully but fails the health check, causing Elastic Beanstalk to consider the deployment failed.

### Symptoms

```
ERROR: Your environment's health has transitioned from Ok to Severe.
       During an environment operation, 1 out of 1 instances failed.
```

### Common Causes

**Wrong port**: Your application isn't listening on the port Elastic Beanstalk expects.

```python
# Wrong - hardcoded port that doesn't match EB's expected port
app.run(port=3000)

# Right - use the PORT environment variable or the platform default
import os
port = int(os.environ.get('PORT', 5000))
app.run(host='0.0.0.0', port=port)
```

**Health check path returns non-200**: The default health check hits `/`. If your root path redirects or returns a non-200 status, the check fails.

```yaml
# .ebextensions/healthcheck.config - Point health check to a dedicated endpoint
option_settings:
  aws:elasticbeanstalk:application:
    Application Healthcheck URL: /health
```

**Application crashes on startup**: The app starts, crashes immediately, and isn't running when the health check arrives. Check `web.stdout.log` for the crash reason.

**Slow startup**: Java and large Python applications can take minutes to start. The health check arrives before the app is ready.

```yaml
# .ebextensions/timeout.config - Increase deployment timeout
option_settings:
  aws:elasticbeanstalk:command:
    Timeout: 900
  aws:elasticbeanstalk:environment:process:default:
    HealthCheckInterval: 30
    HealthCheckTimeout: 10
```

## Dependency Installation Failures

Your `requirements.txt`, `package.json`, or `pom.xml` specifies a dependency that can't be installed.

### Symptoms

```
ERROR: [Instance: i-0abc123] Command failed on instance.
       Return code: 1 Output: pip install failed
```

### Diagnosing

```bash
# SSH into the instance to see what happened
eb ssh

# Check the deployment log
sudo cat /var/log/eb-engine.log | grep -A 20 "pip install"
```

### Common Fixes

**Missing system dependencies**: Some Python packages (like `psycopg2`) need system libraries to compile.

```yaml
# .ebextensions/packages.config - Install system dependencies
packages:
  yum:
    postgresql-devel: []
    gcc: []
    python3-devel: []
```

**Version conflicts**: Two dependencies require incompatible versions of the same package.

```bash
# Generate a clean requirements file with pip-compile
pip-compile requirements.in --output-file requirements.txt
```

**Private packages**: If you're installing from a private registry, make sure the credentials are available on the instance.

## Permission and IAM Errors

The instance profile doesn't have the permissions your application needs.

### Symptoms

```
botocore.exceptions.ClientError: An error occurred (AccessDenied)
when calling the GetObject operation
```

### Fix

Make sure the instance profile has the right policies. You can check what role the instances are using.

```bash
# Check the instance profile
aws elasticbeanstalk describe-environment-resources \
    --environment-name production \
    --query "EnvironmentResources.Instances"

# Check the IAM role's policies
aws iam list-attached-role-policies \
    --role-name aws-elasticbeanstalk-ec2-role
```

Add the missing permissions.

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject"
            ],
            "Resource": "arn:aws:s3:::my-bucket/*"
        }
    ]
}
```

## Out of Disk Space

The deployment package plus dependencies can fill up the root volume, especially on smaller instances.

### Symptoms

```
OSError: [Errno 28] No space left on device
```

### Fix

Increase the root volume size.

```yaml
# .ebextensions/storage.config - Increase root volume
option_settings:
  aws:autoscaling:launchconfiguration:
    RootVolumeType: gp3
    RootVolumeSize: 30
```

Clean up old deployment artifacts.

```yaml
# .ebextensions/cleanup.config - Clean up old versions on deploy
container_commands:
  01_cleanup:
    command: "sudo rm -rf /var/app/ondeck/node_modules/.cache"
```

## Docker-Specific Failures

Docker deployments have their own category of issues.

### Image Pull Failures

```
ERROR: Cannot pull Docker image from ECR
```

Make sure the instance role has ECR access.

```json
{
    "Effect": "Allow",
    "Action": [
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:GetAuthorizationToken"
    ],
    "Resource": "*"
}
```

### Docker Build Failures

```bash
# SSH in and check Docker build output
eb ssh
sudo cat /var/log/eb-activity.log
```

Common causes: missing files in the build context (check your `.dockerignore`), multi-stage builds referencing stages that don't exist, and `COPY` commands for files that aren't in the deployment package.

## Platform Hook Failures

Custom scripts in `.platform/hooks/` can fail and block the deployment.

### Diagnosing

```bash
# Check hook execution logs
eb ssh
sudo cat /var/log/eb-hooks.log
```

### Common Issues

**Missing execute permission**: Scripts must be executable.

```bash
# Make all hooks executable before deploying
chmod +x .platform/hooks/predeploy/*.sh
chmod +x .platform/hooks/postdeploy/*.sh
```

**Wrong line endings**: If you develop on Windows, your scripts might have CRLF line endings that Linux can't execute.

```bash
# Convert to Unix line endings
dos2unix .platform/hooks/predeploy/01_setup.sh
```

**Non-zero exit code**: Any script that exits with a non-zero code fails the deployment. Add error handling.

```bash
#!/bin/bash
# .platform/hooks/predeploy/01_setup.sh
set -e  # Exit on any error

# Use || true for commands that might fail but shouldn't stop deployment
some-optional-command || true

# Use explicit error handling for critical commands
if ! critical-command; then
    echo "Critical command failed, aborting deployment"
    exit 1
fi
```

## Deployment Timeout

The deployment takes longer than the configured timeout.

### Symptoms

```
ERROR: Operation timed out waiting for environment to become healthy
```

### Fix

Increase the timeout and check what's taking so long.

```yaml
option_settings:
  aws:elasticbeanstalk:command:
    Timeout: 1200
```

Common slow operations:

- Compiling native dependencies (Python C extensions, npm native modules)
- Docker image builds without layer caching
- Database migrations that lock tables
- Downloading large files during deployment

## The Nuclear Option: Rebuild

If your environment is completely broken and nothing seems to fix it, you can rebuild it.

```bash
# Save current configuration
eb config save production --cfg my-backup

# Terminate the environment
eb terminate production

# Recreate with saved configuration
eb create production --cfg my-backup
```

This gives you a completely fresh environment with your saved configuration. It's the last resort, but sometimes it's faster than debugging a deeply broken state.

## Prevention

The best fix is not needing to troubleshoot in the first place.

**Test locally first**: Run your application locally with the same environment variables and verify it starts correctly.

**Use immutable deployments**: They're slower but automatically roll back on failure, leaving your production environment untouched.

**Set up monitoring**: Catch issues before they become deployment failures. Tools like [OneUptime](https://oneuptime.com/blog/post/2026-02-12-set-up-aws-resilience-hub-for-application-resilience/view) can alert you to health degradation before it impacts deployments.

**Keep a deployment runbook**: Document the steps to diagnose and fix common issues. Future you (or your on-call teammate at 2 AM) will appreciate it.

## Wrapping Up

Most Elastic Beanstalk deployment failures fall into five categories: health check failures, dependency issues, permission errors, resource constraints, and script errors. The diagnosis process is almost always the same - check the logs, identify which category the error falls into, and apply the appropriate fix.

When in doubt, SSH into the instance and look at what's actually happening. The logs in the console are summarized, but the instance logs tell the full story.
