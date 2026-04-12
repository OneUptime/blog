# Validation Summary: How to Activate Roles in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- MySQL Role-Based Access Control (RBAC)
- MySQL Information Schema

## Sources Consulted
- MySQL 8.0 Reference Manual: SET ROLE Statement — https://dev.mysql.com/doc/refman/8.0/en/set-role.html
- MySQL 8.0 Reference Manual: Using Roles — https://dev.mysql.com/doc/refman/8.0/en/roles.html
- MySQL 8.0 Reference Manual: SET DEFAULT ROLE Statement — https://dev.mysql.com/doc/refman/8.0/en/set-default-role.html
- MySQL 8.0 Reference Manual: APPLICABLE_ROLES Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-applicable-roles-table.html
- MySQL 8.0 Reference Manual: Server System Variables (activate_all_roles_on_login) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html

## Issues Found
No technical issues found.

## Review Notes
- The `information_schema.APPLICABLE_ROLES` table was introduced in MySQL 8.0.19. The blog does not specify a minimum MySQL version beyond "8.0", which is acceptable but readers on earlier 8.0.x releases (before 8.0.19) would not have this table available.
- The query on `APPLICABLE_ROLES` selects three columns (ROLE_NAME, IS_DEFAULT, IS_MANDATORY) out of nine available. This is fine for the tutorial context — the blog does not claim these are the only columns.
- All `SET ROLE` variants (specific role, ALL, NONE, ALL EXCEPT) use correct syntax per official documentation.
- The `SET DEFAULT ROLE` and `activate_all_roles_on_login` examples are both correct.
- The privilege escalation pattern shown is a sound security practice.
