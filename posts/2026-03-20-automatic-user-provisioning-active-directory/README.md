# How to Set Up Automatic User Provisioning with Active Directory in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Active Directory, User Provisioning, LDAP, Automation

Description: Configure Portainer to automatically create user accounts on first login when authenticating via Active Directory, eliminating manual user management.

---

In Portainer Business Edition, with auto-provisioning enabled, Portainer creates a user account the first time someone logs in via Active Directory - no pre-registration required. Users can be added to matching Portainer teams based on their AD group assignments.

## Enable Auto-Create Users

The `AutoCreateUsers` setting controls whether Portainer creates accounts on first LDAP/AD login:

```bash
TOKEN=$(curl -s -X POST \
  https://localhost:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' \
  --insecure | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Enable automatic user provisioning

curl -X PUT \
  https://localhost:9443/api/settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "AuthenticationMethod": 2,
    "LDAPSettings": {
      "ReaderDN": "CN=portainer-svc,OU=Service Accounts,DC=corp,DC=example,DC=com",
      "Password": "ServicePassword!",
      "URL": "dc01.corp.example.com:636",
      "TLSConfig": {"TLS": true, "TLSSkipVerify": false},
      "SearchSettings": [{
        "BaseDN": "DC=corp,DC=example,DC=com",
        "Filter": "(&(objectClass=user)(objectCategory=person))",
        "UserNameAttribute": "sAMAccountName"
      }],
      "GroupSearchSettings": [{
        "GroupBaseDN": "OU=Portainer Groups,DC=corp,DC=example,DC=com",
        "GroupFilter": "(objectClass=group)",
        "GroupAttribute": "member"
      }],
      "AutoCreateUsers": true
    }
  }' \
  --insecure
```

## How Auto-Provisioning Works

```mermaid
flowchart TD
    A[User attempts login] --> B{User exists in Portainer?}
    B -->|Yes| C[Authenticate via AD]
    B -->|No| D[Authenticate via AD]
    D --> E{Authentication successful?}
    E -->|No| F[Login denied]
    E -->|Yes| G[Create Portainer user account]
    G --> H[Query AD group memberships]
    H --> I[Assign to matching Portainer teams]
    I --> J[User logged in]
    C --> K{Authentication successful?}
    K -->|No| F
    K -->|Yes| L[Add matching Portainer team memberships]
    L --> J
```

## Control Which AD Users Can Auto-Provision

Restrict auto-provisioning to specific AD groups using the search filter:

```bash
# Re-submit the full LDAPSettings block when changing nested LDAP settings
# Only enabled users in the "Portainer Users" AD group can log in and be auto-provisioned
curl -X PUT \
  https://localhost:9443/api/settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "AuthenticationMethod": 2,
    "LDAPSettings": {
      "ReaderDN": "CN=portainer-svc,OU=Service Accounts,DC=corp,DC=example,DC=com",
      "Password": "ServicePassword!",
      "URL": "dc01.corp.example.com:636",
      "TLSConfig": {"TLS": true, "TLSSkipVerify": false},
      "SearchSettings": [{
        "BaseDN": "DC=corp,DC=example,DC=com",
        "Filter": "(&(objectClass=user)(objectCategory=person)(memberOf=CN=Portainer Users,OU=Groups,DC=corp,DC=example,DC=com)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))",
        "UserNameAttribute": "sAMAccountName"
      }],
      "GroupSearchSettings": [{
        "GroupBaseDN": "OU=Portainer Groups,DC=corp,DC=example,DC=com",
        "GroupFilter": "(objectClass=group)",
        "GroupAttribute": "member"
      }],
      "AutoCreateUsers": true
    }
  }' \
  --insecure
# Only enabled users in the "Portainer Users" AD group can log in and be auto-provisioned
```

## View Auto-Provisioned Users

```bash
# List users in Portainer to see accounts created after first AD login
curl -s https://localhost:9443/api/users \
  -H "Authorization: Bearer $TOKEN" \
  --insecure | python3 -c "
import sys, json
users = json.load(sys.stdin)
for u in users:
    role = 'Admin' if u.get('Role') == 1 else 'User'
    print(f\"{u['Id']:<5} {u['Username']:<30} {role}\")
"
```

## Deprovisioning Users

When someone leaves the organization, disable their AD account. The next login attempt will fail. To remove the Portainer account as well:

```bash
# Delete a specific user from Portainer
USER_ID=5  # Get from users list
curl -X DELETE \
  https://localhost:9443/api/users/$USER_ID \
  -H "Authorization: Bearer $TOKEN" \
  --insecure
```

---

*Maintain visibility over your provisioned users' container activities with [OneUptime](https://oneuptime.com).*
