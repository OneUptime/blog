# How to Manage IdM Users and Groups from the Command Line on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, IdM, FreeIPA, User Management, Groups, Linux

Description: Learn how to create, modify, and manage users and groups in Red Hat Identity Management (IdM) using the ipa command-line tool on RHEL.

---

The `ipa` command-line tool provides full control over IdM user and group management. This is the preferred method for scripting and automation. All commands require a valid Kerberos ticket.

## Authenticating to IdM

```bash
# Get a Kerberos ticket as admin
kinit admin
# Enter the admin password

# Verify the ticket
klist
```

## Managing Users

```bash
# Create a new user
ipa user-add jsmith \
  --first=John \
  --last=Smith \
  --email=jsmith@example.com \
  --shell=/bin/bash \
  --password

# List all users
ipa user-find

# Search for a specific user
ipa user-find jsmith

# Show detailed information about a user
ipa user-show jsmith --all

# Modify a user (change shell)
ipa user-mod jsmith --shell=/bin/zsh

# Disable a user account
ipa user-disable jsmith

# Enable a user account
ipa user-enable jsmith

# Delete a user
ipa user-del jsmith
```

## Managing Groups

```bash
# Create a new group
ipa group-add developers --desc="Development team"

# Add users to a group
ipa group-add-member developers --users=jsmith
ipa group-add-member developers --users=jdoe,alee

# List all groups
ipa group-find

# Show group details including members
ipa group-show developers

# Remove a user from a group
ipa group-remove-member developers --users=jsmith

# Create a nested group (group of groups)
ipa group-add engineering --desc="All engineering"
ipa group-add-member engineering --groups=developers
```

## Bulk User Operations

```bash
# Create multiple users from a CSV file using a loop
while IFS=',' read -r uid first last email; do
    ipa user-add "$uid" \
      --first="$first" \
      --last="$last" \
      --email="$email" \
      --random
done < users.csv

# The --random flag generates a temporary password for each user
```

## Managing Password Policies

```bash
# View the default password policy
ipa pwpolicy-show

# Modify the default password policy
ipa pwpolicy-mod \
  --minlife=1 \
  --maxlife=90 \
  --minlength=12 \
  --minclasses=3

# Create a policy for a specific group
ipa pwpolicy-add developers \
  --maxlife=180 \
  --minlength=14 \
  --priority=10
```

The `ipa` command follows a consistent pattern: `ipa <object>-<action>`. This makes it straightforward to discover available operations using tab completion or `ipa help <topic>`.
