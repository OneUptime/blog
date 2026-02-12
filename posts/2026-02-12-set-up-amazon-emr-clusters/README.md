# How to Set Up Amazon EMR Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EMR, Big Data, Hadoop, Spark

Description: Step-by-step guide to creating and configuring Amazon EMR clusters for big data processing with Spark, Hadoop, and other frameworks.

---

Amazon EMR (Elastic MapReduce) is AWS's managed big data platform. It lets you run Apache Spark, Hadoop, Hive, Presto, and other frameworks without managing the underlying infrastructure. Setting up a cluster isn't complicated, but getting the configuration right makes a big difference in performance and cost.

Let's walk through everything you need to know to get an EMR cluster running properly.

## Prerequisites

Before creating a cluster, you'll need a few things in place:

- An EC2 key pair for SSH access
- An S3 bucket for logs and data
- IAM roles for EMR (service role and instance profile)
- A VPC with appropriate subnets

If you don't have the default EMR roles, create them with this command.

```bash
aws emr create-default-roles
```

This creates two roles: `EMR_DefaultRole` (the service role) and `EMR_EC2_DefaultRole` (the instance profile). The service role allows EMR to provision EC2 instances, and the instance profile gives those instances access to AWS resources.

## Creating a Basic Cluster via CLI

Here's the simplest way to spin up a cluster.

This creates a basic 3-node EMR cluster with Spark and Hadoop installed.

```bash
aws emr create-cluster \
  --name "my-data-cluster" \
  --release-label emr-7.0.0 \
  --applications Name=Spark Name=Hadoop Name=Hive \
  --instance-type m5.xlarge \
  --instance-count 3 \
  --use-default-roles \
  --ec2-attributes KeyName=my-keypair \
  --log-uri s3://my-emr-logs/clusters/ \
  --region us-east-1
```

That gives you a 1 master + 2 core node cluster. But for production workloads, you'll want more control over the configuration.

## Instance Groups vs Instance Fleets

EMR supports two ways of specifying your cluster hardware: instance groups and instance fleets.

**Instance Groups** are simpler. You pick one instance type per group (master, core, task).

**Instance Fleets** are more flexible. You specify multiple instance types per fleet, and EMR picks the best available option based on price and capacity. This is especially useful when using Spot Instances.

This creates a cluster using instance fleets with multiple instance type options for better Spot availability.

```bash
aws emr create-cluster \
  --name "fleet-cluster" \
  --release-label emr-7.0.0 \
  --applications Name=Spark Name=Hadoop \
  --instance-fleets '[
    {
      "Name": "MasterFleet",
      "InstanceFleetType": "MASTER",
      "TargetOnDemandCapacity": 1,
      "InstanceTypeConfigs": [
        {"InstanceType": "m5.xlarge"},
        {"InstanceType": "m5.2xlarge"}
      ]
    },
    {
      "Name": "CoreFleet",
      "InstanceFleetType": "CORE",
      "TargetOnDemandCapacity": 2,
      "TargetSpotCapacity": 4,
      "InstanceTypeConfigs": [
        {"InstanceType": "m5.xlarge", "WeightedCapacity": 1},
        {"InstanceType": "m5.2xlarge", "WeightedCapacity": 2},
        {"InstanceType": "r5.xlarge", "WeightedCapacity": 1}
      ],
      "LaunchSpecifications": {
        "SpotSpecification": {
          "TimeoutDurationMinutes": 10,
          "TimeoutAction": "SWITCH_TO_ON_DEMAND"
        }
      }
    }
  ]' \
  --use-default-roles \
  --ec2-attributes KeyName=my-keypair \
  --log-uri s3://my-emr-logs/clusters/
```

## Configuring Applications

You can customize the configuration of applications installed on your cluster. This is where you tune Spark memory settings, Hive metastore connections, and other application-specific parameters.

This sets custom Spark and YARN configuration to optimize memory allocation.

```bash
aws emr create-cluster \
  --name "tuned-cluster" \
  --release-label emr-7.0.0 \
  --applications Name=Spark Name=Hadoop \
  --instance-type m5.2xlarge \
  --instance-count 5 \
  --use-default-roles \
  --configurations '[
    {
      "Classification": "spark-defaults",
      "Properties": {
        "spark.executor.memory": "8g",
        "spark.executor.cores": "4",
        "spark.driver.memory": "8g",
        "spark.dynamicAllocation.enabled": "true",
        "spark.shuffle.service.enabled": "true"
      }
    },
    {
      "Classification": "yarn-site",
      "Properties": {
        "yarn.nodemanager.resource.memory-mb": "24576",
        "yarn.scheduler.maximum-allocation-mb": "24576"
      }
    },
    {
      "Classification": "emrfs-site",
      "Properties": {
        "fs.s3.maxConnections": "200"
      }
    }
  ]' \
  --ec2-attributes KeyName=my-keypair \
  --log-uri s3://my-emr-logs/clusters/
```

## Bootstrap Actions

Bootstrap actions run on every node before applications start. They're perfect for installing custom packages, configuring system settings, or downloading files.

First, create a bootstrap script and upload it to S3.

```bash
#!/bin/bash
# bootstrap.sh - Install extra Python packages and configure the environment
sudo pip3 install pandas numpy boto3 pyarrow
sudo yum install -y htop
echo "export PYSPARK_PYTHON=python3" | sudo tee -a /etc/environment
```

Then reference it when creating your cluster.

```bash
aws emr create-cluster \
  --name "custom-cluster" \
  --release-label emr-7.0.0 \
  --applications Name=Spark \
  --instance-type m5.xlarge \
  --instance-count 3 \
  --use-default-roles \
  --bootstrap-actions Path=s3://my-emr-bucket/bootstrap.sh,Name=InstallDeps \
  --ec2-attributes KeyName=my-keypair \
  --log-uri s3://my-emr-logs/clusters/
```

## Security Configuration

For production clusters, you'll want encryption at rest and in transit.

This creates a security configuration with encryption enabled for both data at rest and in transit.

```bash
aws emr create-security-configuration \
  --name "secure-config" \
  --security-configuration '{
    "EncryptionConfiguration": {
      "EnableInTransitEncryption": true,
      "EnableAtRestEncryption": true,
      "InTransitEncryptionConfiguration": {
        "TLSCertificateConfiguration": {
          "CertificateProviderType": "PEM",
          "S3Object": "s3://my-certs/emr-certs.zip"
        }
      },
      "AtRestEncryptionConfiguration": {
        "S3EncryptionConfiguration": {
          "EncryptionMode": "SSE-S3"
        },
        "LocalDiskEncryptionConfiguration": {
          "EncryptionKeyProviderType": "AwsKms",
          "AwsKmsKey": "arn:aws:kms:us-east-1:123456789:key/my-key-id"
        }
      }
    }
  }'
```

Then use the security configuration in your cluster creation.

```bash
aws emr create-cluster \
  --name "secure-cluster" \
  --release-label emr-7.0.0 \
  --applications Name=Spark \
  --instance-type m5.xlarge \
  --instance-count 3 \
  --use-default-roles \
  --security-configuration secure-config \
  --ec2-attributes KeyName=my-keypair,SubnetId=subnet-abc123 \
  --log-uri s3://my-emr-logs/clusters/
```

## VPC and Subnet Configuration

Running EMR in a VPC gives you network isolation and control. Here's how to set up the networking.

This configures the cluster to run in a specific subnet with custom security groups.

```bash
aws emr create-cluster \
  --name "vpc-cluster" \
  --release-label emr-7.0.0 \
  --applications Name=Spark Name=Hadoop \
  --instance-type m5.xlarge \
  --instance-count 3 \
  --use-default-roles \
  --ec2-attributes '{
    "KeyName": "my-keypair",
    "SubnetId": "subnet-abc123",
    "EmrManagedMasterSecurityGroup": "sg-master123",
    "EmrManagedSlaveSecurityGroup": "sg-core123",
    "AdditionalMasterSecurityGroups": ["sg-ssh-access"],
    "ServiceAccessSecurityGroup": "sg-service123"
  }' \
  --log-uri s3://my-emr-logs/clusters/
```

Make sure your subnet has:
- A route to S3 (either through a NAT gateway or an S3 VPC endpoint)
- DNS resolution enabled
- Enough available IP addresses for all your nodes

## Using CloudFormation

For repeatable deployments, define your cluster in CloudFormation.

This CloudFormation template defines an EMR cluster with all the essential configuration.

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  EMRCluster:
    Type: AWS::EMR::Cluster
    Properties:
      Name: cf-emr-cluster
      ReleaseLabel: emr-7.0.0
      Applications:
        - Name: Spark
        - Name: Hadoop
        - Name: Hive
      Instances:
        MasterInstanceGroup:
          InstanceCount: 1
          InstanceType: m5.xlarge
          Market: ON_DEMAND
        CoreInstanceGroup:
          InstanceCount: 2
          InstanceType: m5.xlarge
          Market: ON_DEMAND
        Ec2SubnetId: !Ref SubnetId
        Ec2KeyName: !Ref KeyPair
      ServiceRole: EMR_DefaultRole
      JobFlowRole: EMR_EC2_DefaultRole
      LogUri: !Sub 's3://${LogBucket}/emr-logs/'
      VisibleToAllUsers: true
```

## Monitoring Your Cluster

Once the cluster is up, keep an eye on it. EMR publishes metrics to CloudWatch, and you can SSH into the master node to access the Spark UI.

```bash
# SSH into the master node
aws emr ssh --cluster-id j-XXXXXXXXXXXXX --key-pair-file my-keypair.pem

# Set up a SOCKS proxy for web UIs
aws emr socks --cluster-id j-XXXXXXXXXXXXX --key-pair-file my-keypair.pem
```

For long-running clusters, set up CloudWatch alarms on HDFS utilization and YARN memory usage. If you're using [OneUptime for infrastructure monitoring](https://oneuptime.com/blog/post/run-apache-spark-jobs-on-amazon-emr/view), you can integrate these metrics for a unified view alongside your application monitoring.

## Cluster Lifecycle

Finally, decide whether you need a long-running cluster or a transient one. Transient clusters start, run your steps, and terminate automatically. They're cheaper and cleaner.

This creates a transient cluster that runs a Spark job and then shuts down.

```bash
aws emr create-cluster \
  --name "transient-job" \
  --release-label emr-7.0.0 \
  --applications Name=Spark \
  --instance-type m5.xlarge \
  --instance-count 3 \
  --use-default-roles \
  --auto-terminate \
  --steps Type=Spark,Name="MySparkJob",ActionOnFailure=TERMINATE_CLUSTER,Args=[--deploy-mode,cluster,--class,com.example.Main,s3://my-jars/app.jar] \
  --log-uri s3://my-emr-logs/clusters/
```

Getting your EMR cluster setup right from the start saves a ton of headaches down the road. Start with the basics, tune as you go, and always keep an eye on costs - those nodes add up fast.
