# How to Fix CloudFormation Circular Dependency Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudFormation, DevOps, Infrastructure as Code

Description: Understand and resolve CloudFormation circular dependency errors by restructuring resource references, using DependsOn wisely, and breaking dependency cycles.

---

CloudFormation analyzes your template before deploying anything. It builds a dependency graph of all your resources to figure out the correct creation order. When it detects that Resource A depends on Resource B, which depends on Resource C, which depends back on Resource A, it throws a circular dependency error and refuses to deploy.

The error typically looks like: `Circular dependency between resources: [SecurityGroup, LaunchTemplate, SecurityGroupIngress]`.

This is actually CloudFormation doing you a favor. If it tried to create these resources, it would deadlock since each one needs the others to exist first.

## How Dependencies Are Created

Before you can fix circular dependencies, you need to understand how they form. CloudFormation creates dependencies in several ways:

1. **Ref** and **Fn::GetAtt** - If Resource A uses `!Ref ResourceB`, then A depends on B
2. **DependsOn** - Explicit dependency declarations
3. **Fn::Sub** with resource references - Same as Ref
4. **Condition dependencies** - When conditions reference other resources

The problem usually isn't that you intentionally created a cycle. It's that the implicit dependencies from `!Ref` and `!GetAtt` create a cycle you didn't expect.

## The Classic Security Group Cycle

The most common circular dependency involves security groups that reference each other:

```yaml
# This creates a circular dependency
Resources:
  AppSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: App servers
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 8080
          ToPort: 8080
          SourceSecurityGroupId: !Ref LBSecurityGroup  # Depends on LB SG

  LBSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Load balancer
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          CidrIp: 0.0.0.0/0
      SecurityGroupEgress:
        - IpProtocol: tcp
          FromPort: 8080
          ToPort: 8080
          DestinationSecurityGroupId: !Ref AppSecurityGroup  # Depends on App SG
```

Here, `AppSecurityGroup` references `LBSecurityGroup`, and `LBSecurityGroup` references `AppSecurityGroup`. Classic circular dependency.

The fix is to break one of the inline rules out into a separate resource:

```yaml
# Fixed: use separate SecurityGroupIngress/Egress resources
Resources:
  AppSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: App servers

  LBSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Load balancer
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          CidrIp: 0.0.0.0/0

  # Break the cycle by making ingress a separate resource
  AppIngressFromLB:
    Type: AWS::EC2::SecurityGroupIngress
    Properties:
      GroupId: !Ref AppSecurityGroup
      IpProtocol: tcp
      FromPort: 8080
      ToPort: 8080
      SourceSecurityGroupId: !Ref LBSecurityGroup

  LBEgressToApp:
    Type: AWS::EC2::SecurityGroupEgress
    Properties:
      GroupId: !Ref LBSecurityGroup
      IpProtocol: tcp
      FromPort: 8080
      ToPort: 8080
      DestinationSecurityGroupId: !Ref AppSecurityGroup
```

Now each security group is created first (with no cross-references), and the ingress/egress rules are added afterward.

## Lambda and IAM Role Cycles

Another common pattern is when a Lambda function references an IAM role, and the IAM role's policy references the Lambda function (e.g., for resource-based policies):

```yaml
# Circular: Lambda needs the role, role policy references the Lambda
Resources:
  MyFunction:
    Type: AWS::Lambda::Function
    Properties:
      Role: !GetAtt MyRole.Arn
      Runtime: python3.12
      Handler: index.handler
      Code:
        ZipFile: |
          def handler(event, context):
              return "hello"

  MyRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
            Action: sts:AssumeRole
      Policies:
        - PolicyName: InvokePolicy
          PolicyDocument:
            Statement:
              - Effect: Allow
                Action: lambda:InvokeFunction
                Resource: !GetAtt MyFunction.Arn  # Creates the cycle
```

Fix this by using a wildcard or by separating the policy:

```yaml
# Fixed: separate the policy into its own resource
Resources:
  MyFunction:
    Type: AWS::Lambda::Function
    Properties:
      Role: !GetAtt MyRole.Arn
      Runtime: python3.12
      Handler: index.handler
      Code:
        ZipFile: |
          def handler(event, context):
              return "hello"

  MyRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
            Action: sts:AssumeRole

  # Policy is a separate resource that depends on both
  MyPolicy:
    Type: AWS::IAM::Policy
    Properties:
      PolicyName: InvokePolicy
      Roles:
        - !Ref MyRole
      PolicyDocument:
        Statement:
          - Effect: Allow
            Action: lambda:InvokeFunction
            Resource: !GetAtt MyFunction.Arn
```

## EC2 Instance and EIP Cycle

This happens when an EC2 instance references an Elastic IP and the EIP association references the instance:

```yaml
# Fixed using separate EIPAssociation resource
Resources:
  MyInstance:
    Type: AWS::EC2::Instance
    Properties:
      InstanceType: t3.micro
      ImageId: ami-12345678

  MyEIP:
    Type: AWS::EC2::EIP

  EIPAssociation:
    Type: AWS::EC2::EIPAssociation
    Properties:
      InstanceId: !Ref MyInstance
      AllocationId: !GetAtt MyEIP.AllocationId
```

## Debugging Complex Cycles

For templates with many resources, identifying the cycle can be tricky. CloudFormation tells you which resources are involved, but in a large template, the chain might not be obvious.

A useful technique is to draw out the dependency graph:

```bash
# Use cfn-lint to catch dependency issues before deploying
pip install cfn-lint
cfn-lint template.yaml
```

You can also manually trace dependencies by searching for all `!Ref` and `!GetAtt` references in your template:

```bash
# Find all resource references in a template
grep -n '!Ref\|!GetAtt\|Fn::Ref\|Fn::GetAtt\|DependsOn' template.yaml
```

## General Strategy for Breaking Cycles

The strategy is always the same:

1. Identify the cycle from the error message
2. Find the references that create the cycle
3. Break one of the references by extracting it into a separate resource

The separate resource will depend on both of the original resources (which is fine, since that's a tree, not a cycle). The original resources no longer depend on each other directly.

Think of it like this: instead of A depending on B and B depending on A, you create C that depends on both A and B, with neither A nor B depending on each other.

## Avoiding Unnecessary DependsOn

Sometimes people add `DependsOn` declarations that aren't needed, and those create cycles. Only use `DependsOn` when there's a real dependency that isn't already captured by `!Ref` or `!GetAtt`.

```yaml
# Don't do this - the Ref already creates the dependency
Resources:
  MySubnet:
    Type: AWS::EC2::Subnet
    DependsOn: MyVPC  # Unnecessary - VpcId: !Ref MyVPC already handles this
    Properties:
      VpcId: !Ref MyVPC
      CidrBlock: 10.0.1.0/24
```

Remove any `DependsOn` that duplicates an existing reference dependency. Less `DependsOn` means fewer chances for accidental cycles.

For tracking issues like these in your infrastructure deployments, having [proper monitoring](https://oneuptime.com/blog/post/fix-cloudformation-create-failed-stack-errors/view) in place helps you catch template problems early.

## Summary

Circular dependencies in CloudFormation happen when resources reference each other in a loop. The fix is always to break the cycle by extracting one of the cross-references into a separate resource. Security groups are the most common culprit, followed by Lambda-IAM combinations. Use `cfn-lint` to catch these before deploying, and remove unnecessary `DependsOn` declarations that can create hidden cycles.
