# Validation Summary: How to Configure Atlas Database Access and Network Access

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Atlas
- MongoDB Atlas CLI (`atlas` CLI)
- MongoDB Atlas Admin API (v1.0)
- mongosh (MongoDB Shell)
- SCRAM-SHA-256 authentication
- X.509 certificate authentication
- Node.js MongoDB driver

## Sources Consulted
- MongoDB Atlas CLI reference documentation for `atlas accessLists create` and `atlas dbusers create` commands
- MongoDB Atlas Admin API v1.0 documentation for `/groups/{groupId}/databaseUsers` and `/groups/{groupId}/accessList` endpoints
- MongoDB mongosh documentation for X.509 authentication flags
- Cross-referenced with other validated blog posts in this repository covering Atlas CLI operations, X.509 authentication, and network access configuration

## Issues Found

### Issue 1: Invalid `--cidr` flag on `atlas accessLists create`
- **What was wrong:** The `atlas accessLists create` command used `--cidr "X.X.X.X/Y"` as a flag, but `--cidr` is not a valid flag for this command. The CIDR block or IP address is a positional argument.
- **What was changed:** Replaced `--cidr "X.X.X.X/Y"` with positional argument `"X.X.X.X/Y"` in all three `atlas accessLists create` examples (specific IP, CIDR block, and allow-all).
- **Why:** The Atlas CLI `accessLists create` command accepts the entry (IP address, CIDR block, or AWS security group ID) as a positional argument, not via a `--cidr` flag. Using `--cidr` would produce an "unknown flag" error.

### Issue 2: Missing authentication flags in mongosh X.509 connection
- **What was wrong:** The `mongosh` X.509 connection example only specified `--tls` and `--tlsCertificateKeyFile`, omitting the required `--authenticationMechanism MONGODB-X509` and `--authenticationDatabase '$external'` flags.
- **What was changed:** Added `--authenticationMechanism MONGODB-X509` and `--authenticationDatabase '$external'` to the mongosh connection command.
- **Why:** mongosh defaults to SCRAM-SHA-256 authentication. Without explicitly specifying `MONGODB-X509` as the authentication mechanism and `$external` as the authentication database, the connection would fail because no password is provided and the shell wouldn't know to use the client certificate for authentication.

## Review Notes
- The Atlas Admin API examples use v1.0 (`/api/atlas/v1.0/...`), which still works but is the older API version. The current recommended version is v2 (`/api/atlas/v2/...`). This is not an error since v1.0 is still supported, but readers building new integrations should consider using v2.
- The best practices section omits `--password` from `atlas dbusers create` commands. This is acceptable since the CLI will prompt interactively, but readers should be aware they'll need to provide a password at the prompt.
- For the managed X.509 user creation (`--x509Type MANAGED`), the username uses a full DN format (`CN=appService,OU=apps,O=mycompany`). With Atlas-managed certificates, a simpler username is more typical since Atlas generates the certificate. This works but is unconventional.
