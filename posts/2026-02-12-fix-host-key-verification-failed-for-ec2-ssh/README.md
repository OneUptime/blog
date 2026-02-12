# How to Fix 'Host Key Verification Failed' for EC2 SSH

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, SSH, Security, Troubleshooting

Description: Fix the 'Host key verification failed' SSH error when connecting to EC2 instances, understanding when it is safe to update known hosts and when it signals a real security issue.

---

You SSH into an EC2 instance you've connected to before and get this alarming message:

```
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@    WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!     @
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
IT IS POSSIBLE THAT SOMEONE IS DOING SOMETHING NASTY!
Someone could be eavesdropping on you right now (man-in-the-middle attack)!
It is also possible that a host key has just been changed.
The fingerprint for the ECDSA key sent by the remote host is
SHA256:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.
Please contact your system administrator.
Add correct host key in /Users/you/.ssh/known_hosts:47
Offending ECDSA key in /Users/you/.ssh/known_hosts:47
Host key verification failed.
```

This looks scary, but in the context of EC2, it's almost always harmless. Let me explain why it happens and how to handle it safely.

## Why This Happens with EC2

Every SSH server has a unique host key. When you connect to a server for the first time, your SSH client saves this key in `~/.ssh/known_hosts`. On subsequent connections, it compares the server's key to the saved one. If they don't match, you get this error.

With EC2, this happens frequently because:

1. **You stopped and started an instance** and it got a new public IP address, but someone else previously had that IP and you'd connected to their instance
2. **You terminated an instance and launched a new one** that got the same IP as the old one
3. **Elastic IPs** - you reassigned an Elastic IP from one instance to another
4. **You rebuilt the instance** (replaced the root volume, restored from snapshot)
5. **Auto Scaling** replaced an instance behind a load balancer

In all these cases, the IP address is the same but the server behind it has changed. It's a new instance with a new host key.

## Fix 1: Remove the Old Host Key

The simplest fix when you know the instance has changed.

```bash
# Remove the specific host entry
ssh-keygen -R 54.123.45.67

# Or remove by hostname
ssh-keygen -R ec2-54-123-45-67.compute-1.amazonaws.com

# Then connect normally
ssh -i ~/.ssh/my-key.pem ec2-user@54.123.45.67
```

You'll see the normal first-connection prompt:

```
The authenticity of host '54.123.45.67' can't be established.
ECDSA key fingerprint is SHA256:xxxxxxxxxxx.
Are you sure you want to continue connecting (yes/no/[fingerprint])? yes
```

Type `yes` and the new host key gets saved.

## Fix 2: Edit known_hosts Directly

The error message tells you exactly which line to fix:

```
Offending ECDSA key in /Users/you/.ssh/known_hosts:47
```

Line 47 is the problematic entry. You can remove just that line.

```bash
# Delete line 47 from known_hosts
sed -i '47d' ~/.ssh/known_hosts

# On macOS (sed requires a backup extension)
sed -i '' '47d' ~/.ssh/known_hosts
```

## Fix 3: Skip Host Key Checking (Use with Caution)

For automation and scripting where you know the host keys will change frequently, you can configure SSH to not check host keys. This is less secure, so only use it when appropriate.

```bash
# Single command - skip host key check
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
  -i ~/.ssh/my-key.pem ec2-user@54.123.45.67
```

For specific hosts in your SSH config:

```bash
# ~/.ssh/config

# Skip host key checking for all EC2 instances
Host *.compute.amazonaws.com *.compute-1.amazonaws.com
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null
    LogLevel ERROR

# Or for a specific IP range
Host 10.0.*.*
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null
```

Setting `UserKnownHostsFile` to `/dev/null` means SSH won't save the host key at all, so you won't get this error on the next connection either.

The `LogLevel ERROR` suppresses the warning message that SSH prints when adding unknown hosts.

## Fix 4: Auto-Accept New Keys

A middle ground - accept new keys automatically but still warn if a known key changes.

```bash
# ~/.ssh/config
Host *.amazonaws.com
    StrictHostKeyChecking accept-new
```

`accept-new` means:
- New hosts: automatically accept the key (no prompt)
- Known hosts with changed keys: still show the warning and refuse to connect

This is a good option for development environments where you're frequently launching new instances.

## Verifying the Host Key (The Secure Way)

If security is important (production environments), you should verify the new host key before accepting it. EC2 provides the instance's host key fingerprint in the system log.

```bash
# Get the instance's console output which includes the host key fingerprint
aws ec2 get-console-output \
  --instance-id i-1234567890abcdef0 \
  --output text | grep -A1 "fingerprint"
```

The output includes lines like:

```
ec2: #############################################################
ec2: -----BEGIN SSH HOST KEY FINGERPRINTS-----
ec2: 256 SHA256:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (ECDSA)
ec2: 256 SHA256:yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy (ED25519)
ec2: 3072 SHA256:zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz (RSA)
ec2: -----END SSH HOST KEY FINGERPRINTS-----
ec2: #############################################################
```

Compare these fingerprints with what SSH shows you when connecting. If they match, it's safe to accept.

## Handling This in Scripts and Automation

For CI/CD pipelines and automation scripts, you don't want host key prompts interrupting execution.

```bash
# In a deploy script
#!/bin/bash

INSTANCE_IP="54.123.45.67"
KEY_FILE="~/.ssh/deploy-key.pem"

# Remove old key and add new one in a single step
ssh-keygen -R "$INSTANCE_IP" 2>/dev/null

# Connect with auto-accept for new keys
ssh -o StrictHostKeyChecking=accept-new \
    -i "$KEY_FILE" \
    ec2-user@"$INSTANCE_IP" \
    "echo 'Deployment successful'"
```

For Ansible:

```ini
# ansible.cfg
[defaults]
host_key_checking = False

# Or via environment variable
# export ANSIBLE_HOST_KEY_CHECKING=False
```

For Terraform provisioners:

```hcl
resource "aws_instance" "example" {
  # ... instance config

  connection {
    type        = "ssh"
    user        = "ec2-user"
    private_key = file("~/.ssh/my-key.pem")
    host        = self.public_ip

    # Skip host key checking for new instances
    agent = false
  }

  provisioner "remote-exec" {
    inline = ["echo 'Connected!'"]
  }
}
```

## When This IS a Security Concern

While most EC2 host key changes are benign, there are cases where you should investigate:

1. **The instance hasn't been replaced.** If the same instance suddenly has a different host key and you haven't changed anything, something may have tampered with the SSH configuration.
2. **Corporate or shared environments.** If someone else manages the infrastructure, confirm with them before accepting a new key.
3. **After a security incident.** If you're investigating a potential breach, a changed host key could indicate compromise.

In these cases, verify the host key fingerprint through the EC2 console output before accepting it.

## Preventing the Issue

A few strategies to reduce how often you hit this:

1. **Use Elastic IPs** for instances you connect to regularly - the IP doesn't change between stop/start cycles
2. **Use hostnames** in your SSH config that map to Elastic IPs
3. **Use Session Manager** instead of SSH for instance access
4. **Use `HashKnownHosts no`** in SSH config so you can read the known_hosts file (makes it easier to find and remove entries)

```bash
# ~/.ssh/config
Host *
    HashKnownHosts no
```

## Summary

"Host key verification failed" in the EC2 context almost always means you're connecting to a new instance at an IP address you've used before. Remove the old host key with `ssh-keygen -R`, verify the new fingerprint if security matters, and consider configuring `StrictHostKeyChecking accept-new` for development environments. For automation, disable host key checking entirely since you're dealing with ephemeral infrastructure that changes regularly. Just be aware of the trade-offs - if you're working in a high-security environment, always verify host keys through out-of-band channels.
