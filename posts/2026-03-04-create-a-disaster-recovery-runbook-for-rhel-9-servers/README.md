# How to Create a Disaster Recovery Runbook for RHEL Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Backup, Linux

Description: Step-by-step guide on create a disaster recovery runbook  servers using Red Hat Enterprise Linux 9.

---

Production environments require systematic verification before, during, and after deployment. A well-maintained checklist reduces human error and ensures consistency across your server fleet.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 2: Configure the Service

### Disaster Recovery Procedures

1. **Detection**: Define how outages are detected (monitoring alerts, user reports)
2. **Assessment**: Determine scope and severity
3. **Communication**: Notify stakeholders via predefined channels
4. **Recovery**: Follow documented recovery steps:
   - Restore from most recent verified backup
   - Verify data integrity
   - Restore network connectivity
   - Validate application functionality
5. **Verification**: Run full test suite against recovered system
6. **Post-Mortem**: Document what happened and how to prevent recurrence

```bash
# Quick system health check after recovery
systemctl --failed
journalctl -p err --since "1 hour ago"
df -h
free -m
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable <service-name>

# Start the service
sudo systemctl start <service-name>

# Check the status
sudo systemctl status <service-name>
```

## Step 4: Configure the Firewall

```bash
# Open the required port
sudo firewall-cmd --permanent --add-port=<PORT>/tcp
sudo firewall-cmd --reload

# Verify the rule
sudo firewall-cmd --list-all
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
- Verify firewall rules allow traffic on the required ports: `firewall-cmd --list-all`.
- Ensure all required packages are installed: `rpm -qa | grep <package-name>`.

## Conclusion

You have successfully completed the setup described in this guide. Review and update this checklist regularly as your environment evolves. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
