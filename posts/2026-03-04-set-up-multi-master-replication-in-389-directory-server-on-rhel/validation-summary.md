# Validation Summary: How to Set Up Multi-Master Replication in 389 Directory Server on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL
- Red Hat Directory Server / 389 Directory Server
- LDAP
- Multi-supplier replication
- `dsconf`, `dsidm`, and `ldapsearch`

## Sources Consulted
- Red Hat Directory Server 13, Configuring and managing replication: https://docs.redhat.com/en/documentation/red_hat_directory_server/13/html-single/configuring_and_managing_replication/index
- Red Hat Directory Server 12, Configuring and managing replication: https://docs.redhat.com/en/documentation/red_hat_directory_server/12/html-single/configuring_and_managing_replication/index
- Red Hat Directory Server 12, Monitoring server and database activity: https://docs.redhat.com/en/documentation/red_hat_directory_server/12/pdf/monitoring_server_and_database_activity/red_hat_directory_server-12-monitoring_server_and_database_activity-en-us.pdf
- 389 Directory Server, How to Monitor Replication: https://www.port389.org/docs/389ds/howto/howto-monitor-replication.html
- 389 Directory Server, Howto: Users and Groups: https://www.port389.org/docs/389ds/howto/howto-users-and-groups.html
- 389 Directory Server, Managing Replication Conflict Entries: https://www.port389.org/docs/389ds/design/managing-repl-conflict-entries.html

## Issues Found
- The replication monitoring snippet attempted to find lag with `dsconf repl-agmt status ... | grep -i lag`, but official `repl-agmt status` examples report synchronization state, update status, and CSN details rather than a literal lag field. Changed the example to use `dsconf ldap1 replication monitor`, which is the documented command for topology replication monitoring.
- The changelog command used `dsconf ldap1 replication get-changelog` without specifying the replicated suffix. Red Hat documentation shows `replication get-changelog --suffix "dc=example,dc=com"`, so the suffix option was added.
- The conflict search used only `(nsds5ReplConflict=*)`. Documented conflict searches include `objectClass=ldapSubEntry` and request the conflict attribute explicitly, so the filter and requested attributes were updated.

## Review Notes
The replication enable, agreement creation, initialization, status, and `dsidm user create` examples match the current documented command patterns. The post assumes LDAPS is already configured correctly on port 636; certificate trust and firewall setup are prerequisites that could be expanded in a future revision.
