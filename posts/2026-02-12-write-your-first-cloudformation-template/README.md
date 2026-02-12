# How to Write Your First CloudFormation Template

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudFormation, Infrastructure as Code, DevOps

Description: Learn how to write your first AWS CloudFormation template from scratch, covering template anatomy, resource definitions, and deploying a simple S3 bucket stack.

---

If you've been clicking around the AWS Console creating resources by hand, you already know the pain. One wrong click, one forgotten setting, and suddenly your staging environment doesn't match production. AWS CloudFormation fixes that by letting you define your infrastructure in code - a template file that describes exactly what you want AWS to build.

This guide walks you through writing your very first CloudFormation template. We'll keep it practical and build something real.

## What is CloudFormation?

CloudFormation is AWS's native Infrastructure as Code (IaC) service. You write a template - either in JSON or YAML - that describes the AWS resources you want. CloudFormation reads that template and creates, updates, or deletes resources to match what you've described.

The big benefits are:

- **Repeatability**: Deploy the same infrastructure across multiple environments
- **Version control**: Track infrastructure changes in Git just like application code
- **Consistency**: Eliminate manual configuration errors
- **Cleanup**: Delete an entire stack of resources with one command

## Template Anatomy

Every CloudFormation template has a specific structure. Here's what each section does:

```yaml
# The template format version - always use this date
AWSTemplateFormatVersion: '2010-09-09'

# A human-readable description of what this template does
Description: My first CloudFormation template

# Input variables that make templates reusable
Parameters:
  # ... parameters go here

# Lookup tables for conditional values
Mappings:
  # ... mappings go here

# Boolean logic for conditional resource creation
Conditions:
  # ... conditions go here

# The actual AWS resources to create (this is the only required section)
Resources:
  # ... resources go here

# Values to return after stack creation
Outputs:
  # ... outputs go here
```

The only section that's actually required is `Resources`. Everything else is optional. But in practice, you'll use most of these sections as your templates grow.

## Writing Your First Template

Let's start with something simple - an S3 bucket. Create a file called `my-first-template.yaml`:

```yaml
# A minimal CloudFormation template that creates an S3 bucket
AWSTemplateFormatVersion: '2010-09-09'
Description: Creates a simple S3 bucket with versioning enabled

Resources:
  MyS3Bucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: my-first-cfn-bucket-12345
      VersioningConfiguration:
        Status: Enabled
      Tags:
        - Key: Environment
          Value: Development
        - Key: ManagedBy
          Value: CloudFormation
```

Let's break this down:

- `MyS3Bucket` is the logical name. It's how CloudFormation refers to this resource internally. You pick the name.
- `Type: AWS::S3::Bucket` tells CloudFormation what kind of AWS resource to create.
- `Properties` contains the configuration for that resource. Different resource types have different properties.

## Adding More Resources

A single S3 bucket isn't very exciting. Let's add a bucket policy that makes the bucket private and an IAM role that can read from it:

```yaml
# Template with S3 bucket, bucket policy, and IAM role
AWSTemplateFormatVersion: '2010-09-09'
Description: S3 bucket with a read-only IAM role

Resources:
  MyS3Bucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: my-app-data-bucket-12345
      VersioningConfiguration:
        Status: Enabled
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        BlockPublicPolicy: true
        IgnorePublicAcls: true
        RestrictPublicBuckets: true

  BucketPolicy:
    Type: AWS::S3::BucketPolicy
    Properties:
      Bucket: !Ref MyS3Bucket
      PolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Sid: AllowReadAccess
            Effect: Allow
            Principal:
              AWS: !GetAtt ReadOnlyRole.Arn
            Action:
              - s3:GetObject
              - s3:ListBucket
            Resource:
              - !GetAtt MyS3Bucket.Arn
              - !Sub '${MyS3Bucket.Arn}/*'

  ReadOnlyRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: S3ReadOnlyRole
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: ec2.amazonaws.com
            Action: sts:AssumeRole
```

Notice the `!Ref` and `!GetAtt` functions. These are CloudFormation intrinsic functions that let resources reference each other. `!Ref MyS3Bucket` returns the bucket name, while `!GetAtt MyS3Bucket.Arn` returns the bucket's ARN. CloudFormation figures out the dependency order automatically.

## Making Templates Flexible with Parameters

Hard-coded values like bucket names are a problem. You can't deploy the same template twice because names would collide. Parameters solve this:

```yaml
# Template with parameters for flexibility
AWSTemplateFormatVersion: '2010-09-09'
Description: Parameterized S3 bucket template

Parameters:
  Environment:
    Type: String
    Default: dev
    AllowedValues:
      - dev
      - staging
      - prod
    Description: The deployment environment

  BucketSuffix:
    Type: String
    Description: A unique suffix for the bucket name

Resources:
  MyS3Bucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub 'my-app-${Environment}-${BucketSuffix}'
      Tags:
        - Key: Environment
          Value: !Ref Environment
```

The `!Sub` function handles string interpolation. When you deploy this template, CloudFormation will ask you to provide values for `Environment` and `BucketSuffix`.

## Common Resource Types

Here are the resource types you'll use most often when starting out:

| Resource Type | What It Creates |
|---|---|
| `AWS::S3::Bucket` | S3 storage bucket |
| `AWS::EC2::Instance` | EC2 virtual machine |
| `AWS::EC2::SecurityGroup` | Firewall rules for EC2 |
| `AWS::EC2::VPC` | Virtual private network |
| `AWS::IAM::Role` | IAM role for permissions |
| `AWS::Lambda::Function` | Serverless function |
| `AWS::RDS::DBInstance` | Relational database |
| `AWS::SNS::Topic` | Notification topic |
| `AWS::SQS::Queue` | Message queue |

You can find the complete list and all available properties in the [AWS CloudFormation Resource Reference](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-template-resource-type-ref.html).

## YAML vs JSON

CloudFormation supports both YAML and JSON. YAML is the popular choice because it's more readable and supports comments. Here's the same resource in both formats:

```yaml
# YAML version - cleaner and supports comments
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: my-bucket
```

```json
{
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket",
      "Properties": {
        "BucketName": "my-bucket"
      }
    }
  }
}
```

Stick with YAML unless your tooling requires JSON. It's less noisy and easier to maintain.

## Deploying Your Template

Once your template file is ready, you can deploy it through the AWS Console or the CLI. Here's the CLI approach:

```bash
# Deploy the template as a new stack
aws cloudformation create-stack \
  --stack-name my-first-stack \
  --template-body file://my-first-template.yaml \
  --parameters ParameterKey=Environment,ParameterValue=dev \
               ParameterKey=BucketSuffix,ParameterValue=abc123

# Wait for the stack to finish creating
aws cloudformation wait stack-create-complete \
  --stack-name my-first-stack

# Check the stack status
aws cloudformation describe-stacks \
  --stack-name my-first-stack
```

For a deeper dive into CLI deployment, check out our guide on [deploying CloudFormation templates with the AWS CLI](https://oneuptime.com/blog/post/deploy-cloudformation-templates-aws-cli/view).

## Tips for Beginners

**Start small.** Don't try to template your entire infrastructure on day one. Pick one resource, get it working, and expand from there.

**Use the AWS docs.** Every resource type has a documentation page listing all available properties. Bookmark it.

**Validate before deploying.** Run `aws cloudformation validate-template` to catch syntax errors before you waste time on a failed deployment. We've got a full post on [validating CloudFormation templates](https://oneuptime.com/blog/post/validate-cloudformation-templates-before-deployment/view) if you want the details.

**Name your resources descriptively.** Logical names like `MyS3Bucket` are fine for tutorials, but in real projects use names like `ApplicationDataBucket` or `UserUploadsBucket`.

**Tag everything.** Tags help you track costs and ownership. Always include at minimum an `Environment` tag and a `ManagedBy: CloudFormation` tag.

## What's Next?

You've written your first template, and you understand the basic structure. From here, you'll want to explore [CloudFormation parameters](https://oneuptime.com/blog/post/cloudformation-parameters-reusable-templates/view) for building reusable templates, [outputs and exports](https://oneuptime.com/blog/post/cloudformation-outputs-export-values/view) for sharing values between stacks, and [nested stacks](https://oneuptime.com/blog/post/cloudformation-nested-stacks/view) for organizing large deployments.

CloudFormation has a learning curve, but once you get comfortable with templates, you'll never want to go back to clicking through the console. Your infrastructure becomes reviewable, repeatable, and reliable - and that's worth the investment.
