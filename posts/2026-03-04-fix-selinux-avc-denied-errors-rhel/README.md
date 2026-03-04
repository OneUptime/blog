# How to Fix SELinux 'avc: denied' Errors on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SELinux, Troubleshooting, Security, AVC

Description: Learn how to identify, analyze, and resolve SELinux AVC (Access Vector Cache) denial errors on RHEL without disabling SELinux.

---

SELinux AVC denials occur when a process tries to perform an action that its security policy does not allow. Rather than disabling SELinux, you should identify the correct policy fix.

## Finding AVC Denials

```bash
# Search the audit log for recent AVC denials
sudo ausearch -m avc --start recent

# Or use the audit log directly
sudo grep "avc:  denied" /var/log/audit/audit.log | tail -10

# Use sealert for human-readable analysis (requires setroubleshoot)
sudo dnf install setroubleshoot-server -y
sudo sealert -a /var/log/audit/audit.log
```

## Understanding an AVC Message

```
type=AVC msg=audit(1709312400.123:456): avc:  denied  { read } for
pid=1234 comm="httpd" name="index.html" dev="sda1" ino=56789
scontext=system_u:system_r:httpd_t:s0
tcontext=unconfined_u:object_r:user_home_t:s0 tclass=file
```

Key fields:
- `{ read }` - the denied operation
- `comm="httpd"` - the process name
- `scontext=...httpd_t` - the process security context
- `tcontext=...user_home_t` - the target file security context

## Common Fixes

**Fix 1: Restore the correct file context**

```bash
# The most common fix - the file has the wrong SELinux label
# Restore the default context for the file's location
sudo restorecon -Rv /var/www/html/

# If the file is in a non-standard location, set the context manually
sudo semanage fcontext -a -t httpd_sys_content_t "/custom/web(/.*)?"
sudo restorecon -Rv /custom/web/
```

**Fix 2: Enable an SELinux boolean**

```bash
# Some operations require specific booleans to be enabled
# List booleans related to httpd
sudo getsebool -a | grep httpd

# Enable the required boolean
sudo setsebool -P httpd_can_network_connect on
```

**Fix 3: Create a custom policy module**

```bash
# Generate a policy module from the denial
sudo ausearch -m avc --start recent | audit2allow -M my_custom_policy

# Review the generated policy before applying
cat my_custom_policy.te

# Install the policy module
sudo semodule -i my_custom_policy.pp
```

## Verifying the Fix

```bash
# Clear the AVC cache
sudo semodule -B

# Attempt the previously denied action
# Then check for new denials
sudo ausearch -m avc --start recent
```

Always try restorecon first, then booleans, and only create custom policy modules as a last resort. Never disable SELinux to work around AVC denials.
