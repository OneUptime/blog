# How to Combine fapolicyd with SELinux for Defense-in-Depth on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, fapolicyd, SELinux, Security, Defense in Depth

Description: Learn how to combine fapolicyd application whitelisting with SELinux mandatory access controls to create a layered security posture on RHEL.

---

SELinux and fapolicyd serve complementary security roles on RHEL. SELinux controls what processes can access, while fapolicyd controls which binaries can execute. Together, they create a strong defense-in-depth strategy.

## Understanding the Layers

SELinux enforces mandatory access controls based on security contexts. It restricts what a running process can do. fapolicyd decides whether a binary is allowed to run in the first place.

```bash
# Check SELinux status
getenforce

# Check fapolicyd status
sudo systemctl is-active fapolicyd

# Both should be active for defense-in-depth
```

## SELinux Policy for fapolicyd Itself

fapolicyd runs under its own SELinux context. Ensure it is properly confined.

```bash
# View the SELinux context of the fapolicyd process
ps -eZ | grep fapolicyd
# system_u:system_r:fapolicyd_t:s0

# Check for any SELinux denials related to fapolicyd
sudo ausearch -m avc -c fapolicyd --start recent
```

## Example: Protecting a Web Server

Here is how both tools work together to protect Apache.

```bash
# fapolicyd ensures only trusted httpd binaries can execute
sudo fapolicyd-cli --dump-db | grep httpd

# SELinux confines httpd to its designated context
ls -Z /usr/sbin/httpd
# system_u:object_r:httpd_exec_t:s0

# SELinux restricts what httpd can access
# For example, httpd can only serve content with httpd_sys_content_t label
ls -Z /var/www/html/
```

## Handling a Scenario: Malicious Binary Dropped in /tmp

If an attacker drops a malicious binary in /tmp:

```bash
# fapolicyd blocks it because it is not in the trust database
# Attempting to execute /tmp/malware would produce:
# bash: /tmp/malware: Operation not permitted

# Even if fapolicyd were bypassed, SELinux blocks execution from /tmp
# The httpd_t domain cannot execute files with tmp_t context
```

## Verifying Both Controls Are Working

```bash
# Test fapolicyd: create a simple test script
echo '#!/bin/bash' > /tmp/test_exec
echo 'echo hello' >> /tmp/test_exec
chmod +x /tmp/test_exec

# With fapolicyd enforcing, this should be denied
/tmp/test_exec
# Operation not permitted

# Check SELinux booleans that complement fapolicyd
sudo getsebool -a | grep exec
# Example: httpd_execmem --> off (prevents httpd from executing writable memory)
```

## Best Practices

```bash
# Keep SELinux in enforcing mode
sudo setenforce 1

# Keep fapolicyd in enforcement mode (permissive = 0)
grep "permissive" /etc/fapolicyd/fapolicyd.conf

# Regularly update both SELinux policies and fapolicyd trust
sudo dnf update selinux-policy -y
sudo fapolicyd-cli --update
```

Using both tools together means an attacker must defeat two independent security mechanisms to execute unauthorized code on your system.
