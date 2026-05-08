# How to Install Rancher Using Pulumi

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Pulumi, IaC, Installation, Cloud

Description: Deploy Rancher using Pulumi for infrastructure as code with your favorite programming language.

Pulumi is a modern Infrastructure as Code platform that lets you define infrastructure using general-purpose programming languages like TypeScript, Python, Go, and C#. This guide demonstrates how to deploy Rancher using Pulumi with TypeScript, provisioning AWS infrastructure and installing Rancher automatically.

## Prerequisites

- Pulumi CLI installed
- A supported Node.js version installed (use an active LTS release such as Node.js 22 or 24)
- AWS CLI configured with credentials
- An existing EC2 key pair in AWS and the matching private key on your machine
- A Pulumi account (free tier available)
- A DNS hostname for Rancher

## Step 1: Create a New Pulumi Project

```bash
mkdir rancher-pulumi && cd rancher-pulumi
pulumi new aws-typescript --name rancher-deployment --yes
```

## Step 2: Install Required Packages

```bash
npm install @pulumi/aws @pulumi/command @pulumi/pulumi
```

## Step 3: Define the Configuration

Set the Pulumi configuration values:

```bash
pulumi config set aws:region us-east-1
pulumi config set rancherHostname rancher.example.com
pulumi config set --secret rancherBootstrapPassword replace-with-a-unique-password
pulumi config set keyName your-aws-key-pair
pulumi config set sshPrivateKeyPath ~/.ssh/id_rsa
```

## Step 4: Write the Infrastructure Code

Replace the contents of `index.ts` with the following:

```typescript
// index.ts
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as command from "@pulumi/command";
import * as fs from "fs";

const config = new pulumi.Config();
const rancherHostname = config.require("rancherHostname");
const rancherBootstrapPassword = config.requireSecret("rancherBootstrapPassword");
const keyName = config.require("keyName");
const sshPrivateKeyPath = config.require("sshPrivateKeyPath");

// Look up the latest Ubuntu 22.04 AMI
const ubuntu = aws.ec2.getAmi({
  mostRecent: true,
  owners: ["099720109477"],
  filters: [
    {
      name: "name",
      values: ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"],
    },
  ],
});

// Create a security group
const securityGroup = new aws.ec2.SecurityGroup("rancher-sg", {
  description: "Security group for Rancher server",
  ingress: [
    { protocol: "tcp", fromPort: 22, toPort: 22, cidrBlocks: ["0.0.0.0/0"] },
    { protocol: "tcp", fromPort: 80, toPort: 80, cidrBlocks: ["0.0.0.0/0"] },
    { protocol: "tcp", fromPort: 443, toPort: 443, cidrBlocks: ["0.0.0.0/0"] },
    { protocol: "tcp", fromPort: 6443, toPort: 6443, cidrBlocks: ["0.0.0.0/0"] },
  ],
  egress: [
    { protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] },
  ],
});

// Create the EC2 instance
const server = new aws.ec2.Instance("rancher-server", {
  ami: ubuntu.then((u) => u.id),
  instanceType: "t3.medium",
  keyName: keyName,
  vpcSecurityGroupIds: [securityGroup.id],
  rootBlockDevice: {
    volumeSize: 50,
    volumeType: "gp3",
  },
  tags: {
    Name: "rancher-server",
  },
});

// Allocate an Elastic IP
const eip = new aws.ec2.Eip("rancher-eip", {
  instance: server.id,
  domain: "vpc",
});

// Install Rancher via SSH
const installRancher = new command.remote.Command(
  "install-rancher",
  {
    connection: {
      host: eip.publicIp,
      user: "ubuntu",
      privateKey: fs.readFileSync(
        sshPrivateKeyPath.replace("~", process.env.HOME || ""),
        "utf8"
      ),
    },
    create: pulumi.interpolate`
      set -eu

      # Wait for cloud-init
      cloud-init status --wait

      # Install K3s
      curl -sfL https://get.k3s.io | sh -s - --write-kubeconfig-mode 644
      export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
      until kubectl get nodes >/dev/null 2>&1; do sleep 5; done
      kubectl wait --for=condition=Ready nodes --all --timeout=300s

      # Install Helm
      curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

      # Install cert-manager
      helm repo add jetstack https://charts.jetstack.io --force-update
      helm repo add rancher-stable https://releases.rancher.com/server-charts/stable --force-update
      helm repo update
      helm upgrade --install cert-manager jetstack/cert-manager \
        --namespace cert-manager \
        --create-namespace \
        --set crds.enabled=true
      kubectl -n cert-manager rollout status deploy/cert-manager --timeout=300s
      kubectl -n cert-manager rollout status deploy/cert-manager-cainjector --timeout=300s
      kubectl -n cert-manager rollout status deploy/cert-manager-webhook --timeout=300s

      # Install Rancher
      kubectl get namespace cattle-system >/dev/null 2>&1 || kubectl create namespace cattle-system
      helm upgrade --install rancher rancher-stable/rancher \
        --namespace cattle-system \
        --set hostname=${rancherHostname} \
        --set bootstrapPassword=${rancherBootstrapPassword} \
        --set replicas=1

      # Wait for Rancher
      kubectl -n cattle-system rollout status deploy/rancher --timeout=300s
    `,
  },
  { dependsOn: [eip] }
);

// Export outputs
export const publicIp = eip.publicIp;
export const rancherUrl = pulumi.interpolate`https://${rancherHostname}`;
```

## Step 5: Deploy the Stack

Preview the changes:

```bash
pulumi preview
```

Deploy the infrastructure:

```bash
pulumi up
```

Review the proposed changes and confirm when prompted.

## Step 6: Get the Outputs

After deployment completes:

```bash
pulumi stack output publicIp
pulumi stack output rancherUrl
```

## Step 7: Configure DNS and Access Rancher

Point your hostname to the Elastic IP from the output and navigate to your Rancher URL in a browser. Log in with the bootstrap password and set your admin credentials.

## Managing the Stack

Check the current state:

```bash
pulumi stack
```

Update the configuration and redeploy:

```bash
pulumi config set rancherHostname new-hostname.example.com
pulumi up
```

## Destroying the Infrastructure

When you no longer need the deployment:

```bash
pulumi destroy
```

This removes all AWS resources managed by Pulumi.

## Advantages of Using Pulumi

Using Pulumi for Rancher deployment offers several benefits over traditional approaches. You get full IDE support with autocompletion and type checking, the ability to use loops, conditionals, and functions in your infrastructure code, built-in state management with Pulumi Cloud, and the ability to write tests for your infrastructure using standard testing frameworks.

## Summary

You have deployed Rancher using Pulumi with TypeScript. This IaC approach gives you the expressiveness of a full programming language combined with the reproducibility of infrastructure automation. The Pulumi stack can be shared across teams, stored in version control, and extended with additional resources as your needs grow.
