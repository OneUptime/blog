# How to Use gcloud CLI to SSH into Compute Engine Instances

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, gcloud CLI, SSH, Compute Engine, Google Cloud

Description: Learn how to use the gcloud CLI to SSH into Compute Engine instances, manage SSH keys, tunnel through IAP, and troubleshoot common connection issues.

---

The gcloud CLI is the fastest way to SSH into a Compute Engine instance. It handles key management, project and zone resolution, and can even tunnel through Identity-Aware Proxy when your VM does not have a public IP. No need to manually copy SSH keys or configure SSH config files.

This post covers the basics of gcloud SSH, the different connection methods available, and how to troubleshoot when things go wrong.

## Basic SSH Connection

The simplest form of gcloud SSH requires just the instance name:

```bash
# SSH into an instance (gcloud resolves the zone automatically)
gcloud compute ssh my-instance --project=my-project
```

If you have instances with the same name in different zones, specify the zone:

```bash
# SSH into an instance in a specific zone
gcloud compute ssh my-instance --zone=us-central1-a --project=my-project
```

The first time you run this command, gcloud generates an SSH key pair and uploads the public key to your instance's metadata. This happens automatically and you do not need to manage it.

## How gcloud SSH Works

When you run `gcloud compute ssh`, several things happen behind the scenes:

1. gcloud checks for an existing SSH key pair in `~/.ssh/google_compute_engine`
2. If no key exists, it generates a new RSA key pair
3. It uploads the public key to the instance (or project) metadata
4. It resolves the instance's IP address
5. It opens an SSH connection using the key

The SSH key is stored locally at:
- Private key: `~/.ssh/google_compute_engine`
- Public key: `~/.ssh/google_compute_engine.pub`

## Connecting as a Different User

By default, gcloud SSH uses your local username. To connect as a different user:

```bash
# SSH as a specific user
gcloud compute ssh admin@my-instance --zone=us-central1-a --project=my-project
```

## Running Remote Commands

You do not always need an interactive session. Run a single command and get the output:

```bash
# Run a command on the remote instance and return the output
gcloud compute ssh my-instance \
  --zone=us-central1-a \
  --project=my-project \
  --command="df -h && free -m"
```

This is useful for quick checks and scripting:

```bash
# Check disk usage across multiple instances
for instance in web-1 web-2 web-3; do
  echo "=== $instance ==="
  gcloud compute ssh "$instance" \
    --zone=us-central1-a \
    --project=my-project \
    --command="df -h / | tail -1" \
    --quiet
done
```

## SSH Through Identity-Aware Proxy (IAP)

If your VM does not have a public IP (which is best practice for security), you can tunnel through IAP:

```bash
# SSH through IAP tunnel - works for instances without public IPs
gcloud compute ssh my-internal-instance \
  --zone=us-central1-a \
  --project=my-project \
  --tunnel-through-iap
```

For IAP tunneling to work, you need:

1. The IAP API enabled
2. A firewall rule allowing SSH from IAP's IP range
3. IAM permissions for IAP-secured tunnel access

```bash
# Enable IAP API
gcloud services enable iap.googleapis.com --project=my-project

# Create a firewall rule allowing SSH from IAP
gcloud compute firewall-rules create allow-ssh-from-iap \
  --network=my-vpc \
  --allow=tcp:22 \
  --source-ranges=35.235.240.0/20 \
  --target-tags=allow-iap-ssh \
  --project=my-project

# Grant IAP tunnel access to a user
gcloud projects add-iam-policy-binding my-project \
  --member="user:developer@example.com" \
  --role="roles/iap.tunnelResourceAccessor"
```

## Port Forwarding

Forward a remote port to your local machine through the SSH tunnel:

```bash
# Forward remote port 8080 to local port 8080
gcloud compute ssh my-instance \
  --zone=us-central1-a \
  --project=my-project \
  -- -L 8080:localhost:8080
```

This is useful for accessing web UIs or databases running on the instance:

```bash
# Forward a remote PostgreSQL port through IAP
gcloud compute ssh my-db-instance \
  --zone=us-central1-a \
  --project=my-project \
  --tunnel-through-iap \
  -- -L 5432:localhost:5432 -N
```

The `-N` flag tells SSH not to execute a remote command, just forward the port. Your local PostgreSQL client can then connect to `localhost:5432`.

## SSH Key Management

### Viewing SSH Keys

```bash
# List SSH keys in project metadata
gcloud compute project-info describe \
  --project=my-project \
  --format="value(commonInstanceMetadata.items.filter(key:ssh-keys).value)"
```

### Using a Custom Key

```bash
# SSH with a specific private key
gcloud compute ssh my-instance \
  --zone=us-central1-a \
  --project=my-project \
  --ssh-key-file=~/.ssh/my-custom-key
```

### Removing SSH Keys

If you need to revoke access:

```bash
# Remove a specific SSH key from project metadata
gcloud compute project-info remove-metadata \
  --keys=ssh-keys \
  --project=my-project
```

This removes all keys. For removing a single key, you need to edit the metadata manually.

### OS Login

For better key management, especially in organizations, use OS Login instead of metadata-based keys:

```bash
# Enable OS Login at the project level
gcloud compute project-info add-metadata \
  --metadata enable-oslogin=TRUE \
  --project=my-project
```

With OS Login, SSH keys are managed through IAM rather than instance metadata. Users' keys are synced automatically based on their IAM permissions.

## SSH Config Integration

You can generate an SSH config file for use with regular ssh commands:

```bash
# Generate SSH config entries for all instances in a project
gcloud compute config-ssh --project=my-project
```

This adds entries to `~/.ssh/config` so you can use regular SSH:

```bash
# After running config-ssh, you can use regular ssh
ssh my-instance.us-central1-a.my-project
```

## Troubleshooting SSH Issues

### Permission Denied

If you get "Permission denied (publickey)":

```bash
# Reset the SSH key by removing the old one and generating a new one
gcloud compute ssh my-instance \
  --zone=us-central1-a \
  --project=my-project \
  --ssh-key-expire-after=1h \
  --force-key-file-overwrite
```

### Connection Timed Out

This usually means a firewall rule is blocking port 22:

```bash
# Check if there is a firewall rule allowing SSH
gcloud compute firewall-rules list \
  --filter="network=my-vpc AND allowed[].ports:22" \
  --format="table(name,sourceRanges,targetTags)" \
  --project=my-project
```

### Instance Not Found

Make sure you have the right zone:

```bash
# Find which zone an instance is in
gcloud compute instances list \
  --filter="name=my-instance" \
  --project=my-project \
  --format="table(name,zone,status)"
```

### SSH Key Propagation Delay

After a new SSH key is uploaded to metadata, it can take up to 30 seconds for the key to propagate to the instance. If you just created the instance, wait a moment and try again.

## Advanced Options

### SSH with Specific Ciphers

```bash
# Specify SSH options directly
gcloud compute ssh my-instance \
  --zone=us-central1-a \
  --project=my-project \
  -- -o Ciphers=aes256-ctr -o MACs=hmac-sha2-256
```

### Serial Console Access

When SSH is completely broken (network misconfiguration, broken sshd), use the serial console:

```bash
# Connect to the serial console for emergency access
gcloud compute connect-to-serial-port my-instance \
  --zone=us-central1-a \
  --project=my-project
```

This connects directly to the VM's serial port, bypassing the network entirely.

## Summary

The gcloud CLI makes SSH connections to Compute Engine instances straightforward - it handles key generation, upload, and zone resolution automatically. For instances without public IPs, use IAP tunneling. For organization-wide key management, enable OS Login. When SSH fails, check firewall rules first, then key propagation, and fall back to serial console access for emergency situations.
