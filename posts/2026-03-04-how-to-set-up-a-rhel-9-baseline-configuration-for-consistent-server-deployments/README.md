# How to Set Up a RHEL 9 Baseline Configuration for Consistent Server Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux

Description: Step-by-step guide on set up a rhel 9 baseline configuration for consistent server deployments with practical examples and commands.

---

A baseline configuration ensures every RHEL 9 server in your fleet starts from the same foundation.

## Kickstart Template

```bash
# rhel9-baseline.ks
lang en_US.UTF-8
keyboard us
timezone UTC --utc
rootpw --lock
user --name=sysadmin --groups=wheel --lock
selinux --enforcing
firewall --enabled --ssh

bootloader --location=mbr --append="crashkernel=auto"
autopart --type=lvm --encrypted --luks-version=luks2

%packages
@core
@base
vim-enhanced
tmux
git
curl
wget
chrony
rsyslog
audit
aide
firewalld
policycoreutils-python-utils
insights-client
rhc
%end

%post
# Register with Satellite
subscription-manager register --org=MyOrg --activationkey=baseline

# Enable Insights
insights-client --register

# Configure chrony
cat > /etc/chrony.conf <<CHRONY
server ntp1.example.com iburst
server ntp2.example.com iburst
driftfile /var/lib/chrony/drift
makestep 1.0 3
rtcsync
CHRONY

# Set crypto policy
update-crypto-policies --set DEFAULT

# Configure SSH hardening
cat >> /etc/ssh/sshd_config.d/99-hardening.conf <<SSH
PermitRootLogin no
PasswordAuthentication no
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
SSH

# Configure session timeout
echo "TMOUT=900" > /etc/profile.d/timeout.sh

# Initialize AIDE database
aide --init
mv /var/lib/aide/aide.db.new.gz /var/lib/aide/aide.db.gz
%end
```

## Ansible Baseline Role

```yaml
---
# roles/baseline/tasks/main.yml
- name: Set hostname
  ansible.builtin.hostname:
    name: "{{ inventory_hostname }}"

- name: Configure NTP
  ansible.builtin.template:
    src: chrony.conf.j2
    dest: /etc/chrony.conf
  notify: restart chronyd

- name: Apply security baseline
  ansible.builtin.include_tasks: security.yml

- name: Configure monitoring
  ansible.builtin.include_tasks: monitoring.yml
```

## Validate Baseline Compliance

```bash
# Use OpenSCAP to verify baseline
sudo oscap xccdf eval \
  --profile xccdf_org.ssgproject.content_profile_cis \
  /usr/share/xml/scap/ssg/content/ssg-rhel9-ds.xml
```

## Conclusion

A standardized baseline configuration for RHEL 9 ensures consistency, security, and compliance across your server fleet. Use kickstart for provisioning and Ansible for ongoing configuration management.

