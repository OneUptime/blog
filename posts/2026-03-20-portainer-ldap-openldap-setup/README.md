# How to Set Up LDAP with OpenLDAP in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, LDAP, OpenLDAP, Authentication, Docker

Description: Connect Portainer to an OpenLDAP server for user authentication with a practical configuration example for standard OpenLDAP deployments.

## Introduction

OpenLDAP is the most widely deployed open-source LDAP server. Unlike Active Directory, OpenLDAP uses standard LDAP schemas (inetOrgPerson, posixAccount) rather than Microsoft-specific ones. This guide provides a complete, tested configuration for connecting Portainer to OpenLDAP.

## Step 1: Deploy OpenLDAP with Docker (Test Environment)

For a test setup, run OpenLDAP in Docker. The `osixia/openldap:1.5.0` example below is suitable for a quick lab, but its v1 branch is deprecated and no longer receives updates, so use a maintained image for production:

```yaml
# openldap-stack.yml

services:
  openldap:
    image: osixia/openldap:1.5.0
    container_name: openldap
    environment:
      LDAP_ORGANISATION: "Example Corp"
      LDAP_DOMAIN: "example.com"
      LDAP_BASE_DN: "dc=example,dc=com"
      LDAP_ADMIN_PASSWORD: "adminpassword"
      LDAP_CONFIG_PASSWORD: "configpassword"
      # Create readonly user for Portainer binding
      LDAP_READONLY_USER: "true"
      LDAP_READONLY_USER_USERNAME: "portainer-bind"
      LDAP_READONLY_USER_PASSWORD: "bindpassword"
    ports:
      - "389:389"
      - "636:636"
    volumes:
      - openldap_data:/var/lib/ldap
      - openldap_config:/etc/ldap/slapd.d

  phpldapadmin:
    image: osixia/phpldapadmin:0.9.0
    container_name: phpldapadmin
    environment:
      PHPLDAPADMIN_LDAP_HOSTS: openldap
    ports:
      - "6443:443"

volumes:
  openldap_data:
  openldap_config:
```

```bash
docker compose -f openldap-stack.yml up -d
```

## Step 2: Populate OpenLDAP with Test Users

Create `users.ldif`:

```ldif
# Organizational Units
dn: ou=users,dc=example,dc=com
objectClass: organizationalUnit
ou: users

dn: ou=groups,dc=example,dc=com
objectClass: organizationalUnit
ou: groups

# Users
dn: uid=alice,ou=users,dc=example,dc=com
objectClass: inetOrgPerson
objectClass: posixAccount
uid: alice
cn: Alice Smith
sn: Smith
givenName: Alice
mail: alice@example.com
userPassword: {SHA}W6ph5Mm5Pz8GgiULbPgzG37mj9g=
uidNumber: 1001
gidNumber: 1001
homeDirectory: /home/alice

dn: uid=bob,ou=users,dc=example,dc=com
objectClass: inetOrgPerson
objectClass: posixAccount
uid: bob
cn: Bob Jones
sn: Jones
userPassword: {SHA}W6ph5Mm5Pz8GgiULbPgzG37mj9g=
uidNumber: 1002
gidNumber: 1001
homeDirectory: /home/bob

# Group
dn: cn=devops,ou=groups,dc=example,dc=com
objectClass: groupOfNames
cn: devops
member: uid=alice,ou=users,dc=example,dc=com
member: uid=bob,ou=users,dc=example,dc=com
```

```bash
# Copy LDIF into the container first
docker cp users.ldif openldap:/tmp/users.ldif

# Import the LDIF
docker exec openldap ldapadd \
  -x -D "cn=admin,dc=example,dc=com" \
  -w adminpassword \
  -f /tmp/users.ldif
```

## Step 3: Configure Portainer for OpenLDAP

In Portainer Settings → Authentication → LDAP:

```text
Automatic user provisioning: On
Server:                ldap.example.com:389
Anonymous Bind:        Off
Reader DN:             cn=portainer-bind,dc=example,dc=com
Reader Password:       bindpassword

BaseDN:                ou=users,dc=example,dc=com
Username Attribute:    uid
Filter:                (objectClass=inetOrgPerson)

Group Base DN:         ou=groups,dc=example,dc=com
Group Membership Attribute: member
Group Filter:          (objectClass=groupOfNames)
```

## Step 4: Verify Connectivity

Test LDAP search manually before configuring Portainer:

```bash
# Test bind and user search
ldapsearch \
  -x \
  -H ldap://ldap.example.com:389 \
  -D "cn=portainer-bind,dc=example,dc=com" \
  -w bindpassword \
  -b "ou=users,dc=example,dc=com" \
  "(objectClass=inetOrgPerson)" uid cn mail

# Test finding a specific user
ldapsearch \
  -x \
  -H ldap://ldap.example.com:389 \
  -D "cn=portainer-bind,dc=example,dc=com" \
  -w bindpassword \
  -b "ou=users,dc=example,dc=com" \
  "(uid=alice)" uid cn mail
```

## Step 5: Common OpenLDAP Attribute Mappings

| Portainer Setting | OpenLDAP Attribute | Description |
|------------------|--------------------|-------------|
| Username Attribute | `uid` | Login username |
| Filter | `(objectClass=inetOrgPerson)` | All users |
| Group Filter | `(objectClass=groupOfNames)` | Groups |
| Group Membership Attribute | `member` | DN of members |

## Troubleshooting OpenLDAP Issues

```bash
# Check OpenLDAP logs
docker logs openldap

# Verify the bind account works
ldapwhoami -x -H ldap://localhost:389 \
  -D "cn=portainer-bind,dc=example,dc=com" \
  -w bindpassword

# Check if a user DN exists
ldapsearch -x -H ldap://localhost:389 \
  -D "cn=portainer-bind,dc=example,dc=com" \
  -w bindpassword \
  -b "dc=example,dc=com" \
  "(uid=alice)" dn
```

## Conclusion

OpenLDAP integration with Portainer follows the standard LDAP pattern: a service account for binding, a search base for users, and optional group search. Once connected, users authenticate with their LDAP credentials, and Portainer can create local accounts automatically when automatic user provisioning is enabled. The key OpenLDAP-specific details are using `uid` as the username attribute and `inetOrgPerson` as the user object class.
