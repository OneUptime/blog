# How to Migrate from Amazon Linux 2 to RHEL on AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, AWS, Migration, Amazon Linux

Description: Step-by-step guide on migrate from amazon linux 2 to RHEL on aws with practical examples and commands.

---

Migrating from Amazon Linux 2 to RHEL on AWS provides longer support and multi-cloud portability.

## Assessment

```bash
# On Amazon Linux 2
yum list installed > /tmp/al2-packages.txt
systemctl list-unit-files --state=enabled > /tmp/al2-services.txt
```

## Launch RHEL on AWS

```bash
# Find RHEL AMI
aws ec2 describe-images --owners 309956199498 \
  --filters "Name=name,Values=RHEL-9*" \
  --query 'Images[*].[ImageId,Name]' --output table

# Launch instance
aws ec2 run-instances \
  --image-id ami-XXXXX \
  --instance-type t3.medium \
  --key-name mykey \
  --security-group-ids sg-XXXXX \
  --subnet-id subnet-XXXXX
```

## Install AWS Tools on RHEL

```bash
sudo dnf install -y amazon-ssm-agent
sudo systemctl enable --now amazon-ssm-agent

# Install AWS CLI
sudo dnf install -y unzip
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

## Migrate Data

```bash
# Use rsync or AWS DataSync
rsync -aAXv al2-server:/var/www/ /var/www/
rsync -aAXv al2-server:/var/lib/mysql/ /var/lib/mysql/

# Or use EBS snapshots
aws ec2 create-snapshot --volume-id vol-XXXXX
```

## Update Load Balancer

```bash
# Register new RHEL instance with target group
aws elbv2 register-targets \
  --target-group-arn arn:aws:elasticloadbalancing:... \
  --targets Id=i-XXXXX
```

## Conclusion

Migrating from Amazon Linux 2 to RHEL on AWS gives you longer support lifecycle and the ability to run the same OS across AWS, Azure, GCP, and on-premises.

