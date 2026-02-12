# How to Use CloudFormation Mappings for Region-Specific Values

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudFormation, Infrastructure as Code, Multi-Region

Description: Learn how to use CloudFormation Mappings to create templates that automatically adapt to different AWS regions and environments.

---

Different AWS regions have different AMI IDs. Different environments need different instance sizes. You could handle this with a pile of parameters, but that pushes complexity onto whoever is deploying the template. Mappings are the cleaner solution - they let you bake a lookup table directly into your template.

## What Are Mappings?

Mappings are static key-value lookup tables defined in your CloudFormation template. You define the data upfront, then look up values based on keys at deploy time. Think of them as a dictionary or hash map embedded in your template.

Here's the basic structure:

```yaml
# Mappings define a two-level lookup table
Mappings:
  TopLevelKey:
    SecondLevelKey:
      ValueName: the-actual-value
```

You access values using the `Fn::FindInMap` intrinsic function (or `!FindInMap` in YAML shorthand):

```yaml
# Look up a value from the mapping
!FindInMap [TopLevelKey, SecondLevelKey, ValueName]
```

## The Classic Use Case: Region-Specific AMI IDs

Every AWS region has different AMI IDs for the same operating system image. This is the most common reason people reach for mappings:

```yaml
# Map AMI IDs per region so the template works everywhere
AWSTemplateFormatVersion: '2010-09-09'
Description: EC2 instance with region-specific AMI mapping

Mappings:
  RegionAMI:
    us-east-1:
      HVM64: ami-0c02fb55956c7d316
      HVM32: ami-0b5eea76982371e91
    us-west-2:
      HVM64: ami-00ee4df451840fa9d
      HVM32: ami-0c65adc9a5c1b5d7c
    eu-west-1:
      HVM64: ami-0d71ea30463e0ff8d
      HVM32: ami-0f3164307ee5d695a
    ap-southeast-1:
      HVM64: ami-0801a1e12f4a9ccc0
      HVM32: ami-09a7bbd08886aafdf

Resources:
  WebServer:
    Type: AWS::EC2::Instance
    Properties:
      ImageId: !FindInMap [RegionAMI, !Ref 'AWS::Region', HVM64]
      InstanceType: t3.micro
```

The `!Ref 'AWS::Region'` pseudo parameter returns whatever region the stack is being deployed to. CloudFormation plugs that into the lookup and gets the right AMI automatically. You deploy the same template to `us-east-1` or `ap-southeast-1` and it just works.

## Environment-Based Mappings

Mappings are great for varying configuration across environments too:

```yaml
# Map resource sizes and settings per environment
AWSTemplateFormatVersion: '2010-09-09'
Description: Environment-specific infrastructure settings

Parameters:
  Environment:
    Type: String
    AllowedValues: [dev, staging, prod]

Mappings:
  EnvironmentConfig:
    dev:
      InstanceType: t3.micro
      DBInstanceClass: db.t3.micro
      DBStorage: '20'
      MultiAZ: 'false'
      MinInstances: '1'
      MaxInstances: '2'
    staging:
      InstanceType: t3.small
      DBInstanceClass: db.t3.small
      DBStorage: '50'
      MultiAZ: 'false'
      MinInstances: '2'
      MaxInstances: '4'
    prod:
      InstanceType: t3.large
      DBInstanceClass: db.r5.large
      DBStorage: '200'
      MultiAZ: 'true'
      MinInstances: '3'
      MaxInstances: '10'

Resources:
  AutoScalingGroup:
    Type: AWS::AutoScaling::AutoScalingGroup
    Properties:
      MinSize: !FindInMap [EnvironmentConfig, !Ref Environment, MinInstances]
      MaxSize: !FindInMap [EnvironmentConfig, !Ref Environment, MaxInstances]
      LaunchTemplate:
        LaunchTemplateId: !Ref LaunchTemplate
        Version: !GetAtt LaunchTemplate.LatestVersionNumber

  LaunchTemplate:
    Type: AWS::EC2::LaunchTemplate
    Properties:
      LaunchTemplateData:
        InstanceType: !FindInMap [EnvironmentConfig, !Ref Environment, InstanceType]

  Database:
    Type: AWS::RDS::DBInstance
    Properties:
      DBInstanceClass: !FindInMap [EnvironmentConfig, !Ref Environment, DBInstanceClass]
      AllocatedStorage: !FindInMap [EnvironmentConfig, !Ref Environment, DBStorage]
      MultiAZ: !FindInMap [EnvironmentConfig, !Ref Environment, MultiAZ]
      Engine: postgres
      MasterUsername: admin
      MasterUserPassword: '{{resolve:ssm-secure:db-password}}'
```

With this approach, deploying to dev vs. prod is just a parameter change. The mapping handles all the sizing differences.

## Combining Region and Environment Mappings

You can have multiple mapping tables in a single template:

```yaml
# Multiple mappings for different lookup dimensions
Mappings:
  RegionAMI:
    us-east-1:
      AmiId: ami-0c02fb55956c7d316
    us-west-2:
      AmiId: ami-00ee4df451840fa9d
    eu-west-1:
      AmiId: ami-0d71ea30463e0ff8d

  EnvironmentConfig:
    dev:
      InstanceType: t3.micro
      VolumeSize: '20'
    prod:
      InstanceType: t3.large
      VolumeSize: '100'

  RegionConfig:
    us-east-1:
      ELBAccountId: '127311923021'
      S3Prefix: us-east
    us-west-2:
      ELBAccountId: '797873946194'
      S3Prefix: us-west
    eu-west-1:
      ELBAccountId: '156460612806'
      S3Prefix: eu-west

Parameters:
  Environment:
    Type: String
    AllowedValues: [dev, prod]

Resources:
  WebServer:
    Type: AWS::EC2::Instance
    Properties:
      ImageId: !FindInMap [RegionAMI, !Ref 'AWS::Region', AmiId]
      InstanceType: !FindInMap [EnvironmentConfig, !Ref Environment, InstanceType]
```

## Mappings vs Parameters vs Conditions

These three features overlap, so when do you use which?

**Use parameters** when the deployer needs to provide a value (VPC ID, subnet, password) or make a choice.

**Use mappings** when you know all the possible values upfront and they're determined by something predictable (region, environment name).

**Use conditions** when you need to include or exclude entire resources based on a decision. Check out our [conditions guide](https://oneuptime.com/blog/post/cloudformation-conditions-conditional-resources/view) for details.

A common pattern is combining all three:

```yaml
# Parameters feed into mappings and conditions
Parameters:
  Environment:
    Type: String
    AllowedValues: [dev, prod]

Mappings:
  EnvironmentConfig:
    dev:
      DBSize: db.t3.micro
    prod:
      DBSize: db.r5.large

Conditions:
  IsProduction: !Equals [!Ref Environment, prod]

Resources:
  Database:
    Type: AWS::RDS::DBInstance
    Properties:
      DBInstanceClass: !FindInMap [EnvironmentConfig, !Ref Environment, DBSize]
      MultiAZ: !If [IsProduction, true, false]
```

## Limitations of Mappings

Mappings have some constraints you should know about:

1. **Values must be static.** You can't compute mapping values - they're literal strings, lists, or integers defined at template authoring time.

2. **Only two levels of keys.** You get a top-level key and a second-level key. That's it. No deeper nesting.

3. **No dynamic keys in FindInMap.** The keys must resolve to actual keys in the mapping. Prior to the `Fn::FindInMap` enhancement with a default value (added in 2023), you couldn't handle missing keys gracefully.

4. **All values are strings.** Even numbers need to be quoted. CloudFormation coerces them where needed, but be aware.

If you need more complex lookups or dynamic data, consider using SSM Parameter Store or [CloudFormation macros](https://oneuptime.com/blog/post/cloudformation-macros-transforms/view).

## FindInMap with Default Values

AWS added support for a default value in `Fn::FindInMap`, which is handy when you're not sure a key exists:

```yaml
# FindInMap with a default fallback value
Resources:
  Instance:
    Type: AWS::EC2::Instance
    Properties:
      InstanceType: !FindInMap
        - EnvironmentConfig
        - !Ref Environment
        - InstanceType
        - DefaultValue: t3.micro
```

This prevents stack failures when someone passes an environment name that isn't in your mapping.

## Best Practices

**Keep mappings focused.** One mapping per concern - don't mix AMI IDs and instance types in the same mapping table.

**Use descriptive key names.** `HVM64` is less clear than `AmazonLinux2HVM64`. Future you will appreciate it.

**Document what the mapping contains.** A comment above each mapping explaining its purpose helps people maintain the template.

**Prefer SSM parameters for AMIs.** Instead of maintaining an AMI mapping that goes stale, use `AWS::SSM::Parameter::Value<AWS::EC2::Image::Id>` parameters that resolve the latest AMI at deploy time.

**Combine with parameters.** Parameters provide the lookup key; mappings provide the data. Together, they keep templates clean and reusable.

Mappings are one piece of the reusability puzzle. When paired with [parameters](https://oneuptime.com/blog/post/cloudformation-parameters-reusable-templates/view) and [outputs](https://oneuptime.com/blog/post/cloudformation-outputs-export-values/view), they let you write templates once and deploy them everywhere.
