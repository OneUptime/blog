# Validation Summary: How to Integrate Elasticsearch with LDAP/AD

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Elasticsearch security realms
- LDAP
- Active Directory
- LDAPS / TLS
- Elasticsearch role mapping APIs and files
- Elasticsearch keystore
- curl, ldapsearch, netcat, and OpenSSL troubleshooting commands

## Sources Consulted
- Elastic Docs: LDAP user authentication: https://www.elastic.co/docs/deploy-manage/users-roles/cluster-or-deployment-auth/ldap
- Elastic Docs: Active Directory user authentication: https://www.elastic.co/docs/deploy-manage/users-roles/cluster-or-deployment-auth/active-directory
- Elastic Docs: Security settings in Elasticsearch: https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/security-settings
- Elastic Docs: Map external users and groups to roles: https://www.elastic.co/docs/deploy-manage/users-roles/cluster-or-deployment-auth/mapping-users-groups-to-roles
- Elasticsearch API Docs: Create or update role mappings: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-put-role-mapping

## Issues Found
- The Active Directory examples configured `bind_dn` but did not mention the required `secure_bind_password` keystore setting. Added the matching `elasticsearch-keystore add` command for the `active_directory.ad1` realm.
- The StartTLS example was misleading. Elasticsearch realm SSL settings apply to LDAP over TLS (`ldaps://`) rather than enabling StartTLS on a plain `ldap://` URL. Renamed the example and changed the URL to `ldaps://ldap.example.com:636`.
- The truststore example used `ssl.truststore.password` in `elasticsearch.yml`, which is deprecated. Removed the inline password and added the secure keystore setting `ssl.truststore.secure_password`.
- The user attribute example used deprecated `user_search.attribute`. Replaced it with the supported `user_search.filter` form using `sAMAccountName`.
- The Active Directory nested group example used `group_search.filter`, which is not an Active Directory realm setting. Replaced it with a valid AD realm example and noted that AD realms retrieve security group membership from `tokenGroups`.
- The multiple URL load-balancing comment listed `dns_failover` alongside explicit multiple URLs. Removed that suggestion from the snippet because DNS load-balancing modes are for DNS-based resolution.
- The connection pooling snippets used a non-existent `connection_pool` block. Updated them to the supported `user_search.pool.size` and `user_search.pool.initial_size` settings.
- The timeout snippets used deprecated `timeout.tcp_read`. Replaced it with `timeout.response`.

## Review Notes
The post is now aligned with current Elastic documentation for self-managed Elasticsearch. LDAP and Active Directory realm configuration is not available on Elastic Cloud Hosted deployments, which could be mentioned in a future version if the post expands its deployment-scope guidance.
