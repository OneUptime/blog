# How to Migrate from Amazon Linux 2 to RHEL on AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Amazon Linux, AWS, Migration, Cloud

Description: Migrate workloads from Amazon Linux 2 to RHEL on AWS using a parallel EC2 instance approach with minimal downtime.

---

Amazon Linux 2 reaches end of standard support in June 2025. If you need a commercially supported OS on AWS, RHEL is a strong choice. Since there is no in-place conversion from Amazon Linux to RHEL, you need to launch a new RHEL instance and migrate your workloads.

## Step 1: Audit the Amazon Linux 2 Instance

```bash
# On Amazon Linux 2: Document installed packages
rpm -qa --queryformat '%{NAME}\n' | sort > /tmp/al2-packages.txt

# List running services
systemctl list-units --type=service --state=running > /tmp/al2-services.txt

# Document instance metadata
curl -s http://169.254.169.254/latest/meta-data/instance-type
curl -s http://169.254.169.254/latest/meta-data/placement/availability-zone

# Export security group and IAM role info
aws ec2 describe-instances --instance-ids $(curl -s http://169.254.169.254/latest/meta-data/instance-id) \
  --query 'Reservations[0].Instances[0].[SecurityGroups,IamInstanceProfile]'
```

## Step 2: Launch a RHEL Instance

```bash
# Find the latest RHEL 9 AMI in your region
aws ec2 describe-images \
  --owners 309956199498 \
  --filters "Name=name,Values=RHEL-9*_HVM-*-x86_64*" \
  --query 'sort_by(Images, &CreationDate)[-1].[ImageId,Name]' \
  --output text

# Launch the RHEL instance with the same instance type and security groups
aws ec2 run-instances \
  --image-id ami-0abcdef1234567890 \
  --instance-type m5.xlarge \
  --key-name your-key \
  --security-group-ids sg-12345678 \
  --iam-instance-profile Name=your-iam-role \
  --subnet-id subnet-12345678
```

## Step 3: Install Equivalent Packages on RHEL

```bash
# Register with Red Hat (or use RHEL BYOS AMI with Cloud Access)
sudo subscription-manager register --auto-attach

# Amazon Linux 2 extras -> RHEL Application Streams
# Map your AL2 extras to RHEL modules
# AL2: amazon-linux-extras install nginx1
# RHEL: dnf install nginx
sudo dnf install nginx postgresql-server python3

# Install AWS CLI (pre-installed on AL2, manual on RHEL)
sudo dnf install unzip
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip && sudo ./aws/install
```

## Step 4: Migrate EBS Data Volumes

If your data is on separate EBS volumes, detach and reattach:

```bash
# Detach the data volume from the AL2 instance
aws ec2 detach-volume --volume-id vol-1234567890abcdef0

# Attach it to the RHEL instance
aws ec2 attach-volume --volume-id vol-1234567890abcdef0 \
  --instance-id i-0rhel1234567890 --device /dev/xvdf

# On RHEL: Mount the volume
sudo mkdir -p /data
sudo mount /dev/xvdf1 /data

# Add to fstab
echo "UUID=$(sudo blkid -s UUID -o value /dev/xvdf1) /data xfs defaults 0 2" | sudo tee -a /etc/fstab
```

## Step 5: Migrate Application Configuration

```bash
# Copy configs from AL2 to RHEL
scp -i your-key.pem ec2-user@al2-host:/etc/nginx/conf.d/* /tmp/
sudo cp /tmp/*.conf /etc/nginx/conf.d/

# Set SELinux contexts (AL2 does not use SELinux by default)
sudo restorecon -Rv /etc/nginx/
sudo restorecon -Rv /data/

# Test the configuration
sudo nginx -t
```

## Step 6: Switch the Elastic IP

```bash
# Move the Elastic IP from AL2 to RHEL for zero-DNS-change cutover
aws ec2 disassociate-address --association-id eipassoc-al2instance
aws ec2 associate-address --instance-id i-0rhel1234567890 --allocation-id eipalloc-12345678
```

This approach ensures your application keeps the same public IP and the migration appears seamless to clients.
