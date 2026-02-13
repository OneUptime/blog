# How to Use CloudFormation Fn::If and Fn::Equals for Conditional Logic

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudFormation, Infrastructure as Code, DevOps

Description: Learn how to use Fn::If and Fn::Equals in CloudFormation to implement conditional logic for resource properties, values, and template behavior.

---

CloudFormation isn't a programming language, but it gives you just enough conditional logic to handle the real-world complexity of multi-environment deployments. `Fn::Equals` evaluates comparisons, and `Fn::If` acts as a ternary operator. Together, they let you vary template behavior without maintaining separate templates.

## Fn::Equals - The Comparison Function

`Fn::Equals` compares two values and returns true or false. It's used exclusively in the `Conditions` section:

```yaml
# Fn::Equals compares two values
Conditions:
  # Simple comparison - is the environment "prod"?
  IsProduction: !Equals [!Ref Environment, prod]

  # Compare with a pseudo parameter
  IsUsEast: !Equals [!Ref 'AWS::Region', us-east-1]

  # Compare two parameters
  SameVPC: !Equals [!Ref PrimaryVPC, !Ref SecondaryVPC]
```

A few important things about `Fn::Equals`:

- It only works in the `Conditions` section
- It compares exactly two values
- Comparison is case-sensitive
- Both values must be strings (numbers are coerced to strings)

## Fn::If - The Ternary Operator

`Fn::If` takes a condition name and returns one of two values:

```yaml
# Fn::If returns different values based on a condition
Conditions:
  IsProduction: !Equals [!Ref Environment, prod]

Resources:
  Database:
    Type: AWS::RDS::DBInstance
    Properties:
      # If production, use r5.large; otherwise use t3.micro
      DBInstanceClass: !If [IsProduction, db.r5.large, db.t3.micro]
      AllocatedStorage: !If [IsProduction, '100', '20']
      MultiAZ: !If [IsProduction, true, false]
```

The syntax is `!If [ConditionName, ValueIfTrue, ValueIfFalse]`. Note that `ConditionName` is a string referencing a condition - not an inline expression.

## Building Complex Conditions

You can combine conditions using `Fn::And`, `Fn::Or`, and `Fn::Not`:

```yaml
# Composing conditions with logical operators
Parameters:
  Environment:
    Type: String
    AllowedValues: [dev, staging, prod]
  EnableHA:
    Type: String
    AllowedValues: ['true', 'false']
    Default: 'false'

Conditions:
  IsProduction: !Equals [!Ref Environment, prod]
  IsDev: !Equals [!Ref Environment, dev]
  IsStaging: !Equals [!Ref Environment, staging]
  IsNotDev: !Not [!Equals [!Ref Environment, dev]]
  HARequested: !Equals [!Ref EnableHA, 'true']

  # Production OR HA was explicitly requested
  ShouldEnableHA: !Or
    - !Condition IsProduction
    - !Condition HARequested

  # Production AND in us-east-1
  ProdUsEast: !And
    - !Condition IsProduction
    - !Equals [!Ref 'AWS::Region', us-east-1]

  # Not dev AND not staging (same as IsProduction, but shows composition)
  IsUpperEnvironment: !And
    - !Not [!Condition IsDev]
    - !Not [!Condition IsStaging]
```

## Conditionally Creating Resources

Add the `Condition` key to a resource to make its creation conditional:

```yaml
# Resource-level condition controls whether it exists at all
Conditions:
  IsProduction: !Equals [!Ref Environment, prod]
  IsNotDev: !Not [!Equals [!Ref Environment, dev]]

Resources:
  # Always created
  ApplicationBucket:
    Type: AWS::S3::Bucket

  # Only in production
  ReplicationBucket:
    Type: AWS::S3::Bucket
    Condition: IsProduction
    Properties:
      BucketName: !Sub '${AWS::StackName}-replication'

  # In staging and production (not dev)
  WAFWebACL:
    Type: AWS::WAFv2::WebACL
    Condition: IsNotDev
    Properties:
      Name: !Sub '${Environment}-waf'
      Scope: REGIONAL
      DefaultAction:
        Allow: {}
      VisibilityConfig:
        SampledRequestsEnabled: true
        CloudWatchMetricsEnabled: true
        MetricName: !Sub '${Environment}-waf'
```

## Using Fn::If in Resource Properties

This is where `Fn::If` really shines - adapting resource configuration based on conditions:

```yaml
# Vary properties within a single resource
Conditions:
  IsProduction: !Equals [!Ref Environment, prod]

Resources:
  AutoScalingGroup:
    Type: AWS::AutoScaling::AutoScalingGroup
    Properties:
      MinSize: !If [IsProduction, '3', '1']
      MaxSize: !If [IsProduction, '20', '3']
      DesiredCapacity: !If [IsProduction, '3', '1']
      HealthCheckType: !If [IsProduction, ELB, EC2]
      HealthCheckGracePeriod: !If [IsProduction, 300, 60]
```

## AWS::NoValue - Conditionally Remove Properties

Sometimes you don't want a property to exist at all when a condition is false. `AWS::NoValue` removes the property:

```yaml
# Use AWS::NoValue to conditionally remove a property entirely
Conditions:
  IsProduction: !Equals [!Ref Environment, prod]
  HasAlarmTopic: !Not [!Equals [!Ref AlarmTopicArn, '']]

Resources:
  Database:
    Type: AWS::RDS::DBInstance
    Properties:
      DBInstanceClass: db.t3.micro
      Engine: mysql
      MasterUsername: admin
      MasterUserPassword: !Ref DBPassword
      # Only add StorageEncrypted in production; remove property entirely in dev
      StorageEncrypted: !If [IsProduction, true, !Ref 'AWS::NoValue']
      # Only add KmsKeyId if encryption is enabled
      KmsKeyId: !If [IsProduction, !Ref KMSKey, !Ref 'AWS::NoValue']
```

When the condition is false, `AWS::NoValue` tells CloudFormation to act as if the property wasn't specified at all. This is different from setting it to null or empty string - the property literally doesn't exist, so CloudFormation uses the service's default.

## Nested If Expressions

You can nest `Fn::If` for multiple conditions, though it gets ugly fast:

```yaml
# Nested If for three-way branching
Conditions:
  IsDev: !Equals [!Ref Environment, dev]
  IsStaging: !Equals [!Ref Environment, staging]

Resources:
  Instance:
    Type: AWS::EC2::Instance
    Properties:
      # dev -> t3.micro, staging -> t3.small, else (prod) -> t3.large
      InstanceType: !If
        - IsDev
        - t3.micro
        - !If
          - IsStaging
          - t3.small
          - t3.large
```

For more than two branches, [mappings](https://oneuptime.com/blog/post/2026-02-12-cloudformation-mappings-region-specific-values/view) are usually cleaner:

```yaml
# Mappings are cleaner for multi-branch selection
Mappings:
  InstanceSizes:
    dev:
      Type: t3.micro
    staging:
      Type: t3.small
    prod:
      Type: t3.large

Resources:
  Instance:
    Type: AWS::EC2::Instance
    Properties:
      InstanceType: !FindInMap [InstanceSizes, !Ref Environment, Type]
```

## Conditional Outputs

```yaml
# Only include outputs when the condition is true
Conditions:
  IsProduction: !Equals [!Ref Environment, prod]

Outputs:
  # Always present
  BucketName:
    Value: !Ref ApplicationBucket

  # Only present in production
  ReplicationBucketName:
    Condition: IsProduction
    Value: !Ref ReplicationBucket
    Export:
      Name: !Sub '${AWS::StackName}-ReplicationBucket'

  # Different values based on condition
  DatabaseEndpoint:
    Value: !If
      - IsProduction
      - !GetAtt ProdDatabase.Endpoint.Address
      - !GetAtt DevDatabase.Endpoint.Address
```

## A Complete Real-World Example

Here's a template that deploys a Lambda function with environment-specific configuration:

```yaml
# Lambda deployment with conditional configuration
AWSTemplateFormatVersion: '2010-09-09'
Description: Lambda function with environment-specific settings

Parameters:
  Environment:
    Type: String
    AllowedValues: [dev, staging, prod]
  EnableTracing:
    Type: String
    Default: 'false'
    AllowedValues: ['true', 'false']

Conditions:
  IsProduction: !Equals [!Ref Environment, prod]
  IsNotDev: !Not [!Equals [!Ref Environment, dev]]
  TracingEnabled: !Or
    - !Condition IsProduction
    - !Equals [!Ref EnableTracing, 'true']

Resources:
  LambdaFunction:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: !Sub '${Environment}-data-processor'
      Runtime: python3.12
      Handler: index.handler
      MemorySize: !If [IsProduction, 1024, 256]
      Timeout: !If [IsProduction, 300, 60]
      ReservedConcurrentExecutions: !If [IsProduction, 100, !Ref 'AWS::NoValue']
      TracingConfig:
        Mode: !If [TracingEnabled, Active, PassThrough]
      Environment:
        Variables:
          ENV: !Ref Environment
          LOG_LEVEL: !If [IsProduction, WARN, DEBUG]
      Code:
        ZipFile: |
          def handler(event, context):
              return {"statusCode": 200}
      Role: !GetAtt LambdaRole.Arn

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

  # Dead letter queue - only in production
  DLQ:
    Type: AWS::SQS::Queue
    Condition: IsProduction
    Properties:
      QueueName: !Sub '${Environment}-data-processor-dlq'
      MessageRetentionPeriod: 1209600

  # CloudWatch alarm - staging and production only
  ErrorAlarm:
    Type: AWS::CloudWatch::Alarm
    Condition: IsNotDev
    Properties:
      AlarmName: !Sub '${Environment}-lambda-errors'
      MetricName: Errors
      Namespace: AWS/Lambda
      Statistic: Sum
      Period: 300
      EvaluationPeriods: 1
      Threshold: 5
      ComparisonOperator: GreaterThanThreshold
      Dimensions:
        - Name: FunctionName
          Value: !Ref LambdaFunction

Outputs:
  FunctionArn:
    Value: !GetAtt LambdaFunction.Arn
  DLQUrl:
    Condition: IsProduction
    Value: !Ref DLQ
```

## Tips and Best Practices

**Keep condition names readable.** `IsProduction` and `ShouldEnableMultiAZ` are much better than `Cond1` or `MyCondition`.

**Don't over-nest Fn::If.** If you're more than two levels deep, use mappings or split into separate templates. Nested ternaries are hard to read in any language.

**Remember AWS::NoValue.** It's the clean way to optionally include a property. Setting a property to empty string is not the same as removing it.

**Test both branches.** Deploy with conditions evaluating to both true and false. Broken references hiding behind a false condition will bite you eventually.

**Use conditions for resources, If for properties.** The resource-level `Condition` key controls existence. `Fn::If` in properties controls configuration.

For more on conditional resource creation, see our post on [CloudFormation conditions](https://oneuptime.com/blog/post/2026-02-12-cloudformation-conditions-conditional-resources/view). And for the broader picture of intrinsic functions, check out [Ref, Fn::Sub, and Fn::Join](https://oneuptime.com/blog/post/2026-02-12-cloudformation-intrinsic-functions-ref-sub-join/view).
