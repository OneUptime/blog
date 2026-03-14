# How to Automate Kernel Live Patching with Red Hat Satellite

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Red Hat Satellite, Kpatch, Kernel Live Patching, Automation, Linux

Description: Use Red Hat Satellite to automate the deployment of kernel live patches across your RHEL fleet, ensuring critical security fixes are applied consistently without manual intervention.

---

Red Hat Satellite can manage kernel live patching at scale, automatically distributing and applying kpatch modules to hundreds or thousands of RHEL systems. This ensures that critical kernel security fixes reach all systems promptly without requiring reboots.

## Prerequisites

- Red Hat Satellite 6.x installed and configured
- RHEL systems registered to Satellite (content hosts)
- Satellite syncing the RHEL BaseOS repository (which includes kpatch packages)

## Sync Live Patch Content in Satellite

```bash
# On the Satellite server, verify the RHEL BaseOS repository is synced
hammer repository list --organization "Your Org" | grep BaseOS

# Trigger a sync to get the latest live patch packages
hammer repository synchronize \
  --organization "Your Org" \
  --product "Red Hat Enterprise Linux for x86_64" \
  --name "Red Hat Enterprise Linux 9 for x86_64 - BaseOS RPMs 9"
```

## Create a Content View with Live Patches

```bash
# Create a content view that includes the live patch repository
hammer content-view create \
  --organization "Your Org" \
  --name "RHEL9-LivePatch" \
  --description "RHEL 9 with kernel live patching"

# Add the BaseOS repository to the content view
hammer content-view add-repository \
  --organization "Your Org" \
  --name "RHEL9-LivePatch" \
  --repository "Red Hat Enterprise Linux 9 for x86_64 - BaseOS RPMs 9" \
  --product "Red Hat Enterprise Linux for x86_64"

# Publish the content view
hammer content-view publish \
  --organization "Your Org" \
  --name "RHEL9-LivePatch"

# Promote to the appropriate lifecycle environment
hammer content-view version promote \
  --organization "Your Org" \
  --content-view "RHEL9-LivePatch" \
  --to-lifecycle-environment "Production"
```

## Install kpatch on Content Hosts

Use a remote execution job to install kpatch on all managed hosts.

```bash
# Run a remote execution job to install kpatch-dnf on all hosts
hammer job-invocation create \
  --job-template "Run Command - Script Default" \
  --inputs "command=dnf install -y kpatch-dnf" \
  --search-query "os = RedHat 9" \
  --organization "Your Org"
```

## Create an Ansible Role for Live Patching

```yaml
# roles/kpatch/tasks/main.yml
---
- name: Install kpatch-dnf plugin
  dnf:
    name: kpatch-dnf
    state: present

- name: Install available kernel live patches
  shell: dnf update -y kpatch-patch-*
  register: kpatch_result
  changed_when: "'Nothing to do' not in kpatch_result.stdout"

- name: Verify live patches are loaded
  command: kpatch list
  register: kpatch_list
  changed_when: false

- name: Display loaded patches
  debug:
    var: kpatch_list.stdout_lines
```

## Schedule Automated Live Patch Deployment

```bash
# Create a recurring job in Satellite to apply live patches weekly
hammer recurring-logic create \
  --cron-line "0 2 * * 1" \
  --purpose "Weekly kernel live patch application"

# Or use Satellite's content management to auto-apply errata
# Navigate to: Content > Errata > Select security errata
# Click "Apply to Content Hosts"
```

## Monitor Live Patch Status

```bash
# Check live patch status across all hosts
hammer host list --search "installed_packages ~ kpatch-patch" \
  --fields "Name,Operating System"

# Run a status check across all hosts
hammer job-invocation create \
  --job-template "Run Command - Script Default" \
  --inputs "command=kpatch list" \
  --search-query "os = RedHat 9" \
  --organization "Your Org"
```

## View Applicable Errata in Satellite

```bash
# List security errata that include live patches
hammer erratum list \
  --search "type = security and packages ~ kpatch" \
  --organization "Your Org"

# Check which hosts need live patches
hammer host errata list \
  --host "server1.example.com" \
  --search "type = security"
```

## Reporting

```bash
# Generate a report of live patch compliance
hammer report-template generate \
  --name "Host - Installed Packages" \
  --inputs "organization=Your Org" \
  --output /tmp/kpatch-report.csv
```

Automating kernel live patching through Satellite ensures consistent security coverage across your entire RHEL fleet with minimal manual effort and zero downtime.
