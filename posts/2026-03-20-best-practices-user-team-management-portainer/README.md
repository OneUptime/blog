# Best Practices for User and Team Management in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, RBAC, User Management, Team, Security, Access Control, Best Practice

Description: Establish secure and scalable user and team management in Portainer with RBAC, SSO integration, least-privilege access policies, and user lifecycle management.

---

Proper user and team management in Portainer prevents unauthorized access, ensures accountability, and makes operations auditable. These best practices apply to both small teams and large organizations.

## Principle of Least Privilege

Grant users only the access they need:

| Role | Who Gets It | What They Can Do |
|------|-------------|-----------------|
| Administrator | Platform engineers only | Full access everywhere |
| Environment Administrator | Team leads | Full access within their environment |
| Helpdesk | Support staff | Read-only access, no console |
| Standard User | Developers | Manage resources they or their team deploy |
| Read-Only User | Auditors, stakeholders | View resources they are entitled to see |

Never grant Administrator to regular developers.

## Team Structure

Create teams that mirror your organizational structure:

```text
Teams:
- platform-engineers    → Environment Administrator on all environments
- backend-team          → Standard User on backend environments
- frontend-team         → Standard User on frontend environments
- ml-team               → Standard User on ML environments
- security-auditors     → Read-Only User on all environments
```

## LDAP/AD Integration

For organizations with Active Directory or LDAP, configure external authentication to avoid manual user management:

In Portainer BE, go to **Settings > Authentication** and choose **LDAP Authentication** or **Microsoft Active Directory**:

```text
Example LDAP configuration:
Server: ldap.company.com:389
Reader DN: cn=portainer-reader,ou=service-accounts,dc=company,dc=com
Base DN: dc=company,dc=com
Username attribute: sAMAccountName
Group base DN: ou=groups,dc=company,dc=com
Group membership attribute: member
Automatic user provisioning: true

Portainer team names should match your directory groups:
- Container-Admins
- Container-Devs
- Container-Auditors
```

With automatic user provisioning and group search configured, users can be created automatically and placed into matching Portainer teams based on their directory group membership.

## User Lifecycle Management

**Onboarding:**
1. Add user to the appropriate LDAP/AD group (or create manually in Portainer)
2. Assign to the correct team in Portainer
3. Verify access is scoped to only their environments

**Offboarding:**
1. Remove user from LDAP groups (or disable/delete in Portainer)
2. Review any active sessions
3. Rotate any shared credentials the user had access to

## Authentication and Activity Logs (BE Feature)

Use Portainer's authentication and activity logs to track user actions:

- User logins and logouts
- Container start/stop/delete operations
- Stack deployments and updates
- Registry configuration changes

Review these logs regularly, especially after incidents.

## Service Accounts for Automation

For CI/CD pipelines and automation scripts, use dedicated service accounts:

1. Create a dedicated user: `ci-deploy`
2. Assign only the permissions needed (e.g., stack deployment on specific environments)
3. Generate an API token for this user (not your personal account)
4. Store the token in your secrets manager (Vault, AWS Secrets Manager, etc.)

```bash
# Create service account via Portainer API

curl -X POST "https://portainer.example.com/api/users" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"Username":"ci-deploy","Password":"generated-strong-password","Role":2}'

# Authenticate as the service account to get a JWT
curl -X POST "https://portainer.example.com/api/auth" \
  -H "Content-Type: application/json" \
  -d '{"username":"ci-deploy","password":"generated-strong-password"}'

# Generate API token for service account
curl -X POST "https://portainer.example.com/api/users/<SERVICE_USER_ID>/tokens" \
  -H "Authorization: Bearer <SERVICE_ACCOUNT_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"description":"ci-deploy-token","password":"generated-strong-password"}'
```

## Regular Access Reviews

Schedule quarterly access reviews:
- List all users and their roles
- Verify each user still needs access
- Check for orphaned service accounts
- Remove or downgrade access for users who have changed roles

## Summary

User and team management in Portainer requires deliberate structure. Use external authentication to reduce manual user management, apply least-privilege roles, use service accounts for automation, and review access regularly. These practices reduce the blast radius of compromised accounts and prevent accidental access to production environments.
