# Validation Summary: How to Use mongoldap for LDAP Configuration Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Enterprise (`mongoldap` utility)
- LDAP (Lightweight Directory Access Protocol)
- MongoDB LDAP authorization configuration (`mongod.conf`)
- `ldapsearch` CLI tool

## Sources Consulted
- MongoDB official documentation: mongoldap reference (https://www.mongodb.com/docs/manual/reference/program/mongoldap/)
- MongoDB official documentation: LDAP Proxy Authentication (https://www.mongodb.com/docs/manual/core/security-ldap/)
- MongoDB official documentation: LDAP Authorization on Self-Managed Deployments (https://www.mongodb.com/docs/manual/core/security-ldap-external/)
- MongoDB official documentation: Server Parameters (https://www.mongodb.com/docs/manual/reference/parameters/)

## Issues Found

1. **Invalid `--ldapUserCacheInvalidationInterval` flag on `mongoldap`** (Critical)
   - **What was wrong:** The post used `--ldapUserCacheInvalidationInterval 0` as a `mongoldap` command-line flag to test "username-to-DN transformation only." This parameter is a `mongod` server parameter, not a valid `mongoldap` option. Running `mongoldap` with this flag would produce an unrecognized option error.
   - **What was changed:** Removed the invalid flag. Simplified the example to show testing with a plain username (e.g., `"alice"`) which exercises the `userToDNMapping` transformation, and updated the explanation accordingly.

2. **Inaccurate `mongoldap` output format** (Minor)
   - **What was wrong:** The sample success output showed a custom format (`Parsing MongoDB Configuration File ...`, `Successfully authenticated with the LDAP server`, `LDAP Authorization Mapping:`) that doesn't match actual `mongoldap` output. Real output uses step-by-step validation checks with `[OK]` status markers.
   - **What was changed:** Replaced the output sample with a format closer to actual `mongoldap` output, including `[OK]` markers for each validation step (server check, connection, authentication, authorization).

## Review Notes
- The `mongod.conf` LDAP configuration structure (`security.ldap.*` fields) is accurate and correctly documented.
- The `--config`, `--user`, `--password`, `--ldapServers`, and `--ldapTransportSecurity` flags are all valid `mongoldap` options.
- The `ldapsearch` troubleshooting example is correct and useful for isolating LDAP filter issues.
- The common errors table provides reasonable diagnostic guidance, though exact error messages may vary by MongoDB version.
- The post correctly notes that `mongoldap` is an Enterprise-only tool.
