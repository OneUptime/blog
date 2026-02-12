# How to Create a CloudFormation Stack from the Console

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudFormation, AWS Console, Infrastructure as Code

Description: Step-by-step guide to creating and managing AWS CloudFormation stacks directly from the AWS Management Console with practical examples.

---

Not everyone wants to start with the CLI. If you're just getting into CloudFormation, the AWS Console is a perfectly fine way to create and manage stacks while you're learning. The visual feedback helps you understand what's happening at each step.

This guide walks through the entire process of creating a CloudFormation stack from the Console - from uploading your template to monitoring the creation process and troubleshooting failures.

## Prerequisites

Before you begin, make sure you have:

- An AWS account with permissions to create CloudFormation stacks
- A CloudFormation template ready (YAML or JSON). If you need help writing one, check out [writing your first CloudFormation template](https://oneuptime.com/blog/post/write-your-first-cloudformation-template/view).
- The IAM permissions needed for whatever resources your template creates

## Step 1: Navigate to CloudFormation

Log into the AWS Management Console and search for "CloudFormation" in the search bar at the top. Click on the CloudFormation service to open the dashboard.

You'll see a list of existing stacks (if any). The main view shows stack names, their statuses, and when they were last updated.

## Step 2: Create a New Stack

Click the "Create stack" button. You'll see a dropdown - choose "With new resources (standard)".

The first page asks how you want to specify your template. You have three options:

1. **Template is ready** - you already have a template file
2. **Use a sample template** - AWS provides some starter templates
3. **Create template in Designer** - a visual drag-and-drop builder

For most cases, pick "Template is ready." Then choose how to provide it:

- **Upload a template file** - upload from your local machine
- **Amazon S3 URL** - reference a template stored in S3

If your template is small and you're just testing, uploading directly is easiest. For production workflows, storing templates in S3 is the better approach since it provides versioning and access control.

Here's a simple template you can use to follow along:

```yaml
# Simple template for creating an S3 bucket and SNS topic
AWSTemplateFormatVersion: '2010-09-09'
Description: Demo stack - creates an S3 bucket and SNS notification topic

Parameters:
  EnvironmentName:
    Type: String
    Default: dev
    AllowedValues:
      - dev
      - staging
      - prod
    Description: Environment for resource naming

  NotificationEmail:
    Type: String
    Description: Email address for SNS notifications

Resources:
  DataBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub 'demo-data-${EnvironmentName}-${AWS::AccountId}'
      VersioningConfiguration:
        Status: Enabled
      Tags:
        - Key: Environment
          Value: !Ref EnvironmentName

  NotificationTopic:
    Type: AWS::SNS::Topic
    Properties:
      TopicName: !Sub 'demo-notifications-${EnvironmentName}'
      Subscription:
        - Protocol: email
          Endpoint: !Ref NotificationEmail

Outputs:
  BucketName:
    Description: Name of the created S3 bucket
    Value: !Ref DataBucket

  TopicArn:
    Description: ARN of the SNS topic
    Value: !Ref NotificationTopic
```

## Step 3: Configure Stack Details

After uploading, you'll land on the "Specify stack details" page. Here you need to:

**Stack name**: Give your stack a descriptive name. This is how you'll identify it later. Use something like `demo-dev-stack` or `myapp-production`. Stack names must be unique within your AWS account and region.

**Parameters**: If your template has parameters, they'll appear here as form fields. The Console renders them based on the parameter types and constraints you defined. For our example, you'd fill in:
- `EnvironmentName`: pick from the dropdown (dev, staging, prod)
- `NotificationEmail`: type in an email address

Parameters with `Default` values will be pre-filled but you can override them.

## Step 4: Configure Stack Options

This page has several sections:

**Tags**: Add key-value pairs that will be applied to all resources in the stack. I always add at least:
- `Project`: the project name
- `ManagedBy`: CloudFormation
- `Owner`: your team name

**Permissions**: You can specify an IAM role for CloudFormation to use when creating resources. If you leave it blank, CloudFormation uses your current session's permissions.

**Stack failure options**: This is important. You can choose:
- **Roll back all stack resources** - if anything fails, delete everything that was created (the safe default)
- **Preserve successfully provisioned resources** - keep what worked, which helps with debugging

**Advanced options**: These include:
- Stack policy (restrict updates to specific resources)
- Rollback configuration (CloudWatch alarm to trigger rollback)
- Notification options (SNS topic for stack events)
- Termination protection (prevent accidental deletion)

For your first stack, the defaults are fine. But definitely enable termination protection for production stacks.

## Step 5: Review and Create

The review page shows everything you've configured. Double-check your parameter values and tags.

At the bottom, you may see a checkbox that says "I acknowledge that AWS CloudFormation might create IAM resources." If your template creates IAM roles, policies, or users, you must check this box. It's AWS making sure you know your template will create security-related resources.

Click "Submit" to start the creation.

## Step 6: Monitor Stack Creation

After clicking Submit, you're taken to the stack detail page. The "Events" tab is where the action is. You'll see events streaming in as CloudFormation creates each resource:

```
Timestamp           Logical ID          Status                  Reason
12:00:01            demo-dev-stack      CREATE_IN_PROGRESS      User initiated
12:00:05            DataBucket          CREATE_IN_PROGRESS
12:00:06            NotificationTopic   CREATE_IN_PROGRESS
12:00:25            DataBucket          CREATE_COMPLETE
12:00:30            NotificationTopic   CREATE_COMPLETE
12:00:32            demo-dev-stack      CREATE_COMPLETE
```

The stack goes through these statuses:

| Status | Meaning |
|---|---|
| `CREATE_IN_PROGRESS` | CloudFormation is working on it |
| `CREATE_COMPLETE` | Everything succeeded |
| `CREATE_FAILED` | Something went wrong |
| `ROLLBACK_IN_PROGRESS` | Cleaning up after a failure |
| `ROLLBACK_COMPLETE` | Cleanup finished |

## Checking Other Tabs

Once creation is complete, explore the other tabs:

- **Resources**: Lists every resource CloudFormation created, with links to each one in the Console
- **Outputs**: Shows the output values defined in your template (like our bucket name and topic ARN)
- **Parameters**: Shows the parameter values used for this deployment
- **Template**: Shows the template that was used
- **Change sets**: For managing updates (more on that in our [change sets guide](https://oneuptime.com/blog/post/cloudformation-change-sets-safe-updates/view))

## Troubleshooting Failed Stacks

When a stack creation fails, don't panic. Go to the Events tab and scroll down to find the first `CREATE_FAILED` event. The "Status reason" column tells you what went wrong.

Common failures include:

**Insufficient permissions**: Your IAM user or role doesn't have permission to create the specified resources. Fix: add the required permissions and try again.

**Name conflicts**: A resource with that name already exists. Fix: change the name or use dynamic naming with `!Sub` and `${AWS::AccountId}`.

**Invalid parameter values**: A parameter doesn't meet validation constraints. Fix: double-check your inputs against the template's `AllowedValues` or `AllowedPattern`.

**Resource limit reached**: You've hit an AWS service limit. Fix: request a limit increase through the Service Quotas console.

After a failure, the stack typically rolls back to `ROLLBACK_COMPLETE`. You'll need to delete the failed stack before creating a new one with the same name.

## Updating an Existing Stack

To update a stack from the Console:

1. Select the stack from the list
2. Click "Update"
3. Choose whether to use the current template or upload a new one
4. Walk through the same wizard, adjusting parameters as needed
5. Review the changes and submit

Before making updates to production stacks, consider using [change sets](https://oneuptime.com/blog/post/cloudformation-change-sets-safe-updates/view) to preview what will change before executing the update.

## Deleting a Stack

Select the stack and click "Delete." CloudFormation will remove all resources it created. Check the Events tab to monitor progress.

If deletion fails (common with non-empty S3 buckets), you'll see the failure reason in the events. For more on this, see our post on [handling stack deletion failures](https://oneuptime.com/blog/post/cloudformation-stack-deletion-failures/view).

## When to Move Beyond the Console

The Console is great for learning and one-off deployments. But as your infrastructure grows, you'll want to switch to the CLI or CI/CD pipelines for:

- Repeatable deployments across environments
- Code review workflows for infrastructure changes
- Automated testing and validation
- Integration with deployment pipelines

Our guide on [deploying CloudFormation with the AWS CLI](https://oneuptime.com/blog/post/deploy-cloudformation-templates-aws-cli/view) covers the next step in that progression.

The Console remains useful for monitoring stacks, reading events, and debugging - even when you deploy through automation. Think of it as your dashboard, not your deployment tool.
