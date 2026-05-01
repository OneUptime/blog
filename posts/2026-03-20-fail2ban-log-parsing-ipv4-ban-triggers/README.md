# How to Configure Fail2Ban Log Parsing for IPv4 Ban Triggers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fail2Ban, IPv4, Security, Log Analysis, Linux, Intrusion Prevention

Description: Configure Fail2Ban to parse application logs for failed IPv4 authentication attempts and automatically ban offending addresses with iptables, covering custom filters, jails, and actions.

## Introduction

Fail2Ban monitors log files for patterns indicating brute-force or abuse attempts from IPv4 addresses. When a threshold is exceeded, it triggers an action - typically an `iptables` rule - to block the offending IP for a configurable duration.

## Install Fail2Ban

```bash
# Ubuntu/Debian

sudo apt install fail2ban

# CentOS/RHEL
sudo yum install fail2ban

sudo systemctl enable --now fail2ban
```

## Built-in Jails (Enable in /etc/fail2ban/jail.local)

```ini
# /etc/fail2ban/jail.local

[DEFAULT]
bantime  = 3600       # Ban for 1 hour
findtime = 600        # Look back 10 minutes
maxretry = 5          # Allow 5 failures before ban
backend  = auto
usedns   = warn

[sshd]
enabled  = true
port     = ssh
filter   = sshd
logpath  = %(sshd_log)s
maxretry = 3
bantime  = 86400      # 24 hours for SSH

[nginx-http-auth]
enabled  = true
filter   = nginx-http-auth
logpath  = %(nginx_error_log)s
maxretry = 5

[nginx-limit-req]
enabled  = true
filter   = nginx-limit-req
logpath  = %(nginx_error_log)s
maxretry = 10
```

## Custom Filter for Application Login Failures

```ini
# /etc/fail2ban/filter.d/myapp-auth.conf

[INCLUDES]
before = common.conf

[Definition]
_daemon = myapp

failregex = ^%(__prefix_line)s.*LOGIN FAILED.*?from <IP4>$
            ^%(__prefix_line)s.*Authentication failed for .*? from <IP4>$
            ^<IP4> - .* "POST /api/auth HTTP/\S+" 401(?: .*)?$

ignoreregex = ^<IP4> - .* "GET /health HTTP/\S+" 200(?: .*)?$
```

## Custom Jail for Application

```ini
# /etc/fail2ban/jail.d/myapp.conf

[myapp-auth]
enabled  = true
filter   = myapp-auth
logpath  = /var/log/myapp/app.log
           /var/log/myapp/access.log
port     = 8080,8443
maxretry = 10
findtime = 300
bantime  = 7200
action   = iptables[type=multiport, name=myapp, port="8080,8443"]
```

## Test Your Filter

```bash
# Test filter against a log file
fail2ban-regex /var/log/myapp/access.log /etc/fail2ban/filter.d/myapp-auth.conf

# Test with verbose output
fail2ban-regex -v /var/log/auth.log /etc/fail2ban/filter.d/sshd.conf
```

## Monitor and Manage Bans

```bash
# Show status of all jails
fail2ban-client status

# Show status and banned IPs for a jail
fail2ban-client status sshd

# Manually ban an IP
fail2ban-client set sshd banip 203.0.113.42

# Unban an IP
fail2ban-client set sshd unbanip 203.0.113.42

# Reload configuration
fail2ban-client reload
```

## Long-Term Persistent Bans

```ini
# /etc/fail2ban/jail.d/persistent.conf

[persistent-ban]
enabled  = true
filter   = sshd
logpath  = %(sshd_log)s
maxretry = 1
bantime  = -1         # -1 = permanent ban
action   = iptables[name=persistent, port=ssh]
           sendmail[name=persistent, dest=security@example.com]
```

## Conclusion

Fail2Ban parses IPv4 addresses from log files using regex filters and bans them via iptables when failure thresholds are exceeded. Write custom filters using `<IP4>` as the IPv4 capture placeholder and test them with `fail2ban-regex` before activating. Use `bantime = -1` for permanent bans of highly abusive IPs and always whitelist your own management IPs with `ignoreip`.
