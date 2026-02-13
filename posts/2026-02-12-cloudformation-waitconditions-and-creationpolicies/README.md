# How to Use CloudFormation WaitConditions and CreationPolicies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudFormation, DevOps, Infrastructure as Code

Description: Learn the differences between WaitConditions and CreationPolicies in CloudFormation, when to use each, and how they help coordinate resource provisioning.

---

CloudFormation creates resources, but it doesn't always know when those resources are truly ready. An EC2 instance can be "running" according to AWS while still installing packages and configuring itself. A WaitCondition or CreationPolicy tells CloudFormation to pause and wait for a signal before moving on.

These two mechanisms solve the same fundamental problem - synchronizing external processes with your stack creation - but they work differently and suit different scenarios. Let's dig into both.

## The Problem They Solve

Consider this scenario. You have an Auto Scaling Group that launches three instances. Each instance runs a bootstrap script that installs your application, pulls configuration from S3, and starts the application server. CloudFormation marks the ASG as "CREATE_COMPLETE" the moment the instances launch, but your application isn't actually running yet.

If downstream resources depend on that application being available (maybe a health check, or another service that connects to it), you've got a race condition. WaitConditions and CreationPolicies fix this by making CloudFormation wait for explicit success signals.

## CreationPolicy

CreationPolicy is the newer and simpler approach. You attach it directly to a resource (typically an EC2 instance or Auto Scaling Group), and it waits for the specified number of success signals before marking the resource as complete.

Here's a basic example with an EC2 instance.

```yaml
# EC2 instance with a CreationPolicy that waits for a success signal
AWSTemplateFormatVersion: "2010-09-09"

Resources:
  MyInstance:
    Type: AWS::EC2::Instance
    CreationPolicy:
      ResourceSignal:
        # Wait up to 15 minutes for a signal
        Timeout: PT15M
        # Expect exactly 1 success signal
        Count: 1
    Properties:
      ImageId: ami-0abcdef1234567890
      InstanceType: t3.micro
      UserData:
        Fn::Base64: !Sub |
          #!/bin/bash -xe

          # Do your setup work
          yum update -y
          yum install -y httpd
          systemctl start httpd
          systemctl enable httpd

          # Signal success back to CloudFormation
          /opt/aws/bin/cfn-signal -e $? \
            --stack ${AWS::StackName} \
            --resource MyInstance \
            --region ${AWS::Region}
```

The `PT15M` timeout uses ISO 8601 duration format. PT15M means 15 minutes. PT1H means one hour. If the signal doesn't arrive within the timeout, the resource creation fails and CloudFormation rolls back.

## CreationPolicy with Auto Scaling Groups

CreationPolicies really shine with Auto Scaling Groups, where you need multiple instances to signal success.

```yaml
# Auto Scaling Group that waits for 3 instances to signal success
Resources:
  MyASG:
    Type: AWS::AutoScaling::AutoScalingGroup
    CreationPolicy:
      ResourceSignal:
        # Wait for 3 signals (matching MinSize)
        Count: 3
        Timeout: PT20M
      AutoScalingCreationPolicy:
        # Minimum number of instances that must signal success
        MinSuccessfulInstancesPercent: 100
    Properties:
      MinSize: "3"
      MaxSize: "6"
      DesiredCapacity: "3"
      LaunchTemplate:
        LaunchTemplateId: !Ref MyLaunchTemplate
        Version: !GetAtt MyLaunchTemplate.LatestVersionNumber
      VPCZoneIdentifier:
        - !Ref PrivateSubnet1
        - !Ref PrivateSubnet2

  MyLaunchTemplate:
    Type: AWS::EC2::LaunchTemplate
    Properties:
      LaunchTemplateData:
        ImageId: ami-0abcdef1234567890
        InstanceType: t3.micro
        UserData:
          Fn::Base64: !Sub |
            #!/bin/bash -xe

            # Install and configure your application
            /opt/aws/bin/cfn-init -v \
              --stack ${AWS::StackName} \
              --resource MyLaunchTemplate \
              --region ${AWS::Region}

            # Each instance sends its own signal
            /opt/aws/bin/cfn-signal -e $? \
              --stack ${AWS::StackName} \
              --resource MyASG \
              --region ${AWS::Region}
```

Notice that cfn-signal references `MyASG` (the resource with the CreationPolicy), not the launch template. Each instance signals the ASG, and CloudFormation waits until it has received the required number of success signals.

The `MinSuccessfulInstancesPercent` parameter adds flexibility. Setting it to 75 means that if 3 out of 4 instances succeed, the ASG is still marked as complete.

## WaitCondition

WaitConditions are older and more flexible. They use a separate resource pair - a WaitConditionHandle (which generates a pre-signed URL) and the WaitCondition itself.

```yaml
# WaitCondition with its handle for signaling from external processes
AWSTemplateFormatVersion: "2010-09-09"

Resources:
  # The handle generates a pre-signed URL for signaling
  WaitHandle:
    Type: AWS::CloudFormation::WaitConditionHandle

  # The WaitCondition pauses stack creation
  WaitCondition:
    Type: AWS::CloudFormation::WaitCondition
    DependsOn: MyInstance
    Properties:
      Handle: !Ref WaitHandle
      Timeout: "900"  # 15 minutes, in seconds (not ISO 8601)
      Count: 1

  MyInstance:
    Type: AWS::EC2::Instance
    Properties:
      ImageId: ami-0abcdef1234567890
      InstanceType: t3.micro
      UserData:
        Fn::Base64: !Sub |
          #!/bin/bash -xe

          # Do your setup work
          yum update -y
          yum install -y httpd
          systemctl start httpd

          # Signal using the WaitConditionHandle URL
          /opt/aws/bin/cfn-signal -e $? \
            --stack ${AWS::StackName} \
            --resource WaitCondition \
            --region ${AWS::Region}

  # This resource waits for the WaitCondition before creating
  DependentResource:
    Type: AWS::SNS::Topic
    DependsOn: WaitCondition
    Properties:
      TopicName: app-ready-notifications
```

One key difference: WaitCondition timeout is in seconds (a plain number), while CreationPolicy uses ISO 8601 duration format. This is a common source of confusion.

## Signaling with curl

You don't have to use cfn-signal. Any process that can make an HTTPS request can signal a WaitCondition. This is useful for external tools, containers, or Lambda functions.

```bash
# Signal a WaitCondition using curl and the pre-signed URL
curl -X PUT -H "Content-Type:" \
  --data-binary '{
    "Status": "SUCCESS",
    "Reason": "Application configured successfully",
    "UniqueId": "instance-001",
    "Data": "Application is ready on port 8080"
  }' \
  "https://cloudformation-waitcondition-us-east-1.s3.amazonaws.com/..."
```

The pre-signed URL is the value of the WaitConditionHandle reference. You can pass it to instances through UserData.

```yaml
# Passing the WaitConditionHandle URL to an instance
UserData:
  Fn::Base64: !Sub |
    #!/bin/bash -xe
    WAIT_HANDLE_URL="${WaitHandle}"

    # Run setup...

    # Signal success using curl
    curl -X PUT -H "Content-Type:" \
      --data-binary '{"Status":"SUCCESS","Reason":"Setup complete","UniqueId":"id1","Data":"OK"}' \
      "$WAIT_HANDLE_URL"
```

## Accessing WaitCondition Data

A neat feature of WaitConditions is that you can access data sent in signals. The WaitCondition's Data attribute contains a JSON object mapping UniqueId to Data values.

```yaml
# Accessing data from WaitCondition signals in other resources
Resources:
  WaitHandle:
    Type: AWS::CloudFormation::WaitConditionHandle

  WaitCondition:
    Type: AWS::CloudFormation::WaitCondition
    Properties:
      Handle: !Ref WaitHandle
      Timeout: "600"
      Count: 1

Outputs:
  SignalData:
    # Returns the data sent with the signal
    Value: !GetAtt WaitCondition.Data
```

If a signal was sent with `"UniqueId": "server1"` and `"Data": "10.0.1.50"`, you could extract it with `Fn::Select` and `Fn::GetAtt`.

## When to Use Which

Here's the decision framework.

**Use CreationPolicy when:**
- You're signaling from EC2 instances or Auto Scaling Groups
- The signal source is the resource itself
- You want simpler syntax
- You're working with cfn-init and cfn-signal

**Use WaitCondition when:**
- You need to signal from external processes (Lambda, external systems)
- You need to pass data back through the signal
- You need to coordinate resources that aren't EC2 instances or ASGs
- You need the signal URL to be passed to another system

## Common Mistakes

The most common mistake is setting the timeout too low. If your bootstrap process takes 12 minutes on average, don't set a 15-minute timeout. Network hiccups, slow package mirrors, or a busy availability zone can push it over. Give yourself at least 50% headroom.

Another gotcha: if cfn-signal runs before the CreationPolicy is evaluated, the signal is lost. Make sure cfn-signal points at the right resource name.

```bash
# Common mistake: signaling the wrong resource
# WRONG - signals the launch template instead of the ASG
/opt/aws/bin/cfn-signal -e $? --resource MyLaunchTemplate ...

# RIGHT - signals the ASG that has the CreationPolicy
/opt/aws/bin/cfn-signal -e $? --resource MyASG ...
```

Finally, remember that failure signals trigger immediate rollback. If any instance sends `-e 1` (failure), CloudFormation doesn't wait for other signals - it starts rolling back right away.

For more on working with helper scripts that pair with these mechanisms, check out the post on [cfn-init and cfn-signal](https://oneuptime.com/blog/post/2026-02-12-cloudformation-helper-scripts-cfn-init-cfn-signal/view). And if you're validating your templates before deployment, [cfn-lint](https://oneuptime.com/blog/post/2026-02-12-cloudformation-linter-cfn-lint/view) can catch issues with your WaitConditions and CreationPolicies before you even try to deploy.
