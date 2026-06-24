# Validation Summary: How to Implement Field-Level Security in Elasticsearch

## Status
validated

## Post Type
Guide

## Technologies Covered
- Elasticsearch 8.x / 9.x (X-Pack Security: field-level security, document-level security, role/user APIs)

## Sources Consulted
- Elastic Docs — Controlling access at the document and field level — https://www.elastic.co/docs/deploy-manage/users-roles/cluster-or-deployment-auth/controlling-access-at-document-field-level (verified field_security grant/except, that except must be a subset of grant and is used with grant ["*"], DLS query format, template.source Mustache templating, and that {{_user.username}} and {{_user.metadata.<x>}} are valid template variables)
- Elastic Docs — Security settings in Elasticsearch — https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/security-settings (confirmed xpack.security.enabled default true; confirmed the role-index cache settings used in the post do NOT exist; confirmed the real DLS cache settings xpack.security.dls.bitset.cache.size / .ttl)

## Issues Found
- INVALID CONFIG KEYS (fixed): The "Caching Considerations" section used `xpack.security.authz.store.roles.index.cache.max_size: 10000` and `xpack.security.authz.store.roles.index.cache.ttl: 20m`. These settings are not real Elasticsearch settings — they were deprecated/removed back in 5.2 and specifying them on Elasticsearch 8.0+ causes a startup error. They also do not appear in the current official security-settings reference. Replaced them with the correct, documented document-level-security BitSet cache settings `xpack.security.dls.bitset.cache.size` and `xpack.security.dls.bitset.cache.ttl` (which is what actually caches DLS query bitsets), with accurate defaults (50mb size, 2h ttl) noted in a comment.

## Review Notes
- `xpack.security.enabled: true` in the prerequisites is correct (it is a real static setting that defaults to true).
- field_security: confirmed `grant` lists allowed fields and `except` denies a subset; using `grant: ["*"]` with `except: [...]` is the documented pattern. All FLS examples (basic grant, except, wildcard patterns like `pii.*`/`*.encrypted`, nested fields like `customer.name`) match the documented behavior.
- DLS `query` accepts standard Query DSL (term, bool with must/must_not, range) — verified format matches search request queries.
- DLS `template` with `source` and Mustache variables `{{_user.username}}` and `{{_user.metadata.department}}` / `{{_user.metadata.tenant_id}}` are valid per the docs.
- `_security/user/_has_privileges` request body uses an `index` array of objects with `names` and `privileges` — matches the documented shape.
- `GET _security/_authenticate` and `GET _security/user/<name>` are valid endpoints used correctly for troubleshooting.
- Aggregation on `team.keyword` and term queries are standard and correct; the post correctly recommends keyword-type fields for DLS query fields.
- curl examples use `_security/role/<name>` and `_security/user/<name>` PUT endpoints, which are valid (the newer canonical path is `_security/role`; the post's usage is correct).
