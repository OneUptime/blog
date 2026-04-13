# How to Deploy MongoDB on AWS with CloudFormation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, AWS, CloudFormation, Infrastructure

Description: Learn how to deploy a production-ready MongoDB replica set on AWS EC2 using CloudFormation templates with VPC, security groups, and EBS volumes.

---

## Overview

AWS CloudFormation lets you define infrastructure as JSON or YAML templates. This guide walks through deploying a three-node MongoDB replica set on EC2 instances, with dedicated EBS volumes for data, inside a VPC with proper security groups.

## VPC and Network Stack

Create a separate VPC stack for networking. Here is a minimal template snippet:

```yaml
AWSTemplateFormatVersion: "2010-09-09"
Description: VPC for MongoDB replica set

Resources:
  MongoVPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16
      EnableDnsSupport: true
      EnableDnsHostnames: true
      Tags:
        - Key: Name
          Value: mongo-vpc

  MongoSubnetA:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref MongoVPC
      CidrBlock: 10.0.1.0/24
      AvailabilityZone: !Select [0, !GetAZs ""]

  MongoSubnetB:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref MongoVPC
      CidrBlock: 10.0.2.0/24
      AvailabilityZone: !Select [1, !GetAZs ""]

  MongoSubnetC:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref MongoVPC
      CidrBlock: 10.0.3.0/24
      AvailabilityZone: !Select [2, !GetAZs ""]
```

## Security Group

Allow MongoDB traffic (port 27017) only between replica set members and from your application subnet:

```yaml
  MongoSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: MongoDB replica set SG
      VpcId: !Ref MongoVPC
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 27017
          ToPort: 27017
          SourceSecurityGroupId: !Ref AppSecurityGroup
        - IpProtocol: tcp
          FromPort: 27017
          ToPort: 27017
          SourceSecurityGroupId: !Ref MongoSecurityGroup
```

Self-referencing the security group allows intra-replica-set communication.

## EC2 Launch Template with User Data

```yaml
  MongoLaunchTemplate:
    Type: AWS::EC2::LaunchTemplate
    Properties:
      LaunchTemplateName: mongo-rs-lt
      LaunchTemplateData:
        ImageId: !Ref LatestAmazonLinuxAMI
        InstanceType: r6i.large
        KeyName: !Ref KeyPairName
        SecurityGroupIds:
          - !Ref MongoSecurityGroup
        BlockDeviceMappings:
          - DeviceName: /dev/xvdf
            Ebs:
              VolumeSize: 100
              VolumeType: gp3
              Iops: 3000
              Throughput: 125
              Encrypted: true
              DeleteOnTermination: false
        UserData:
          Fn::Base64: !Sub |
            #!/bin/bash
            # Install MongoDB 7.0
            cat > /etc/yum.repos.d/mongodb-org-7.0.repo <<'EOF'
            [mongodb-org-7.0]
            name=MongoDB Repository
            baseurl=https://repo.mongodb.org/yum/amazon/2023/mongodb-org/7.0/x86_64/
            gpgcheck=1
            enabled=1
            gpgkey=https://www.mongodb.org/static/pgp/server-7.0.asc
            EOF
            yum install -y mongodb-org

            # Mount EBS data volume
            mkfs.xfs /dev/xvdf
            mkdir -p /data/mongodb
            echo "/dev/xvdf /data/mongodb xfs defaults 0 0" >> /etc/fstab
            mount -a
            chown -R mongod:mongod /data/mongodb

            # Create keyfile for replica set authentication
            # In production, retrieve a shared key from AWS Secrets Manager or SSM Parameter Store
            # All replica set members must use the same keyfile
            openssl rand -base64 756 > /etc/mongodb-keyfile
            chmod 400 /etc/mongodb-keyfile
            chown mongod:mongod /etc/mongodb-keyfile

            # Configure mongod
            cat > /etc/mongod.conf <<'EOF'
            storage:
              dbPath: /data/mongodb
            net:
              bindIp: 0.0.0.0
              port: 27017
            replication:
              replSetName: rs0
            security:
              keyFile: /etc/mongodb-keyfile
            EOF

            systemctl enable mongod
            systemctl start mongod
```

## Auto Scaling Group (One Node per AZ)

```yaml
  MongoASG:
    Type: AWS::AutoScaling::AutoScalingGroup
    Properties:
      MinSize: 3
      MaxSize: 3
      DesiredCapacity: 3
      LaunchTemplate:
        LaunchTemplateId: !Ref MongoLaunchTemplate
        Version: !GetAtt MongoLaunchTemplate.LatestVersionNumber
      VPCZoneIdentifier:
        - !Ref MongoSubnetA
        - !Ref MongoSubnetB
        - !Ref MongoSubnetC
      Tags:
        - Key: Name
          Value: mongo-rs-node
          PropagateAtLaunch: true
```

## Initializing the Replica Set

After the stack creates, SSH into one node and run:

```javascript
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "10.0.1.10:27017" },
    { _id: 1, host: "10.0.2.10:27017" },
    { _id: 2, host: "10.0.3.10:27017" }
  ]
})
```

## Summary

Deploy MongoDB on AWS by combining CloudFormation stacks for VPC, security groups, a launch template with EBS data volumes, and an Auto Scaling group pinned at three nodes spread across availability zones. Use `gp3` EBS volumes with dedicated IOPS and set `DeleteOnTermination: false` to preserve data across instance replacements. Restrict port 27017 to self-referencing security groups and application-tier SGs rather than opening it to the internet.
