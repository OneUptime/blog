# How to Build a Post-Incident Review Checklist for RHEL Outages

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Best Practices, Operations, Linux

Description: Step-by-step guide on build a post-incident review checklist  outages using Red Hat Enterprise Linux 9.

---

Production environments require systematic verification before, during, and after deployment. A well-maintained checklist reduces human error and ensures consistency across your server fleet.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 2: Configure the Service

### Post-Incident Review Items

- [ ] Timeline of events documented
- [ ] Root cause identified
- [ ] Impact assessment completed
- [ ] Detection time measured
- [ ] Response time measured
- [ ] Recovery time measured
- [ ] Action items assigned with deadlines
- [ ] Monitoring gaps identified and addressed
- [ ] Runbook updated with lessons learned
- [ ] Changes communicated to affected teams

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
