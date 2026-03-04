# How to Implement Least Privilege Access Controls on RHEL 9 Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux

Description: Step-by-step guide on implement least privilege access controls on rhel 9 servers with practical examples and commands.

---

Least privilege access control limits user permissions to only what is needed, reducing the attack surface on RHEL 9.

## Audit Current Access

```bash
# List all users with shell access
grep -v "nologin\|false" /etc/passwd

# List sudo privileges
sudo cat /etc/sudoers
sudo ls -la /etc/sudoers.d/

# List group memberships
for user in $(awk -F: '$7 !~ /nologin|false/ {print $1}' /etc/passwd); do
  echo "$user: $(groups $user)"
done
```

## Configure Granular sudo

Replace broad sudo access with specific commands:

```bash
# /etc/sudoers.d/webadmin
webadmin ALL=(root) NOPASSWD: /usr/bin/systemctl restart httpd, \
  /usr/bin/systemctl status httpd, \
  /usr/bin/systemctl reload httpd
```

```bash
# /etc/sudoers.d/dbadmin
dbadmin ALL=(postgres) NOPASSWD: /usr/bin/psql, \
  /usr/bin/pg_dump, \
  /usr/bin/pg_restore
```

## Restrict SSH Access

```bash
# Allow only specific users
echo "AllowUsers sysadmin deployer" >> /etc/ssh/sshd_config.d/access.conf

# Or restrict by group
echo "AllowGroups ssh-users" >> /etc/ssh/sshd_config.d/access.conf

sudo systemctl reload sshd
```

## Use ACLs for Fine-Grained File Access

```bash
# Grant a specific user read access
sudo setfacl -m u:auditor:rx /var/log/httpd/
sudo setfacl -m u:auditor:r /var/log/httpd/*

# Verify ACLs
getfacl /var/log/httpd/
```

## Configure SELinux User Mappings

```bash
# Map a Linux user to a restricted SELinux user
sudo semanage login -a -s user_u restricteduser

# Verify
sudo semanage login -l
```

## Remove Unnecessary SUID/SGID Bits

```bash
# Find all SUID/SGID files
sudo find / -type f \( -perm -4000 -o -perm -2000 \) -exec ls -la {} \;

# Remove SUID from unnecessary binaries
sudo chmod u-s /usr/bin/unnecessary-suid-binary
```

## Conclusion

Implementing least privilege on RHEL 9 reduces the blast radius of compromised accounts. Use granular sudo rules, SSH restrictions, ACLs, and SELinux user mappings to limit access to only what each user needs.

