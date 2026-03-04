# How to Create a Pre-Production Security Checklist for RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Best Practices, Linux

Description: Step-by-step guide on create a pre-production security checklist using Red Hat Enterprise Linux 9.

---

Production environments require systematic verification before, during, and after deployment. A well-maintained checklist reduces human error and ensures consistency across your server fleet.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 2: Configure the Service

### Security Verification Items

- [ ] SELinux is in Enforcing mode: `getenforce`
- [ ] Firewall is active: `firewall-cmd --state`
- [ ] SSH root login is disabled
- [ ] Password authentication is disabled for SSH
- [ ] Unused services are stopped and disabled
- [ ] System crypto policy is set appropriately: `update-crypto-policies --show`
- [ ] All packages are up to date: `dnf check-update`
- [ ] Audit daemon is running: `systemctl status auditd`
- [ ] No world-writable files: `find / -perm -o+w -type f 2>/dev/null`
- [ ] No unowned files: `find / -nouser -o -nogroup 2>/dev/null`

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable <service-name>

# Start the service
sudo systemctl start <service-name>

# Check the status
sudo systemctl status <service-name>
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Run a quick system health check
systemctl --failed
journalctl -p err --since "24 hours ago" --no-pager | tail -20
df -h
free -m
uptime
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u <service-name> -e --no-pager`.
- SELinux may block access. Check for denials with `ausearch -m avc -ts recent` and apply appropriate policies.
- Ensure all required packages are installed: `rpm -qa | grep <package-name>`.

## Conclusion

You have successfully completed the setup described in this guide. Review and update this checklist regularly as your environment evolves. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
