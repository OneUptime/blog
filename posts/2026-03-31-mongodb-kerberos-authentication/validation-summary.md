# Validation Summary: How to Set Up Kerberos Authentication in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Enterprise (4.0+)
- Kerberos (MIT Kerberos and Active Directory)
- GSSAPI authentication mechanism
- PyMongo (Python MongoDB driver)
- mongosh (MongoDB Shell)
- systemd service configuration
- Windows `setspn` utility
- MIT `kadmin.local` utility

## Sources Consulted
- MongoDB documentation on Kerberos authentication: https://www.mongodb.com/docs/manual/core/kerberos/
- MongoDB documentation on configuring Kerberos: https://www.mongodb.com/docs/manual/tutorial/control-access-to-mongodb-with-kerberos-authentication/
- Microsoft `setspn` documentation: https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-server-2012-r2-and-2012/cc731241(v=ws.11)
- MIT Kerberos `kadmin` documentation: https://web.mit.edu/kerberos/krb5-latest/doc/admin/admin_commands/kadmin_local.html
- PyMongo authentication documentation: https://pymongo.readthedocs.io/en/stable/examples/authentication.html

## Issues Found
1. **Incorrect `setspn` command syntax**: The original command was `setspn -A mongodb/mongod1.example.com@EXAMPLE.COM mongod1$`. This was wrong in two ways:
   - The `@EXAMPLE.COM` realm should not be included in the `setspn` command. On Active Directory, the realm is implicit from the domain; `setspn` takes the SPN in `service/hostname` format without a Kerberos realm suffix.
   - The `-A` flag is deprecated in favor of `-S`, which performs a duplicate check before adding the SPN.
   - **Fixed to**: `setspn -S mongodb/mongod1.example.com mongod1$`

## Review Notes
- The `kadmin.local` commands (`addprinc`, `ktadd`) are shown as sequential lines within the same code block. While technically they are interactive commands entered within the `kadmin.local` session, this is a standard and widely understood documentation convention.
- The post correctly notes that MongoDB Enterprise is required for GSSAPI/Kerberos support. Community edition does not support this authentication mechanism.
- The PyMongo example correctly URL-encodes the `@` symbol as `%40` in the connection string, which is a common source of errors.
- The 5-minute clock skew tolerance mentioned in the troubleshooting section is the default Kerberos setting and is accurate.
- The `setParameter.authenticationMechanisms` configuration only lists GSSAPI. In production, environments often also include SCRAM-SHA-256 (e.g., `GSSAPI,SCRAM-SHA-256`) so that local admin accounts can still authenticate. This is a valid design choice for a focused tutorial but worth noting.
