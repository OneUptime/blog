# How to Deploy RHEL on AWS EC2 with Cloud-Init Customization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, AWS, EC2, cloud-init, Cloud, Automation, Linux

Description: Deploy RHEL instances on AWS EC2 with cloud-init user data to automate initial configuration, package installation, and service setup at launch.

---

Cloud-init is a standard tool for customizing cloud instances at boot time. When launching RHEL on AWS EC2, you can pass user data scripts that cloud-init executes on first boot to configure the system automatically.

## Launching RHEL on EC2 with User Data

### Using the AWS CLI

```bash
# Find the latest RHEL 9 AMI
AMI_ID=$(aws ec2 describe-images \
  --owners 309956199498 \
  --filters "Name=name,Values=RHEL-9.*_HVM-*-x86_64-*-Hourly2-GP3" \
  --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
  --output text)

echo "Using AMI: $AMI_ID"
```

### Creating a Cloud-Init User Data Script

```yaml
# cloud-init-userdata.yaml
#cloud-config

# Set the hostname
hostname: web-server-01
fqdn: web-server-01.example.com

# Configure timezone
timezone: America/New_York

# Install packages
packages:
  - httpd
  - mod_ssl
  - firewalld
  - vim-enhanced
  - git

# Create users
users:
  - name: webadmin
    groups: wheel
    sudo: ALL=(ALL) NOPASSWD:ALL
    ssh_authorized_keys:
      - ssh-ed25519 AAAAC3NzaC1lZDI1NTE5... webadmin@company

# Write configuration files
write_files:
  - path: /etc/httpd/conf.d/custom.conf
    content: |
      ServerName web-server-01.example.com
      <VirtualHost *:80>
        DocumentRoot /var/www/html
      </VirtualHost>
    permissions: '0644'

# Run commands on first boot
runcmd:
  - systemctl enable --now httpd
  - systemctl enable --now firewalld
  - firewall-cmd --permanent --add-service=http
  - firewall-cmd --permanent --add-service=https
  - firewall-cmd --reload
  - echo "Deployed on $(date)" > /var/www/html/index.html

# Final message
final_message: "Cloud-init completed after $UPTIME seconds"
```

### Launching the Instance

```bash
# Launch the EC2 instance with user data
aws ec2 run-instances \
  --image-id "$AMI_ID" \
  --instance-type t3.medium \
  --key-name my-keypair \
  --security-group-ids sg-0123456789abcdef \
  --subnet-id subnet-0123456789abcdef \
  --user-data file://cloud-init-userdata.yaml \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=web-server-01}]' \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":50,"VolumeType":"gp3"}}]'
```

## Verifying Cloud-Init Execution

After the instance launches, SSH in and check cloud-init status:

```bash
# Check cloud-init status
cloud-init status

# View cloud-init logs
cat /var/log/cloud-init-output.log

# Check that packages were installed
rpm -q httpd mod_ssl

# Verify services are running
systemctl status httpd
systemctl status firewalld
```

## Debugging Cloud-Init Issues

```bash
# Detailed cloud-init log
cat /var/log/cloud-init.log | tail -50

# Re-run cloud-init (for testing)
sudo cloud-init clean
sudo cloud-init init
sudo cloud-init modules --mode=config
sudo cloud-init modules --mode=final
```
