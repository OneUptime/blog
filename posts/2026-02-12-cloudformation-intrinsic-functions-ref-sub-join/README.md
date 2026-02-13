# How to Use CloudFormation Intrinsic Functions (Ref, Fn::Sub, Fn::Join)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudFormation, Infrastructure as Code, DevOps

Description: Master the most commonly used CloudFormation intrinsic functions including Ref, Fn::Sub, and Fn::Join with practical examples and patterns.

---

CloudFormation intrinsic functions are the glue that holds templates together. Without them, you'd be hard-coding everything - account IDs, resource ARNs, connection strings. The three functions you'll use on almost every template are `Ref`, `Fn::Sub`, and `Fn::Join`. Let's dig into each one.

## Ref - The Basic Reference

`Ref` is the simplest intrinsic function. It returns the value of a parameter or the physical ID of a resource.

For parameters, it returns the parameter value:

```yaml
# Ref returns parameter values
Parameters:
  Environment:
    Type: String
    Default: dev

Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      # !Ref Environment returns "dev" (or whatever was passed)
      BucketName: !Ref Environment
```

For resources, `Ref` returns the resource's "primary identifier" - which varies by resource type:

```yaml
# Ref returns different things for different resource types
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    # !Ref MyBucket returns the bucket name

  MyInstance:
    Type: AWS::EC2::Instance
    # !Ref MyInstance returns the instance ID (i-0abc123...)

  MySecurityGroup:
    Type: AWS::EC2::SecurityGroup
    # !Ref MySecurityGroup returns the security group ID (sg-0abc123...)

  MyTopic:
    Type: AWS::SNS::Topic
    # !Ref MyTopic returns the topic ARN
```

What `Ref` returns for common resource types:

| Resource Type | Ref Returns |
|---|---|
| `AWS::S3::Bucket` | Bucket name |
| `AWS::EC2::Instance` | Instance ID |
| `AWS::EC2::SecurityGroup` | Security group ID |
| `AWS::EC2::VPC` | VPC ID |
| `AWS::EC2::Subnet` | Subnet ID |
| `AWS::SNS::Topic` | Topic ARN |
| `AWS::SQS::Queue` | Queue URL |
| `AWS::IAM::Role` | Role name |
| `AWS::Lambda::Function` | Function name |

When you need something other than what `Ref` returns (like the ARN of an S3 bucket), use `Fn::GetAtt` instead.

## Pseudo Parameters

CloudFormation provides pseudo parameters that you reference with `Ref`:

```yaml
# Pseudo parameters give you account and region info
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      # Uses the account ID and region to create a unique name
      BucketName: !Sub 'my-app-${AWS::AccountId}-${AWS::Region}'
      Tags:
        - Key: Account
          Value: !Ref AWS::AccountId
        - Key: Region
          Value: !Ref AWS::Region
        - Key: Stack
          Value: !Ref AWS::StackName
```

Available pseudo parameters:

| Pseudo Parameter | Returns |
|---|---|
| `AWS::AccountId` | The AWS account ID (e.g., 123456789012) |
| `AWS::Region` | The region (e.g., us-east-1) |
| `AWS::StackId` | The stack ID (full ARN) |
| `AWS::StackName` | The stack name |
| `AWS::URLSuffix` | The domain suffix (amazonaws.com) |
| `AWS::NoValue` | Used to remove a property conditionally |
| `AWS::Partition` | The partition (aws, aws-cn, aws-us-gov) |

## Fn::Sub - String Substitution

`Fn::Sub` (shorthand `!Sub`) replaces variables in a string with their values. It's the most convenient way to build dynamic strings.

Simple usage with just variable references:

```yaml
# Fn::Sub replaces ${Variable} with actual values
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub '${AWS::StackName}-data-${AWS::Region}'
      # If stack name is "myapp" and region is "us-east-1"
      # Result: "myapp-data-us-east-1"
```

With parameter and resource references:

```yaml
# Sub can reference parameters and resources
Parameters:
  Environment:
    Type: String
    Default: prod

Resources:
  AppBucket:
    Type: AWS::S3::Bucket

  LogGroup:
    Type: AWS::Logs::LogGroup
    Properties:
      # References both a parameter and a resource
      LogGroupName: !Sub '/aws/app/${Environment}/${AppBucket}'
```

The powerful second form takes a mapping of variable names to values:

```yaml
# Sub with explicit variable mapping
Resources:
  LambdaFunction:
    Type: AWS::Lambda::Function
    Properties:
      Environment:
        Variables:
          # The second argument maps variable names to values
          CONNECTION_STRING: !Sub
            - 'postgresql://${User}:${Pass}@${Host}:${Port}/${DB}'
            - User: !Ref DBUsername
              Pass: !Ref DBPassword
              Host: !GetAtt Database.Endpoint.Address
              Port: !GetAtt Database.Endpoint.Port
              DB: !Ref DBName
```

This form is especially useful when you need to reference `GetAtt` values or construct complex strings.

## Fn::Join - String Concatenation

`Fn::Join` concatenates a list of strings with a delimiter:

```yaml
# Join a list of values with a delimiter
Resources:
  SecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: !Join
        - ' '
        - - 'Security group for'
          - !Ref Environment
          - 'environment in'
          - !Ref AWS::Region
      # Result: "Security group for prod environment in us-east-1"
```

Join with an empty delimiter for plain concatenation:

```yaml
# Empty delimiter joins strings directly
Outputs:
  WebsiteURL:
    Value: !Join
      - ''
      - - 'https://'
        - !GetAtt Distribution.DomainName
        - '/index.html'
```

Join is also useful for creating comma-separated lists:

```yaml
# Create a comma-separated string from individual values
Outputs:
  SubnetList:
    Value: !Join
      - ','
      - - !Ref PublicSubnet1
        - !Ref PublicSubnet2
        - !Ref PrivateSubnet1
        - !Ref PrivateSubnet2
```

## Fn::Sub vs Fn::Join

In most cases, `Fn::Sub` is cleaner than `Fn::Join`:

```yaml
# Using Join - verbose
BucketName: !Join
  - '-'
  - - 'myapp'
    - !Ref Environment
    - !Ref AWS::AccountId

# Using Sub - cleaner, same result
BucketName: !Sub 'myapp-${Environment}-${AWS::AccountId}'
```

Use `Join` when you're building a list that naturally needs a delimiter. Use `Sub` when you're building a string with embedded variables.

## Combining Functions

These functions can be nested inside each other:

```yaml
# Nesting intrinsic functions for complex values
Resources:
  BucketPolicy:
    Type: AWS::S3::BucketPolicy
    Properties:
      Bucket: !Ref DataBucket
      PolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              AWS: !Sub 'arn:${AWS::Partition}:iam::${AWS::AccountId}:role/${RoleName}'
            Action:
              - s3:GetObject
            Resource: !Join
              - ''
              - - !GetAtt DataBucket.Arn
                - '/*'
```

## Practical Patterns

Building IAM policy ARNs:

```yaml
# Construct ARNs dynamically
PolicyDocument:
  Statement:
    - Effect: Allow
      Action: 's3:GetObject'
      Resource: !Sub 'arn:${AWS::Partition}:s3:::${BucketName}/*'
    - Effect: Allow
      Action: 'dynamodb:GetItem'
      Resource: !Sub 'arn:${AWS::Partition}:dynamodb:${AWS::Region}:${AWS::AccountId}:table/${TableName}'
```

Building user data scripts for EC2:

```yaml
# EC2 user data with Sub for variable injection
UserData:
  Fn::Base64:
    !Sub |
      #!/bin/bash
      yum update -y
      echo "Environment: ${Environment}" >> /etc/app/config
      echo "Region: ${AWS::Region}" >> /etc/app/config
      echo "Stack: ${AWS::StackName}" >> /etc/app/config
      aws s3 cp s3://${ConfigBucket}/app.conf /etc/app/
      systemctl start myapp
```

Building endpoint URLs:

```yaml
# Construct application URLs
Outputs:
  ApiEndpoint:
    Value: !Sub 'https://${ApiGateway}.execute-api.${AWS::Region}.${AWS::URLSuffix}/${StageName}'

  DatabaseConnection:
    Value: !Sub
      - 'mysql://${Host}:${Port}/mydb'
      - Host: !GetAtt Database.Endpoint.Address
        Port: !GetAtt Database.Endpoint.Port
```

## Common Mistakes

**Forgetting quotes around Sub strings.** YAML interprets `${` as a special character. Always quote `!Sub` strings:

```yaml
# Wrong - YAML parser will choke on this
BucketName: !Sub ${Environment}-bucket

# Right - quoted string
BucketName: !Sub '${Environment}-bucket'
```

**Using Ref when you need GetAtt.** `Ref` returns the primary ID, not the ARN or other attributes. Check the docs for what each resource type's `Ref` returns.

**Over-nesting functions.** If your expression looks like a LISP program, there's probably a cleaner way. Usually `Fn::Sub` with a variable mapping can flatten deeply nested expressions.

These three functions form the core of CloudFormation template authoring. Master them and you'll handle 90% of the dynamic values you need. For the remaining edge cases, look into [Fn::Select and Fn::Split](https://oneuptime.com/blog/post/2026-02-12-cloudformation-fn-select-fn-split-functions/view) and [Fn::If and Fn::Equals](https://oneuptime.com/blog/post/2026-02-12-cloudformation-fn-if-fn-equals-conditional-logic/view).
