# How to Migrate from SUSE Linux Enterprise to RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Migration, SUSE

Description: Step-by-step guide on migrate from suse linux enterprise to rhel 9 with practical examples and commands.

---

Migrating from SUSE Linux Enterprise to RHEL 9 requires a parallel deployment approach since there is no direct conversion tool.

## Assessment

```bash
# On SLES, document current state
zypper se --installed-only > /tmp/sles-packages.txt
systemctl list-unit-files --state=enabled > /tmp/sles-services.txt
```

## Package Mapping

| SLES | RHEL 9 |
|------|--------|
| zypper | dnf |
| YaST | Cockpit |
| SuSEfirewall2/firewalld | firewalld |
| AppArmor | SELinux |

## Deploy RHEL 9

```bash
# Install RHEL 9 on new hardware/VM
sudo subscription-manager register
sudo dnf update -y

# Install equivalent packages
sudo dnf install -y httpd mariadb-server php
```

## Migrate AppArmor to SELinux

AppArmor profiles do not convert to SELinux. Instead:

```bash
# Use default SELinux policies
# Customize with semanage for non-standard paths
sudo semanage fcontext -a -t httpd_sys_content_t "/custom/web(/.*)?"
sudo restorecon -Rv /custom/web
```

## Migrate Data

```bash
rsync -aAXv sles-server:/srv/www/ /var/www/html/
rsync -aAXv sles-server:/var/lib/mysql/ /var/lib/mysql/
```

## Conclusion

SLES to RHEL 9 migration requires a parallel deployment with data synchronization. Plan for AppArmor-to-SELinux conversion and package mapping during the transition.

