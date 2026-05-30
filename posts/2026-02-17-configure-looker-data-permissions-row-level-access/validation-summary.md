# Validation Summary: How to Configure Looker Data Permissions with Row-Level Access Filters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Looker
- LookML
- Looker user attributes
- Looker access filters
- Looker Liquid templating
- BigQuery

## Sources Consulted
- Looker `access_filter` parameter documentation: https://docs.cloud.google.com/looker/docs/reference/param-explore-access-filter
- Looker user attributes admin documentation: https://docs.cloud.google.com/looker/docs/admin-panel-users-user-attributes
- Looker `sql_always_where` parameter documentation: https://docs.cloud.google.com/looker/docs/reference/param-explore-sql-always-where
- Looker `always_filter` parameter documentation: https://docs.cloud.google.com/looker/docs/reference/param-explore-always-filter
- Looker Liquid variable reference: https://docs.cloud.google.com/looker/docs/liquid-variable-reference
- Looker admin users and sudo documentation: https://docs.cloud.google.com/looker/docs/admin-panel-users-users
- Looker SQL Runner documentation: https://docs.cloud.google.com/looker/docs/sql-runner-manage-db

## Issues Found
- The post configured region and department attributes as plain `String` values while also recommending comma-separated multi-value filters and wildcard admin access. Looker documents `String Filter (advanced)` for multiple string values and filter expressions, so the examples now use `String Filter (advanced)`.
- The post suggested leaving the default blank or using `ALL` for admins with `access_filter`. Looker requires a value for users of an Explore with `access_filter`, including admins, and documents `%, NULL` as the all-values string filter expression. The admin guidance now uses `%, NULL` for `access_filter` and reserves `ALL` for the Liquid `sql_always_where` example.
- The multi-value user attribute example included a space after the comma. The user attributes documentation recommends no whitespace between comma-separated values, so the example now uses `West,Central`.
- The multi-tenant example used `always_filter` to prevent users from seeing `client_id`. `always_filter` adds a visible, user-editable required filter and does not hide fields; the `hidden: yes` field setting is the relevant part. The misleading `always_filter` block was removed.
- The edge-case `sql_always_where` example placed an inline SQL comment after `1=0`. This can be fragile inside generated SQL, so the branch now emits only `1=0`; the explanatory text remains outside the code block.

## Review Notes
The corrected access filter examples align with current Looker documentation. The Liquid examples are useful for custom logic, but database-level row access controls such as BigQuery row-level security remain appropriate defense in depth when users have direct database or SQL Runner access.
