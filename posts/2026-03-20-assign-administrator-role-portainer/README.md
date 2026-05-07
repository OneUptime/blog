# How to Assign the Administrator Role in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, RBAC, Administrator, User Management, DevOps

Description: Learn how to grant and revoke the administrator role in Portainer to manage who has full system control.

---

The Administrator role in Portainer grants complete control over all environments, users, teams, and settings. Assigning this role should be done carefully and only to trusted personnel.

## Administrator Capabilities

Portainer administrators can:
- Manage all environments (add, edit, remove)
- Manage all users and teams
- Configure authentication settings
- View and manage all containers, stacks, and resources across all environments
- Configure Portainer settings and SSL certificates
- Manage registries and app templates

## Assign Administrator Role via the UI

1. Log in as an existing administrator
2. From the menu expand **User-related** then select **Users**
3. Click the username of the user you want to promote to administrator
4. Toggle **Administrator** on
5. Click **Save**

## Assign Administrator via API

```bash
TOKEN=$(curl -s -X POST \
  https://localhost:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' \
  --insecure | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Get user ID for the user to promote

curl -s https://localhost:9443/api/users \
  -H "Authorization: Bearer $TOKEN" \
  --insecure | python3 -c "
import sys, json
users = json.load(sys.stdin)
for u in users:
    print(f'ID: {u[\"Id\"]:<5} Username: {u[\"Username\"]:<30} Role: {\"Admin\" if u[\"Role\"]==1 else \"User\"}')
"

# Promote user ID 3 to Administrator (Role: 1)
curl -X PUT \
  https://localhost:9443/api/users/3 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"Role": 1}' \
  --insecure
```

## Revoke Administrator Role

```bash
# Demote user from Admin to Standard User (Role: 2)
curl -X PUT \
  https://localhost:9443/api/users/3 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"Role": 2}' \
  --insecure
```

## Create a New Administrator Account

```bash
# Create a new admin user directly
curl -X POST \
  https://localhost:9443/api/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "Username": "newadmin",
    "Password": "SecurePassword123!",
    "Role": 1
  }' \
  --insecure
```

## Best Practices

- Limit the number of administrator accounts (2-3 maximum)
- Use individual accounts rather than shared admin credentials
- Enable MFA for all administrator accounts (via OAuth provider)
- Regularly audit the admin user list
- For day-to-day tasks, use environment-level roles instead of global admin

```bash
# Audit: List all current administrators
curl -s https://localhost:9443/api/users \
  -H "Authorization: Bearer $TOKEN" \
  --insecure | python3 -c "
import sys, json
users = json.load(sys.stdin)
admins = [u for u in users if u.get('Role') == 1]
print(f'Total administrators: {len(admins)}')
for a in admins:
    print(f'  - {a[\"Username\"]}')
"
```

---

*Monitor admin activities and infrastructure health with [OneUptime](https://oneuptime.com).*
