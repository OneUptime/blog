# Validation Summary: How to Use DROP ROLE Statement in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL 8.0+ (Roles feature introduced in 8.0)
- MySQL Role-Based Access Control (RBAC)
- MySQL system tables: mysql.user, mysql.role_edges, mysql.default_roles

## Sources Consulted
- MySQL 8.0 Reference Manual: DROP ROLE Statement (https://dev.mysql.com/doc/refman/8.0/en/drop-role.html)
- MySQL 8.0 Reference Manual: Using Roles (https://dev.mysql.com/doc/refman/8.0/en/roles.html)
- MySQL 8.0 Reference Manual: GRANT Statement (https://dev.mysql.com/doc/refman/8.0/en/grant.html)
- MySQL 8.0 Reference Manual: Privilege Changes (https://dev.mysql.com/doc/refman/8.0/en/privilege-changes.html)

## Issues Found

### Issue 1: Incorrect claim that DROP ROLE does not automatically revoke from users
- **What was wrong:** The post stated "Dropping a role does not automatically revoke it from users who currently hold it - you must revoke it first or the users simply lose the privileges the role provided." This is factually incorrect.
- **What was changed:** Corrected to state that a dropped role is automatically revoked from any user account or role to which it was granted, per the official MySQL documentation.
- **Why:** The MySQL docs explicitly state: "A dropped role is automatically revoked from any user account (or role) to which the role was granted."

### Issue 2: Misleading explanation of role revocation before dropping
- **What was wrong:** The "Revoking a Role Before Dropping" section framed pre-revocation as necessary because DROP ROLE wouldn't handle it, stating "While dropping a role that is still assigned to users is allowed, best practice is to revoke it first."
- **What was changed:** Reworded to clarify that DROP ROLE does automatically revoke, but explicit revocation beforehand is a best practice for auditing who is affected.
- **Why:** The advice to audit before dropping is still sound, but the rationale needed correction.

### Issue 3: Incorrect description of privilege loss timing
- **What was wrong:** The post stated "users who had that role lose its privileges immediately on their next privilege check or session reconnect," implying a delay or reconnect requirement.
- **What was changed:** Corrected to state that MySQL automatically revokes the role and adjusted privileges take effect beginning with the next statement executed in active sessions.
- **Why:** Per MySQL docs, privilege changes from DROP ROLE apply starting with the next statement executed, not on reconnect.

### Issue 4: "Effect on Active Sessions" section inaccuracy
- **What was wrong:** Stated users "immediately lose the privileges" which was slightly imprecise.
- **What was changed:** Changed to "the adjusted privileges apply beginning with the next statement executed."
- **Why:** Aligns with the precise behavior documented by MySQL.

### Issue 5: Summary section repeated incorrect claim
- **What was wrong:** The summary did not mention that DROP ROLE automatically revokes roles.
- **What was changed:** Added "and automatically revokes the role from all granted accounts" and changed "revoke it before dropping" to "audit which users hold the role before dropping."
- **Why:** Consistency with the corrected content throughout the post.

## Review Notes
- All SQL syntax (DROP ROLE, SHOW GRANTS, REVOKE, GRANT, ALTER USER, SELECT from system tables) is correct.
- The mysql.role_edges and mysql.default_roles table queries use correct column names.
- The GRANT DROP ROLE ON *.* syntax is valid for MySQL 8.0+.
- The Role Cleanup Example workflow is a good practice pattern even though manual revocation is not strictly required.
- Roles are a MySQL 8.0+ feature; the post does not explicitly mention version requirements, but this is a minor omission.
