# Validation Summary: How to Set Up MySQL High Availability with Keepalived

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- Keepalived
- VRRP (Virtual Router Redundancy Protocol)
- systemd
- mysqladmin

## Sources Consulted
- Keepalived official documentation (https://www.keepalived.org/manpage.html)
- RFC 3768 — Virtual Router Redundancy Protocol (VRRP), Section 5.3.6 (Authentication Data field limited to 8 octets)
- MySQL `mysqladmin` reference (https://dev.mysql.com/doc/refman/8.0/en/mysqladmin.html)
- Keepalived `vrrp_script` configuration reference

## Issues Found

### 1. Incomplete standby node configuration
- **What was wrong:** The standby node configuration only showed the `vrrp_instance` block, but the `track_script { check_mysql }` directive references a `vrrp_script check_mysql` block that was not included. The `global_defs` block was also missing. Keepalived would fail to start on the standby because the tracked script is undefined.
- **What was changed:** Added the complete configuration for the standby node including `global_defs { router_id MYSQL_STANDBY }` and the full `vrrp_script check_mysql` block. Also updated the introductory text to clarify this is a complete config file.
- **Why:** Without the `vrrp_script` definition, Keepalived cannot resolve the `check_mysql` reference in `track_script` and will refuse to start, making the standby non-functional.

### 2. `auth_pass` exceeds VRRP 8-character limit
- **What was wrong:** The `auth_pass` value was "mysqlha123" (10 characters). VRRP authentication data is limited to 8 octets per RFC 3768. Keepalived silently truncates passwords longer than 8 characters.
- **What was changed:** Changed `auth_pass` from "mysqlha123" to "mysqlHA1" (8 characters) on both nodes.
- **Why:** While the original would technically work (both sides truncate identically), it is misleading — users would believe the full 10-character string is the password when only the first 8 characters are actually used. Using an 8-character password avoids this confusion.

## Review Notes
- The `GRANT PROCESS` privilege given to the `keepalived` MySQL user is more than needed for `mysqladmin ping`, which only requires the ability to connect (the default `USAGE` privilege). This is not harmful but violates the principle of least privilege.
- `FLUSH PRIVILEGES` is unnecessary after `CREATE USER` and `GRANT` in MySQL 5.7.6+ and 8.0+, since these statements update the grant tables directly. Including it is harmless but redundant.
- The `interface eth0` value is system-dependent — modern Ubuntu/Debian systems often use predictable interface names like `ens33` or `enp0s3`. The post could note this, but it's acceptable as a common example.
- VRRP authentication (`auth_type PASS`) is deprecated in RFC 5798 (VRRPv3) and provides minimal security. For production environments, network-level isolation (e.g., firewall rules) is the recommended approach.
