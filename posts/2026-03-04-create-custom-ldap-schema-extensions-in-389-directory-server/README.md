# How to Create Custom LDAP Schema Extensions in 389 Directory Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, 389 Directory Server, LDAP, Schema, Directory Services

Description: Create and add custom schema extensions to 389 Directory Server on RHEL to store application-specific attributes and object classes in your LDAP directory.

---

Sometimes the standard LDAP schema does not include the attributes your application needs. 389 Directory Server allows you to define custom attributes and object classes by adding schema extensions.

## Understand Schema Structure

LDAP schema defines:
- **attributeTypes**: individual data fields (e.g., employeeBadgeNumber)
- **objectClasses**: collections of required and optional attributes (e.g., customEmployee)

Each element needs a unique OID (Object Identifier).

## Plan Your Custom Schema

Before creating schema, obtain an OID arc for your organization, or use the experimental OID arc `2.16.840.1.113730.3.8.x.x` for testing:

```text
Attribute OIDs: 2.16.840.1.113730.3.8.10.1.x
ObjectClass OIDs: 2.16.840.1.113730.3.8.10.2.x
```

## Create a Custom Schema File

Create a new LDIF file for your custom schema:

```bash
sudo vi /etc/dirsrv/slapd-localhost/schema/98custom.ldif
```

```ldif
dn: cn=schema
attributeTypes: ( 2.16.840.1.113730.3.8.10.1.1
  NAME 'badgeNumber'
  DESC 'Employee badge number'
  EQUALITY caseIgnoreMatch
  SUBSTR caseIgnoreSubstringsMatch
  SYNTAX 1.3.6.1.4.1.1466.115.121.1.15
  SINGLE-VALUE
  X-ORIGIN 'Custom Schema' )
attributeTypes: ( 2.16.840.1.113730.3.8.10.1.2
  NAME 'department'
  DESC 'Department name'
  EQUALITY caseIgnoreMatch
  SUBSTR caseIgnoreSubstringsMatch
  SYNTAX 1.3.6.1.4.1.1466.115.121.1.15
  X-ORIGIN 'Custom Schema' )
attributeTypes: ( 2.16.840.1.113730.3.8.10.1.3
  NAME 'startDate'
  DESC 'Employee start date'
  EQUALITY generalizedTimeMatch
  ORDERING generalizedTimeOrderingMatch
  SYNTAX 1.3.6.1.4.1.1466.115.121.1.24
  SINGLE-VALUE
  X-ORIGIN 'Custom Schema' )
objectClasses: ( 2.16.840.1.113730.3.8.10.2.1
  NAME 'customEmployee'
  DESC 'Custom employee object class'
  SUP inetOrgPerson
  AUXILIARY
  MAY ( badgeNumber $ department $ startDate )
  X-ORIGIN 'Custom Schema' )
```

## Load the Schema

Restart the instance to load the new schema file:

```bash
# Restart to load the schema
sudo dsctl localhost restart

# Verify the schema was loaded
sudo dsconf localhost schema attributetypes list | grep badgeNumber
sudo dsconf localhost schema objectclasses list | grep customEmployee
```

## Add Schema Dynamically (Without Restart)

You can also add schema at runtime:

```bash
# Add an attribute type dynamically
ldapmodify -x -H ldap://localhost -D "cn=Directory Manager" -W << 'EOF'
dn: cn=schema
changetype: modify
add: attributeTypes
attributeTypes: ( 2.16.840.1.113730.3.8.10.1.4
  NAME 'projectCode'
  DESC 'Project assignment code'
  EQUALITY caseIgnoreMatch
  SYNTAX 1.3.6.1.4.1.1466.115.121.1.15
  X-ORIGIN 'Custom Schema' )
EOF
```

## Use the Custom Schema

Now add the custom object class and attributes to entries:

```bash
# Modify an existing user to add the custom object class
ldapmodify -x -H ldap://localhost -D "cn=Directory Manager" -W << 'EOF'
dn: uid=jdoe,ou=People,dc=example,dc=com
changetype: modify
add: objectClass
objectClass: customEmployee
-
add: badgeNumber
badgeNumber: EMP-12345
-
add: department
department: Engineering
-
add: startDate
startDate: 20240115000000Z
EOF

# Verify the attributes were added
ldapsearch -x -H ldap://localhost -b "dc=example,dc=com" \
    "(badgeNumber=EMP-12345)" badgeNumber department startDate
```

## Create Indexes for Custom Attributes

For better search performance on custom attributes:

```bash
# Create an equality index for badgeNumber
sudo dsconf localhost backend index create --attr badgeNumber \
    --index-type eq --reindex userroot

# Create a presence and substring index for department
sudo dsconf localhost backend index create --attr department \
    --index-type eq --index-type pres --index-type sub --reindex userroot
```

## Validate the Schema

```bash
# Check for schema errors
sudo dsconf localhost schema validate

# List all custom attributes
ldapsearch -x -H ldap://localhost -b "cn=schema" \
    "(objectClass=*)" attributeTypes | grep "Custom Schema"
```

Custom schema extensions let you tailor 389 Directory Server to your organization's specific data requirements while maintaining LDAP standards compliance.
