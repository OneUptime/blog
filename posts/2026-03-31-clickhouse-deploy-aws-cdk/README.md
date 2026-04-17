# How to Deploy ClickHouse on AWS CDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, AWS CDK, AWS, Infrastructure as Code, TypeScript

Description: Learn how to deploy ClickHouse on AWS using CDK constructs in TypeScript, covering EC2 instances, security groups, and EBS volume attachment.

---

## Why AWS CDK for ClickHouse

AWS CDK (Cloud Development Kit) lets you define AWS infrastructure in TypeScript, Python, or Java using high-level constructs. Compared to raw CloudFormation, CDK provides loops, helper methods, and reusable constructs - making it easier to build multi-node ClickHouse clusters programmatically.

## Project Setup

```bash
npm install -g aws-cdk
cdk init app --language typescript
npm install aws-cdk-lib constructs
```

## Stack Definition

```typescript
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export class ClickHouseStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromLookup(this, 'VPC', { isDefault: true });

    const sg = new ec2.SecurityGroup(this, 'ClickHouseSG', {
      vpc,
      description: 'ClickHouse security group',
      allowAllOutbound: true,
    });

    sg.addIngressRule(ec2.Peer.ipv4('10.0.0.0/8'), ec2.Port.tcp(8123), 'HTTP');
    sg.addIngressRule(ec2.Peer.ipv4('10.0.0.0/8'), ec2.Port.tcp(9000), 'Native TCP');

    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      'apt-get update',
      'apt-get install -y apt-transport-https ca-certificates curl gnupg',
      "curl -fsSL 'https://packages.clickhouse.com/rpm/lts/repodata/repomd.xml.key' | gpg --dearmor -o /usr/share/keyrings/clickhouse-keyring.gpg",
      'echo "deb [signed-by=/usr/share/keyrings/clickhouse-keyring.gpg] https://packages.clickhouse.com/deb lts main" > /etc/apt/sources.list.d/clickhouse.list',
      'apt-get update',
      'DEBIAN_FRONTEND=noninteractive apt-get install -y clickhouse-server clickhouse-client',
      'systemctl enable --now clickhouse-server',
    );

    const instance = new ec2.Instance(this, 'ClickHouseNode', {
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.M6I, ec2.InstanceSize.XLARGE2),
      machineImage: ec2.MachineImage.lookup({ name: 'ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-*' }),
      securityGroup: sg,
      userData,
    });

    const dataVolume = new ec2.Volume(this, 'ClickHouseData', {
      availabilityZone: instance.instanceAvailabilityZone,
      size: cdk.Size.gibibytes(500),
      volumeType: ec2.EbsDeviceVolumeType.GP3,
      encrypted: true,
    });

    dataVolume.grantAttachVolume(instance.grantPrincipal);

    new cdk.CfnOutput(this, 'PrivateIP', { value: instance.instancePrivateIp });
  }
}
```

## Deploying

```bash
cdk bootstrap
cdk diff
cdk deploy
```

## Multi-Node Cluster

```typescript
const nodeCount = 3;
Array.from({ length: nodeCount }, (_, i) =>
  new ec2.Instance(this, `ClickHouseNode${i}`, {
    vpc,
    instanceType: ec2.InstanceType.of(ec2.InstanceClass.M6I, ec2.InstanceSize.XLARGE2),
    machineImage: ec2.MachineImage.lookup({ name: 'ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-*' }),
    securityGroup: sg,
    userData,
  })
);
```

## Summary

AWS CDK deploys ClickHouse using TypeScript constructs for EC2 instances, security groups, and EBS volumes. Use `UserData.addCommands()` for bootstrap installation, attach encrypted GP3 volumes for data persistence, and use a loop for multi-node clusters. CDK's `diff` command lets you preview infrastructure changes before applying, similar to Terraform's `plan`.
