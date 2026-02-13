# How to Set Up RDS with CloudFormation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, RDS, CloudFormation, Infrastructure as Code, Database

Description: Build a production-ready Amazon RDS deployment using AWS CloudFormation with parameter groups, security, monitoring, and automated backups.

---

CloudFormation is AWS's native infrastructure-as-code tool. If you're already deep in the AWS ecosystem, using CloudFormation to manage your RDS instances makes a lot of sense. It integrates natively with other AWS services, supports drift detection, and doesn't require any third-party tools.

In this post, we'll build a complete CloudFormation template that provisions an RDS instance with security groups, parameter groups, monitoring, and alarms - everything you need for production.

## Template Structure

CloudFormation templates can get long, so let's organize this logically. We'll cover parameters at the top, then resources grouped by function.

## The Complete Template

Here's a production-ready CloudFormation template for an RDS PostgreSQL instance:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: Production-ready RDS PostgreSQL instance with monitoring and security

Parameters:
  ProjectName:
    Type: String
    Description: Project name used for resource naming
    Default: myapp

  Environment:
    Type: String
    Description: Deployment environment
    AllowedValues:
      - production
      - staging
      - development
    Default: production

  DBInstanceClass:
    Type: String
    Description: RDS instance type
    Default: db.r6g.large
    AllowedValues:
      - db.t4g.medium
      - db.t4g.large
      - db.r6g.large
      - db.r6g.xlarge
      - db.r6g.2xlarge

  AllocatedStorage:
    Type: Number
    Description: Initial storage size in GB
    Default: 100
    MinValue: 20
    MaxValue: 65536

  MaxAllocatedStorage:
    Type: Number
    Description: Maximum storage for auto scaling in GB
    Default: 500

  MasterUsername:
    Type: String
    Description: Master database username
    Default: admin
    NoEcho: true

  MasterUserPassword:
    Type: String
    Description: Master database password
    NoEcho: true
    MinLength: 12

  VpcId:
    Type: AWS::EC2::VPC::Id
    Description: VPC to deploy the RDS instance in

  PrivateSubnetIds:
    Type: List<AWS::EC2::Subnet::Id>
    Description: Private subnets for the DB subnet group

  ApplicationSecurityGroupId:
    Type: AWS::EC2::SecurityGroup::Id
    Description: Security group of the application servers

  AlertSNSTopicARN:
    Type: String
    Description: SNS topic ARN for CloudWatch alarm notifications

Conditions:
  IsProduction: !Equals [!Ref Environment, production]

Resources:
  # Security group for RDS
  RDSSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: !Sub 'Security group for ${ProjectName} RDS instance'
      VpcId: !Ref VpcId
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 5432
          ToPort: 5432
          SourceSecurityGroupId: !Ref ApplicationSecurityGroupId
          Description: Allow PostgreSQL access from application servers
      Tags:
        - Key: Name
          Value: !Sub '${ProjectName}-${Environment}-rds-sg'

  # DB Subnet Group
  DBSubnetGroup:
    Type: AWS::RDS::DBSubnetGroup
    Properties:
      DBSubnetGroupDescription: !Sub 'Subnet group for ${ProjectName} database'
      SubnetIds: !Ref PrivateSubnetIds
      Tags:
        - Key: Name
          Value: !Sub '${ProjectName}-${Environment}-db-subnet'

  # Custom Parameter Group
  DBParameterGroup:
    Type: AWS::RDS::DBParameterGroup
    Properties:
      Family: postgres16
      Description: !Sub 'Parameter group for ${ProjectName}'
      Parameters:
        rds.force_ssl: '1'
        log_min_duration_statement: '1000'
        shared_preload_libraries: pg_stat_statements
        pg_stat_statements.track: all
      Tags:
        - Key: Name
          Value: !Sub '${ProjectName}-${Environment}-params'

  # IAM Role for Enhanced Monitoring
  EnhancedMonitoringRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: !Sub '${ProjectName}-${Environment}-rds-monitoring'
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: monitoring.rds.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole

  # The RDS Instance
  RDSInstance:
    Type: AWS::RDS::DBInstance
    DeletionPolicy: !If [IsProduction, Snapshot, Delete]
    UpdateReplacePolicy: Snapshot
    Properties:
      DBInstanceIdentifier: !Sub '${ProjectName}-${Environment}'
      Engine: postgres
      EngineVersion: '16.2'
      DBInstanceClass: !Ref DBInstanceClass
      DBParameterGroupName: !Ref DBParameterGroup

      # Storage
      AllocatedStorage: !Ref AllocatedStorage
      MaxAllocatedStorage: !Ref MaxAllocatedStorage
      StorageType: gp3
      StorageEncrypted: true

      # Network
      DBSubnetGroupName: !Ref DBSubnetGroup
      VPCSecurityGroups:
        - !Ref RDSSecurityGroup
      PubliclyAccessible: false

      # Credentials
      DBName: !Sub '${ProjectName}_${Environment}'
      MasterUsername: !Ref MasterUsername
      MasterUserPassword: !Ref MasterUserPassword

      # High availability
      MultiAZ: !If [IsProduction, true, false]

      # Backups
      BackupRetentionPeriod: !If [IsProduction, 14, 3]
      PreferredBackupWindow: '03:00-04:00'
      CopyTagsToSnapshot: true

      # Maintenance
      PreferredMaintenanceWindow: 'sun:04:30-sun:05:30'
      AutoMinorVersionUpgrade: true

      # Monitoring
      MonitoringInterval: 10
      MonitoringRoleArn: !GetAtt EnhancedMonitoringRole.Arn
      EnablePerformanceInsights: true
      PerformanceInsightsRetentionPeriod: 7
      EnableCloudwatchLogsExports:
        - postgresql
        - upgrade

      # Protection
      DeletionProtection: !If [IsProduction, true, false]

      Tags:
        - Key: Name
          Value: !Sub '${ProjectName}-${Environment}'
        - Key: Environment
          Value: !Ref Environment

  # CloudWatch Alarms
  CPUAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub 'rds-${ProjectName}-${Environment}-cpu-high'
      AlarmDescription: RDS CPU utilization above 80%
      MetricName: CPUUtilization
      Namespace: AWS/RDS
      Statistic: Average
      Period: 300
      EvaluationPeriods: 3
      Threshold: 80
      ComparisonOperator: GreaterThanThreshold
      Dimensions:
        - Name: DBInstanceIdentifier
          Value: !Ref RDSInstance
      AlarmActions:
        - !Ref AlertSNSTopicARN
      OKActions:
        - !Ref AlertSNSTopicARN

  StorageAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub 'rds-${ProjectName}-${Environment}-storage-low'
      AlarmDescription: RDS free storage below 10 GB
      MetricName: FreeStorageSpace
      Namespace: AWS/RDS
      Statistic: Average
      Period: 300
      EvaluationPeriods: 1
      Threshold: 10737418240
      ComparisonOperator: LessThanThreshold
      Dimensions:
        - Name: DBInstanceIdentifier
          Value: !Ref RDSInstance
      AlarmActions:
        - !Ref AlertSNSTopicARN

  MemoryAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub 'rds-${ProjectName}-${Environment}-memory-low'
      AlarmDescription: RDS freeable memory below 500 MB
      MetricName: FreeableMemory
      Namespace: AWS/RDS
      Statistic: Average
      Period: 300
      EvaluationPeriods: 3
      Threshold: 524288000
      ComparisonOperator: LessThanThreshold
      Dimensions:
        - Name: DBInstanceIdentifier
          Value: !Ref RDSInstance
      AlarmActions:
        - !Ref AlertSNSTopicARN

  ConnectionsAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub 'rds-${ProjectName}-${Environment}-connections-high'
      AlarmDescription: RDS connection count above threshold
      MetricName: DatabaseConnections
      Namespace: AWS/RDS
      Statistic: Average
      Period: 300
      EvaluationPeriods: 2
      Threshold: 500
      ComparisonOperator: GreaterThanThreshold
      Dimensions:
        - Name: DBInstanceIdentifier
          Value: !Ref RDSInstance
      AlarmActions:
        - !Ref AlertSNSTopicARN

  # RDS Event Subscription
  RDSEventSubscription:
    Type: AWS::RDS::EventSubscription
    Properties:
      SubscriptionName: !Sub '${ProjectName}-${Environment}-rds-events'
      SnsTopicArn: !Ref AlertSNSTopicARN
      SourceType: db-instance
      SourceIds:
        - !Ref RDSInstance
      EventCategories:
        - availability
        - failover
        - failure
        - maintenance
        - recovery

Outputs:
  Endpoint:
    Description: RDS instance endpoint
    Value: !GetAtt RDSInstance.Endpoint.Address
    Export:
      Name: !Sub '${ProjectName}-${Environment}-rds-endpoint'

  Port:
    Description: RDS instance port
    Value: !GetAtt RDSInstance.Endpoint.Port
    Export:
      Name: !Sub '${ProjectName}-${Environment}-rds-port'

  SecurityGroupId:
    Description: RDS security group ID
    Value: !Ref RDSSecurityGroup
    Export:
      Name: !Sub '${ProjectName}-${Environment}-rds-sg'

  InstanceIdentifier:
    Description: RDS instance identifier
    Value: !Ref RDSInstance
```

## Deploying the Stack

Deploy using the AWS CLI:

```bash
# Deploy the CloudFormation stack
aws cloudformation create-stack \
  --stack-name myapp-production-rds \
  --template-body file://rds-template.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameters \
    ParameterKey=ProjectName,ParameterValue=myapp \
    ParameterKey=Environment,ParameterValue=production \
    ParameterKey=DBInstanceClass,ParameterValue=db.r6g.large \
    ParameterKey=AllocatedStorage,ParameterValue=200 \
    ParameterKey=MasterUsername,ParameterValue=admin \
    ParameterKey=MasterUserPassword,ParameterValue=YourSecurePassword123 \
    ParameterKey=VpcId,ParameterValue=vpc-abc123 \
    ParameterKey=PrivateSubnetIds,ParameterValue=\"subnet-abc123,subnet-def456\" \
    ParameterKey=ApplicationSecurityGroupId,ParameterValue=sg-abc123 \
    ParameterKey=AlertSNSTopicARN,ParameterValue=arn:aws:sns:us-east-1:123456789012:alerts

# Monitor the stack creation
aws cloudformation wait stack-create-complete --stack-name myapp-production-rds

# Get the outputs
aws cloudformation describe-stacks \
  --stack-name myapp-production-rds \
  --query 'Stacks[0].Outputs'
```

## Updating the Stack

To modify the RDS instance (e.g., change instance class):

```bash
# Update the stack with new parameters
aws cloudformation update-stack \
  --stack-name myapp-production-rds \
  --template-body file://rds-template.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameters \
    ParameterKey=DBInstanceClass,ParameterValue=db.r6g.xlarge \
    ParameterKey=MasterUserPassword,UsePreviousValue=true
```

CloudFormation will show you a change set before applying. Always review it carefully, especially for RDS changes that might cause downtime.

For the Terraform alternative, see our guide on [setting up RDS with Terraform](https://oneuptime.com/blog/post/2026-02-12-set-up-rds-with-terraform/view). And once your instance is running, make sure you're using [Performance Insights](https://oneuptime.com/blog/post/2026-02-12-monitor-rds-with-performance-insights/view) to keep an eye on query performance.
