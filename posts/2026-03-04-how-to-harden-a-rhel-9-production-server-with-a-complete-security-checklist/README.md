# How to Harden a RHEL 9 Production Server with a Complete Security Checklist

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Best Practices

Description: Step-by-step guide on harden a rhel 9 production server with a complete security checklist with practical examples and commands.

---

A comprehensive security hardening checklist ensures your RHEL 9 production servers are protected against common threats.

## System Updates

- [ ] Register the system with subscription-manager
- [ ] Apply all available security updates: `sudo dnf update --security`
- [ ] Enable automatic security updates with dnf-automatic
- [ ] Remove unnecessary packages: `sudo dnf autoremove`

## User and Access Management

- [ ] Disable root SSH login: `PermitRootLogin no` in sshd_config
- [ ] Use SSH key-based authentication
- [ ] Disable password authentication: `PasswordAuthentication no`
- [ ] Configure sudo with least privilege
- [ ] Set strong password policy in /etc/security/pwquality.conf
- [ ] Enable account lockout with faillock
- [ ] Remove unnecessary user accounts
- [ ] Set TMOUT for idle session timeout

```bash
# Password policy
sudo vi /etc/security/pwquality.conf
# minlen = 14
# dcredit = -1
# ucredit = -1
# lcredit = -1
# ocredit = -1
```

## SELinux

- [ ] Verify SELinux is enforcing: `getenforce`
- [ ] Ensure targeted policy is active
- [ ] Review and fix any SELinux denials
- [ ] Apply correct file contexts to custom paths

## Firewall

- [ ] Enable firewalld: `sudo systemctl enable --now firewalld`
- [ ] Allow only required services
- [ ] Set default zone to drop or public
- [ ] Remove unnecessary services from the zone

```bash
sudo firewall-cmd --set-default-zone=public
sudo firewall-cmd --permanent --remove-service=dhcpv6-client
sudo firewall-cmd --reload
```

## Network Security

- [ ] Disable IPv6 if not needed
- [ ] Set crypto policy to DEFAULT or FUTURE
- [ ] Disable unused network protocols
- [ ] Configure TCP SYN flood protection

## Auditing

- [ ] Enable auditd: `sudo systemctl enable --now auditd`
- [ ] Configure audit rules for critical files
- [ ] Monitor privileged commands
- [ ] Send audit logs to a remote server

## Filesystem Security

- [ ] Mount /tmp with noexec,nosuid,nodev
- [ ] Mount /var/tmp with noexec,nosuid,nodev
- [ ] Set sticky bit on world-writable directories
- [ ] Remove SUID/SGID from unnecessary binaries

## Conclusion

Apply this checklist systematically to every RHEL 9 production server. Automate the hardening process with Ansible or the RHEL9-CIS role for consistent security across your fleet.

