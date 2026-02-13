# How to Fix 'Permission Denied (publickey)' When SSH-ing to EC2

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, SSH, Security, Troubleshooting

Description: Resolve the 'Permission denied (publickey)' SSH error when connecting to EC2 instances by checking key pairs, usernames, file permissions, and SSH agent configuration.

---

You can see the instance is reachable (no connection timeout), but SSH still won't let you in:

```
Permission denied (publickey).
```

Or the more verbose version:

```
debug1: Authentications that can continue: publickey
debug1: Next authentication method: publickey
debug1: Offering public key: /home/user/.ssh/id_rsa RSA
debug1: Authentications that can continue: publickey
debug1: No more authentication methods to try.
user@54.123.45.67: Permission denied (publickey).
```

This means SSH connected to the instance, but key-based authentication failed. Your key, username, or the instance's authorized_keys configuration doesn't match.

## Cause 1: Wrong Username

Different AMIs use different default usernames. This is the most common cause.

| AMI | Default Username |
|-----|-----------------|
| Amazon Linux 2/2023 | `ec2-user` |
| Ubuntu | `ubuntu` |
| Debian | `admin` |
| CentOS (older) | `centos` |
| RHEL | `ec2-user` |
| SUSE | `ec2-user` |
| Fedora | `fedora` |
| Bitnami | `bitnami` |

```bash
# Wrong - using "root" on Amazon Linux
ssh root@54.123.45.67

# Correct
ssh ec2-user@54.123.45.67

# Wrong - using "ec2-user" on Ubuntu
ssh ec2-user@54.123.45.67

# Correct
ssh ubuntu@54.123.45.67
```

If you're not sure which AMI the instance is using:

```bash
# Check the AMI
aws ec2 describe-instances \
  --instance-ids i-1234567890abcdef0 \
  --query "Reservations[0].Instances[0].ImageId"

# Get details about the AMI
aws ec2 describe-images \
  --image-ids ami-abc123 \
  --query "Images[0].[Name,Description]" \
  --output text
```

## Cause 2: Wrong Key Pair

You might be using a different key than the one associated with the instance.

```bash
# Check which key pair the instance was launched with
aws ec2 describe-instances \
  --instance-ids i-1234567890abcdef0 \
  --query "Reservations[0].Instances[0].KeyName"
```

Make sure you're specifying the right private key.

```bash
# Specify the key explicitly
ssh -i ~/.ssh/my-ec2-key.pem ec2-user@54.123.45.67
```

Common mistakes:
- You have multiple `.pem` files and are using the wrong one
- The key was downloaded but you renamed it
- Your SSH agent is offering a different key first

Check which keys your SSH agent is offering.

```bash
# List keys loaded in the agent
ssh-add -l

# If the wrong key is loaded, or no keys are loaded
ssh-add ~/.ssh/my-ec2-key.pem
```

## Cause 3: Wrong Key File Permissions

SSH is strict about file permissions. If your private key file is too permissive, SSH refuses to use it.

```
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@         WARNING: UNPROTECTED PRIVATE KEY FILE!          @
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
Permissions 0644 for 'my-key.pem' are too open.
```

Fix the permissions.

```bash
# Set correct permissions on the private key
chmod 400 ~/.ssh/my-ec2-key.pem

# Or 600 if you need write access
chmod 600 ~/.ssh/my-ec2-key.pem

# Also check the .ssh directory itself
chmod 700 ~/.ssh
```

## Cause 4: Key Was Changed on the Instance

If someone modified or deleted the `authorized_keys` file on the instance, your key won't work even if everything else is correct.

You can check and fix this using EC2 Instance Connect, Session Manager, or by detaching the volume.

### Using Session Manager

```bash
# Connect via Session Manager (no SSH key needed)
aws ssm start-session --target i-1234567890abcdef0

# Check the authorized_keys file
cat /home/ec2-user/.ssh/authorized_keys

# If it's empty or wrong, add your public key
echo "ssh-rsa AAAA...your-public-key... user@host" >> /home/ec2-user/.ssh/authorized_keys

# Fix permissions
chmod 600 /home/ec2-user/.ssh/authorized_keys
chmod 700 /home/ec2-user/.ssh
chown -R ec2-user:ec2-user /home/ec2-user/.ssh
```

### Using Volume Detach/Attach

If Session Manager isn't available, you can fix the authorized_keys by detaching the root volume.

```bash
# 1. Stop the instance
aws ec2 stop-instances --instance-ids i-1234567890abcdef0

# 2. Detach the root volume
aws ec2 detach-volume --volume-id vol-abc123

# 3. Attach it to a working instance as a secondary volume
aws ec2 attach-volume \
  --volume-id vol-abc123 \
  --instance-id i-WORKING \
  --device /dev/xvdf

# 4. On the working instance, mount and fix the file
sudo mkdir /mnt/rescue
sudo mount /dev/xvdf1 /mnt/rescue
sudo nano /mnt/rescue/home/ec2-user/.ssh/authorized_keys
# Add your public key
sudo umount /mnt/rescue

# 5. Detach and reattach to the original instance
aws ec2 detach-volume --volume-id vol-abc123
aws ec2 attach-volume \
  --volume-id vol-abc123 \
  --instance-id i-1234567890abcdef0 \
  --device /dev/xvda

# 6. Start the instance
aws ec2 start-instances --instance-ids i-1234567890abcdef0
```

## Cause 5: SELinux or AppArmor

On RHEL, CentOS, and Amazon Linux, SELinux can block SSH access if the security context on the authorized_keys file is wrong.

```bash
# Check SELinux status (via Session Manager or serial console)
getenforce

# Restore the correct context
restorecon -Rv /home/ec2-user/.ssh

# Or temporarily set to permissive for testing
sudo setenforce 0
```

## Cause 6: SSH Configuration on the Instance

The SSH daemon configuration might be restricting key-based auth.

```bash
# Check sshd configuration (via Session Manager)
sudo cat /etc/ssh/sshd_config | grep -v "^#" | grep -v "^$"

# Important settings to check
# PubkeyAuthentication yes    <- Must be yes
# AuthorizedKeysFile .ssh/authorized_keys  <- Must point to the right file
# PasswordAuthentication no   <- This is normal for EC2
```

If you change sshd_config, restart the service.

```bash
sudo systemctl restart sshd
```

## Debugging SSH Connections

Use verbose mode to see exactly what SSH is doing.

```bash
# Single -v for basic debugging
ssh -v -i ~/.ssh/my-key.pem ec2-user@54.123.45.67

# Triple -vvv for maximum verbosity
ssh -vvv -i ~/.ssh/my-key.pem ec2-user@54.123.45.67
```

Look for these lines in the output:

```
debug1: Offering public key: /home/user/.ssh/my-key.pem RSA SHA256:xxxxx
```

This shows which keys SSH is trying. If it's not offering the key you expect, specify it with `-i`.

```
debug1: Authentications that can continue: publickey
```

This means the key was rejected. Either it's the wrong key or the authorized_keys file doesn't contain the matching public key.

## Using EC2 Instance Connect as a Recovery Tool

EC2 Instance Connect can push a temporary key to the instance, giving you access even if your original key doesn't work.

```bash
# Push your public key temporarily (valid for 60 seconds)
aws ec2-instance-connect send-ssh-public-key \
  --instance-id i-1234567890abcdef0 \
  --instance-os-user ec2-user \
  --ssh-public-key file://~/.ssh/id_rsa.pub

# Connect within 60 seconds
ssh -i ~/.ssh/id_rsa ec2-user@54.123.45.67
```

This requires the instance to have the EC2 Instance Connect agent installed (it's included by default on recent Amazon Linux and Ubuntu AMIs).

## Prevention

1. **Always test SSH immediately** after launching an instance
2. **Store your key pairs securely** and keep track of which key goes with which instance
3. **Enable Session Manager** on all instances as a backup access method
4. **Don't modify authorized_keys manually** unless you know what you're doing
5. **Use EC2 Instance Connect** for temporary access instead of sharing key pairs

For connection timeouts (as opposed to permission denied), see our guide on [fixing connection timeouts to EC2](https://oneuptime.com/blog/post/2026-02-12-fix-connection-timed-out-when-connecting-to-ec2/view).

## Summary

"Permission denied (publickey)" means SSH reached the instance but authentication failed. Check the username first (it's wrong more often than you'd think), then verify the key pair, fix file permissions, and check that authorized_keys hasn't been modified. Use verbose mode (`ssh -vvv`) to see exactly which keys are being offered and why they're being rejected. And always have Session Manager set up as a backup access path - it'll save you when SSH keys are lost or misconfigured.
