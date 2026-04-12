# How to Write a Script to Automate MongoDB User Creation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Scripting, User Management, Security, Automation

Description: Learn how to write a script to automate MongoDB user creation with role assignments, password generation, and idempotent re-runs for safe provisioning workflows.

---

## Overview

Managing MongoDB users manually is error-prone and doesn't scale across multiple environments. An automated user creation script provisions users consistently, generates secure passwords, assigns appropriate roles, and runs idempotently so it can be safely re-executed without creating duplicate users.

## Shell Script for User Creation

```bash
#!/bin/bash
# mongodb-create-users.sh

MONGO_URI="${MONGO_URI:-mongodb://localhost:27017}"
ADMIN_USER="${MONGO_ADMIN_USER}"
ADMIN_PASS="${MONGO_ADMIN_PASS}"

# User definitions: "username:database:role"
USERS=(
  "app_user:myapp:readWrite"
  "reports_user:myapp:read"
  "backup_user:admin:backup"
  "monitoring_user:admin:clusterMonitor"
)

generate_password() {
  openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 20
}

for entry in "${USERS[@]}"; do
  USERNAME=$(echo "$entry" | cut -d: -f1)
  DB=$(echo "$entry" | cut -d: -f2)
  ROLE=$(echo "$entry" | cut -d: -f3)
  PASSWORD=$(generate_password)

  echo "Provisioning user: $USERNAME on db: $DB with role: $ROLE"

  mongosh "$MONGO_URI" \
    -u "$ADMIN_USER" -p "$ADMIN_PASS" \
    --authenticationDatabase admin \
    --quiet --eval "
      const targetDb = db.getSiblingDB('$DB');
      const existing = targetDb.getUser('$USERNAME');
      if (existing) {
        print('User $USERNAME already exists - skipping');
      } else {
        targetDb.createUser({
          user: '$USERNAME',
          pwd: '$PASSWORD',
          roles: [{ role: '$ROLE', db: '$DB' }]
        });
        print('Created user: $USERNAME | Password: $PASSWORD');
      }
    "
done
```

## Python Script with Idempotent User Provisioning

```python
#!/usr/bin/env python3
import os
import secrets
import string
from pymongo import MongoClient
from pymongo.errors import OperationFailure

MONGO_URI = os.environ["MONGO_URI"]
client = MongoClient(MONGO_URI)

def generate_password(length=24):
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))

USER_DEFINITIONS = [
    {"username": "app_user", "db": "myapp", "roles": [{"role": "readWrite", "db": "myapp"}]},
    {"username": "reports_user", "db": "myapp", "roles": [{"role": "read", "db": "myapp"}]},
    {"username": "backup_user", "db": "admin", "roles": [{"role": "backup", "db": "admin"}]},
    {"username": "monitoring_user", "db": "admin",
     "roles": [{"role": "clusterMonitor", "db": "admin"}]},
]

def provision_user(definition):
    db_name = definition["db"]
    username = definition["username"]
    db = client[db_name]

    # Check if user already exists
    existing = db.command("usersInfo", username)
    if existing["users"]:
        print(f"SKIP: User '{username}' already exists on db '{db_name}'")
        return None

    password = generate_password()
    db.command(
        "createUser",
        username,
        pwd=password,
        roles=definition["roles"]
    )
    print(f"CREATED: {username} | DB: {db_name} | Password: {password}")
    return {"username": username, "password": password, "db": db_name}

if __name__ == "__main__":
    print("=== MongoDB User Provisioning ===")
    credentials = []
    for user_def in USER_DEFINITIONS:
        try:
            result = provision_user(user_def)
            if result:
                credentials.append(result)
        except OperationFailure as e:
            print(f"ERROR creating {user_def['username']}: {e}")

    if credentials:
        print("\n=== Newly Created Credentials (store securely) ===")
        for cred in credentials:
            print(f"  {cred['username']} / {cred['password']} (db: {cred['db']})")
```

## Updating Roles for Existing Users

```python
def update_user_roles(username, db_name, new_roles):
    db = client[db_name]
    db.command("updateUser", username, roles=new_roles)
    print(f"Updated roles for {username}: {new_roles}")

update_user_roles("reports_user", "myapp", [
    {"role": "read", "db": "myapp"},
    {"role": "read", "db": "analytics"}
])
```

## Loading Users from a Config File

Define users in a YAML config and provision from it:

```yaml
users:
  - username: app_user
    db: myapp
    roles:
      - role: readWrite
        db: myapp
  - username: reports_user
    db: myapp
    roles:
      - role: read
        db: myapp
```

```python
import yaml

with open("users.yaml") as f:
    config = yaml.safe_load(f)

for user_def in config["users"]:
    provision_user(user_def)
```

## Best Practices

- Never hardcode passwords - always generate them using `secrets.choice` (Python) or `openssl rand` (shell).
- Write generated passwords to a secrets manager (AWS Secrets Manager, HashiCorp Vault) immediately rather than printing to stdout in production.
- Make scripts idempotent by checking `usersInfo` before calling `createUser` - this allows safe re-runs without failure.
- Use role names from MongoDB's built-in role set (`readWrite`, `read`, `backup`, `clusterMonitor`) rather than creating custom roles unless strictly necessary.

## Summary

An automated MongoDB user creation script checks for existing users, generates secure random passwords, assigns roles, and writes credentials to a secure store. Design scripts to be idempotent so they can be run multiple times safely during environment provisioning or CI/CD pipelines.
