# How to Debug Compute Engine SSH Connection Failures Caused by OS Login Misconfiguration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Compute Engine, SSH, OS Login, Troubleshooting

Description: Learn how to diagnose and fix SSH connection failures on Google Compute Engine VMs when OS Login is misconfigured, including IAM roles, metadata settings, and firewall rules.

---

If you have ever stared at a terminal waiting for an SSH connection that never completes, you know the frustration. On Google Compute Engine, one of the most common culprits behind SSH failures is OS Login misconfiguration. OS Login ties SSH access to IAM, which is great for security but can be tricky to get right. In this post, I will walk through the debugging process step by step, based on real issues I have run into.

## What Is OS Login and Why Does It Matter

OS Login is a feature in Google Cloud that manages SSH access to Compute Engine VMs using IAM roles instead of traditional SSH key management. When enabled, it creates POSIX user accounts on VMs based on Google identities and checks IAM permissions before allowing SSH access.

This is a big improvement over manually managing SSH keys in project or instance metadata. But it also means that if your IAM setup is off, you will not be able to connect at all.

## Step 1: Confirm OS Login Is Enabled

First, check whether OS Login is actually enabled on the instance. It can be set at the project level or the instance level.

This command checks instance-level metadata for the OS Login setting:

```bash
# Check if OS Login is enabled on a specific instance
gcloud compute instances describe my-instance \
  --zone=us-central1-a \
  --format="value(metadata.items[key='enable-oslogin'].value)"
```

If this returns `TRUE`, OS Login is active on that instance. You can also check the project-level default:

```bash
# Check project-level OS Login setting
gcloud compute project-info describe \
  --format="value(commonInstanceMetadata.items[key='enable-oslogin'].value)"
```

If both are empty, OS Login is not enabled and your SSH issue is likely something else entirely - like a missing SSH key in metadata or a firewall rule problem.

## Step 2: Verify IAM Roles

OS Login requires specific IAM roles. Without them, the connection will fail even if everything else is set up correctly.

The two key roles are:

- `roles/compute.osLogin` - Allows SSH access without sudo
- `roles/compute.osAdminLogin` - Allows SSH access with sudo privileges

Check what roles your user has on the project:

```bash
# List IAM policy bindings for the project
gcloud projects get-iam-policy my-project \
  --flatten="bindings[].members" \
  --filter="bindings.members:user@example.com" \
  --format="table(bindings.role)"
```

If you do not see either `roles/compute.osLogin` or `roles/compute.osAdminLogin` in the output, that is your problem. Grant the appropriate role:

```bash
# Grant OS Login role to a user
gcloud projects add-iam-policy-binding my-project \
  --member="user:user@example.com" \
  --role="roles/compute.osLogin"
```

For service accounts connecting via SSH, the same roles apply. Make sure the service account has the OS Login role bound at the project or instance level.

## Step 3: Check for Two-Factor Authentication Requirements

If your organization has enabled OS Login with two-factor authentication, you need the `roles/compute.osLogin` role AND must have 2FA configured on your Google account. You can check whether 2FA is required:

```bash
# Check if 2FA is required for OS Login
gcloud compute instances describe my-instance \
  --zone=us-central1-a \
  --format="value(metadata.items[key='enable-oslogin-2fa'].value)"
```

If this returns `TRUE` and your account does not have 2FA set up, SSH will fail silently or with a generic authentication error.

## Step 4: Inspect Firewall Rules

Even with OS Login configured correctly, SSH needs port 22 open. This trips people up more often than you would expect, especially in projects with restrictive default firewall rules.

```bash
# List firewall rules that allow TCP port 22
gcloud compute firewall-rules list \
  --filter="allowed[].ports:22 AND direction=INGRESS" \
  --format="table(name, network, sourceRanges[], allowed[].ports[])"
```

Make sure there is a rule allowing ingress on port 22 from your source IP or from `35.235.240.0/20` if you are using Identity-Aware Proxy (IAP) for SSH tunneling.

If no rule exists, create one:

```bash
# Create a firewall rule allowing SSH from IAP
gcloud compute firewall-rules create allow-ssh-iap \
  --direction=INGRESS \
  --priority=1000 \
  --network=default \
  --action=ALLOW \
  --rules=tcp:22 \
  --source-ranges=35.235.240.0/20 \
  --target-tags=allow-ssh
```

## Step 5: Test with the Serial Console

When SSH is completely broken, the serial console is your lifeline. You can connect to it through the Cloud Console or via gcloud:

```bash
# Connect to the serial console for debugging
gcloud compute connect-to-serial-port my-instance \
  --zone=us-central1-a
```

Once connected, check the SSH daemon logs:

```bash
# Check SSH daemon logs on the VM
sudo journalctl -u sshd -n 50
```

Look for messages like "Permission denied" or "no matching key exchange method." These will point you directly to the issue.

## Step 6: Verify the OS Login POSIX Account

OS Login creates POSIX accounts on the VM. Sometimes these accounts do not get created properly, especially on custom images that do not have the OS Login packages installed.

Check whether the guest environment packages are installed:

```bash
# Check if the OS Login packages are installed (Debian/Ubuntu)
dpkg -l | grep google-compute-engine-oslogin
```

If the package is missing, install it:

```bash
# Install OS Login packages on Debian/Ubuntu
sudo apt-get update && sudo apt-get install -y google-compute-engine-oslogin
```

For CentOS or RHEL-based systems:

```bash
# Install OS Login packages on CentOS/RHEL
sudo yum install -y google-compute-engine-oslogin
```

## Step 7: Check NSS Configuration

OS Login relies on NSS (Name Service Switch) to resolve user accounts. If the NSS configuration is broken, the VM will not recognize OS Login users.

```bash
# Check NSS configuration for OS Login entries
grep oslogin /etc/nsswitch.conf
```

You should see `oslogin` in the `passwd`, `group`, and optionally `shadow` lines. If it is missing, the OS Login package may not be installed correctly.

## Common Patterns and Fixes

Here is a quick reference for the most frequent OS Login SSH failures:

| Symptom | Likely Cause | Fix |
|---|---|---|
| "Permission denied (publickey)" | Missing IAM role | Grant `roles/compute.osLogin` |
| Connection timeout | Firewall rule missing | Add ingress rule for port 22 |
| "Connection refused" | sshd not running | Restart sshd via serial console |
| Works in Console but not gcloud | Local SSH config conflict | Check ~/.ssh/config for overrides |
| Intermittent failures | OS Login package outdated | Update guest environment packages |

## Putting It All Together

When debugging OS Login SSH failures, work through the layers systematically: metadata settings first, then IAM roles, then firewall rules, and finally the guest OS configuration. Most issues fall into one of these categories, and checking them in order will save you from chasing ghosts.

If you are managing a fleet of VMs, consider using organization policies to enforce consistent OS Login settings across all projects. This prevents the drift that causes these issues in the first place.

One last tip: if you are using Terraform or another IaC tool to manage your infrastructure, make sure your OS Login configuration is defined there too. I have seen cases where someone enabled OS Login in the console but it was not in the Terraform state, so the next apply wiped it out and broke SSH for the whole team.
