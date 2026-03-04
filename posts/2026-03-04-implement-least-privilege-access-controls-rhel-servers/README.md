# How to Implement Least Privilege Access Controls on RHEL Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Security, Access Control, sudo, SELinux

Description: Implement least privilege access on RHEL servers using sudo rules, SELinux, and proper user and group management.

---

The principle of least privilege means giving users and processes only the permissions they need to do their job. On RHEL, you achieve this through careful sudo configuration, SELinux policies, and proper user management.

## Creating Functional User Groups

Instead of giving users full sudo access, create groups with specific permissions:

```bash
# Create groups for different roles
sudo groupadd web-admins
sudo groupadd db-admins
sudo groupadd deploy-users

# Add users to their appropriate groups
sudo usermod -aG web-admins alice
sudo usermod -aG db-admins bob
sudo usermod -aG deploy-users carol
```

## Scoped sudo Rules

Create separate sudoers files for each role:

```bash
# Web admins: can manage httpd and nginx only
sudo tee /etc/sudoers.d/web-admins << 'EOF'
%web-admins ALL=(root) NOPASSWD: /usr/bin/systemctl start httpd, \
    /usr/bin/systemctl stop httpd, \
    /usr/bin/systemctl restart httpd, \
    /usr/bin/systemctl reload httpd, \
    /usr/bin/systemctl status httpd, \
    /usr/bin/systemctl start nginx, \
    /usr/bin/systemctl stop nginx, \
    /usr/bin/systemctl restart nginx
EOF

# Database admins: can manage PostgreSQL only
sudo tee /etc/sudoers.d/db-admins << 'EOF'
%db-admins ALL=(root) NOPASSWD: /usr/bin/systemctl start postgresql, \
    /usr/bin/systemctl stop postgresql, \
    /usr/bin/systemctl restart postgresql, \
    /usr/bin/systemctl status postgresql
%db-admins ALL=(postgres) NOPASSWD: ALL
EOF

# Validate the sudoers syntax
sudo visudo -cf /etc/sudoers.d/web-admins
sudo visudo -cf /etc/sudoers.d/db-admins
```

## Restricting Shell Access

Not every user needs a login shell:

```bash
# Create a user for deployment only (no interactive shell)
sudo useradd -s /usr/sbin/nologin deploy-bot

# For users who need SFTP only
sudo useradd -s /usr/sbin/nologin sftp-user
```

## SELinux User Mapping

Map Linux users to restricted SELinux users:

```bash
# Map a user to the staff_u SELinux user (limited sudo capabilities)
sudo semanage login -a -s staff_u alice

# Map a service account to the user_u SELinux user (no sudo at all)
sudo semanage login -a -s user_u carol

# Verify the mapping
sudo semanage login -l
```

## File Permission Auditing

Regularly check for overly permissive files:

```bash
# Find SUID/SGID binaries (potential privilege escalation vectors)
sudo find / -xdev \( -perm -4000 -o -perm -2000 \) -type f -exec ls -l {} \;

# Find files writable by non-owners
sudo find /etc -xdev -type f -perm -o+w -exec ls -l {} \;
```

## Logging Privilege Escalation

Track all sudo usage for audit purposes:

```bash
# Sudo logging is enabled by default in /var/log/secure
# Add additional logging for detailed command tracking
sudo tee -a /etc/sudoers.d/logging << 'EOF'
Defaults log_output
Defaults!/usr/bin/sudoreplay !log_output
Defaults logfile="/var/log/sudo.log"
EOF
```

Review sudo logs regularly:

```bash
# Check who used sudo and what they ran
grep sudo /var/log/secure | tail -20
```

Least privilege is not a one-time setup. Review access quarterly and remove permissions that are no longer needed.
