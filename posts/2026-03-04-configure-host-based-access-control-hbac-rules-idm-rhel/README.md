# How to Configure Host-Based Access Control (HBAC) Rules in IdM on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, IdM, HBAC, Access Control, FreeIPA, Security, Linux

Description: Learn how to configure Host-Based Access Control (HBAC) rules in IdM on RHEL to control which users can access which hosts and services.

---

HBAC (Host-Based Access Control) rules in IdM let you define which users or groups can log in to which hosts using which services (SSH, console, etc.). By default, IdM has an "allow_all" rule that permits all users on all hosts. In production, you should disable this and create specific rules.

## Disabling the Default allow_all Rule

```bash
# Authenticate as admin
kinit admin

# Disable the default rule that allows everyone everywhere
ipa hbacrule-disable allow_all

# Verify it is disabled
ipa hbacrule-show allow_all
```

After disabling allow_all, no one can log in to IdM-enrolled hosts until you create specific rules.

## Creating HBAC Rules

```bash
# Create a rule allowing developers to access development servers
ipa hbacrule-add dev-server-access \
  --desc="Allow developers to access development servers"

# Add the developers group as allowed users
ipa hbacrule-add-user dev-server-access --groups=developers

# Add specific hosts
ipa hbacrule-add-host dev-server-access --hosts=dev1.example.com
ipa hbacrule-add-host dev-server-access --hosts=dev2.example.com

# Or add a host group
ipa hostgroup-add dev-servers --desc="Development servers"
ipa hostgroup-add-member dev-servers --hosts=dev1.example.com,dev2.example.com
ipa hbacrule-add-host dev-server-access --hostgroups=dev-servers

# Add services (sshd, login, etc.)
ipa hbacrule-add-service dev-server-access --hbacsvcs=sshd
ipa hbacrule-add-service dev-server-access --hbacsvcs=login
```

## Creating an Admin Access Rule

```bash
# Allow admins to access all hosts
ipa hbacrule-add admin-access \
  --desc="Allow admins to access all hosts"

ipa hbacrule-add-user admin-access --groups=admins

# Use the "all" category for hosts and services
ipa hbacrule-mod admin-access --hostcat=all --servicecat=all
```

## Testing HBAC Rules

```bash
# Test if a user is allowed to access a specific host
ipa hbactest \
  --user=jsmith \
  --host=dev1.example.com \
  --service=sshd

# Test with detailed rule matching output
ipa hbactest \
  --user=jsmith \
  --host=prod1.example.com \
  --service=sshd \
  --rules=dev-server-access,admin-access
```

## Listing and Managing Rules

```bash
# List all HBAC rules
ipa hbacrule-find

# Show details of a specific rule
ipa hbacrule-show dev-server-access --all

# Delete a rule
ipa hbacrule-del dev-server-access
```

Always test HBAC rules with `ipa hbactest` before disabling `allow_all`. Keep an admin access rule that grants you access to all hosts to avoid locking yourself out. SSSD on client machines caches HBAC rules, so changes may take a few minutes to propagate.
