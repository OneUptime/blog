# How to Harden a RHEL Production Server with a Complete Security Checklist

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Security, Hardening, Checklist, Linux

Description: A practical security hardening checklist for RHEL production servers covering SSH, SELinux, firewall, patching, and audit configuration.

---

Hardening a RHEL server before putting it into production reduces your attack surface and helps meet compliance requirements. Here is a practical checklist with commands you can run.

## 1. Apply All Security Updates

```bash
# Update all packages to their latest versions
sudo dnf update -y

# Enable automatic security updates
sudo dnf install dnf-automatic
sudo sed -i 's/apply_updates = no/apply_updates = yes/' /etc/dnf/automatic.conf
sudo systemctl enable --now dnf-automatic-install.timer
```

## 2. Enforce SELinux

```bash
# Verify SELinux is in enforcing mode
getenforce

# If it shows Permissive, set it to Enforcing
sudo setenforce 1
sudo sed -i 's/^SELINUX=permissive/SELINUX=enforcing/' /etc/selinux/config
```

## 3. Harden SSH

```bash
# Edit the SSH configuration
sudo tee /etc/ssh/sshd_config.d/99-hardening.conf << 'EOF'
PermitRootLogin no
PasswordAuthentication no
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
AllowUsers your-admin-user
Protocol 2
X11Forwarding no
EOF

sudo systemctl restart sshd
```

## 4. Configure the Firewall

```bash
# Ensure firewalld is running
sudo systemctl enable --now firewalld

# Allow only necessary services
sudo firewall-cmd --permanent --remove-service=cockpit
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --reload

# Verify the rules
sudo firewall-cmd --list-all
```

## 5. Enable Audit Logging

```bash
# Install and enable auditd
sudo dnf install audit
sudo systemctl enable --now auditd

# Add rules to monitor critical files
sudo tee /etc/audit/rules.d/hardening.rules << 'EOF'
-w /etc/passwd -p wa -k identity
-w /etc/shadow -p wa -k identity
-w /etc/sudoers -p wa -k sudoers
-w /var/log/ -p wa -k log-access
EOF

sudo augenrules --load
```

## 6. Set Password Policies

```bash
# Configure password aging
sudo sed -i 's/^PASS_MAX_DAYS.*/PASS_MAX_DAYS 90/' /etc/login.defs
sudo sed -i 's/^PASS_MIN_DAYS.*/PASS_MIN_DAYS 7/' /etc/login.defs
sudo sed -i 's/^PASS_MIN_LEN.*/PASS_MIN_LEN 12/' /etc/login.defs
```

## 7. Disable Unnecessary Services

```bash
# List all enabled services and disable what you do not need
systemctl list-unit-files --state=enabled --type=service

# Common services to disable on a minimal server
sudo systemctl disable --now avahi-daemon
sudo systemctl disable --now cups
```

## 8. Set Proper File Permissions

```bash
# Ensure no world-writable files outside /tmp
sudo find / -xdev -type f -perm -0002 -exec ls -l {} \;

# Secure cron directories
sudo chmod 700 /etc/cron.d /etc/cron.daily /etc/cron.hourly
```

Run through this checklist for every new RHEL server before deploying it to production.
