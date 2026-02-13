# How to Use Systems Manager Automation for Runbooks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Systems Manager, Automation, DevOps, Runbooks

Description: Learn how to use AWS Systems Manager Automation to build and run operational runbooks that standardize repetitive tasks across your infrastructure.

---

If you've ever found yourself SSH-ing into servers at 2 AM to restart a service, patch an instance, or investigate a disk space issue, you already know why runbooks exist. They're the step-by-step procedures your team follows when something goes sideways - or when routine maintenance needs doing. The problem is that most runbooks live in a wiki somewhere, collecting dust and falling out of date.

AWS Systems Manager Automation fixes this by letting you turn those runbooks into executable documents. Instead of reading steps off a Confluence page and running commands by hand, you define your runbook as an Automation document, and Systems Manager handles the execution. Let's walk through how to set this up properly.

## What Is Systems Manager Automation?

Systems Manager Automation is a feature within AWS Systems Manager that lets you define multi-step workflows called Automation documents (sometimes called SSM documents of type "Automation"). Each step in the document can perform an action - running a script on an instance, calling an AWS API, waiting for approval, branching based on conditions, and more.

Think of it as a lightweight orchestration engine built right into your AWS account. You don't need to manage any servers or install any agents beyond the SSM Agent that's already on most modern AMIs.

## Why Automation Runbooks Beat Manual Procedures

There are a few concrete reasons to move your runbooks into Automation:

- **Consistency**: Every execution follows the same steps, every time. No one accidentally skips step 3.
- **Audit trail**: Every execution is logged in Systems Manager, complete with who triggered it and what happened at each step.
- **Approvals**: You can gate certain steps behind manual approvals, so someone has to sign off before a dangerous action proceeds.
- **Scheduling**: You can trigger runbooks on a schedule, in response to CloudWatch alarms, or from EventBridge rules.

## Creating Your First Automation Document

Automation documents are defined in YAML or JSON. Let's create a simple one that restarts an EC2 instance and waits for it to come back online.

Here's the Automation document in YAML format:

```yaml
description: Restart an EC2 instance and wait for it to be running
schemaVersion: '0.3'
assumeRole: '{{ AutomationAssumeRole }}'
parameters:
  InstanceId:
    type: String
    description: The ID of the instance to restart
  AutomationAssumeRole:
    type: String
    description: The ARN of the role for Automation to assume
    default: ''
mainSteps:
  - name: StopInstance
    action: 'aws:changeInstanceState'
    inputs:
      InstanceIds:
        - '{{ InstanceId }}'
      DesiredState: stopped
    nextStep: StartInstance

  - name: StartInstance
    action: 'aws:changeInstanceState'
    inputs:
      InstanceIds:
        - '{{ InstanceId }}'
      DesiredState: running
    nextStep: VerifyRunning

  - name: VerifyRunning
    action: 'aws:waitForAwsResourceProperty'
    inputs:
      Service: ec2
      Api: DescribeInstanceStatus
      InstanceIds:
        - '{{ InstanceId }}'
      PropertySelector: '$.InstanceStatuses[0].InstanceState.Name'
      DesiredValues:
        - running
    timeoutSeconds: 300
```

You can create this document through the AWS CLI:

```bash
# Create the Automation document from a YAML file
aws ssm create-document \
  --name "Restart-EC2-Instance" \
  --document-type "Automation" \
  --content file://restart-instance.yaml \
  --document-format YAML
```

## Running the Automation

Once the document exists, you can execute it from the CLI:

```bash
# Start the automation execution
aws ssm start-automation-execution \
  --document-name "Restart-EC2-Instance" \
  --parameters "InstanceId=i-0abc123def456789"
```

Or you can run it from the Systems Manager console under the Automation section. The console gives you a nice visual of each step's progress and status.

## Adding Approval Steps

For sensitive operations, you'll want human approval before proceeding. Let's say you have a runbook that terminates and replaces an instance. You'd want someone to approve that first.

This step definition pauses execution until someone approves:

```yaml
  - name: ApproveTermination
    action: 'aws:approve'
    inputs:
      NotificationArn: 'arn:aws:sns:us-east-1:123456789012:ops-approvals'
      Message: 'Please approve termination of instance {{ InstanceId }}'
      MinRequiredApprovals: 1
      Approvers:
        - 'arn:aws:iam::123456789012:role/OpsTeamLead'
    timeoutSeconds: 3600
    nextStep: TerminateInstance
```

The approver gets an SNS notification and can approve or reject from the Systems Manager console. If nobody approves within the timeout, the execution fails gracefully.

## Branching and Conditional Logic

Real runbooks aren't always linear. Sometimes you need to take different actions based on conditions. Automation supports this with the `aws:branch` action.

This example checks the instance state and branches accordingly:

```yaml
  - name: CheckInstanceState
    action: 'aws:executeAwsApi'
    inputs:
      Service: ec2
      Api: DescribeInstances
      InstanceIds:
        - '{{ InstanceId }}'
    outputs:
      - Name: CurrentState
        Selector: '$.Reservations[0].Instances[0].State.Name'
        Type: String
    nextStep: BranchOnState

  - name: BranchOnState
    action: 'aws:branch'
    inputs:
      Choices:
        - NextStep: StartInstance
          Variable: '{{ CheckInstanceState.CurrentState }}'
          StringEquals: stopped
        - NextStep: RestartInstance
          Variable: '{{ CheckInstanceState.CurrentState }}'
          StringEquals: running
      Default: HandleUnknownState
```

## Running Scripts Within Automation

You can run scripts directly on instances as part of your automation. This uses the `aws:runCommand` action under the hood.

Here's a step that checks disk usage and cleans up if needed:

```yaml
  - name: CleanupDiskSpace
    action: 'aws:runCommand'
    inputs:
      DocumentName: AWS-RunShellScript
      InstanceIds:
        - '{{ InstanceId }}'
      Parameters:
        commands:
          - |
            # Check disk usage percentage
            USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
            echo "Current disk usage: ${USAGE}%"

            if [ "$USAGE" -gt 80 ]; then
              echo "Cleaning up old log files..."
              find /var/log -name "*.gz" -mtime +30 -delete

              # Clean docker images if docker is installed
              if command -v docker &> /dev/null; then
                docker system prune -f
              fi

              echo "Cleanup complete."
            else
              echo "Disk usage is acceptable, no cleanup needed."
            fi
```

## Using AWS-Provided Runbooks

Before building your own, check what AWS already provides. There are hundreds of pre-built Automation documents covering common tasks:

- `AWS-RestartEC2Instance` - Restart an EC2 instance
- `AWS-StopEC2Instance` - Stop an instance
- `AWS-CreateSnapshot` - Create EBS snapshots
- `AWS-PatchInstanceWithRollback` - Patch with automatic rollback
- `AWS-SetupManagedInstance` - Configure a new managed instance

You can list them with:

```bash
# List all AWS-provided Automation documents
aws ssm list-documents \
  --filters "Key=Owner,Values=Amazon" \
  --filters "Key=DocumentType,Values=Automation" \
  --query "DocumentIdentifiers[].Name" \
  --output table
```

## Setting Up IAM Permissions

Automation needs an IAM role to perform actions on your behalf. Here's a trust policy for the role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ssm.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

Attach policies that grant only the permissions your runbook needs. If it restarts instances, give it `ec2:StopInstances`, `ec2:StartInstances`, and `ec2:DescribeInstances`. Don't hand out admin access.

## Triggering Automation from CloudWatch Alarms

One of the most practical uses is auto-remediation. You can wire a CloudWatch alarm to trigger an Automation runbook through EventBridge.

This EventBridge rule triggers the restart runbook when a specific alarm fires:

```json
{
  "source": ["aws.cloudwatch"],
  "detail-type": ["CloudWatch Alarm State Change"],
  "detail": {
    "alarmName": ["HighCPU-WebServer"],
    "state": {
      "value": ["ALARM"]
    }
  }
}
```

The target would be the SSM Automation execution with the relevant parameters. This way, when CPU stays pegged on your web server, Systems Manager automatically restarts it without anyone having to wake up.

For more on setting up CloudWatch monitoring and alarms, check out our guide on [monitoring your infrastructure with CloudWatch](https://oneuptime.com/blog/post/2026-02-12-monitor-efs-cloudwatch/view).

## Best Practices

After building dozens of these runbooks, here's what I'd recommend:

1. **Version your documents** - Use document versions so you can roll back if a new version has issues.
2. **Use parameter validation** - Define allowed values and patterns for parameters to catch mistakes early.
3. **Add timeouts to every step** - Don't let a stuck step hang forever.
4. **Log generously** - Use `aws:executeScript` steps to output diagnostic information.
5. **Test in non-production first** - Create a separate set of documents for testing, or use the document version feature.
6. **Keep runbooks focused** - One runbook per problem. Compose them using parent-child executions if you need complex workflows.

## Wrapping Up

Systems Manager Automation turns your team's tribal knowledge into executable, auditable, repeatable procedures. Instead of relying on someone remembering all the steps at 3 AM, you codify those steps once and let the system handle execution. Start with the AWS-provided documents, customize them for your environment, and gradually build up a library of runbooks that covers your most common operational scenarios.
