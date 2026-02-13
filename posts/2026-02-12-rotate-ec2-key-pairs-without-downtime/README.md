# How to Rotate EC2 Key Pairs Without Downtime

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, Security, SSH, Key Management

Description: A practical guide to rotating SSH key pairs on EC2 instances without causing downtime, including manual rotation, automation with SSM, and migration to Session Manager.

---

SSH key pairs are the front door to your EC2 instances, and like any security credential, they should be rotated regularly. The problem is that EC2 key pairs are baked into instances at launch time, and there's no built-in "rotate key" button. Many teams never rotate their keys because they're afraid of locking themselves out.

But rotating keys is straightforward once you understand the process, and you can do it without any downtime.

## Why Rotate Keys?

Key rotation matters because:

- Team members leave and their copies of private keys go with them
- Keys can be inadvertently committed to Git repositories
- Long-lived keys have more time to be compromised
- Compliance frameworks (SOC 2, PCI-DSS) typically require regular rotation
- A shared key used by multiple people makes it impossible to audit who did what

## Understanding How EC2 Keys Work

When you launch an EC2 instance with a key pair, AWS injects the public key into the default user's `~/.ssh/authorized_keys` file during first boot. After that, the key pair is just a regular SSH authorized key - nothing magic about it. You can add, remove, or change authorized keys at any time by editing that file.

The EC2 key pair resource in AWS is just a reference to the public key. It's not linked to the instance after launch. This means you can:

- Add new public keys to authorized_keys at any time
- Remove old public keys at any time
- The instance doesn't know or care about the EC2 key pair resource

## Manual Key Rotation

The simplest approach works on any instance you can currently access via SSH.

Step 1 - Generate a new key pair locally:

```bash
# Generate a new ED25519 key pair (more secure than RSA)
ssh-keygen -t ed25519 -f ~/.ssh/ec2-new-key -C "ec2-rotated-$(date +%Y%m%d)"

# Or RSA if your instance requires it
ssh-keygen -t rsa -b 4096 -f ~/.ssh/ec2-new-key -C "ec2-rotated-$(date +%Y%m%d)"
```

Step 2 - Add the new public key to the instance:

```bash
# SSH in with the current key and add the new public key
ssh -i ~/.ssh/ec2-old-key ec2-user@instance-ip \
  "echo '$(cat ~/.ssh/ec2-new-key.pub)' >> ~/.ssh/authorized_keys"
```

Step 3 - Verify the new key works:

```bash
# Test the new key (in a separate terminal - don't close the old session)
ssh -i ~/.ssh/ec2-new-key ec2-user@instance-ip "echo 'New key works!'"
```

Step 4 - Remove the old key:

```bash
# SSH in with the new key and remove the old key from authorized_keys
ssh -i ~/.ssh/ec2-new-key ec2-user@instance-ip

# Inside the instance, edit authorized_keys to remove the old key
# First, view the current keys
cat ~/.ssh/authorized_keys

# Remove the old key (replace OLD_KEY_CONTENT with the actual old public key)
grep -v "OLD_KEY_IDENTIFIER" ~/.ssh/authorized_keys > /tmp/authorized_keys_new
mv /tmp/authorized_keys_new ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

## Automating Rotation with SSM

For fleets of instances, manual rotation doesn't scale. AWS Systems Manager (SSM) can push key changes to multiple instances simultaneously without needing SSH access.

Make sure your instances have the SSM agent running and an IAM role with `AmazonSSMManagedInstanceCore` permissions.

Rotate keys across multiple instances using SSM Run Command:

```bash
# First, generate the new key pair
ssh-keygen -t ed25519 -f ~/.ssh/ec2-fleet-key-new -N "" -C "fleet-key-$(date +%Y%m%d)"
NEW_PUBLIC_KEY=$(cat ~/.ssh/ec2-fleet-key-new.pub)

# Add the new key to all instances tagged with Environment=production
aws ssm send-command \
  --document-name "AWS-RunShellScript" \
  --targets '[{"Key":"tag:Environment","Values":["production"]}]' \
  --parameters "{
    \"commands\": [
      \"echo '$NEW_PUBLIC_KEY' >> /home/ec2-user/.ssh/authorized_keys\",
      \"echo 'New key added successfully'\"
    ]
  }" \
  --comment "Add new SSH key for rotation"
```

Wait for the command to complete, then verify the new key works on a sample instance:

```bash
# Check command status
aws ssm list-command-invocations \
  --command-id COMMAND_ID \
  --details \
  --query 'CommandInvocations[].{Instance: InstanceId, Status: Status}'
```

After verifying, remove the old key from all instances:

```bash
# Remove the old key from all instances
OLD_KEY_IDENTIFIER="old-key-comment-or-fingerprint"

aws ssm send-command \
  --document-name "AWS-RunShellScript" \
  --targets '[{"Key":"tag:Environment","Values":["production"]}]' \
  --parameters "{
    \"commands\": [
      \"grep -v '$OLD_KEY_IDENTIFIER' /home/ec2-user/.ssh/authorized_keys > /tmp/auth_keys_tmp\",
      \"mv /tmp/auth_keys_tmp /home/ec2-user/.ssh/authorized_keys\",
      \"chmod 600 /home/ec2-user/.ssh/authorized_keys\",
      \"chown ec2-user:ec2-user /home/ec2-user/.ssh/authorized_keys\",
      \"echo 'Old key removed'\"
    ]
  }" \
  --comment "Remove old SSH key"
```

## Automated Key Rotation Script

Here's a complete script that handles the full rotation lifecycle:

```bash
#!/bin/bash
# rotate-ec2-keys.sh - Automated EC2 SSH key rotation

set -e

KEY_NAME="ec2-fleet-key"
KEY_DIR="$HOME/.ssh"
TARGET_USER="ec2-user"
SSM_TARGETS='[{"Key":"tag:KeyRotation","Values":["enabled"]}]'

# Generate new key
DATE=$(date +%Y%m%d)
NEW_KEY_FILE="$KEY_DIR/${KEY_NAME}-${DATE}"

echo "Generating new key pair..."
ssh-keygen -t ed25519 -f "$NEW_KEY_FILE" -N "" -C "${KEY_NAME}-${DATE}"

NEW_PUBLIC_KEY=$(cat "${NEW_KEY_FILE}.pub")

# Step 1: Add new key to all instances
echo "Adding new key to instances..."
CMD_ID=$(aws ssm send-command \
  --document-name "AWS-RunShellScript" \
  --targets "$SSM_TARGETS" \
  --parameters "{
    \"commands\": [
      \"echo '$NEW_PUBLIC_KEY' >> /home/$TARGET_USER/.ssh/authorized_keys\"
    ]
  }" \
  --query 'Command.CommandId' \
  --output text)

echo "Waiting for key addition (Command: $CMD_ID)..."
aws ssm wait command-executed \
  --command-id "$CMD_ID" \
  --instance-id "$(aws ssm list-command-invocations --command-id "$CMD_ID" --query 'CommandInvocations[0].InstanceId' --output text)" 2>/dev/null || true

sleep 10

# Step 2: Verify new key works on a sample instance
SAMPLE_INSTANCE=$(aws ec2 describe-instances \
  --filters "Name=tag:KeyRotation,Values=enabled" "Name=instance-state-name,Values=running" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

echo "Testing new key on $SAMPLE_INSTANCE..."
if ssh -i "$NEW_KEY_FILE" -o StrictHostKeyChecking=no -o ConnectTimeout=10 \
  "$TARGET_USER@$SAMPLE_INSTANCE" "echo 'Key verification successful'" 2>/dev/null; then
  echo "New key verified successfully!"
else
  echo "ERROR: New key verification failed! Aborting rotation."
  exit 1
fi

# Step 3: Remove old keys (keep only the new one)
echo "Removing old keys..."
aws ssm send-command \
  --document-name "AWS-RunShellScript" \
  --targets "$SSM_TARGETS" \
  --parameters "{
    \"commands\": [
      \"echo '$NEW_PUBLIC_KEY' > /home/$TARGET_USER/.ssh/authorized_keys\",
      \"chmod 600 /home/$TARGET_USER/.ssh/authorized_keys\",
      \"chown $TARGET_USER:$TARGET_USER /home/$TARGET_USER/.ssh/authorized_keys\"
    ]
  }"

echo "Key rotation complete!"
echo "New private key: $NEW_KEY_FILE"
echo "Store this key securely and distribute to authorized users."
```

## Updating the EC2 Key Pair Resource

After rotating the actual SSH keys, you might want to update the EC2 key pair resource to match. This doesn't affect running instances but keeps your AWS console consistent.

Create a new EC2 key pair resource:

```bash
# Import your new public key as an EC2 key pair
aws ec2 import-key-pair \
  --key-name "production-key-$(date +%Y%m%d)" \
  --public-key-material fileb://~/.ssh/ec2-fleet-key-new.pub

# Optionally delete the old key pair resource
aws ec2 delete-key-pair --key-name old-production-key
```

Remember, deleting the EC2 key pair resource doesn't remove the key from running instances. It only removes the reference from AWS.

## Moving to Session Manager Instead

The best way to handle SSH key rotation is to eliminate SSH keys entirely. AWS Systems Manager Session Manager provides shell access without SSH keys, without opening port 22, and with full audit logging.

Connect via Session Manager:

```bash
# Connect to an instance without SSH
aws ssm start-session --target i-0abc123

# Or set up SSH over Session Manager (through the SSM tunnel)
# Add this to ~/.ssh/config:
# Host i-*
#   ProxyCommand sh -c "aws ssm start-session --target %h --document-name AWS-StartSSHSession --parameters 'portNumber=%p'"
```

This approach eliminates key rotation entirely since there are no keys to rotate. All access is controlled through IAM policies, and every session is logged.

## Best Practices

1. **Rotate at least every 90 days** - more frequently for high-security environments
2. **Use individual keys per user** - shared keys make it impossible to audit access
3. **Store private keys securely** - use AWS Secrets Manager or a vault solution
4. **Always verify new keys before removing old ones** - test in a separate session
5. **Automate the process** - manual rotation leads to skipped rotations
6. **Consider eliminating SSH keys** - Session Manager is often a better approach

For monitoring SSH access and security events on your EC2 instances, check our guide on [monitoring AWS infrastructure](https://oneuptime.com/blog/post/2026-02-13-aws-cloudwatch-infrastructure-monitoring/view).

## Wrapping Up

Rotating EC2 key pairs is a multi-step process - generate new keys, add them to instances, verify they work, remove old keys. The process has zero downtime because you add the new key before removing the old one. For fleets, SSM Run Command scales the process to hundreds of instances. And if you really want to simplify your life, consider moving to Session Manager and eliminating SSH keys altogether.
