# How to Troubleshoot EC2 Instance Status Check Failures

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, Troubleshooting, Status Checks, Monitoring, Debugging

Description: Diagnose and resolve EC2 instance and system status check failures with step-by-step debugging techniques, console output analysis, and recovery strategies.

---

EC2 status checks are your first indication that something is wrong with an instance. When that red "impaired" status shows up in the console, your instance is either not responding correctly or the underlying hardware has a problem. The trick is figuring out which one it is and what to do about it, because the two types of status check failures have very different causes and solutions.

## Understanding the Two Status Checks

EC2 runs two independent status checks every minute:

**System status check** - Tests the underlying AWS infrastructure:
- Network reachability
- System power
- Software on the physical host
- Hardware on the physical host

If this fails, it's AWS's problem. You generally can't fix it from inside the instance.

**Instance status check** - Tests the instance's own software and network:
- Correct networking configuration
- Operating system health
- Memory availability
- File system integrity
- Kernel responsiveness

If this fails, it's your problem to debug.

## Checking Status

```bash
# Check status for a specific instance
aws ec2 describe-instance-status \
  --instance-ids i-0abc123 \
  --query 'InstanceStatuses[0].{
    Instance: InstanceStatus.Status,
    System: SystemStatus.Status,
    InstanceDetails: InstanceStatus.Details,
    SystemDetails: SystemStatus.Details,
    Events: Events
  }' --output json

# Check status for all instances (including those with issues)
aws ec2 describe-instance-status \
  --filters "Name=instance-status.status,Values=impaired" \
  --query 'InstanceStatuses[*].{
    Id: InstanceId,
    Instance: InstanceStatus.Status,
    System: SystemStatus.Status
  }' --output table
```

## System Status Check Failures

When the system status check fails, the problem is with the underlying hardware or AWS infrastructure.

**What to do:**

1. **Wait and see**: Sometimes the issue resolves on its own within minutes.

2. **Stop and start** (not reboot): This migrates the instance to new physical hardware:

```bash
# Stop and start to move to new hardware
aws ec2 stop-instances --instance-ids i-0abc123
aws ec2 wait instance-stopped --instance-ids i-0abc123
aws ec2 start-instances --instance-ids i-0abc123
aws ec2 wait instance-running --instance-ids i-0abc123

# Verify status checks pass
sleep 120  # Wait for status checks to run
aws ec2 describe-instance-status \
  --instance-ids i-0abc123 \
  --query 'InstanceStatuses[0].{Instance:InstanceStatus.Status,System:SystemStatus.Status}'
```

A reboot keeps the instance on the same physical host, which won't help if the hardware is faulty. A stop/start moves it to a new host.

3. **Set up auto recovery**: Automate this process with a CloudWatch alarm:

```bash
# Auto-recover when system status check fails
aws cloudwatch put-metric-alarm \
  --alarm-name "recover-i-0abc123" \
  --namespace AWS/EC2 \
  --metric-name StatusCheckFailed_System \
  --dimensions Name=InstanceId,Value=i-0abc123 \
  --statistic Maximum \
  --period 60 \
  --evaluation-periods 2 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --alarm-actions "arn:aws:automate:us-east-1:ec2:recover"
```

For a full setup guide, see [EC2 auto recovery for instance health](https://oneuptime.com/blog/post/set-up-ec2-auto-recovery-for-instance-health/view).

## Instance Status Check Failures

These are the ones that require investigation. The instance is running on healthy hardware, but something inside is broken.

### Step 1: Check Console Output

The console output shows boot messages and kernel output. This is your best first diagnostic:

```bash
# Get the instance console output
aws ec2 get-console-output \
  --instance-id i-0abc123 \
  --latest \
  --output text
```

Look for:
- Kernel panics
- File system errors (fsck failures)
- Network interface errors
- Out-of-memory (OOM) kills
- Cloud-init failures

### Step 2: Take a Screenshot

If the instance has a GUI or is stuck at a login prompt, get a screenshot:

```bash
# Get a screenshot of the instance console
aws ec2 get-console-screenshot \
  --instance-id i-0abc123 \
  --query 'ImageData' --output text | base64 -d > screenshot.png
```

This is particularly useful for Windows instances that might be stuck at a BSOD or a configuration screen.

### Step 3: Check System Logs

If the instance was recently accessible, check the system logs through SSM:

```bash
# Try to run a command via SSM (works if SSM agent is responsive)
aws ssm send-command \
  --instance-ids i-0abc123 \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["dmesg | tail -50", "journalctl -p err --no-pager -n 50"]' \
  --output text
```

## Common Instance Status Check Failure Causes

### Out of Memory

When Linux runs out of memory, the OOM killer starts terminating processes. If it kills something critical (like sshd or the init system), the instance becomes unresponsive.

**Diagnosis**: Console output shows `Out of memory: Kill process` messages.

**Fix**: Stop the instance, change to a larger instance type, and start it:

```bash
# Resize to fix OOM issues
aws ec2 stop-instances --instance-ids i-0abc123
aws ec2 wait instance-stopped --instance-ids i-0abc123

aws ec2 modify-instance-attribute \
  --instance-id i-0abc123 \
  --instance-type '{"Value": "m5.xlarge"}'  # Upgrade from m5.large

aws ec2 start-instances --instance-ids i-0abc123
```

**Prevention**: Monitor memory with the CloudWatch agent and set alarms before it hits 100%. See [CloudWatch alarms for CPU and memory](https://oneuptime.com/blog/post/set-up-cloudwatch-alarms-for-ec2-cpu-and-memory/view).

### Disk Full

A full root filesystem can cause all sorts of failures - services can't write logs, applications crash, and the instance becomes unresponsive.

**Diagnosis**: Console output shows `No space left on device` errors.

**Fix**: Attach the volume to another instance and clean it up:

```bash
# Step 1: Stop the problem instance
aws ec2 stop-instances --instance-ids i-0abc123
aws ec2 wait instance-stopped --instance-ids i-0abc123

# Step 2: Detach the root volume
ROOT_VOL=$(aws ec2 describe-instances \
  --instance-ids i-0abc123 \
  --query 'Reservations[0].Instances[0].BlockDeviceMappings[0].Ebs.VolumeId' \
  --output text)

aws ec2 detach-volume --volume-id $ROOT_VOL
aws ec2 wait volume-available --volume-ids $ROOT_VOL

# Step 3: Attach to a rescue instance as a secondary volume
aws ec2 attach-volume \
  --volume-id $ROOT_VOL \
  --instance-id i-0rescue456 \
  --device /dev/sdf

# Step 4: On the rescue instance, mount and clean up
# ssh into rescue instance, then:
# sudo mount /dev/xvdf1 /mnt
# sudo du -sh /mnt/var/log/*  (find the space hog)
# sudo truncate -s 0 /mnt/var/log/large-file.log
# sudo umount /mnt

# Step 5: Detach, reattach to original, and start
aws ec2 detach-volume --volume-id $ROOT_VOL
aws ec2 wait volume-available --volume-ids $ROOT_VOL
aws ec2 attach-volume --volume-id $ROOT_VOL --instance-id i-0abc123 --device /dev/xvda
aws ec2 start-instances --instance-ids i-0abc123
```

### Corrupted File System

File system corruption can happen after an ungraceful shutdown or hardware issue.

**Diagnosis**: Console output shows fsck errors or `unable to mount root fs`.

**Fix**: Similar to disk full - attach to a rescue instance and run fsck:

```bash
# On the rescue instance after attaching the volume
sudo fsck -y /dev/xvdf1
```

### Bad Network Configuration

If someone changed the network configuration inside the instance (wrong IP, bad route table, disabled interface), the instance becomes unreachable.

**Diagnosis**: System status check passes but instance status check fails.

**Fix**: Use EC2 Serial Console (if available) or attach the root volume to a rescue instance and fix the network config files:

```bash
# Enable EC2 Serial Console for the account (one-time setup)
aws ec2 enable-serial-console-access

# Connect to serial console
aws ec2-instance-connect send-serial-console-ssh-public-key \
  --instance-id i-0abc123 \
  --serial-port 0 \
  --ssh-public-key file://~/.ssh/id_rsa.pub
```

### Kernel Panic

A bad kernel update or incompatible driver can cause a kernel panic on boot.

**Diagnosis**: Console output shows `Kernel panic - not syncing`.

**Fix**: Attach root volume to rescue instance and either:
- Roll back to the previous kernel
- Fix the kernel configuration
- Replace the kernel

```bash
# On the rescue instance, after mounting the volume
# Edit grub to boot the previous kernel
sudo mount /dev/xvdf1 /mnt
sudo chroot /mnt

# List available kernels
ls /boot/vmlinuz-*

# Set the previous kernel as default in grub
grub2-set-default 1  # Or whatever index is the old kernel
grub2-mkconfig -o /boot/grub2/grub.cfg
```

## Monitoring Status Checks

Set up alerts for both types of failures:

```bash
# Alert on any status check failure
aws cloudwatch put-metric-alarm \
  --alarm-name "status-check-failed-i-0abc123" \
  --namespace AWS/EC2 \
  --metric-name StatusCheckFailed \
  --dimensions Name=InstanceId,Value=i-0abc123 \
  --statistic Maximum \
  --period 60 \
  --evaluation-periods 3 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --alarm-actions arn:aws:sns:us-east-1:123456789:ops-alerts
```

## Preventing Future Failures

1. **Monitor memory and disk**: Most instance status check failures come from resource exhaustion. Install the [CloudWatch agent](https://oneuptime.com/blog/post/install-and-configure-the-cloudwatch-agent-on-ec2/view) and set alarms before resources run out.

2. **Use Auto Scaling**: If an instance is irrecoverably broken, Auto Scaling can terminate it and launch a replacement.

3. **Keep instances stateless**: If you can rebuild an instance from an AMI and user data, recovery from any status check failure is just a terminate-and-replace.

4. **Enable auto recovery**: For system-level failures that are outside your control, auto recovery moves the instance to healthy hardware automatically.

5. **Test your user data scripts**: A broken startup script can leave an instance in a bad state after every launch.

Status check failures are inevitable over a long enough timeline. The key is having monitoring in place to detect them quickly and recovery procedures ready to fix them fast.
