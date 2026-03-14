# How to Troubleshoot 'Failed to Start' systemd Service Errors on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Systemd, Troubleshooting

Description: Step-by-step guide on troubleshoot 'failed to start' systemd service errors on rhel 9 with practical examples and commands.

---

When a systemd service fails to start on RHEL 9, systematic troubleshooting can identify the root cause quickly.

## Check the Service Status

```bash
sudo systemctl status servicename
```

## View Detailed Logs

```bash
sudo journalctl -u servicename -n 50 --no-pager
sudo journalctl -u servicename -xe
```

## Common Causes and Fixes

### Configuration File Errors

```bash
# Test configuration syntax (example for httpd)
sudo httpd -t
# For nginx
sudo nginx -t
```

### Missing Dependencies

```bash
sudo systemctl list-dependencies servicename
```

### Port Conflicts

```bash
sudo ss -tlnp | grep :80
# Kill or stop the conflicting service
sudo systemctl stop conflicting-service
```

### Permission Issues

```bash
# Check file ownership
ls -la /etc/servicename/
ls -la /var/run/servicename/

# Check SELinux denials
sudo ausearch -m AVC -ts recent
```

### Missing Working Directory

```bash
# Check the unit file for WorkingDirectory
sudo systemctl cat servicename | grep WorkingDirectory
# Create the directory if missing
sudo mkdir -p /path/to/working/directory
```

## Inspect the Unit File

```bash
sudo systemctl cat servicename
```

Look for issues with:
- ExecStart path
- User and Group settings
- Environment variables
- Working directory

## Reset a Failed Service

```bash
sudo systemctl reset-failed servicename
sudo systemctl start servicename
```

## Enable Debug Logging

```bash
# Temporarily increase logging
sudo systemctl edit servicename
# Add:
# [Service]
# Environment=DEBUG=1

sudo systemctl daemon-reload
sudo systemctl restart servicename
```

## Conclusion

systemd service failures on RHEL 9 are usually caused by configuration errors, port conflicts, permission issues, or missing dependencies. Check the journal logs first, then examine the unit file and service configuration.

