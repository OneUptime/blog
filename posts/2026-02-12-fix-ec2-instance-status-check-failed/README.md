# How to Fix EC2 Instance Status Check Failed (System/Instance)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, Monitoring, Troubleshooting, Infrastructure

Description: Diagnose and resolve EC2 system status check failures and instance status check failures, including causes, recovery steps, and prevention strategies.

---

EC2 runs two status checks on every instance, and when either one fails, your instance is in trouble. Understanding the difference between the two checks is the key to fixing them.

```bash
# Check the current status
aws ec2 describe-instance-status \
  --instance-ids i-1234567890abcdef0 \
  --query "InstanceStatuses[0].[SystemStatus.Status, InstanceStatus.Status]" \
  --output text
```

The output should say `ok ok`. If either says `impaired`, you've got a problem.

## System Status Check vs. Instance Status Check

These check different things, and the fix is different for each.

**System Status Check** verifies the AWS infrastructure your instance runs on:
- Physical host hardware
- Network connectivity at the hypervisor level
- Power to the host
- Software on the host system

When the system check fails, it's an AWS-side problem. You can't fix the underlying hardware, but you can move your instance to healthy hardware.

**Instance Status Check** verifies things inside your instance:
- Operating system boot
- Network configuration
- File system
- Kernel panics or errors

When the instance check fails, it's usually something in your OS or configuration.

## Fixing System Status Check Failures

System check failures mean the physical hardware or AWS infrastructure has a problem. Here's what to do.

### Option 1: Stop and Start (Not Reboot)

Stopping and starting an instance migrates it to a different physical host. This is the most common fix.

```bash
# Stop the instance
aws ec2 stop-instances --instance-ids i-1234567890abcdef0

# Wait for it to stop
aws ec2 wait instance-stopped --instance-ids i-1234567890abcdef0

# Start it on new hardware
aws ec2 start-instances --instance-ids i-1234567890abcdef0

# Wait for it to come up
aws ec2 wait instance-running --instance-ids i-1234567890abcdef0

# Check status again
aws ec2 describe-instance-status --instance-ids i-1234567890abcdef0
```

Important: A reboot doesn't help for system check failures because the instance stays on the same physical host. You need a full stop/start cycle.

Note that the public IP address will change after a stop/start (unless you're using an Elastic IP).

### Option 2: Instance Store Instances

If your instance uses instance store volumes (not EBS), you can't stop it - you can only terminate it. Data on instance store volumes is lost when the instance stops or terminates.

```bash
# Check if the instance has instance store volumes
aws ec2 describe-instances \
  --instance-ids i-1234567890abcdef0 \
  --query "Reservations[0].Instances[0].BlockDeviceMappings[*].[DeviceName,Ebs.VolumeId]"
```

If it's instance store backed, your options are limited:
1. Launch a new instance from the same AMI
2. Restore from your most recent backup

### Option 3: Wait for AWS to Fix It

Sometimes system status check failures are transient and AWS resolves them automatically. Check the AWS Health Dashboard for ongoing issues in your region.

```bash
# Check for scheduled events or maintenance
aws ec2 describe-instance-status \
  --instance-ids i-1234567890abcdef0 \
  --query "InstanceStatuses[0].Events"
```

## Fixing Instance Status Check Failures

Instance check failures are about your OS and software. These require investigation.

### Step 1: Get the System Log

The system log often reveals what went wrong during boot.

```bash
# Get console output
aws ec2 get-console-output \
  --instance-id i-1234567890abcdef0 \
  --output text
```

Look for:
- Kernel panics
- File system errors (`fsck` messages)
- Out of memory (OOM) kills
- Failed services
- Network configuration errors

### Step 2: Common Causes and Fixes

#### Corrupted File System

If the console output shows file system errors:

```
/dev/xvda1: UNEXPECTED INCONSISTENCY; RUN fsck MANUALLY.
```

Fix by detaching the volume and running fsck from another instance.

```bash
# Stop the problem instance
aws ec2 stop-instances --instance-ids i-1234567890abcdef0
aws ec2 wait instance-stopped --instance-ids i-1234567890abcdef0

# Detach the root volume
ROOT_VOLUME=$(aws ec2 describe-instances \
  --instance-ids i-1234567890abcdef0 \
  --query "Reservations[0].Instances[0].BlockDeviceMappings[0].Ebs.VolumeId" \
  --output text)

aws ec2 detach-volume --volume-id $ROOT_VOLUME

# Attach to a rescue instance
aws ec2 attach-volume \
  --volume-id $ROOT_VOLUME \
  --instance-id i-RESCUE \
  --device /dev/xvdf

# On the rescue instance, run fsck
sudo fsck /dev/xvdf1

# Reattach to original instance and start
aws ec2 detach-volume --volume-id $ROOT_VOLUME
aws ec2 attach-volume \
  --volume-id $ROOT_VOLUME \
  --instance-id i-1234567890abcdef0 \
  --device /dev/xvda

aws ec2 start-instances --instance-ids i-1234567890abcdef0
```

#### Disk Full

If the root volume is full, the OS may not boot properly.

```bash
# Same rescue approach - mount the volume on another instance
sudo mount /dev/xvdf1 /mnt/rescue

# Check disk usage
df -h /mnt/rescue

# Clean up space
sudo rm -rf /mnt/rescue/var/log/old-logs/*
sudo rm -rf /mnt/rescue/tmp/*

# Unmount and reattach
sudo umount /mnt/rescue
```

#### Bad /etc/fstab Entry

If someone added a volume to `/etc/fstab` that no longer exists, the instance won't boot.

```bash
# Mount the volume on a rescue instance
sudo mount /dev/xvdf1 /mnt/rescue

# Check fstab for bad entries
cat /mnt/rescue/etc/fstab

# Comment out or fix the problematic line
sudo nano /mnt/rescue/etc/fstab

# Add nofail option to prevent boot failures
# /dev/xvdb /data ext4 defaults,nofail 0 2
```

#### Network Configuration Issues

If the instance can't get a network address, the instance check will fail.

```bash
# Check network configuration on the rescue volume
cat /mnt/rescue/etc/sysconfig/network-scripts/ifcfg-eth0
# or for newer systems
cat /mnt/rescue/etc/netplan/*.yaml
```

Make sure DHCP is enabled and there's no hardcoded IP that conflicts.

#### Kernel Panic

If the console shows a kernel panic, you might need to change the kernel or AMI.

```bash
# Check for kernel issues in the console output
aws ec2 get-console-output --instance-id i-1234567890abcdef0 \
  --output text | grep -i "panic\|error\|fatal"
```

If a kernel update caused the panic, mount the volume and roll back.

```bash
# On the rescue instance, after mounting
sudo chroot /mnt/rescue

# List available kernels
rpm -q kernel  # RHEL/Amazon Linux
dpkg --list | grep linux-image  # Ubuntu

# Set the previous kernel as default (varies by distro)
```

### Step 3: Reboot vs. Stop/Start

For instance check failures, try a reboot first - it's faster and keeps the same IP.

```bash
# Reboot the instance
aws ec2 reboot-instances --instance-ids i-1234567890abcdef0

# Wait a few minutes and check status
sleep 120
aws ec2 describe-instance-status --instance-ids i-1234567890abcdef0
```

If the reboot doesn't fix it, do a full stop/start. If that doesn't work, use the volume rescue approach described above.

## Setting Up Status Check Alarms

Don't wait until you notice a problem. Set up CloudWatch alarms to alert you when status checks fail.

```bash
# Alarm for system status check failure
aws cloudwatch put-metric-alarm \
  --alarm-name "system-check-failed-i-1234567890abcdef0" \
  --namespace AWS/EC2 \
  --metric-name StatusCheckFailed_System \
  --statistic Maximum \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --dimensions Name=InstanceId,Value=i-1234567890abcdef0 \
  --alarm-actions arn:aws:sns:us-east-1:123456789:ops-alerts

# Alarm for instance status check failure
aws cloudwatch put-metric-alarm \
  --alarm-name "instance-check-failed-i-1234567890abcdef0" \
  --namespace AWS/EC2 \
  --metric-name StatusCheckFailed_Instance \
  --statistic Maximum \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --dimensions Name=InstanceId,Value=i-1234567890abcdef0 \
  --alarm-actions arn:aws:sns:us-east-1:123456789:ops-alerts
```

## Auto-Recovery

For system status check failures, you can configure EC2 to automatically recover the instance to new hardware.

```bash
# Set up auto-recovery action
aws cloudwatch put-metric-alarm \
  --alarm-name "auto-recover-i-1234567890abcdef0" \
  --namespace AWS/EC2 \
  --metric-name StatusCheckFailed_System \
  --statistic Maximum \
  --period 60 \
  --evaluation-periods 3 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --dimensions Name=InstanceId,Value=i-1234567890abcdef0 \
  --alarm-actions arn:aws:automate:us-east-1:ec2:recover
```

The recover action moves the instance to healthy hardware while keeping the same instance ID, IP address, and EBS volumes.

## Summary

EC2 status check failures come in two flavors. System check failures are AWS infrastructure problems - stop and start the instance to move it to new hardware. Instance check failures are OS-level problems - check the console log, investigate the root cause, and either reboot or use the volume rescue technique to fix the issue. Set up CloudWatch alarms and auto-recovery so you catch these problems early and minimize downtime. For SSH connection issues to instances that pass status checks, see our guides on [fixing connection timeouts](https://oneuptime.com/blog/post/fix-connection-timed-out-when-connecting-to-ec2/view) and [fixing permission denied errors](https://oneuptime.com/blog/post/fix-permission-denied-publickey-when-sshing-to-ec2/view).
