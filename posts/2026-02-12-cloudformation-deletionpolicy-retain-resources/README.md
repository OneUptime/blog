# How to Use CloudFormation DeletionPolicy to Retain Resources

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudFormation, Infrastructure as Code, Data Protection

Description: Learn how to use CloudFormation DeletionPolicy to protect critical resources like databases and S3 buckets from accidental deletion during stack operations.

---

By default, when you delete a CloudFormation stack, every resource it created gets deleted too. That's usually fine for security groups and IAM roles - they're easy to recreate. But for databases with years of production data, or S3 buckets with irreplaceable files, that default behavior is terrifying. DeletionPolicy lets you override it.

## What is DeletionPolicy?

`DeletionPolicy` is an attribute you add to any resource in your CloudFormation template. It controls what happens to that resource when the stack is deleted (or when the resource is removed from the template during an update).

Three options:

| Policy | What Happens |
|---|---|
| `Delete` | Resource is destroyed (the default) |
| `Retain` | Resource is kept but disconnected from CloudFormation |
| `Snapshot` | Creates a final snapshot before deleting (only for supported resources) |

## Using DeletionPolicy: Retain

`Retain` is the safety net for data you can't afford to lose:

```yaml
# Retain the database even if the stack is deleted
Resources:
  ProductionDatabase:
    Type: AWS::RDS::DBInstance
    DeletionPolicy: Retain
    Properties:
      DBInstanceClass: db.r5.large
      Engine: postgres
      MasterUsername: admin
      MasterUserPassword: '{{resolve:ssm-secure:/myapp/db-password}}'
      AllocatedStorage: 100
      StorageEncrypted: true

  CriticalDataBucket:
    Type: AWS::S3::Bucket
    DeletionPolicy: Retain
    Properties:
      BucketName: !Sub '${AWS::StackName}-critical-data'
      VersioningConfiguration:
        Status: Enabled

  EncryptionKey:
    Type: AWS::KMS::Key
    DeletionPolicy: Retain
    Properties:
      Description: Encryption key for application data
      EnableKeyRotation: true
```

When the stack is deleted, the database, bucket, and KMS key will continue to exist in your AWS account. They're just no longer managed by CloudFormation.

## Using DeletionPolicy: Snapshot

For resources that support snapshots, this creates a final backup before deletion:

```yaml
# Create a snapshot before the database is deleted
Resources:
  Database:
    Type: AWS::RDS::DBInstance
    DeletionPolicy: Snapshot
    Properties:
      DBInstanceClass: db.t3.large
      Engine: mysql
      AllocatedStorage: 50

  RedisCache:
    Type: AWS::ElastiCache::CacheCluster
    DeletionPolicy: Snapshot
    Properties:
      CacheNodeType: cache.t3.medium
      Engine: redis
      NumCacheNodes: 1
```

Resources that support `Snapshot`:

- `AWS::RDS::DBInstance`
- `AWS::RDS::DBCluster`
- `AWS::ElastiCache::CacheCluster`
- `AWS::ElastiCache::ReplicationGroup`
- `AWS::Redshift::Cluster`
- `AWS::Neptune::DBCluster`

The snapshot name is auto-generated based on the stack and resource names. You can find it in the respective service console after deletion.

## When Does DeletionPolicy Apply?

DeletionPolicy triggers in two situations:

1. **The entire stack is deleted** - the resource follows its DeletionPolicy
2. **The resource is removed from the template** during a stack update - it follows its DeletionPolicy

It does NOT trigger when:
- A resource is replaced during a stack update (that's governed by `UpdateReplacePolicy` - see our [UpdateReplacePolicy guide](https://oneuptime.com/blog/post/cloudformation-updatereplacepolicy/view))
- You change properties that cause an in-place modification

## A Complete Protection Strategy

Here's how to set up a template with appropriate deletion policies for each resource type:

```yaml
# Template with layered deletion protection
AWSTemplateFormatVersion: '2010-09-09'
Description: Application with proper deletion policies

Resources:
  # RETAIN - contains irreplaceable data
  UserDataBucket:
    Type: AWS::S3::Bucket
    DeletionPolicy: Retain
    Properties:
      BucketName: !Sub '${AWS::StackName}-user-data'
      VersioningConfiguration:
        Status: Enabled
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: aws:kms
              KMSMasterKeyID: !Ref DataKey

  # SNAPSHOT - can be restored from snapshot if needed
  AppDatabase:
    Type: AWS::RDS::DBInstance
    DeletionPolicy: Snapshot
    Properties:
      DBInstanceClass: db.r5.large
      Engine: postgres
      AllocatedStorage: 200
      StorageEncrypted: true
      KmsKeyId: !Ref DataKey

  # RETAIN - losing a KMS key means losing access to encrypted data
  DataKey:
    Type: AWS::KMS::Key
    DeletionPolicy: Retain
    Properties:
      Description: Encryption key for application data
      EnableKeyRotation: true
      KeyPolicy:
        Version: '2012-10-17'
        Statement:
          - Sid: AllowRoot
            Effect: Allow
            Principal:
              AWS: !Sub 'arn:aws:iam::${AWS::AccountId}:root'
            Action: 'kms:*'
            Resource: '*'

  # DELETE (default) - easily recreatable, no data
  AppSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    # DeletionPolicy defaults to Delete - no data to protect
    Properties:
      GroupDescription: Application security group
      VpcId: !Ref VPC

  # DELETE - log groups can be recreated
  AppLogGroup:
    Type: AWS::Logs::LogGroup
    DeletionPolicy: Delete
    Properties:
      LogGroupName: !Sub '/app/${AWS::StackName}'
      RetentionInDays: 30

  # RETAIN - contains message history that may not have been processed
  ProcessingQueue:
    Type: AWS::SQS::Queue
    DeletionPolicy: Retain
    Properties:
      QueueName: !Sub '${AWS::StackName}-processing'
      VisibilityTimeout: 300

  # RETAIN - DynamoDB table with user session data
  SessionTable:
    Type: AWS::DynamoDB::Table
    DeletionPolicy: Retain
    Properties:
      TableName: !Sub '${AWS::StackName}-sessions'
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: SessionId
          AttributeType: S
      KeySchema:
        - AttributeName: SessionId
          KeyType: HASH
```

## Managing Retained Resources

After a stack deletion, retained resources become "orphans" - they exist but aren't managed by any CloudFormation stack. You have a few options:

### Option 1: Import into a new stack

If you're recreating the stack, you can import existing resources:

```bash
# Import an existing resource into a new stack
aws cloudformation create-change-set \
  --stack-name my-new-stack \
  --change-set-name import-resources \
  --change-set-type IMPORT \
  --resources-to-import "[{\"ResourceType\":\"AWS::RDS::DBInstance\",\"LogicalResourceId\":\"AppDatabase\",\"ResourceIdentifier\":{\"DBInstanceIdentifier\":\"my-database\"}}]" \
  --template-body file://template.yaml
```

For details, see our guide on [CloudFormation resource import](https://oneuptime.com/blog/post/cloudformation-resource-import/view).

### Option 2: Delete manually

If you don't need the resource anymore:

```bash
# Manually delete retained resources
aws rds delete-db-instance \
  --db-instance-identifier my-database \
  --skip-final-snapshot

aws s3 rm s3://my-bucket --recursive
aws s3 rb s3://my-bucket
```

### Option 3: Leave in place

For resources like KMS keys that might still be needed to decrypt existing data, just leave them. Make sure they're tagged so you can track ownership.

## Tracking Retained Resources

After deleting a stack, check what was retained:

```bash
# List deleted stacks and their retained resources
aws cloudformation list-stacks \
  --stack-status-filter DELETE_COMPLETE \
  --query 'StackSummaries[*].{Name:StackName,Deleted:DeletionTime}'

# For a specific deleted stack, check which resources were retained
aws cloudformation describe-stack-resources \
  --stack-name my-old-stack 2>/dev/null || echo "Stack fully deleted"
```

Unfortunately, CloudFormation doesn't provide a built-in way to list retained resources from deleted stacks. The best approach is to use tagging:

```yaml
# Tag resources with the stack name so you can find them later
Resources:
  Database:
    Type: AWS::RDS::DBInstance
    DeletionPolicy: Retain
    Properties:
      Tags:
        - Key: CloudFormationStack
          Value: !Ref AWS::StackName
        - Key: DeletionPolicy
          Value: Retain
```

Then search for orphaned resources by tag:

```bash
# Find retained resources from any stack
aws rds describe-db-instances \
  --query 'DBInstances[?contains(TagList[?Key==`DeletionPolicy`].Value, `Retain`)].[DBInstanceIdentifier,TagList[?Key==`CloudFormationStack`].Value]'
```

## DeletionPolicy vs Termination Protection

These are complementary, not alternatives:

- **Termination protection** prevents the entire stack from being deleted. It's a gate that must be explicitly turned off.
- **DeletionPolicy** controls what happens to individual resources when deletion proceeds.

Use both for production:

```bash
# Enable termination protection on the stack
aws cloudformation update-termination-protection \
  --enable-termination-protection \
  --stack-name my-app-prod
```

And set DeletionPolicy on critical resources as an additional safety layer.

## Best Practices

**Retain databases and encryption keys by default.** The cost of an orphaned database is negligible compared to the cost of losing data.

**Use Snapshot for RDS when possible.** It gives you a backup without ongoing costs.

**Tag retained resources.** You need to be able to find and manage them after the stack is gone.

**Document your deletion policies.** Make it clear in your team documentation which resources will be retained and who's responsible for cleanup.

**Test your deletion policies in dev.** Delete your dev stack and verify that retained resources actually persist. Don't discover a misconfiguration in production.

**Pair DeletionPolicy with UpdateReplacePolicy.** [UpdateReplacePolicy](https://oneuptime.com/blog/post/cloudformation-updatereplacepolicy/view) handles the resource replacement scenario that DeletionPolicy doesn't cover.

DeletionPolicy is one of the simplest but most important CloudFormation features. A single line in your template can prevent catastrophic data loss. Use it on anything you can't afford to lose.
