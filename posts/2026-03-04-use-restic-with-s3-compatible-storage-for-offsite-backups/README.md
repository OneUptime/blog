# How to Use Restic with S3-Compatible Storage for Offsite Backups on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Restic, Backup, Linux

Description: Learn how to use Restic with S3-Compatible Storage for Offsite Backups on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to use Restic with S3-compatible storage for offsite backups on RHEL 8 or 9. Following these steps will help you set up a reliable configuration on RHEL.

## Prerequisites

- RHEL with a minimal or standard installation
- Root or sudo access
- A stable network connection
- An S3-compatible bucket, endpoint URL, access key, and secret key

## Overview

Using Restic with S3-compatible storage for offsite backups requires careful planning and execution. This guide walks through the complete process from installation to verification.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Install any required dependencies:

```bash
. /etc/os-release
sudo subscription-manager repos --enable "codeready-builder-for-rhel-${VERSION_ID%%.*}-$(arch)-rpms"
sudo dnf install -y "https://dl.fedoraproject.org/pub/epel/epel-release-latest-${VERSION_ID%%.*}.noarch.rpm"
```

## Step 2: Install Required Packages

```bash
sudo dnf install -y restic
```

Verify the installation:

```bash
restic version
rpm -qi restic
```

## Step 3: Configure Restic

Create an environment file for the repository and S3 credentials:

```bash
sudo install -d -m 0700 /etc/restic
sudo vi /etc/restic/s3.env
```

Add the following settings and replace the example values with your S3-compatible storage details:

```bash
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export RESTIC_REPOSITORY="s3:https://s3.example.com:9000/restic-backups"
export RESTIC_PASSWORD="use-a-long-unique-repository-password"
```

Protect the file because it contains credentials:

```bash
sudo chmod 600 /etc/restic/s3.env
```

Initialize the repository:

```bash
sudo bash -c 'set -a; source /etc/restic/s3.env; set +a; restic init'
```

## Step 4: Run a Backup

```bash
sudo bash -c 'set -a; source /etc/restic/s3.env; set +a; restic backup /etc /home --exclude-caches'
```

## Step 5: Verify the Configuration

List snapshots in the repository:

```bash
sudo bash -c 'set -a; source /etc/restic/s3.env; set +a; restic snapshots'
```

Check the repository metadata:

```bash
sudo bash -c 'set -a; source /etc/restic/s3.env; set +a; restic check'
```

## Step 6: Configure Firewall Rules

Restic connects outbound to your S3-compatible endpoint and does not require an inbound firewall service on the RHEL host. Make sure outbound HTTPS access to the endpoint is allowed by your network policy. If your endpoint uses a custom port, allow outbound traffic to that port.

```bash
curl -I https://s3.example.com:9000
```

## Step 7: Retention and Maintenance

Apply a retention policy and prune unreferenced data:

```bash
sudo bash -c 'set -a; source /etc/restic/s3.env; set +a; restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune'
```

## Security Considerations

- Store `/etc/restic/s3.env` with `600` permissions because it contains credentials
- Use TLS/SSL for the S3-compatible endpoint
- Restrict access with firewall rules
- Keep packages updated with `dnf update`
- Keep the Restic repository password safe; losing it makes the backup data unrecoverable

## Troubleshooting

Common issues and solutions:

1. **Repository initialization fails**: Verify `RESTIC_REPOSITORY`, the S3 endpoint URL, and the bucket name
2. **Permission denied**: Verify file ownership and SELinux contexts with `ls -laZ`
3. **S3 authentication fails**: Verify `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`

## Conclusion

You have successfully configured Restic with S3-compatible storage for offsite backups on RHEL. Monitor the backups regularly and keep Restic updated to maintain security and performance.
