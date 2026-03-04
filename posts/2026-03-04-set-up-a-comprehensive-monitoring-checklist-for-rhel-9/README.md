# How to Set Up a Comprehensive Monitoring Checklist for RHEL Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Best Practices, Monitoring, Linux

Description: Step-by-step guide on set up a comprehensive monitoring checklist  servers using Red Hat Enterprise Linux 9.

---

Production environments require systematic verification before, during, and after deployment. A well-maintained checklist reduces human error and ensures consistency across your server fleet.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 2: Configure the Service

### Monitoring Verification Items

- [ ] System metrics collector is running (node_exporter, Telegraf, etc.)
- [ ] Disk space alerts configured (threshold: 80%)
- [ ] CPU usage alerts configured (threshold: 90%)
- [ ] Memory usage alerts configured (threshold: 85%)
- [ ] Log forwarding is operational
- [ ] Alert notification channels are verified
- [ ] NTP synchronization is active: `timedatectl`
- [ ] Service health checks are configured
- [ ] Network connectivity monitoring is in place
- [ ] SSL certificate expiration monitoring is active

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
