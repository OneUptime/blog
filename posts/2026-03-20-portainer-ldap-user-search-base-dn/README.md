# How to Configure LDAP User Search Base DN in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, LDAP, Authentication, Configuration, Directory Services

Description: Configure the LDAP User Search Base DN and filters in Portainer to control which directory users can authenticate.

## Introduction

The LDAP User Search Base DN is the starting point in your directory tree where Portainer searches for user accounts during login. Getting this right is critical - too broad and performance suffers, too narrow and legitimate users can't log in. This guide explains how to configure optimal Base DN settings.

## Understanding Base DN

The Base DN (Distinguished Name) specifies the root node in the LDAP tree from which searches begin. For example:

```text
dc=example,dc=com                              # Entire directory
ou=users,dc=example,dc=com                    # Just the users OU
ou=staff,ou=users,dc=example,dc=com           # Nested OU
dc=corp,dc=example,dc=com                     # Subdomain
```

Portainer searches the Base DN and all its sub-entries (subtree scope) to find users matching the filter.

## Common Base DN Patterns

### Single OU

```text
User Base DN: ou=users,dc=example,dc=com
```

Best for: Small organizations with a flat user structure.

### Department-based OUs

For multiple departments:
```text
ou=employees,dc=example,dc=com
```

And, in OpenLDAP deployments using password policy lockout, a filter that excludes locked accounts:
```text
User Filter: (&(objectClass=inetOrgPerson)(!(pwdAccountLockedTime=*)))
```

### Active Directory Domains

```text
User Base DN: dc=corp,dc=example,dc=com
```

With a filter for enabled accounts only:
```text
User Filter: (&(objectClass=user)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))
```

The `userAccountControl` filter excludes disabled AD accounts.

## Configuring Multiple Search Bases

Portainer supports multiple user search settings, allowing you to search multiple OUs:

```bash
TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/settings \
  -d '{
    "AuthenticationMethod": 2,
    "LDAPSettings": {
      "URL": "ldap.example.com:389",
      "ReaderDN": "cn=portainer-bind,dc=example,dc=com",
      "Password": "bindpassword",
      "SearchSettings": [
        {
          "BaseDN": "ou=admins,dc=example,dc=com",
          "UserNameAttribute": "uid",
          "Filter": "(objectClass=inetOrgPerson)"
        },
        {
          "BaseDN": "ou=developers,dc=example,dc=com",
          "UserNameAttribute": "uid",
          "Filter": "(objectClass=inetOrgPerson)"
        },
        {
          "BaseDN": "ou=contractors,dc=example,dc=com",
          "UserNameAttribute": "uid",
          "Filter": "(&(objectClass=inetOrgPerson)(departmentNumber=IT))"
        }
      ]
    }
  }'
```

## Discovering Your LDAP Structure

Use `ldapsearch` to explore your directory before configuring Portainer:

```bash
# List top-level OUs

ldapsearch -x \
  -H ldap://ldap.example.com:389 \
  -D "cn=portainer-bind,dc=example,dc=com" \
  -w bindpassword \
  -b "dc=example,dc=com" \
  -s one \
  "(objectClass=organizationalUnit)" dn

# List users under a specific OU
ldapsearch -x \
  -H ldap://ldap.example.com:389 \
  -D "cn=portainer-bind,dc=example,dc=com" \
  -w bindpassword \
  -b "ou=users,dc=example,dc=com" \
  "(objectClass=inetOrgPerson)" uid cn mail \
  | grep -E "^dn:|^uid:|^cn:|^mail:"

# Count users in a base DN (performance planning)
ldapsearch -x \
  -H ldap://ldap.example.com:389 \
  -D "cn=portainer-bind,dc=example,dc=com" \
  -w bindpassword \
  -b "ou=users,dc=example,dc=com" \
  "(objectClass=inetOrgPerson)" dn \
  | grep -c "^dn:"
```

## LDAP Filter Best Practices

### Basic user filter (OpenLDAP)
```text
(objectClass=inetOrgPerson)
```

### Users with email (requires email to be present)
```text
(&(objectClass=inetOrgPerson)(mail=*))
```

### Active Directory - active users only
```text
(&(objectClass=user)(objectCategory=person)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))
```

### Restrict to specific group members (when your directory populates `memberOf`)
```text
(&(objectClass=inetOrgPerson)(memberOf=cn=portainer-users,ou=groups,dc=example,dc=com))
```

### Active Directory - users in a specific group (nested groups)
```text
(&(objectClass=user)(memberOf:1.2.840.113556.1.4.1941:=cn=portainer-users,ou=groups,dc=corp,dc=example,dc=com))
```

## Performance Considerations

| Base DN Scope | Typical Result Set | Relative Search Cost |
|---------------|--------------------|----------------------|
| Entire directory | Largest | Highest |
| Department OU | Smaller | Lower |
| Specific OU | Smallest practical | Lowest |

Use the most specific Base DN that still includes all users who need access.

## Conclusion

The LDAP User Search Base DN is one of the most important settings in your Portainer LDAP configuration. Use the most specific DN that covers your user population, combine it with appropriate filters to exclude disabled or irrelevant accounts, and test with `ldapsearch` before configuring Portainer. Multiple search settings let you include users from different parts of the directory without using the root.
