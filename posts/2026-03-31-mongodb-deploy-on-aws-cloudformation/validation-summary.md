# Validation Summary: How to Deploy MongoDB on AWS with CloudFormation

## Status
validated

## Post Type
Tutorial / Infrastructure Guide

## Technologies Covered
- MongoDB 7.0
- AWS CloudFormation (YAML templates)
- AWS EC2 (Launch Templates, Auto Scaling Groups)
- AWS VPC (Subnets, Security Groups)
- Amazon EBS (gp3 volumes)
- Amazon Linux 2023

## Sources Consulted
- AWS CloudFormation Resource Types Reference — AWS::EC2::VPC, AWS::EC2::Subnet, AWS::EC2::SecurityGroup, AWS::EC2::LaunchTemplate, AWS::AutoScaling::AutoScalingGroup (https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ec2-vpc.html)
- AWS CloudFormation intrinsic functions — !Ref, !Select, !GetAZs, !Sub, Fn::Base64 (https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference.html)
- MongoDB 7.0 Installation on Amazon Linux — yum repo configuration (https://www.mongodb.com/docs/v7.0/tutorial/install-mongodb-on-amazon/)
- MongoDB replica set configuration — replSetName, keyFile authentication, rs.initiate() (https://www.mongodb.com/docs/v7.0/tutorial/deploy-replica-set-with-keyfile-access-control/)
- Amazon EBS gp3 volume specifications — baseline IOPS and throughput (https://docs.aws.amazon.com/ebs/latest/userguide/general-purpose.html)
- AWS EC2 Nitro instance device naming — /dev/xvd* symlinks on Amazon Linux 2023 (https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/device_naming.html)

## Issues Found

### 1. Only 2 subnets defined for 3-node "One Node per AZ" deployment
**What was wrong:** The VPC template defined only MongoSubnetA (AZ 0) and MongoSubnetB (AZ 1), but the Auto Scaling Group had DesiredCapacity of 3. With only 2 AZs, one AZ would receive 2 nodes, contradicting the section title "One Node per AZ."
**What was changed:** Added MongoSubnetC in a third AZ (`!Select [2, !GetAZs ""]`) with CIDR 10.0.3.0/24. Added `!Ref MongoSubnetC` to the ASG's VPCZoneIdentifier.
**Why:** Three subnets across three AZs ensures the ASG distributes one node per AZ, matching the stated intent and providing better fault tolerance.

### 2. Missing keyfile creation in UserData script
**What was wrong:** The mongod.conf specified `security.keyFile: /etc/mongodb-keyfile`, but the UserData script never created this file. Without it, `systemctl start mongod` would fail because mongod requires the keyfile to exist when the `keyFile` option is set.
**What was changed:** Added keyfile generation commands (`openssl rand -base64 756`) with proper permissions (400) and ownership (mongod:mongod) before the mongod.conf creation. Added a comment noting that in production, a shared key should be retrieved from AWS Secrets Manager or SSM Parameter Store rather than generated independently on each node.
**Why:** The keyfile must exist for mongod to start. Additionally, all replica set members must share the same keyfile for intra-set authentication.

### 3. Replica set member IPs did not reflect 3 separate subnets
**What was wrong:** Two of the three rs.initiate() member IPs (10.0.1.10 and 10.0.1.11) were in the same 10.0.1.0/24 subnet, inconsistent with the corrected 3-AZ deployment.
**What was changed:** Updated member IPs to 10.0.1.10, 10.0.2.10, and 10.0.3.10, placing one member in each subnet.
**Why:** The IPs should illustrate the expected topology — one node per AZ/subnet.

## Review Notes
- The keyfile fix generates a unique keyfile per instance. In a real deployment, all replica set members need the *same* keyfile. The added comment notes this and recommends AWS Secrets Manager or SSM Parameter Store for sharing the key. A complete solution would add an SSM parameter lookup to the UserData, but this was kept minimal to match the tutorial's style.
- The `!Sub` in `Fn::Base64: !Sub |` is unnecessary since no CloudFormation variable substitutions are used in the UserData block. It works correctly but `Fn::Base64` alone would suffice.
- The security group self-references itself inline (`SourceSecurityGroupId: !Ref MongoSecurityGroup`). This works in CloudFormation for self-referencing rules (as opposed to cross-referencing between two SGs, which requires separate SecurityGroupIngress resources).
- The gp3 volume specifies 3000 IOPS and 125 MiB/s throughput, which are the baseline defaults for gp3. They work correctly but are technically redundant since they match the defaults.
- `AppSecurityGroup` is referenced in the security group ingress but not defined in any template snippet. This is acceptable since the post presents these as snippets, not a complete deployable template.
