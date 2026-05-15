# How to Configure Bacula Backup Jobs with Custom File Sets and Schedules on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Bacula, Backup, Linux

Description: Learn how to configure Bacula Backup Jobs with Custom File Sets and Schedules on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to Configure Bacula Backup Jobs with Custom File Sets and Schedules on RHEL. Following these steps will help you set up a reliable configuration on RHEL.

## Prerequisites

- RHEL with a minimal or standard installation
- Root or sudo access
- A stable network connection

## Overview

Configure Bacula Backup Jobs with Custom File Sets and Schedules requires careful planning and execution. This guide walks through the complete process from installation to verification.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Install any required dependencies:

```bash
sudo subscription-manager repos --enable "codeready-builder-for-rhel-$(rpm -E %rhel)-$(arch)-rpms"
sudo dnf install -y "https://dl.fedoraproject.org/pub/epel/epel-release-latest-$(rpm -E %rhel).noarch.rpm"
```

## Step 2: Install Required Packages

```bash
sudo dnf install -y bacula-director bacula-storage bacula-client bacula-console
```

Verify the installation:

```bash
rpm -qi bacula-director bacula-storage bacula-client bacula-console
```

## Step 3: Configure the Service

Create or edit the Bacula Director configuration file:

```bash
sudo vi /etc/bacula/bacula-dir.conf
```

Add a custom `FileSet`, `Schedule`, and `Job` resource. Replace `appserver-fd`, `File1`, and `File` with the Client, Storage, and Pool resource names already defined in your Bacula configuration:

```conf
FileSet {
  Name = "AppServerFiles"
  Include {
    Options {
      signature = MD5
      compression = GZIP
    }
    File = /etc
    File = /var/www
  }
  Exclude {
    File = /tmp
    File = /var/tmp
  }
}

Schedule {
  Name = "WeeklyCycle"
  Run = Full 1st sun at 23:05
  Run = Differential 2nd-5th sun at 23:05
  Run = Incremental mon-sat at 23:05
}

Job {
  Name = "Backup-AppServer"
  Type = Backup
  Level = Incremental
  Client = appserver-fd
  FileSet = "AppServerFiles"
  Schedule = "WeeklyCycle"
  Storage = File1
  Pool = File
  Messages = Standard
}
```

Apply the recommended settings for your environment. Start with the defaults and adjust the File paths, Client, Storage, Pool, and retention settings based on your workload and hardware.

## Step 4: Start and Enable the Service

```bash
sudo systemctl enable --now bacula-dir bacula-sd bacula-fd
sudo systemctl status bacula-dir bacula-sd bacula-fd
```

## Step 5: Verify the Configuration

Test the setup:

```bash
sudo bacula-dir -t -c /etc/bacula/bacula-dir.conf
sudo bacula-sd -t -c /etc/bacula/bacula-sd.conf
sudo bacula-fd -t -c /etc/bacula/bacula-fd.conf
```

Check the logs for any errors:

```bash
journalctl -u bacula-dir -u bacula-sd -u bacula-fd -f
```

Use `bconsole` to confirm that the Director can read the new job and schedule:

```bash
sudo bconsole -c /etc/bacula/bconsole.conf
```

At the `*` prompt, run:

```text
status director
show jobs
```

## Step 6: Configure Firewall Rules

If the service needs network access:

```bash
sudo firewall-cmd --permanent --add-port=9101/tcp
sudo firewall-cmd --permanent --add-port=9102/tcp
sudo firewall-cmd --permanent --add-port=9103/tcp
sudo firewall-cmd --reload
```

## Step 7: Performance Tuning

Monitor resource usage and adjust configuration parameters based on your workload:

```bash
systemctl show bacula-dir --property=MemoryCurrent
top -p $(pidof -s bacula-dir)
```

## Security Considerations

- Run the Director and Storage Daemon with a dedicated non-root user when possible. The File Daemon often needs root privileges to read protected files during backups.
- Enable Bacula TLS/PSK or TLS certificate settings for network communication
- Restrict access to Bacula ports 9101, 9102, and 9103 with firewall rules
- Keep packages updated with `dnf update`

## Troubleshooting

Common issues and solutions:

1. **Service fails to start**: Check `journalctl -u bacula-dir -u bacula-sd -u bacula-fd -xe` for error messages
2. **Permission denied**: Verify file ownership and SELinux contexts with `ls -laZ`
3. **Port conflicts**: Use `ss -tlnp` to identify processes using ports 9101, 9102, or 9103

## Conclusion

You have successfully configured configure bacula backup jobs with custom file sets and schedules on RHEL. Monitor the service regularly and keep it updated to maintain security and performance.
