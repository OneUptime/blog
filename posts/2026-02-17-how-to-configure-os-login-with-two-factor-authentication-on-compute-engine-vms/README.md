# How to Configure OS Login with Two-Factor Authentication on Compute Engine VMs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Compute Engine, OS Login, Two-Factor Authentication, Security

Description: Step-by-step guide to configuring OS Login with two-factor authentication on GCP Compute Engine VMs for secure SSH access management.

---

Managing SSH keys for Compute Engine VMs can quickly become a headache, especially at scale. Who has access to which VM? Are there stale keys from employees who left months ago? OS Login solves this by tying SSH access to your Google Cloud IAM identities. Add two-factor authentication (2FA) on top, and you have a solid access control setup.

In this post, I will walk through enabling OS Login, setting up two-factor authentication, and configuring the IAM roles needed to manage access properly.

## What is OS Login?

By default, Compute Engine manages SSH keys through project and instance metadata. This works but has problems:

- Keys are project-wide unless you manage per-instance keys
- There is no centralized audit trail of who accessed what
- Removing a user's access means finding and removing their key from every instance
- There is no built-in support for 2FA

OS Login replaces this by linking SSH access to Cloud Identity or Google Workspace accounts. When a user SSHs into a VM, GCP verifies their identity, checks their IAM roles, and creates a POSIX user account on the fly. When they leave the organization and their Google account is deactivated, they immediately lose SSH access to all VMs.

## Step 1: Enable OS Login at the Project Level

You can enable OS Login for all VMs in a project by setting a project-wide metadata value.

```bash
# Enable OS Login for all VMs in the project
gcloud compute project-info add-metadata \
    --metadata enable-oslogin=TRUE
```

Or enable it for a specific instance only:

```bash
# Enable OS Login for a single VM
gcloud compute instances add-metadata my-vm \
    --zone=us-central1-a \
    --metadata enable-oslogin=TRUE
```

## Step 2: Enable Two-Factor Authentication

To require 2FA for SSH access, add an additional metadata flag:

```bash
# Enable OS Login with 2FA for all VMs in the project
gcloud compute project-info add-metadata \
    --metadata enable-oslogin=TRUE,enable-oslogin-2fa=TRUE
```

For a specific instance:

```bash
# Enable OS Login with 2FA for a single VM
gcloud compute instances add-metadata my-vm \
    --zone=us-central1-a \
    --metadata enable-oslogin=TRUE,enable-oslogin-2fa=TRUE
```

When 2FA is enabled, users will be prompted for a verification code after providing their SSH key. The verification method depends on their Google account's 2FA configuration - it could be a phone prompt, a TOTP code from an authenticator app, or a security key.

## Step 3: Configure IAM Roles

Users need specific IAM roles to SSH into VMs with OS Login enabled.

**For regular SSH access:**

```bash
# Grant the OS Login role to a user - allows SSH access
gcloud projects add-iam-policy-binding my-project \
    --member="user:developer@example.com" \
    --role="roles/compute.osLogin"
```

**For SSH access with sudo (admin) privileges:**

```bash
# Grant the OS Admin Login role - allows SSH access with sudo
gcloud projects add-iam-policy-binding my-project \
    --member="user:admin@example.com" \
    --role="roles/compute.osAdminLogin"
```

**For external users (outside your organization):**

```bash
# Grant the External User role in addition to OS Login
gcloud projects add-iam-policy-binding my-project \
    --member="user:contractor@external.com" \
    --role="roles/compute.osLoginExternalUser"

gcloud projects add-iam-policy-binding my-project \
    --member="user:contractor@external.com" \
    --role="roles/compute.osLogin"
```

Here is a summary of the roles:

| Role | Description |
|------|-------------|
| `roles/compute.osLogin` | SSH access without sudo |
| `roles/compute.osAdminLogin` | SSH access with sudo |
| `roles/compute.osLoginExternalUser` | Required for users outside your org |

## Step 4: Test the Setup

Have a user try to SSH in:

```bash
# SSH using gcloud - it handles OS Login automatically
gcloud compute ssh my-vm --zone=us-central1-a
```

The first time a user connects with OS Login, GCP automatically:

1. Creates a POSIX user account on the VM (username based on their email)
2. Pushes their SSH public key to the VM
3. Sets up their home directory

With 2FA enabled, after the SSH key is verified, the user sees a prompt like:

```
Please verify your identity.
You can use your phone or visit https://g.co/verifyaccount
Verify:
```

They need to approve the prompt on their phone or enter a code from their authenticator app.

## Setting Up OS Login with Terraform

Here is the Terraform configuration for a project with OS Login and 2FA.

```hcl
# Enable OS Login with 2FA at the project level
resource "google_compute_project_metadata" "oslogin" {
  metadata = {
    enable-oslogin     = "TRUE"
    enable-oslogin-2fa = "TRUE"
  }
}

# Grant OS Login access to a user
resource "google_project_iam_member" "os_login" {
  project = "my-project"
  role    = "roles/compute.osLogin"
  member  = "user:developer@example.com"
}

# Grant OS Admin Login to an admin user
resource "google_project_iam_member" "os_admin_login" {
  project = "my-project"
  role    = "roles/compute.osAdminLogin"
  member  = "user:admin@example.com"
}

# Create a VM - OS Login is inherited from project metadata
resource "google_compute_instance" "secure_vm" {
  name         = "secure-vm"
  machine_type = "e2-medium"
  zone         = "us-central1-a"

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
    }
  }

  network_interface {
    network = "default"
  }
}
```

## Managing SSH Keys with OS Login

When OS Login is enabled, users manage their SSH keys through their Google Cloud profile rather than through instance metadata.

```bash
# Add an SSH public key to your OS Login profile
gcloud compute os-login ssh-keys add \
    --key-file=~/.ssh/id_rsa.pub \
    --ttl=365d
```

The `--ttl` flag sets an expiration for the key. This is a great security feature - you can ensure that SSH keys automatically expire and need to be re-added. For a security-conscious setup, use a shorter TTL like 30 or 90 days.

```bash
# List all SSH keys in your OS Login profile
gcloud compute os-login ssh-keys list

# Remove an SSH key
gcloud compute os-login ssh-keys remove --key="FINGERPRINT"
```

## Checking the POSIX Account

You can look up a user's POSIX account details:

```bash
# Describe a user's OS Login profile
gcloud compute os-login describe-profile

# Look up a specific user's POSIX account
gcloud compute os-login describe-profile --format="value(posixAccounts[0].username)"
```

The username format is the user's email with dots and @ replaced by underscores. For example, `user@example.com` becomes `user_example_com`.

## Audit Logging

One of the biggest advantages of OS Login is the audit trail. Every SSH login attempt is logged in Cloud Audit Logs. You can view these in the Cloud Console under Logging, or query them:

```bash
# View SSH login audit logs
gcloud logging read 'resource.type="gce_instance" AND protoPayload.methodName="google.ssh-serialport.v1.connect"' \
    --limit=20 \
    --format=json
```

This gives you a complete record of who logged into which VM and when.

## Common Issues and Solutions

**Issue: "Permission denied" when SSHing**
This usually means the user does not have the `roles/compute.osLogin` role. Check their IAM permissions:

```bash
# Check what roles a user has
gcloud projects get-iam-policy my-project \
    --flatten="bindings[].members" \
    --filter="bindings.members:developer@example.com" \
    --format="table(bindings.role)"
```

**Issue: 2FA prompt not appearing**
The user's Google account needs to have 2FA configured. If they have not set it up, OS Login with 2FA will deny access entirely rather than skipping the 2FA step.

**Issue: SSH works with gcloud but not with plain ssh**
When using the `ssh` command directly, you need to use the OS Login username and ensure your SSH key is registered with OS Login:

```bash
# Get your OS Login username
USERNAME=$(gcloud compute os-login describe-profile --format='value(posixAccounts[0].username)')

# SSH using the OS Login username
ssh -i ~/.ssh/id_rsa ${USERNAME}@VM_EXTERNAL_IP
```

## Best Practices

1. **Enable OS Login project-wide**, not per-instance. This prevents new VMs from being created without it.
2. **Use 2FA for production environments** where VMs handle sensitive data.
3. **Set SSH key TTLs** to force periodic key rotation.
4. **Use `roles/compute.osLogin`** (not admin) by default. Only grant admin when sudo is genuinely needed.
5. **Monitor audit logs** for unusual SSH access patterns.
6. **Use organization policies** to enforce OS Login across all projects.

## Wrapping Up

OS Login with 2FA transforms Compute Engine SSH access from a key management nightmare into a proper identity-based access control system. The setup is straightforward, the audit trail is comprehensive, and the integration with IAM means access is automatically revoked when someone leaves the organization. If you are still managing SSH keys through metadata, make the switch - your security team will appreciate it.
