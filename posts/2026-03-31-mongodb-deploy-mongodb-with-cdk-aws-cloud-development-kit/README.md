# How to Deploy MongoDB with CDK (AWS Cloud Development Kit)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, AWS, CDK

Description: Deploy a production-ready MongoDB replica set on AWS using CDK, with EC2 instances, EBS volumes, security groups, and automated initialization.

---

## Why Use CDK for MongoDB on AWS

AWS CDK lets you define cloud infrastructure in TypeScript, Python, or other languages, generating CloudFormation templates under the hood. For MongoDB, this means your EC2 instances, EBS volumes, security groups, and IAM roles are all version-controlled alongside your application code. Changes go through code review before touching production.

## Project Setup

```bash
mkdir mongodb-cdk && cd mongodb-cdk
npx cdk init app --language typescript
```

## VPC and Security Group

```typescript
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';

export class MongodbStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'MongoVpc', {
      maxAzs: 3,
      natGateways: 1,
    });

    const mongoSg = new ec2.SecurityGroup(this, 'MongoSG', {
      vpc,
      description: 'MongoDB replica set security group',
    });

    // Allow MongoDB traffic within the security group
    mongoSg.addIngressRule(
      mongoSg,
      ec2.Port.tcp(27017),
      'Allow MongoDB intra-cluster'
    );

    // Allow SSH from bastion (replace with your CIDR)
    mongoSg.addIngressRule(
      ec2.Peer.ipv4('10.0.0.0/8'),
      ec2.Port.tcp(22),
      'SSH from internal'
    );
  }
}
```

## EC2 Instances with EBS Volumes

```typescript
const userData = ec2.UserData.forLinux();
userData.addCommands(
  'curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg',
  'echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" > /etc/apt/sources.list.d/mongodb-org-7.0.list',
  'apt-get update && apt-get install -y mongodb-org',
  'systemctl enable mongod && systemctl start mongod'
);

const mongoRole = new iam.Role(this, 'MongoRole', {
  assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
  managedPolicies: [
    iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
  ],
});

const primaryNode = new ec2.Instance(this, 'MongoPrimary', {
  vpc,
  vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  instanceType: ec2.InstanceType.of(ec2.InstanceClass.R6I, ec2.InstanceSize.XLARGE),
  machineImage: ec2.MachineImage.fromSsmParameter(
    '/aws/service/canonical/ubuntu/server/22.04/stable/current/amd64/hvm/ebs-gp2/ami-id'
  ),
  securityGroup: mongoSg,
  role: mongoRole,
  userData,
  blockDevices: [
    {
      deviceName: '/dev/sdf',
      volume: ec2.BlockDeviceVolume.ebs(500, {
        volumeType: ec2.EbsDeviceVolumeType.GP3,
        iops: 3000,
        throughput: 125,
        encrypted: true,
      }),
    },
  ],
});
```

## Outputs

```typescript
new cdk.CfnOutput(this, 'PrimaryPrivateIp', {
  value: primaryNode.instancePrivateIp,
  description: 'MongoDB primary private IP',
});
```

## Deploying

```bash
# Bootstrap your AWS account for CDK
npx cdk bootstrap aws://ACCOUNT_ID/us-east-1

# Preview the changes
npx cdk diff

# Deploy the stack
npx cdk deploy MongodbStack
```

## Destroying Resources

```bash
npx cdk destroy MongodbStack
```

## Summary

AWS CDK provides a type-safe, programmable approach to deploying MongoDB infrastructure on AWS. By defining your EC2 instances, EBS volumes, VPC configuration, and security groups in TypeScript, you get IntelliSense support, compile-time checks, and easy parametrization across environments. Pair this with AWS Systems Manager for operational access without opening SSH ports to the internet.
