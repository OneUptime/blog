# Validation Summary: How to Use Ansible to Manage MySQL Permissions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.mysql collection
- MySQL user privileges
- MySQL GRANT, REVOKE, SHOW GRANTS, and FLUSH PRIVILEGES
- YAML playbooks and inventory variables

## Sources Consulted
- Ansible documentation: ansible.mysql.mysql_user module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/mysql/mysql_user_module.html
- Ansible documentation: ansible.mysql.mysql_query module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/mysql/mysql_query_module.html
- Ansible documentation: community.mysql.mysql_user module deprecation/rename notice - https://docs.ansible.com/projects/ansible/latest/collections/community/mysql/mysql_user_module.html
- MySQL 8.4 Reference Manual: Privileges Provided by MySQL - https://dev.mysql.com/doc/refman/8.4/en/privileges-provided.html
- MySQL 8.4 Reference Manual: When Privilege Changes Take Effect - https://dev.mysql.com/doc/refman/8.4/en/privilege-changes.html

## Issues Found
- The examples used the `community.mysql` collection FQCN. The official Ansible documentation now says this collection has been renamed to `ansible.mysql` and advises using the new FQCN for new playbooks. Updated module references from `community.mysql.mysql_user` and `community.mysql.mysql_query` to `ansible.mysql.mysql_user` and `ansible.mysql.mysql_query`.
- The privilege hierarchy diagram listed `SUPER` as a representative global privilege. MySQL documents `SUPER` as deprecated and recommends more limited dynamic privileges where possible. Replaced it with `CONNECTION_ADMIN` in the example global privilege list.
- The revocation section said to use `state: absent` on a privilege. The `mysql_user` module uses `state: absent` to remove a user, while specific privilege revocation is handled with `subtract_privs: true`. Updated the explanation while keeping the existing `USAGE` example for revoking all meaningful privileges.
- The flushing section implied direct SQL privilege changes generally require flushing and that the module flushes privileges automatically. MySQL account-management statements such as `GRANT` and `REVOKE` take effect without manually flushing grant tables; `FLUSH PRIVILEGES` is needed after direct grant-table modifications. Updated the wording accordingly.

## Review Notes
The `priv` string format, `append_privs` behavior, `USAGE` usage, `mysql_query` examples, socket login parameter, and listed common privileges were consistent with the official documentation reviewed.
