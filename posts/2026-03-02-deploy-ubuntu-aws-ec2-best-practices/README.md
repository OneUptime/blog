# How to Deploy Ubuntu on AWS EC2 with Best Practices

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, AWS, EC2, Cloud, Security

Description: A thorough guide to deploying Ubuntu on AWS EC2 with best practices covering instance selection, security hardening, storage configuration, and monitoring setup.

---

Deploying Ubuntu on AWS EC2 is straightforward at the surface - click through the console, launch an instance, and you have a running server. But doing it well requires attention to instance sizing, storage choices, network security, OS hardening, and monitoring. Skipping these steps leads to servers that are expensive, insecure, or both.

This guide covers the decisions and configurations that matter for a production-ready Ubuntu EC2 instance.

## Choosing the Right Instance Type

EC2 instance types are organized into families based on their intended workload:

| Family | Use Case |
|--------|----------|
| t3/t4g | Burstable general purpose - dev, test, low traffic web |
| m6i/m7g | Balanced compute/memory - application servers |
| c6i/c7g | Compute-optimized - CPU-intensive workloads |
| r6i/r7g | Memory-optimized - databases, caches |
| i3/i4i | Storage-optimized - high IOPS workloads |

The `g` suffix (Graviton) instances run on ARM64 and are typically 10-20% cheaper with similar or better performance for most workloads. Ubuntu supports Graviton natively.

Avoid over-provisioning. Start with a t3.medium or t3.large for most applications, then resize based on actual CloudWatch metrics after a week of production load.

## Selecting the Right Ubuntu AMI

AWS maintains official Ubuntu AMIs. Always use these rather than community AMIs to ensure you have verified builds with security patches.

Finding the latest official AMI via CLI:

```bash
# Find the latest Ubuntu 24.04 LTS AMI for us-east-1
aws ec2 describe-images \
  --owners 099720109477 \
  --filters \
    "Name=name,Values=ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*" \
    "Name=state,Values=available" \
  --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
  --output text \
  --region us-east-1
```

The owner ID `099720109477` is Canonical's official AWS account. Using this filter ensures you never accidentally use an unofficial AMI.

## Storage Configuration

### Choosing Between gp2 and gp3

Always choose **gp3** over gp2 for new instances. gp3 provides 3,000 IOPS and 125 MB/s throughput baseline at a lower cost than gp2, with the ability to provision up to 16,000 IOPS independently of volume size.

### Root Volume Sizing

The default 8GB root volume is insufficient for most production workloads. A minimum of 20GB is recommended, with 50GB or more for servers running containers or storing logs locally.

When launching via CLI or Terraform:

```bash
# Launch with a 50GB gp3 root volume
aws ec2 run-instances \
  --image-id ami-0abcdef1234567890 \
  --instance-type t3.medium \
  --key-name my-keypair \
  --block-device-mappings '[{
    "DeviceName": "/dev/sda1",
    "Ebs": {
      "VolumeSize": 50,
      "VolumeType": "gp3",
      "Iops": 3000,
      "Encrypted": true,
      "DeleteOnTermination": true
    }
  }]'
```

### Encrypting EBS Volumes

Always encrypt EBS volumes. This can be enforced at the account level:

```bash
# Enable default EBS encryption for the region
aws ec2 enable-ebs-encryption-by-default --region us-east-1
```

With default encryption enabled, all new EBS volumes are encrypted automatically.

## Security Group Configuration

Security groups are stateful firewalls. Follow the principle of least privilege:

```bash
# Create a security group for a web server
aws ec2 create-security-group \
  --group-name web-server-sg \
  --description "Security group for web servers"

# Allow HTTPS from anywhere
aws ec2 authorize-security-group-ingress \
  --group-id sg-0123456789abcdef0 \
  --protocol tcp --port 443 --cidr 0.0.0.0/0

# Allow HTTP (for redirect only)
aws ec2 authorize-security-group-ingress \
  --group-id sg-0123456789abcdef0 \
  --protocol tcp --port 80 --cidr 0.0.0.0/0

# Allow SSH only from your organization's IP range
aws ec2 authorize-security-group-ingress \
  --group-id sg-0123456789abcdef0 \
  --protocol tcp --port 22 --cidr 203.0.113.0/24
```

Never open SSH to `0.0.0.0/0` in production. Use a bastion host, AWS Systems Manager Session Manager, or restrict to known IP ranges.

## IAM Instance Profile

Attach an IAM instance profile so the instance can interact with AWS services without storing credentials:

```bash
# Create a role for EC2
aws iam create-role \
  --role-name ec2-web-server-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ec2.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

# Attach SSM policy to allow Session Manager access (avoids SSH entirely)
aws iam attach-role-policy \
  --role-name ec2-web-server-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore

# Create instance profile and attach role
aws iam create-instance-profile --instance-profile-name ec2-web-server-profile
aws iam add-role-to-instance-profile \
  --instance-profile-name ec2-web-server-profile \
  --role-name ec2-web-server-role
```

## User Data for Initial Configuration

Use EC2 User Data to automate setup on first boot:

```bash
#!/bin/bash
# user-data.sh - Runs once on first boot

# Update all packages
apt-get update -y
apt-get upgrade -y

# Install common tools
apt-get install -y \
  unattended-upgrades \
  fail2ban \
  awscli \
  amazon-cloudwatch-agent \
  curl \
  jq

# Configure unattended security upgrades
cat > /etc/apt/apt.conf.d/50unattended-upgrades << 'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
};
Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::Mail "ops@example.com";
EOF

dpkg-reconfigure -f noninteractive unattended-upgrades

# Harden SSH
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin no/' /etc/ssh/sshd_config
systemctl restart sshd

# Configure fail2ban
systemctl enable fail2ban
systemctl start fail2ban

# Set timezone
timedatectl set-timezone UTC

# Signal completion
touch /var/log/user-data-complete
```

Pass this during instance launch:

```bash
aws ec2 run-instances \
  --image-id ami-0abcdef1234567890 \
  --instance-type t3.medium \
  --user-data file://user-data.sh \
  --iam-instance-profile Name=ec2-web-server-profile \
  --security-group-ids sg-0123456789abcdef0
```

## OS-Level Hardening

After the instance is running, apply additional hardening:

```bash
# Disable IPv6 if not needed
sudo sysctl -w net.ipv6.conf.all.disable_ipv6=1
echo "net.ipv6.conf.all.disable_ipv6=1" | sudo tee -a /etc/sysctl.d/99-disable-ipv6.conf

# Enable and configure UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 443/tcp
sudo ufw allow 80/tcp
sudo ufw enable

# Configure automatic security updates
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure unattended-upgrades
```

## CloudWatch Monitoring

Install and configure the CloudWatch agent to collect system metrics:

```bash
# Install CloudWatch agent
sudo apt install amazon-cloudwatch-agent -y

# Create configuration
sudo tee /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << 'EOF'
{
  "metrics": {
    "namespace": "CWAgent",
    "metrics_collected": {
      "mem": {
        "measurement": ["mem_used_percent"],
        "metrics_collection_interval": 60
      },
      "disk": {
        "measurement": ["disk_used_percent"],
        "resources": ["/"],
        "metrics_collection_interval": 60
      },
      "cpu": {
        "measurement": ["cpu_usage_idle", "cpu_usage_user"],
        "totalcpu": true,
        "metrics_collection_interval": 60
      }
    }
  }
}
EOF

# Start the agent
sudo systemctl enable amazon-cloudwatch-agent
sudo systemctl start amazon-cloudwatch-agent
```

## Elastic IP and DNS

For production servers, allocate an Elastic IP to maintain a stable IP address across reboots and instance replacements:

```bash
# Allocate an Elastic IP
aws ec2 allocate-address --domain vpc

# Associate with instance
aws ec2 associate-address \
  --instance-id i-0123456789abcdef0 \
  --allocation-id eipalloc-0123456789abcdef0
```

Point your domain's A record to this Elastic IP using Route 53 or your DNS provider.

## Cost Optimization

- Use Reserved Instances or Savings Plans for instances that run continuously - savings of 40-60% over On-Demand pricing
- Enable detailed monitoring only when needed (costs extra per metric)
- Set up AWS Cost Explorer alerts for budget thresholds
- Stop non-production instances outside business hours using AWS Instance Scheduler

## Summary

A production-ready Ubuntu EC2 deployment involves more than clicking launch. Choose instance types based on workload characteristics, use official Canonical AMIs, encrypt storage, restrict security groups to required ports, automate initial configuration with User Data, and set up CloudWatch monitoring. These practices together produce instances that are secure, cost-efficient, and observable from day one.
