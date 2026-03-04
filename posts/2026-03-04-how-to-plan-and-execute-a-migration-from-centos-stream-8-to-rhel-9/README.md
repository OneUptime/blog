# How to Plan and Execute a Migration from CentOS Stream 8 to RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Best Practices, Migration, CentOS

Description: Step-by-step guide on plan and execute a migration from centos stream 8 to RHEL with practical examples and commands.

---

Planning a migration from CentOS Stream 8 to RHEL requires understanding the differences and following a structured approach.

## Assessment

```bash
# Document current CentOS Stream 8 state
cat /etc/centos-release
sudo dnf list installed > /tmp/cs8-packages.txt
systemctl list-unit-files --state=enabled > /tmp/cs8-services.txt
```

## Migration Options

### Option 1: Fresh RHEL Install (Recommended)

```bash
# Deploy new RHEL system
# Migrate data and configurations
# Test thoroughly
# Cut over
```

### Option 2: Convert to RHEL 8, Then Upgrade

```bash
# Convert CentOS Stream 8 to RHEL 8
sudo dnf install -y https://ftp.redhat.com/redhat/convert2rhel/8/convert2rhel.repo
sudo dnf install -y convert2rhel
sudo convert2rhel --org <org-id> --activationkey <key>

# Then upgrade to RHEL with Leapp
sudo dnf install -y leapp-upgrade
sudo leapp preupgrade --target 9.4
sudo leapp upgrade --target 9.4
sudo reboot
```

## Migrate Configurations

```bash
# Back up critical configs
sudo tar czf /tmp/configs-backup.tar.gz \
  /etc/httpd/ /etc/nginx/ /etc/my.cnf.d/ \
  /etc/sysconfig/ /etc/firewalld/
```

## Verify After Migration

```bash
cat /etc/redhat-release
sudo subscription-manager status
sudo dnf check-update
sudo systemctl --failed
```

## Conclusion

CentOS Stream 8 to RHEL migration is best done as a fresh install with data migration, or through conversion to RHEL 8 followed by a Leapp upgrade. Test thoroughly in a staging environment before production migration.

