# How to Troubleshoot 'Connection Refused' Errors for SSH on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Troubleshooting, SSH

Description: Step-by-step guide on troubleshoot 'connection refused' errors for ssh on RHEL with practical examples and commands.

---

"Connection refused" errors for SSH on RHEL mean the SSH daemon is not accepting connections. Here is how to troubleshoot.

## Check if sshd is Running

```bash
sudo systemctl status sshd
```

Start it if stopped:

```bash
sudo systemctl start sshd
sudo systemctl enable sshd
```

## Check the SSH Port

```bash
sudo ss -tlnp | grep ssh
grep "^Port" /etc/ssh/sshd_config
```

If SSH is on a non-standard port:

```bash
ssh -p 2222 user@host
```

## Check Firewall Rules

```bash
sudo firewall-cmd --list-all | grep ssh
```

Allow SSH through the firewall:

```bash
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --reload
```

For a non-standard port:

```bash
sudo firewall-cmd --permanent --add-port=2222/tcp
sudo firewall-cmd --reload
```

## Check SELinux

If using a non-standard port:

```bash
sudo semanage port -l | grep ssh
sudo semanage port -a -t ssh_port_t -p tcp 2222
```

## Check sshd Configuration

```bash
sudo sshd -t
```

Fix any syntax errors in /etc/ssh/sshd_config and restart:

```bash
sudo systemctl restart sshd
```

## Check ListenAddress

```bash
grep ListenAddress /etc/ssh/sshd_config
```

Ensure sshd is listening on the correct interface.

## Check TCP Wrappers

```bash
cat /etc/hosts.allow
cat /etc/hosts.deny
```

## Check for Maximum Connection Limits

```bash
grep MaxSessions /etc/ssh/sshd_config
grep MaxStartups /etc/ssh/sshd_config
```

## View SSH Logs

```bash
sudo journalctl -u sshd -n 50
sudo tail -f /var/log/secure
```

## Conclusion

SSH "Connection refused" errors on RHEL are typically caused by the sshd service not running, firewall rules blocking port 22, or configuration errors. Check each layer systematically to restore SSH access.

