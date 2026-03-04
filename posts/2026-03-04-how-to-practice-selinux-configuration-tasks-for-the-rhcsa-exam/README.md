# How to Practice SELinux Configuration Tasks for the RHCSA Exam

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Certification, SELinux

Description: Step-by-step guide on practice selinux configuration tasks for the rhcsa exam with practical examples and commands.

---

SELinux configuration is a key RHCSA exam objective. This guide covers essential SELinux tasks you need to practice on RHEL 9.

## Check SELinux Status

```bash
getenforce
sestatus
```

## Switch Between Modes

```bash
# Temporarily set to permissive
sudo setenforce 0

# Set back to enforcing
sudo setenforce 1

# Permanently change mode
sudo vi /etc/selinux/config
# Set SELINUX=enforcing
```

## Manage File Contexts

```bash
# View file context
ls -Z /var/www/html/
ls -Z /etc/httpd/conf/httpd.conf

# Change file context temporarily
sudo chcon -t httpd_sys_content_t /opt/website/index.html

# Change file context permanently
sudo semanage fcontext -a -t httpd_sys_content_t "/opt/website(/.*)?"
sudo restorecon -Rv /opt/website/
```

## Manage SELinux Booleans

```bash
# List all booleans
getsebool -a

# List specific booleans
getsebool -a | grep httpd

# Enable a boolean permanently
sudo setsebool -P httpd_can_network_connect on

# Enable a boolean temporarily
sudo setsebool httpd_can_network_connect_db on
```

## Manage Ports

```bash
# List port contexts
sudo semanage port -l | grep http

# Add a custom port
sudo semanage port -a -t http_port_t -p tcp 8443

# Verify
sudo semanage port -l | grep 8443
```

## Troubleshoot SELinux Denials

```bash
# View denials in audit log
sudo ausearch -m AVC -ts recent

# Use sealert for detailed analysis
sudo sealert -a /var/log/audit/audit.log

# Generate a policy module from denials
sudo ausearch -m AVC -ts recent | audit2allow -M mypolicy
sudo semodule -i mypolicy.pp
```

## Relabel Files

```bash
# Relabel a single file
sudo restorecon -v /path/to/file

# Relabel a directory recursively
sudo restorecon -Rv /var/www/

# Force a full filesystem relabel on next boot
sudo touch /.autorelabel
sudo reboot
```

## Practice Exercises

1. Configure Apache to serve content from a non-standard directory with correct SELinux context
2. Enable the boolean to allow HTTPD to connect to a database
3. Add a custom port for a service and verify SELinux allows it
4. Troubleshoot an SELinux denial and create a policy module

## Conclusion

SELinux is tested heavily on the RHCSA exam. Practice changing contexts, managing booleans, adding ports, and troubleshooting denials. Keep SELinux in enforcing mode during all practice sessions.

