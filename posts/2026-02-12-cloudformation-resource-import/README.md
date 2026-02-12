# How to Use CloudFormation Resource Import

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudFormation, Infrastructure as Code, Migration

Description: Learn how to import existing AWS resources into CloudFormation stacks to bring manually created infrastructure under Infrastructure as Code management.

---

You've got AWS resources created by hand - maybe a production database someone built through the Console years ago, or an S3 bucket that predates your CloudFormation adoption. Resource import lets you bring these existing resources under CloudFormation management without recreating them. No downtime, no data migration, no risk.

## What is Resource Import?

Resource import adds an existing AWS resource to a CloudFormation stack. CloudFormation starts managing the resource as if it created it. The resource isn't modified, moved, or recreated - CloudFormation just starts tracking it.

```mermaid
graph LR
    A[Existing Resource] --> B[Add to Template]
    B --> C[Create Import Change Set]
    C --> D[Execute Import]
    D --> E[Resource Managed by CloudFormation]
```

## When to Use Resource Import

- **Migrating to IaC**: Bringing manually created resources under CloudFormation control
- **Fixing drift**: Re-importing a resource that was accidentally removed from a stack
- **Reorganizing stacks**: Moving resources between stacks
- **Recovering from failed operations**: Re-importing resources retained after a failed update

## Step-by-Step Import Process

Let's import an existing RDS database into a CloudFormation stack.

### Step 1: Write the template

Add the resource to your template with its current configuration. The template must match the actual resource's properties:

```yaml
# template.yaml - includes the resource to import
AWSTemplateFormatVersion: '2010-09-09'
Description: Application stack with imported database

Resources:
  # Existing resources already in the stack
  AppSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: App security group
      VpcId: vpc-0abc123

  # Resource to import - must match existing configuration
  ImportedDatabase:
    Type: AWS::RDS::DBInstance
    DeletionPolicy: Retain
    Properties:
      DBInstanceIdentifier: my-existing-database
      DBInstanceClass: db.r5.large
      Engine: postgres
      EngineVersion: '15.4'
      AllocatedStorage: 200
      StorageType: gp3
      MasterUsername: admin
      # Don't include MasterUserPassword for imports
```

Important: The properties in your template should match the current state of the resource. If they don't match, CloudFormation might try to update the resource to match the template after the import.

### Step 2: Create an import change set

```bash
# Create a change set of type IMPORT
aws cloudformation create-change-set \
  --stack-name my-app-stack \
  --change-set-name import-database \
  --change-set-type IMPORT \
  --template-body file://template.yaml \
  --resources-to-import '[
    {
      "ResourceType": "AWS::RDS::DBInstance",
      "LogicalResourceId": "ImportedDatabase",
      "ResourceIdentifier": {
        "DBInstanceIdentifier": "my-existing-database"
      }
    }
  ]'
```

The `--resources-to-import` parameter maps each logical resource ID in the template to its physical resource identifier. The identifier key varies by resource type.

### Step 3: Review the change set

```bash
# Wait for the change set to be ready
aws cloudformation wait change-set-create-complete \
  --stack-name my-app-stack \
  --change-set-name import-database

# Review what will happen
aws cloudformation describe-change-set \
  --stack-name my-app-stack \
  --change-set-name import-database \
  --query 'Changes[*].ResourceChange.{Action:Action,Resource:LogicalResourceId,Type:ResourceType}'
```

The action should show `Import` for the imported resources. There should be no `Modify` or `Replace` actions.

### Step 4: Execute the import

```bash
# Execute the import
aws cloudformation execute-change-set \
  --stack-name my-app-stack \
  --change-set-name import-database

# Wait for completion
aws cloudformation wait stack-import-complete \
  --stack-name my-app-stack
```

### Step 5: Verify

```bash
# Check that the resource is now in the stack
aws cloudformation describe-stack-resources \
  --stack-name my-app-stack \
  --query 'StackResources[?LogicalResourceId==`ImportedDatabase`]'
```

## Importing into a New Stack

You can create a brand new stack through import. This is useful when you want to bring a group of existing resources under management together:

```bash
# Create a new stack by importing existing resources
aws cloudformation create-change-set \
  --stack-name my-new-stack \
  --change-set-name initial-import \
  --change-set-type IMPORT \
  --template-body file://template.yaml \
  --resources-to-import '[
    {
      "ResourceType": "AWS::EC2::VPC",
      "LogicalResourceId": "VPC",
      "ResourceIdentifier": {"VpcId": "vpc-0abc123"}
    },
    {
      "ResourceType": "AWS::EC2::Subnet",
      "LogicalResourceId": "PublicSubnet1",
      "ResourceIdentifier": {"SubnetId": "subnet-111"}
    },
    {
      "ResourceType": "AWS::EC2::Subnet",
      "LogicalResourceId": "PublicSubnet2",
      "ResourceIdentifier": {"SubnetId": "subnet-222"}
    },
    {
      "ResourceType": "AWS::RDS::DBInstance",
      "LogicalResourceId": "Database",
      "ResourceIdentifier": {"DBInstanceIdentifier": "prod-db"}
    }
  ]'
```

## Resource Identifiers by Type

Each resource type has a specific identifier key for imports:

| Resource Type | Identifier Key | Example |
|---|---|---|
| `AWS::EC2::Instance` | `InstanceId` | `i-0abc123` |
| `AWS::EC2::VPC` | `VpcId` | `vpc-0abc123` |
| `AWS::EC2::Subnet` | `SubnetId` | `subnet-0abc123` |
| `AWS::EC2::SecurityGroup` | `GroupId` | `sg-0abc123` |
| `AWS::S3::Bucket` | `BucketName` | `my-bucket` |
| `AWS::RDS::DBInstance` | `DBInstanceIdentifier` | `my-database` |
| `AWS::DynamoDB::Table` | `TableName` | `my-table` |
| `AWS::Lambda::Function` | `FunctionName` | `my-function` |
| `AWS::IAM::Role` | `RoleName` | `my-role` |
| `AWS::SNS::Topic` | `TopicArn` | `arn:aws:sns:...` |
| `AWS::SQS::Queue` | `QueueUrl` | `https://sqs...` |

Check the [AWS documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/resource-import-supported-resources.html) for the complete list - not all resource types support import.

## Importing Multiple Resources

You can import several resources in a single change set:

```bash
# Import multiple resources at once
aws cloudformation create-change-set \
  --stack-name infrastructure-stack \
  --change-set-name import-all \
  --change-set-type IMPORT \
  --template-body file://full-template.yaml \
  --resources-to-import file://import-list.json
```

Where `import-list.json` contains:

```json
[
  {
    "ResourceType": "AWS::EC2::VPC",
    "LogicalResourceId": "MainVPC",
    "ResourceIdentifier": { "VpcId": "vpc-0abc123" }
  },
  {
    "ResourceType": "AWS::EC2::Subnet",
    "LogicalResourceId": "SubnetA",
    "ResourceIdentifier": { "SubnetId": "subnet-aaa" }
  },
  {
    "ResourceType": "AWS::EC2::Subnet",
    "LogicalResourceId": "SubnetB",
    "ResourceIdentifier": { "SubnetId": "subnet-bbb" }
  },
  {
    "ResourceType": "AWS::RDS::DBInstance",
    "LogicalResourceId": "Database",
    "ResourceIdentifier": { "DBInstanceIdentifier": "prod-database" }
  }
]
```

## Moving Resources Between Stacks

To move a resource from Stack A to Stack B:

1. Remove the resource from Stack A's template (with `DeletionPolicy: Retain` so it isn't deleted)
2. Update Stack A - the resource is retained but no longer managed
3. Add the resource to Stack B's template
4. Import into Stack B using a change set

```bash
# Step 1: Update Stack A to remove the resource (it's retained)
aws cloudformation deploy \
  --stack-name stack-a \
  --template-file stack-a-without-resource.yaml

# Step 2: Import into Stack B
aws cloudformation create-change-set \
  --stack-name stack-b \
  --change-set-name import-from-stack-a \
  --change-set-type IMPORT \
  --template-body file://stack-b-with-resource.yaml \
  --resources-to-import '[{"ResourceType":"AWS::S3::Bucket","LogicalResourceId":"DataBucket","ResourceIdentifier":{"BucketName":"my-data-bucket"}}]'
```

## Getting the Template Right

The tricky part of importing is making your template match the existing resource. If properties don't match, CloudFormation may try to update the resource after import.

Use the AWS CLI to get the current resource configuration:

```bash
# Get current RDS instance configuration
aws rds describe-db-instances \
  --db-instance-identifier my-existing-database \
  --query 'DBInstances[0].{Class:DBInstanceClass,Engine:Engine,Version:EngineVersion,Storage:AllocatedStorage,StorageType:StorageType,MultiAZ:MultiAZ}'

# Get current S3 bucket configuration
aws s3api get-bucket-versioning --bucket my-existing-bucket
aws s3api get-bucket-encryption --bucket my-existing-bucket
```

Match these values in your template. After import, you can make changes through subsequent stack updates.

## Drift Check After Import

After importing, run drift detection to verify the template matches reality:

```bash
# Check for drift on the imported resource
aws cloudformation detect-stack-drift --stack-name my-app-stack

# Wait and check results
aws cloudformation describe-stack-resource-drifts \
  --stack-name my-app-stack \
  --stack-resource-drift-status-filters MODIFIED
```

If there's drift, update your template to match the actual resource state, or update the stack to bring the resource in line with your template. See our [drift detection guide](https://oneuptime.com/blog/post/detect-fix-cloudformation-drift/view) for details.

## Limitations

- Not all resource types support import. Check the docs for your resource type.
- You can only import into `IMPORT_COMPLETE`, `CREATE_COMPLETE`, `UPDATE_COMPLETE`, `UPDATE_ROLLBACK_COMPLETE`, `ROLLBACK_COMPLETE` status stacks.
- Each resource can only be managed by one stack at a time.
- The resource must not already be managed by another CloudFormation stack.
- Import change sets can only contain import actions - you can't import resources and make other changes in the same change set.

## Best Practices

**Always set DeletionPolicy: Retain on imported resources.** Until you're confident the import is correct, protect the resource from accidental deletion.

**Match the template to reality first.** Get the properties right before importing. Update the template to your desired state afterward.

**Run drift detection after import.** Verify that CloudFormation's view matches the actual resource.

**Import into a test stack first.** Practice the import with a non-critical resource before importing production databases.

**Keep a record of what was imported.** Tag imported resources and document which stack manages them. This helps with auditing and troubleshooting.

Resource import bridges the gap between manually created infrastructure and Infrastructure as Code. It's the path from "we've always done it through the Console" to proper CloudFormation management, without the risk of recreating production resources.
