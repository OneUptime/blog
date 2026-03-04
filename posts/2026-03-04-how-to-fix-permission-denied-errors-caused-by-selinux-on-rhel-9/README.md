# How to Fix 'Permission Denied' Errors Caused by SELinux on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, SELinux, Troubleshooting

Description: Step-by-step guide on fix 'permission denied' errors caused by selinux on rhel 9 with practical examples and commands.

---

SELinux "Permission denied" errors are common when services try to access files or ports not allowed by the current policy. Here is how to diagnose and fix them.

## Check if SELinux is Causing the Issue

```bash
# Check SELinux mode
getenforce

# Temporarily set to permissive to test
sudo setenforce 0
# Try the operation again
# If it works, SELinux is the cause
sudo setenforce 1
```

## View SELinux Denials

```bash
sudo ausearch -m AVC -ts recent
sudo ausearch -m AVC --raw | audit2why
```

## Use sealert for Detailed Analysis

```bash
sudo dnf install -y setroubleshoot-server
sudo sealert -a /var/log/audit/audit.log
```

## Common Fixes

### Wrong File Context

```bash
# Check current context
ls -Z /path/to/file

# Restore default context
sudo restorecon -Rv /path/to/directory

# Set custom context
sudo semanage fcontext -a -t httpd_sys_content_t "/custom/path(/.*)?"
sudo restorecon -Rv /custom/path
```

### Missing Boolean

```bash
# List relevant booleans
getsebool -a | grep httpd

# Enable the needed boolean
sudo setsebool -P httpd_can_network_connect on
```

### Non-Standard Port

```bash
# Add a port to the SELinux policy
sudo semanage port -a -t http_port_t -p tcp 8443
```

## Generate a Custom Policy Module

If no standard fix works:

```bash
sudo ausearch -m AVC -ts recent | audit2allow -M mypolicy
sudo semodule -i mypolicy.pp
```

## Conclusion

SELinux permission denied errors protect your system from unauthorized access. Always fix the root cause (contexts, booleans, ports) rather than disabling SELinux. Use audit2why and sealert for accurate diagnosis.

