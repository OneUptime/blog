# How to Create a RHEL Patch Management and Update Checklist

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Best Practices, Linux

Description: Step-by-step guide on create a RHEL patch management and update checklist using Red Hat Enterprise Linux 9.

---

Production environments require systematic verification before, during, and after deployment. A well-maintained checklist reduces human error and ensures consistency across your server fleet.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 2: Configure the Service

### Patch Management Items

- [ ] DNF automatic updates are configured: `dnf install dnf-automatic`
- [ ] Update schedule is documented
- [ ] Staging environment mirrors production
- [ ] Rollback procedure is documented
- [ ] Critical security patches have an expedited process
- [ ] Kernel updates include reboot scheduling
- [ ] Post-update validation checks are automated
- [ ] Package exclude list is maintained for sensitive packages
- [ ] RHEL subscription is active: `subscription-manager status`

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
- Ensure all required packages are installed: `rpm -qa | grep <package-name>`.

## Conclusion

You have successfully completed the setup described in this guide. Review and update this checklist regularly as your environment evolves. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
