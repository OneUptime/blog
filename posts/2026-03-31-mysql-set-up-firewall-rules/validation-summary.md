# Validation Summary: How to Set Up Firewall Rules for MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (default port 3306, bind-address configuration)
- UFW (Uncomplicated Firewall) on Ubuntu/Debian
- firewalld on RHEL/CentOS/Fedora
- iptables
- Docker bridge networking
- AWS Security Groups (EC2/RDS)
- netcat (nc) for port verification

## Sources Consulted
- UFW man page and Ubuntu documentation (https://manpages.ubuntu.com/manpages/noble/en/man8/ufw.8.html)
- firewalld rich rule documentation (https://firewalld.org/documentation/man-pages/firewalld.richlanguage.html)
- iptables man page and Netfilter documentation (https://linux.die.net/man/8/iptables)
- MySQL Server System Variables documentation for bind-address (https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_bind_address)
- Docker default bridge network documentation (https://docs.docker.com/network/drivers/bridge/)
- AWS Security Groups documentation (https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/security-group-rules.html)

## Issues Found
No technical issues found.

## Review Notes
- All commands in the post omit the `sudo` prefix. This is a common convention in tutorials that assume the reader is running as root or understands that these commands require elevated privileges. Not an error, but readers on non-root accounts will need to prepend `sudo`.
- The firewalld rich rule examples use `port protocol="tcp" port="3306"` rather than the more canonical attribute order `port port="3306" protocol="tcp"`. Both orderings are accepted by firewalld's parser since attributes are matched by name, so this is functionally correct.
- The Docker bridge subnet `172.17.0.0/16` is the default, but custom Docker networks may use different ranges. The post correctly scopes this to the default bridge network.
- The `iptables-save` path `/etc/iptables/rules.v4` requires the `iptables-persistent` package on Debian/Ubuntu. The post notes "(Ubuntu/Debian)" but does not mention the package dependency. This is a minor omission but not a technical error.
