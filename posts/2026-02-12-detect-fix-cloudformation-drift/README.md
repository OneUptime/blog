# How to Detect and Fix CloudFormation Drift

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudFormation, Infrastructure as Code, Monitoring

Description: Learn how to detect CloudFormation drift when resources are modified outside of CloudFormation and how to bring your infrastructure back into alignment.

---

You deploy a perfect CloudFormation stack. A week later, someone logs into the Console and manually changes a security group rule "just for testing." They forget to revert it. Now your actual infrastructure doesn't match what CloudFormation thinks it deployed. That's drift, and it's one of the most common problems in infrastructure management.

## What is Drift?

Drift occurs when the actual state of a resource differs from what CloudFormation expects based on the template. CloudFormation doesn't actively monitor your resources - it trusts that no one has changed anything since the last deployment. Drift detection is how you verify that trust.

Common causes of drift:

- Manual Console changes (the classic)
- Scripts or automation that modify resources directly
- Other AWS services that modify resources (like Auto Scaling adjusting capacity)
- Someone using the AWS CLI to "quickly fix" something

## Detecting Drift

### Using the CLI

```bash
# Start a drift detection operation
DETECTION_ID=$(aws cloudformation detect-stack-drift \
  --stack-name my-app-prod \
  --query 'StackDriftDetectionId' \
  --output text)

echo "Detection ID: $DETECTION_ID"

# Wait for detection to complete (it's asynchronous)
while true; do
  STATUS=$(aws cloudformation describe-stack-drift-detection-status \
    --stack-drift-detection-id "$DETECTION_ID" \
    --query 'DetectionStatus' \
    --output text)
  echo "Status: $STATUS"
  if [ "$STATUS" != "DETECTION_IN_PROGRESS" ]; then
    break
  fi
  sleep 5
done

# Check the overall result
aws cloudformation describe-stack-drift-detection-status \
  --stack-drift-detection-id "$DETECTION_ID" \
  --query '{Status:DetectionStatus,DriftStatus:StackDriftStatus,DriftedCount:DriftedStackResourceCount}'
```

### Checking Individual Resources

```bash
# List all resources and their drift status
aws cloudformation describe-stack-resource-drifts \
  --stack-name my-app-prod \
  --stack-resource-drift-status-filters MODIFIED DELETED \
  --query 'StackResourceDrifts[*].{Resource:LogicalResourceId,Type:ResourceType,Status:StackResourceDriftStatus}'
```

The drift statuses are:

| Status | Meaning |
|---|---|
| `IN_SYNC` | Resource matches the template |
| `MODIFIED` | Resource exists but properties differ |
| `DELETED` | Resource was deleted outside CloudFormation |
| `NOT_CHECKED` | Drift detection doesn't support this resource type |

### Viewing Drift Details

For modified resources, you can see exactly what changed:

```bash
# Get detailed drift information for a specific resource
aws cloudformation describe-stack-resource-drifts \
  --stack-name my-app-prod \
  --stack-resource-drift-status-filters MODIFIED \
  --query 'StackResourceDrifts[*].{Resource:LogicalResourceId,Differences:PropertyDifferences}'
```

The output shows the expected vs actual values for each drifted property:

```json
{
  "PropertyDifferences": [
    {
      "PropertyPath": "/SecurityGroupIngress/0/CidrIp",
      "ExpectedValue": "10.0.0.0/16",
      "ActualValue": "0.0.0.0/0",
      "DifferenceType": "NOT_EQUAL"
    }
  ]
}
```

In this example, someone changed a security group rule from the VPC CIDR to `0.0.0.0/0` - opening it to the entire internet. That's exactly the kind of drift you need to catch.

## Detecting Drift on Individual Resources

If you only care about specific resources:

```bash
# Detect drift on specific resources only
aws cloudformation detect-stack-resource-drift \
  --stack-name my-app-prod \
  --logical-resource-id AppSecurityGroup
```

This is faster than full-stack drift detection when you're investigating a specific resource.

## Fixing Drift

Once you've found drift, you have three options:

### Option 1: Update the Stack to Re-Apply the Template

The simplest approach - run a stack update with the current template. CloudFormation will bring resources back to the template's defined state:

```bash
# Re-apply the current template to fix drift
aws cloudformation update-stack \
  --stack-name my-app-prod \
  --use-previous-template \
  --parameters ParameterKey=Environment,UsePreviousValue=true \
  --capabilities CAPABILITY_IAM
```

Or use `deploy` with `--no-fail-on-empty-changeset`:

```bash
# Deploy with current template to correct drift
aws cloudformation deploy \
  --stack-name my-app-prod \
  --template-file template.yaml \
  --parameter-overrides Environment=prod \
  --no-fail-on-empty-changeset
```

This works when the template is correct and the drift was unintentional.

### Option 2: Update the Template to Match Reality

Sometimes the manual change was intentional and correct. In that case, update your template to match:

```yaml
# Update the template to reflect the intended state
# Before (original):
SecurityGroupIngress:
  - IpProtocol: tcp
    FromPort: 443
    ToPort: 443
    CidrIp: 10.0.0.0/16

# After (matching the manual change):
SecurityGroupIngress:
  - IpProtocol: tcp
    FromPort: 443
    ToPort: 443
    CidrIp: 0.0.0.0/0
```

Deploy the updated template. Now CloudFormation's view matches reality, and the drift is resolved.

### Option 3: Import the Resource

If the resource was deleted and recreated outside CloudFormation, you may need to use [resource import](https://oneuptime.com/blog/post/2026-02-12-cloudformation-resource-import/view) to bring it back under CloudFormation management.

## Automating Drift Detection

Set up a scheduled drift check:

```yaml
# CloudWatch Event rule to check drift daily
AWSTemplateFormatVersion: '2010-09-09'
Description: Automated drift detection schedule

Parameters:
  StackName:
    Type: String
    Description: Stack to monitor for drift

Resources:
  DriftCheckRule:
    Type: AWS::Events::Rule
    Properties:
      Description: Daily drift detection
      ScheduleExpression: 'rate(1 day)'
      State: ENABLED
      Targets:
        - Id: DriftCheckLambda
          Arn: !GetAtt DriftCheckFunction.Arn

  DriftCheckFunction:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: drift-detector
      Runtime: python3.12
      Handler: index.handler
      Timeout: 120
      Role: !GetAtt LambdaRole.Arn
      Environment:
        Variables:
          STACK_NAME: !Ref StackName
          SNS_TOPIC: !Ref AlertTopic
      Code:
        ZipFile: |
          import boto3
          import os
          import time

          cfn = boto3.client('cloudformation')
          sns = boto3.client('sns')

          def handler(event, context):
              stack = os.environ['STACK_NAME']
              topic = os.environ['SNS_TOPIC']

              # Start drift detection
              resp = cfn.detect_stack_drift(StackName=stack)
              detection_id = resp['StackDriftDetectionId']

              # Wait for completion
              for _ in range(30):
                  status = cfn.describe_stack_drift_detection_status(
                      StackDriftDetectionId=detection_id
                  )
                  if status['DetectionStatus'] != 'DETECTION_IN_PROGRESS':
                      break
                  time.sleep(10)

              # Alert if drifted
              if status.get('StackDriftStatus') == 'DRIFTED':
                  drifted = status.get('DriftedStackResourceCount', 0)
                  sns.publish(
                      TopicArn=topic,
                      Subject=f'Drift detected in {stack}',
                      Message=f'{drifted} resources have drifted in stack {stack}. '
                              f'Run drift detection in the console for details.'
                  )
                  return {'drifted': True, 'count': drifted}

              return {'drifted': False}

  AlertTopic:
    Type: AWS::SNS::Topic
    Properties:
      TopicName: drift-alerts

  LambdaRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
      Policies:
        - PolicyName: DriftDetection
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - cloudformation:DetectStackDrift
                  - cloudformation:DescribeStackDriftDetectionStatus
                  - cloudformation:DescribeStackResourceDrifts
                Resource: '*'
              - Effect: Allow
                Action: sns:Publish
                Resource: !Ref AlertTopic

  LambdaPermission:
    Type: AWS::Lambda::Permission
    Properties:
      FunctionName: !Ref DriftCheckFunction
      Action: lambda:InvokeFunction
      Principal: events.amazonaws.com
      SourceArn: !GetAtt DriftCheckRule.Arn
```

## Drift Detection Limitations

Not every resource type supports drift detection. As of now, most common resource types are supported, but check the [AWS documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-stack-drift-resource-list.html) for the current list.

Also, drift detection only checks properties that are specified in your template. If you didn't define a property (letting CloudFormation use the default), changes to that property won't be flagged as drift.

## Best Practices

**Run drift detection regularly.** At minimum weekly for production stacks. Daily is better. Automate it.

**Restrict Console access.** The best way to prevent drift is to prevent manual changes. Use IAM policies to limit who can modify resources directly.

**Set up monitoring for your stacks.** Integrate drift detection with your monitoring platform. If you're using OneUptime, you can set up alerts that fire when drift is detected.

**Fix drift promptly.** The longer drift exists, the harder it is to reconcile. Addressing it quickly prevents compounding changes.

**Treat drift as an incident.** When drift is detected, investigate why it happened and address the root cause. Was it a process gap? Missing automation? Insufficient permissions controls?

**Use change sets for updates.** [Change sets](https://oneuptime.com/blog/post/2026-02-12-cloudformation-change-sets-safe-updates/view) prevent you from accidentally introducing new drift during updates by letting you review changes first.

Drift detection is your safety net against configuration creep. Make it part of your regular operations workflow and you'll catch problems before they become incidents.
