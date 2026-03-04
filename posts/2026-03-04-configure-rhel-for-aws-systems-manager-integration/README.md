# How to Configure RHEL for AWS Systems Manager Integration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, AWS, Systems Manager, SSM, Cloud

Description: Set up AWS Systems Manager (SSM) Agent on RHEL instances so you can manage them remotely without SSH, run commands, and collect inventory.

---

AWS Systems Manager lets you manage EC2 instances remotely, run commands, collect inventory, and patch systems. On RHEL, you need the SSM Agent installed and a proper IAM role attached to the instance.

## Prerequisites

Your EC2 instance needs an IAM instance profile with the `AmazonSSMManagedInstanceCore` policy. Attach it at launch or afterwards:

```bash
# Create an instance profile with the SSM managed policy
aws iam create-role \
  --role-name SSMRoleForRHEL \
  --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ec2.amazonaws.com"},"Action":"sts:AssumeRole"}]}'

aws iam attach-role-policy \
  --role-name SSMRoleForRHEL \
  --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore

aws iam create-instance-profile --instance-profile-name SSMProfileRHEL
aws iam add-role-to-instance-profile \
  --instance-profile-name SSMProfileRHEL \
  --role-name SSMRoleForRHEL
```

## Installing the SSM Agent

On RHEL 8 and 9, the SSM Agent is not pre-installed on all AMIs. Install it manually:

```bash
# Install the SSM Agent on RHEL 8/9
sudo dnf install -y https://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/linux_amd64/amazon-ssm-agent.rpm

# Enable and start the agent
sudo systemctl enable amazon-ssm-agent
sudo systemctl start amazon-ssm-agent

# Verify it is running
sudo systemctl status amazon-ssm-agent
```

## Verifying Connectivity

After a few minutes, the instance should appear in the Systems Manager console. You can also check from the CLI:

```bash
# List managed instances (run from your local machine with AWS CLI)
aws ssm describe-instance-information \
  --query "InstanceInformationList[*].[InstanceId,PlatformName,PlatformVersion,AgentVersion]" \
  --output table
```

## Running Commands Remotely

Use the `send-command` API to run shell commands on your RHEL instance:

```bash
# Run a command on the instance via SSM
aws ssm send-command \
  --instance-ids i-0abcdef1234567890 \
  --document-name "AWS-RunShellScript" \
  --parameters '{"commands":["hostname","cat /etc/redhat-release","uptime"]}'
```

## Troubleshooting

If the instance does not appear as managed, check the agent log:

```bash
# View SSM Agent logs
sudo tail -50 /var/log/amazon/ssm/amazon-ssm-agent.log
```

Common issues include missing IAM roles, blocked outbound HTTPS (port 443) to SSM endpoints, and outdated agent versions.
