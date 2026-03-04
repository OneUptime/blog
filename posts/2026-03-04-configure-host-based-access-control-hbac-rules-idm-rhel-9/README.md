# How to Configure Host-Based Access Control (HBAC) Rules in IdM on RHEL 9

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, IdM, HBAC, Access Control, Security, Identity Management, Linux

Description: Learn how to configure Host-Based Access Control rules in Red Hat Identity Management on RHEL 9 to restrict which users can access which hosts and services.

---

Host-Based Access Control (HBAC) rules in IdM determine which users or groups can access which hosts or host groups using which services. By default, IdM includes an "allow_all" rule that permits every user to access every host. For production security, you should disable this default rule and create specific HBAC rules that follow the principle of least privilege.

## Understanding HBAC Components

An HBAC rule has four components:

- **Who** - Users or user groups
- **Where** - Hosts or host groups
- **What** - Services or service groups (ssh, login, sudo, etc.)
- **Rule type** - Allow (deny rules are not supported; absence of an allow rule denies access)

## Checking Existing HBAC Rules

```bash
kinit admin
ipa hbacrule-find
```

View the default allow_all rule:

```bash
ipa hbacrule-show allow_all
```

## Step 1: Create Host Groups

Organize hosts by role:

```bash
ipa hostgroup-add webservers --desc="Web server hosts"
ipa hostgroup-add dbservers --desc="Database server hosts"
ipa hostgroup-add devservers --desc="Development servers"
```

Add hosts to groups:

```bash
ipa hostgroup-add-member webservers --hosts=web1.example.com --hosts=web2.example.com
ipa hostgroup-add-member dbservers --hosts=db1.example.com
ipa hostgroup-add-member devservers --hosts=dev1.example.com --hosts=dev2.example.com
```

## Step 2: Create User Groups

If not already created:

```bash
ipa group-add webadmins --desc="Web server administrators"
ipa group-add dbadmins --desc="Database administrators"
ipa group-add developers --desc="Development team"
```

Add users:

```bash
ipa group-add-member webadmins --users=jsmith --users=jdoe
ipa group-add-member dbadmins --users=awhite
ipa group-add-member developers --users=bgreen --users=cblue
```

## Step 3: Create HBAC Rules

### Allow Web Admins to Access Web Servers

```bash
ipa hbacrule-add allow_webadmins_webservers --desc="Web admins can access web servers"
ipa hbacrule-add-user allow_webadmins_webservers --groups=webadmins
ipa hbacrule-add-host allow_webadmins_webservers --hostgroups=webservers
ipa hbacrule-add-service allow_webadmins_webservers --hbacsvcs=sshd --hbacsvcs=sudo
```

### Allow DB Admins to Access DB Servers

```bash
ipa hbacrule-add allow_dbadmins_dbservers --desc="DB admins can access database servers"
ipa hbacrule-add-user allow_dbadmins_dbservers --groups=dbadmins
ipa hbacrule-add-host allow_dbadmins_dbservers --hostgroups=dbservers
ipa hbacrule-add-service allow_dbadmins_dbservers --hbacsvcs=sshd --hbacsvcs=sudo
```

### Allow Developers to Access Dev Servers

```bash
ipa hbacrule-add allow_devs_devservers --desc="Developers can access dev servers"
ipa hbacrule-add-user allow_devs_devservers --groups=developers
ipa hbacrule-add-host allow_devs_devservers --hostgroups=devservers
ipa hbacrule-add-service allow_devs_devservers --hbacsvcs=sshd
```

### Allow Admin User Everywhere

```bash
ipa hbacrule-add allow_admin_all --desc="Admin can access all hosts"
ipa hbacrule-add-user allow_admin_all --users=admin
ipa hbacrule-mod allow_admin_all --hostcat=all --servicecat=all
```

## Step 4: Test HBAC Rules Before Disabling allow_all

Use `ipa hbactest` to simulate access:

```bash
# Test: Can jsmith access web1 via SSH?
ipa hbactest --user=jsmith --host=web1.example.com --service=sshd

# Test: Can bgreen access db1 via SSH?
ipa hbactest --user=bgreen --host=db1.example.com --service=sshd
```

Expected results:

- jsmith on web1: Access granted (through webadmins rule)
- bgreen on db1: Access denied (developers only have access to devservers)

## Step 5: Disable the Default allow_all Rule

Only after confirming your rules work correctly:

```bash
ipa hbacrule-disable allow_all
```

Test again:

```bash
ipa hbactest --user=jsmith --host=web1.example.com --service=sshd
ipa hbactest --user=bgreen --host=db1.example.com --service=sshd
```

## Managing HBAC Services

View available services:

```bash
ipa hbacsvc-find
```

Common services:

- `sshd` - SSH access
- `sudo` - Sudo privilege
- `login` - Console login
- `ftp` - FTP access

Create a custom service:

```bash
ipa hbacsvc-add myapp --desc="Custom application service"
```

## Creating Service Groups

```bash
ipa hbacsvcgroup-add remote-access --desc="Remote access services"
ipa hbacsvcgroup-add-member remote-access --hbacsvcs=sshd --hbacsvcs=sudo
```

Use in rules:

```bash
ipa hbacrule-add-service myrule --hbacsvcgroups=remote-access
```

## Troubleshooting HBAC

### User Cannot Log In

Check which rules apply:

```bash
ipa hbactest --user=username --host=hostname --service=sshd --rules=allow_all
```

Use `--rules` to test specific rules.

### Check SSSD Cache

If rule changes are not taking effect, clear the SSSD cache on the client:

```bash
sudo sss_cache -E
sudo systemctl restart sssd
```

### Check SSSD Logs

On the client:

```bash
sudo journalctl -u sssd -f
```

## Summary

HBAC rules in IdM on RHEL 9 provide fine-grained control over which users can access which hosts for which services. Start by creating host groups and user groups, then create specific allow rules. Always test rules with `ipa hbactest` before disabling the default allow_all rule. Combine with sudo rules for complete access control management.
