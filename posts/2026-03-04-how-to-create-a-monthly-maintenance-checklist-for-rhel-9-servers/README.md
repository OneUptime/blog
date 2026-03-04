# How to Create a Monthly Maintenance Checklist for RHEL 9 Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Best Practices

Description: Step-by-step guide on create a monthly maintenance checklist for rhel 9 servers with practical examples and commands.

---

Regular monthly maintenance keeps RHEL 9 servers secure, stable, and performing well. Follow this checklist every month.

## Security Updates

- [ ] Review available security errata: `sudo dnf updateinfo list security`
- [ ] Apply security updates: `sudo dnf update --security`
- [ ] Verify updates applied: `sudo dnf history`
- [ ] Reboot if kernel was updated: `needs-restarting -r`
- [ ] Restart services needing restart: `needs-restarting -s`

## Subscription and Compliance

- [ ] Verify subscription status: `sudo subscription-manager status`
- [ ] Check Insights recommendations: `sudo insights-client`
- [ ] Run compliance scan: `sudo oscap xccdf eval ...`
- [ ] Review and address compliance findings

## Disk Space

- [ ] Check disk usage: `df -h`
- [ ] Clean old packages: `sudo dnf clean all`
- [ ] Rotate and compress logs: `sudo logrotate -f /etc/logrotate.conf`
- [ ] Clean journal: `sudo journalctl --vacuum-time=2weeks`
- [ ] Remove old kernels: `sudo dnf remove --oldinstallonly`

## User Accounts

- [ ] Review user accounts: `cat /etc/passwd`
- [ ] Check for inactive accounts: `lastlog`
- [ ] Verify sudo access: `cat /etc/sudoers.d/*`
- [ ] Review SSH authorized keys

## System Health

- [ ] Check disk health: `sudo smartctl -a /dev/sda`
- [ ] Review system logs: `sudo journalctl -p err -b`
- [ ] Check failed services: `sudo systemctl --failed`
- [ ] Verify backup completion
- [ ] Test backup restoration (quarterly)

## Network

- [ ] Verify firewall rules: `sudo firewall-cmd --list-all`
- [ ] Check certificate expiration dates
- [ ] Review open ports: `sudo ss -tlnp`
- [ ] Verify NTP synchronization: `chronyc tracking`

## Performance

- [ ] Review resource trends
- [ ] Check for performance degradation
- [ ] Verify monitoring is functioning
- [ ] Review alerting thresholds

## Documentation

- [ ] Update change log
- [ ] Document any configuration changes
- [ ] Update asset inventory

## Conclusion

Consistent monthly maintenance of RHEL 9 servers prevents problems from accumulating. Automate what you can with Ansible and schedule manual review tasks in your team's calendar.

