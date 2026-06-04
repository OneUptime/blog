# Validation Summary: How to Run RADIUS Server (FreeRADIUS) in Docker

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Docker
- Docker Compose
- FreeRADIUS
- RADIUS authentication and accounting
- MariaDB / MySQL SQL backend
- LDAP / Active Directory integration
- 802.1X / WPA Enterprise authentication

## Sources Consulted
- FreeRADIUS Docker image documentation: https://hub.docker.com/r/freeradius/freeradius-server/
- FreeRADIUS client configuration documentation: https://www.freeradius.org/documentation/freeradius-server/4.0.0/reference/raddb/clients.conf.html
- FreeRADIUS users file man page: https://www.freeradius.org/radiusd/man/users.html
- FreeRADIUS SQL module tutorial: https://www.freeradius.org/documentation/freeradius-server/3.2.8/tutorials/sql.html
- FreeRADIUS v3.2 MySQL schema: https://raw.githubusercontent.com/FreeRADIUS/freeradius-server/v3.2.x/raddb/mods-config/sql/main/mysql/schema.sql
- FreeRADIUS v3.2 SQL module configuration: https://raw.githubusercontent.com/FreeRADIUS/freeradius-server/v3.2.x/raddb/mods-available/sql
- FreeRADIUS v3.2 LDAP module configuration: https://raw.githubusercontent.com/FreeRADIUS/freeradius-server/v3.2.x/raddb/mods-available/ldap
- FreeRADIUS radtest man page: https://www.freeradius.org/radiusd/man/radtest.html
- FreeRADIUS status server documentation: https://www.freeradius.org/documentation/freeradius-server/3.2.8/howto/monitoring/statistics.html
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- RFC 2865, RADIUS authentication: https://datatracker.ietf.org/doc/rfc2865/
- RFC 2866, RADIUS accounting: https://www.rfc-editor.org/info/rfc2866

## Issues Found
- The quick-start Docker command mounted `/etc/freeradius`, but the official FreeRADIUS container uses `/etc/raddb` for configuration. Removed the incorrect mount and clarified that the default image must be configured with local clients and users before external authentication tests.
- The Compose example used the obsolete top-level `version: "3.8"` key. Removed it to align with the current Compose Specification.
- The Compose example labeled `18120/tcp` as a status port. Changed this to `18121/udp` and noted that the status virtual server must be enabled.
- FreeRADIUS configuration snippets were marked as `bash`, which made non-shell configuration look executable. Changed those snippets to `text` and kept shell commands in separate `bash` blocks.
- The file-based user section pointed readers to a generic users file in the raddb directory. Updated it to the FreeRADIUS v3 location, `mods-config/files/authorize`.
- The SQL schema omitted tables and columns used by the default FreeRADIUS MySQL queries, including `radgroupreply`, `radpostauth`, `nas`, and several accounting columns. Updated the schema to match the official v3.2 MySQL schema more closely.
- The SQL module section said to edit the site configuration but showed `mods-available/sql`. Corrected the description and added the required module enablement step.
- The `radtest` example said it tested from outside the container while using `docker exec`. Corrected the comment to say it tests from inside the container.
- The LDAP group example used `membership_attribute = "member"` for a `groupOfNames`-style directory. Replaced it with a `membership_filter` based on the user DN, which matches the FreeRADIUS LDAP module model for group objects containing member DNs.
- The logging section recommended `docker exec -it freeradius freeradius -X`, which would try to start a second FreeRADIUS process in an already-running container. Replaced it with a one-off debug container command.

## Review Notes
The corrected Docker Compose snippet was parsed successfully with `docker compose -f - config`. A local MySQL/MariaDB client was not installed, so the SQL snippet was verified against the official FreeRADIUS v3.2 MySQL schema rather than executed locally.
