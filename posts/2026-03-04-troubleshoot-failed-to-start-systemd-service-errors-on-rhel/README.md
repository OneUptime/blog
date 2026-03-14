# How to Troubleshoot 'Failed to Start' systemd Service Errors on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Systemd, Services, Troubleshooting, Linux

Description: Diagnose and fix systemd service startup failures on RHEL by reading journal logs, checking unit files, and resolving common configuration issues.

---

When a systemd service fails to start on RHEL, you need to examine the service status, journal logs, and the unit file to find the root cause.

## Step 1: Check the Service Status

```bash
# Get detailed status including recent log lines
sudo systemctl status httpd.service

# Key things to look for:
# - "Active: failed" or "Active: activating (auto-restart)"
# - The "Main PID" line showing if the process exited
# - Recent log output at the bottom
```

## Step 2: Read the Journal Logs

```bash
# View all logs for the service
sudo journalctl -u httpd.service --no-pager

# View only the most recent startup attempt
sudo journalctl -u httpd.service -n 50

# Follow logs in real time while trying to start the service
sudo journalctl -u httpd.service -f
```

In another terminal:

```bash
sudo systemctl start httpd.service
```

## Step 3: Common Causes and Fixes

### Port Already in Use

```bash
# Check if another process is using the port
sudo ss -tlnp | grep :80

# Kill the conflicting process or change the service port
sudo kill <pid>
# Or reconfigure the service to use a different port
```

### Configuration File Errors

```bash
# Test the service configuration (most services support this)
sudo httpd -t          # Apache
sudo nginx -t          # Nginx
sudo named-checkconf   # BIND DNS
sudo sshd -t           # OpenSSH

# Fix any errors in the configuration file
```

### Permission Issues

```bash
# Check file ownership for the service
ls -la /etc/httpd/conf/httpd.conf
ls -la /var/www/html/

# Check SELinux denials
sudo ausearch -m avc --start recent | grep httpd
```

### Missing Dependencies

```bash
# Check what the service requires
systemctl list-dependencies httpd.service

# Ensure required services are running
sudo systemctl start network.target
```

## Step 4: Inspect the Unit File

```bash
# View the unit file
systemctl cat httpd.service

# Check for override files
systemctl show httpd.service | grep FragmentPath
ls /etc/systemd/system/httpd.service.d/
```

## Step 5: Reset a Failed Service

```bash
# Reset the failed state
sudo systemctl reset-failed httpd.service

# Try starting again
sudo systemctl start httpd.service
```

## Step 6: Debug with Increased Verbosity

```bash
# For services that support debug mode, create an override
sudo systemctl edit httpd.service

# Add environment variables for debugging
# [Service]
# Environment=HTTPD_LOG_LEVEL=debug
```

```bash
# Reload and restart
sudo systemctl daemon-reload
sudo systemctl restart httpd.service
```

The journal log (`journalctl -u <service>`) is almost always the fastest path to finding the actual error message.
