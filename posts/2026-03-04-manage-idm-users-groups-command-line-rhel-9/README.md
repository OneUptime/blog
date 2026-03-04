# How to Manage IdM Users and Groups from the Command Line on RHEL 9

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, IdM, Identity Management, Users, Groups, CLI, Linux

Description: Learn how to create, modify, and manage users and groups in Red Hat Identity Management from the command line on RHEL 9.

---

The `ipa` command-line tool provides complete control over IdM user and group management on RHEL 9. While the web UI is convenient for occasional tasks, the CLI is essential for scripting, automation, and bulk operations.

## Authenticating

Before managing IdM, obtain a Kerberos ticket:

```bash
kinit admin
```

Verify:

```bash
klist
```

## Managing Users

### Creating a User

```bash
ipa user-add jsmith --first=John --last=Smith --email=jsmith@example.com
```

Set a temporary password:

```bash
ipa user-add jsmith --first=John --last=Smith --password
```

The user must change this password on first login.

### Viewing User Details

```bash
ipa user-show jsmith
```

With all attributes:

```bash
ipa user-show jsmith --all
```

### Searching for Users

```bash
# Find all users
ipa user-find

# Search by name
ipa user-find smith

# Find users with specific criteria
ipa user-find --lastname=Smith --sizelimit=100
```

### Modifying a User

```bash
# Change email
ipa user-mod jsmith --email=john.smith@example.com

# Set job title
ipa user-mod jsmith --title="Senior Engineer"

# Set phone number
ipa user-mod jsmith --phone="+1-555-0123"

# Add SSH public key
ipa user-mod jsmith --sshpubkey="ssh-rsa AAAA..."
```

### Disabling and Enabling Users

```bash
# Disable a user (preserves the account)
ipa user-disable jsmith

# Enable a user
ipa user-enable jsmith
```

### Deleting a User

```bash
# Delete (can be preserved)
ipa user-del jsmith

# Permanently delete
ipa user-del jsmith --permanent
```

### Preserving and Restoring Users

```bash
# Delete but preserve
ipa user-del jsmith --preserve

# List preserved users
ipa user-find --preserved=true

# Restore a preserved user
ipa user-undel jsmith
```

## Managing Groups

### Creating Groups

```bash
# Create a standard POSIX group
ipa group-add developers --desc="Development team"

# Create a non-POSIX group
ipa group-add project-x --nonposix --desc="Project X members"
```

### Adding Members to Groups

```bash
# Add a user
ipa group-add-member developers --users=jsmith

# Add multiple users
ipa group-add-member developers --users=jsmith --users=jdoe --users=awhite

# Add a group as a member (nested groups)
ipa group-add-member engineering --groups=developers
```

### Removing Members

```bash
ipa group-remove-member developers --users=jsmith
```

### Viewing Group Details

```bash
ipa group-show developers
ipa group-show developers --all
```

### Searching for Groups

```bash
ipa group-find
ipa group-find dev
```

### Deleting a Group

```bash
ipa group-del project-x
```

## Password Management

### Resetting a User Password

```bash
ipa passwd jsmith
```

### Configuring Password Policy

```bash
# View current policy
ipa pwpolicy-show

# Modify global policy
ipa pwpolicy-mod \
    --maxlife=90 \
    --minlife=1 \
    --history=12 \
    --minlength=14 \
    --minclasses=3 \
    --maxfail=5 \
    --failinterval=60 \
    --lockouttime=600
```

### Creating Group-Specific Password Policies

```bash
ipa pwpolicy-add developers \
    --maxlife=180 \
    --minlength=12 \
    --priority=10
```

## Bulk User Operations

### Creating Users from a CSV File

```bash
#!/bin/bash
# create_users.sh
# CSV format: first,last,login,email

while IFS=',' read -r FIRST LAST LOGIN EMAIL; do
    ipa user-add "$LOGIN" \
        --first="$FIRST" \
        --last="$LAST" \
        --email="$EMAIL" \
        --random
done < users.csv
```

### Adding Multiple Users to a Group

```bash
#!/bin/bash
for USER in jsmith jdoe awhite bgreen; do
    ipa group-add-member developers --users="$USER"
done
```

## Managing User Certificates

```bash
# Request a certificate for a user
ipa cert-request user-cert.csr --principal=jsmith

# List user certificates
ipa cert-find --user=jsmith
```

## Useful Tips

### Tab Completion

The `ipa` command supports tab completion:

```bash
ipa user-<TAB>
```

### JSON Output

For scripting, use JSON output:

```bash
ipa user-show jsmith --json
```

### Listing Available Commands

```bash
ipa help commands | grep user
ipa help user-add
```

## Summary

The `ipa` command-line tool on RHEL 9 provides complete user and group management for IdM. Use `ipa user-add` and `ipa group-add` for creation, `ipa user-mod` for modifications, and combine with shell scripting for bulk operations. Password policies can be configured globally or per-group, and user accounts can be preserved and restored instead of permanently deleted.
