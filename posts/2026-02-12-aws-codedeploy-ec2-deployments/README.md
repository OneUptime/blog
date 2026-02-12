# How to Set Up AWS CodeDeploy for EC2 Deployments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CodeDeploy, EC2, DevOps, CI/CD

Description: Learn how to configure AWS CodeDeploy to automate application deployments to EC2 instances, including IAM roles, agent installation, and deployment groups.

---

Deploying code to EC2 instances manually gets old fast. You SSH in, pull the latest code, restart services, hope nothing breaks - and then repeat that across ten servers. AWS CodeDeploy takes all that pain away by automating the entire deployment process. It handles rolling updates, health checks, and rollbacks so you don't have to babysit every release.

In this guide, I'll walk you through setting up CodeDeploy for EC2 from scratch. We'll cover IAM roles, the CodeDeploy agent, deployment groups, and actually pushing a deployment.

## Prerequisites

Before we start, make sure you have:

- An AWS account with admin access
- At least one running EC2 instance
- AWS CLI installed and configured locally
- An S3 bucket (or GitHub repo) to store your application bundle

## Step 1: Create IAM Roles

CodeDeploy needs two IAM roles - one for the service itself and one for your EC2 instances.

First, create the CodeDeploy service role. This lets CodeDeploy talk to other AWS services on your behalf.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "codedeploy.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

Save that as `codedeploy-trust.json` and create the role:

```bash
# Create the CodeDeploy service role
aws iam create-role \
  --role-name CodeDeployServiceRole \
  --assume-role-policy-document file://codedeploy-trust.json

# Attach the managed policy for CodeDeploy
aws iam attach-role-policy \
  --role-name CodeDeployServiceRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSCodeDeployRole
```

Now create the EC2 instance profile. Your instances need permission to pull deployment artifacts from S3.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:Get*",
        "s3:List*"
      ],
      "Resource": "*"
    }
  ]
}
```

Create and attach that policy:

```bash
# Create the EC2 role
aws iam create-role \
  --role-name CodeDeployEC2Role \
  --assume-role-policy-document file://ec2-trust.json

# Create the policy for S3 access
aws iam create-policy \
  --policy-name CodeDeployEC2S3Access \
  --policy-document file://ec2-s3-policy.json

# Create an instance profile and add the role
aws iam create-instance-profile \
  --instance-profile-name CodeDeployEC2Profile

aws iam add-role-to-instance-profile \
  --instance-profile-name CodeDeployEC2Profile \
  --role-name CodeDeployEC2Role
```

Attach this instance profile to your EC2 instances through the console or CLI.

## Step 2: Install the CodeDeploy Agent

The CodeDeploy agent runs on each EC2 instance and handles the actual deployment work. It polls CodeDeploy for new deployments and executes the lifecycle hooks you define.

For Amazon Linux 2 or Amazon Linux 2023:

```bash
# Install the CodeDeploy agent on Amazon Linux
sudo yum update -y
sudo yum install -y ruby wget

cd /home/ec2-user
wget https://aws-codedeploy-us-east-1.s3.us-east-1.amazonaws.com/latest/install
chmod +x ./install
sudo ./install auto

# Verify the agent is running
sudo service codedeploy-agent status
```

For Ubuntu:

```bash
# Install the CodeDeploy agent on Ubuntu
sudo apt-get update
sudo apt-get install -y ruby-full wget

cd /home/ubuntu
wget https://aws-codedeploy-us-east-1.s3.us-east-1.amazonaws.com/latest/install
chmod +x ./install
sudo ./install auto

# Check agent status
sudo service codedeploy-agent status
```

Replace `us-east-1` in the URL with whatever region you're using.

## Step 3: Tag Your EC2 Instances

CodeDeploy uses tags to identify which instances belong to a deployment group. Add a tag to your instances:

```bash
# Tag your EC2 instances for CodeDeploy
aws ec2 create-tags \
  --resources i-0abc123def456 \
  --tags Key=Environment,Value=Production Key=Application,Value=MyApp
```

## Step 4: Create a CodeDeploy Application and Deployment Group

Now let's set up the CodeDeploy application:

```bash
# Create the CodeDeploy application
aws deploy create-application \
  --application-name MyApp \
  --compute-platform Server
```

Then create a deployment group that targets your tagged instances:

```bash
# Create the deployment group targeting tagged EC2 instances
aws deploy create-deployment-group \
  --application-name MyApp \
  --deployment-group-name MyApp-Production \
  --deployment-config-name CodeDeployDefault.OneAtATime \
  --ec2-tag-filters Key=Application,Value=MyApp,Type=KEY_AND_VALUE \
  --service-role-arn arn:aws:iam::123456789012:role/CodeDeployServiceRole
```

The `deployment-config-name` controls how many instances get updated at once. Your options are:

- **CodeDeployDefault.OneAtATime** - safest, deploys to one instance at a time
- **CodeDeployDefault.HalfAtATime** - deploys to half your fleet simultaneously
- **CodeDeployDefault.AllAtOnce** - deploys everywhere at once (fastest but riskiest)

## Step 5: Create the AppSpec File

The `appspec.yml` file tells CodeDeploy what to do during each phase of the deployment. Place it in the root of your application bundle.

```yaml
# appspec.yml - defines deployment lifecycle hooks
version: 0.0
os: linux

files:
  - source: /
    destination: /var/www/myapp

permissions:
  - object: /var/www/myapp
    owner: www-data
    group: www-data
    mode: "755"

hooks:
  BeforeInstall:
    - location: scripts/stop_server.sh
      timeout: 300
      runas: root
  AfterInstall:
    - location: scripts/install_dependencies.sh
      timeout: 300
      runas: root
  ApplicationStart:
    - location: scripts/start_server.sh
      timeout: 300
      runas: root
  ValidateService:
    - location: scripts/validate.sh
      timeout: 300
      runas: root
```

For a deeper look at AppSpec files, check out our guide on [creating CodeDeploy AppSpec files](https://oneuptime.com/blog/post/codedeploy-appspec-files/view).

## Step 6: Bundle and Deploy

Package your application into a zip or tar archive and push it to S3:

```bash
# Create the deployment bundle
zip -r myapp.zip . -x ".git/*"

# Push to S3
aws s3 cp myapp.zip s3://my-deployment-bucket/myapp.zip

# Trigger the deployment
aws deploy create-deployment \
  --application-name MyApp \
  --deployment-group-name MyApp-Production \
  --s3-location bucket=my-deployment-bucket,key=myapp.zip,bundleType=zip
```

## Monitoring Your Deployment

Once you've kicked off a deployment, you can watch its progress:

```bash
# Check deployment status
aws deploy get-deployment \
  --deployment-id d-ABCDEF123

# List deployment instances and their status
aws deploy list-deployment-instances \
  --deployment-id d-ABCDEF123
```

The deployment goes through several lifecycle events: BeforeInstall, Install, AfterInstall, ApplicationStart, and ValidateService. If any hook fails, CodeDeploy stops the deployment and can automatically roll back.

## Setting Up Auto-Rollback

You really should configure automatic rollbacks. If a deployment fails or your health checks start failing, CodeDeploy will revert to the last known good version:

```bash
# Update deployment group with auto-rollback enabled
aws deploy update-deployment-group \
  --application-name MyApp \
  --current-deployment-group-name MyApp-Production \
  --auto-rollback-configuration enabled=true,events=DEPLOYMENT_FAILURE,DEPLOYMENT_STOP_ON_ALARM
```

## Common Issues

A few things that trip people up:

1. **Agent not running** - The CodeDeploy agent must be running on every target instance. Check with `sudo service codedeploy-agent status`.
2. **Wrong IAM permissions** - The EC2 instance profile needs S3 read access. The CodeDeploy service role needs the managed policy attached.
3. **Missing AppSpec** - The `appspec.yml` must be in the root of your deployment bundle, not in a subdirectory.
4. **Script permissions** - Your hook scripts need to be executable. Run `chmod +x scripts/*.sh` before bundling.

## What's Next

Once you've got basic EC2 deployments working, consider integrating CodeDeploy into a full CI/CD pipeline with [CodePipeline and GitHub](https://oneuptime.com/blog/post/codepipeline-github-source/view). You can also scale things up by using CodeDeploy with [Auto Scaling Groups](https://oneuptime.com/blog/post/codedeploy-auto-scaling-groups/view) so new instances automatically get your latest code.

For monitoring your deployments and catching issues early, consider setting up alerts with a tool like [OneUptime](https://oneuptime.com) to track deployment health alongside your application metrics.
