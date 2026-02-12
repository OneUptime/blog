# How to Use EC2 Serial Console for Troubleshooting Boot Issues

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, Serial Console, Troubleshooting, Debugging

Description: Learn how to use the EC2 Serial Console to troubleshoot boot failures, kernel panics, and other issues when SSH access is unavailable.

---

There's a special kind of frustration when an EC2 instance won't boot and you can't SSH in to find out why. Maybe the kernel panicked, maybe the network configuration is broken, maybe a bad fstab entry is preventing the boot from completing. In the past, your only option was to detach the root volume, attach it to another instance, fix the problem, and reattach it.

EC2 Serial Console changes this. It gives you a text-based serial connection to your instance that works even when the OS isn't fully booted, the network is down, or SSH is broken. It's like having a physical keyboard and monitor plugged into the server.

## What the Serial Console Can Do

The serial console connects directly to the instance's serial port (ttyS0). This means you can:

- Watch the entire boot process in real time
- Interact with GRUB (the bootloader)
- See kernel messages and panic traces
- Log in even when networking is completely broken
- Access single-user/rescue mode
- Fix broken configurations (fstab, network, SSH)

It works with Linux and Windows instances. On Linux, it connects to the serial console (ttyS0). On Windows, it connects to the Special Administration Console (SAC).

## Enabling Serial Console Access

Serial Console access is disabled by default at the account level. You need to enable it first.

This command enables Serial Console access for your entire AWS account in the current region:

```bash
# Enable Serial Console access for the account
aws ec2 enable-serial-console-access

# Verify it's enabled
aws ec2 get-serial-console-access-status
```

You only need to do this once per account per region.

## IAM Permissions

Users need specific IAM permissions to access the serial console.

This policy allows serial console access:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2-instance-connect:SendSerialConsoleSSHPublicKey"
      ],
      "Resource": "arn:aws:ec2:*:123456789012:instance/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ec2:GetSerialConsoleAccessStatus",
        "ec2:DescribeInstances"
      ],
      "Resource": "*"
    }
  ]
}
```

You can restrict access to specific instances using resource ARNs or conditions:

```json
{
  "Effect": "Allow",
  "Action": "ec2-instance-connect:SendSerialConsoleSSHPublicKey",
  "Resource": "arn:aws:ec2:us-east-1:123456789012:instance/*",
  "Condition": {
    "StringEquals": {
      "ec2:ResourceTag/AllowSerialConsole": "true"
    }
  }
}
```

## Setting Up a Password for Serial Console Login

The serial console provides a text login prompt, but SSH keys don't work here - you need a password. Set a password for an OS user on your instance before you need the serial console.

This sets up a password for the ec2-user account:

```bash
# Set password for serial console access (do this while instance is accessible)
sudo passwd ec2-user
# Enter and confirm a strong password

# Ensure password authentication is enabled for the serial console
# On Amazon Linux 2, this is usually already configured
sudo grep -r "ttyS0" /etc/securetty
# Should show ttyS0 - if not, add it:
echo "ttyS0" | sudo tee -a /etc/securetty
```

For Amazon Linux 2 and similar distributions, you also need to ensure getty is running on the serial port:

```bash
# Enable getty on ttyS0
sudo systemctl enable serial-getty@ttyS0.service
sudo systemctl start serial-getty@ttyS0.service
```

## Connecting via the AWS Console

The easiest way to access the serial console:

1. Go to EC2 > Instances
2. Select the problematic instance
3. Actions > Monitor and troubleshoot > EC2 Serial Console
4. Click "Connect"

A browser-based terminal opens showing the serial console output. You'll see the boot messages or a login prompt.

## Connecting via the CLI

You can also connect from the command line using SSH:

```bash
# Push a temporary SSH key for serial console access
aws ec2-instance-connect send-serial-console-ssh-public-key \
  --instance-id i-1234567890abcdef0 \
  --serial-port 0 \
  --ssh-public-key file://~/.ssh/id_rsa.pub

# Connect via SSH to the serial console endpoint
ssh -i ~/.ssh/id_rsa i-1234567890abcdef0.port0@serial-console.ec2-instance-connect.us-east-1.aws
```

## Troubleshooting Common Boot Issues

Here are the most common scenarios where the serial console saves the day.

### Bad fstab Entry

A typo in /etc/fstab can prevent the OS from booting. You'll see the boot hang or drop to an emergency shell.

When you connect to the serial console, you'll see something like:

```
[FAILED] Failed to mount /bad-mount-point.
[DEPEND] Dependency failed for Local File Systems.
You are in emergency mode. After logging in, type "journalctl -xb" to view
system logs, "systemctl reboot" to reboot, "systemctl default" to try again.
Give root password for maintenance
(or press Control-D to continue):
```

Log in with your root or user password and fix the fstab:

```bash
# Remount root as read-write
mount -o remount,rw /

# Edit fstab to fix or comment out the bad entry
vi /etc/fstab

# Reboot
reboot
```

### Broken SSH Configuration

If someone changed the SSH config and it won't start, the serial console lets you fix it:

```bash
# Log in via serial console
# Check SSH status
systemctl status sshd

# Check the SSH config for errors
sshd -t

# Fix the config
vi /etc/ssh/sshd_config

# Restart SSH
systemctl restart sshd
```

### Network Misconfiguration

If the network configuration is wrong and the instance has no connectivity:

```bash
# Log in via serial console
# Check network configuration
ip addr show
ip route show

# Fix network config
vi /etc/sysconfig/network-scripts/ifcfg-eth0  # Amazon Linux
# or
vi /etc/netplan/50-cloud-init.yaml  # Ubuntu

# Restart networking
systemctl restart network  # Amazon Linux
# or
netplan apply  # Ubuntu
```

### Kernel Panic

The serial console captures kernel panic output in real time. You'll see the full stack trace:

```
Kernel panic - not syncing: VFS: Unable to mount root fs on unknown-block(0,0)
```

This tells you the root filesystem couldn't be mounted - possibly a bad AMI, corrupt filesystem, or wrong root device specified.

### Firewall Lockout

If someone applied iptables rules that block SSH:

```bash
# Log in via serial console
# Flush all iptables rules
iptables -F
iptables -X

# Make it persistent
service iptables save
# or for Ubuntu
netfilter-persistent save
```

## Configuring Boot Console Output

To get the most useful output on the serial console, configure your instance's kernel to send output to the serial port.

Add these parameters to the kernel command line in GRUB:

```bash
# Edit GRUB configuration
sudo vi /etc/default/grub

# Add or modify the GRUB_CMDLINE_LINUX line
GRUB_CMDLINE_LINUX="console=tty0 console=ttyS0,115200n8"

# Regenerate GRUB config
# Amazon Linux 2:
sudo grub2-mkconfig -o /boot/grub2/grub.cfg

# Ubuntu:
sudo update-grub
```

This sends all kernel messages to both the regular console (tty0) and the serial port (ttyS0), so you can see everything happening during boot.

## Terraform Setup

Include serial console readiness in your instance configuration:

```hcl
resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.medium"
  subnet_id     = var.subnet_id

  vpc_security_group_ids = [aws_security_group.app.id]

  user_data = <<-EOF
    #!/bin/bash
    # Enable serial console login
    systemctl enable serial-getty@ttyS0.service
    systemctl start serial-getty@ttyS0.service

    # Set a rescue password (use Secrets Manager in production)
    echo 'ec2-user:${var.serial_console_password}' | chpasswd

    # Ensure serial console gets boot output
    if ! grep -q "console=ttyS0" /etc/default/grub; then
      sed -i 's/GRUB_CMDLINE_LINUX="/GRUB_CMDLINE_LINUX="console=ttyS0,115200n8 /' /etc/default/grub
      grub2-mkconfig -o /boot/grub2/grub.cfg
    fi
  EOF

  tags = {
    Name               = "app-server"
    AllowSerialConsole = "true"
  }
}
```

## Best Practices

1. **Set up passwords before you need them** - You can't set a serial console password if you can't access the instance
2. **Enable serial console at the account level** proactively
3. **Configure kernel console output** (console=ttyS0) in your base AMIs
4. **Test serial console access** on healthy instances first
5. **Restrict IAM access** - Serial console is powerful; limit who can use it
6. **Document procedures** - Have runbooks for common serial console recovery scenarios

## Summary

The EC2 Serial Console is your last line of defense for instances that can't be reached any other way. It works when SSH is broken, when networking is down, when the kernel panics, and during boot. Set it up proactively - enable it at the account level, configure passwords and getty on your AMIs, and ensure kernel output goes to the serial port. When that 3 AM page comes in about an unresponsive instance, you'll be glad you did. For proactive monitoring that catches issues before they become boot failures, check out [OneUptime's monitoring tools](https://oneuptime.com/blog/post/configure-health-checks-ec2-load-balancer/view) for real-time instance health tracking.
