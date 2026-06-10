# Validation Summary: How to Build Team Directory

## Status
validated

## Post Type
Guide / Tutorial — architectural walkthrough for building a team directory service with concrete code samples in TypeScript, Python, SQL, and YAML.

## Technologies Covered
- TypeScript / Node.js (Express, `pg`)
- Python (Okta SDK `okta-sdk-python`, PyGithub, `pdpyras` for PagerDuty, `asyncpg`, `slack_bolt`)
- PostgreSQL (DDL, `gen_random_uuid()`, ENUM types, text arrays, `@>` containment operator)
- React / `react-organizational-chart`
- Mermaid (flowchart, sequenceDiagram, erDiagram)
- Slack Block Kit (sections, fields, actions, headers)
- YAML (escalation configuration)
- Okta API, GitHub API, PagerDuty REST API

## Sources Consulted
- okta-sdk-python README and pagination patterns: https://github.com/okta/okta-sdk-python
- PyGithub documentation for `Organization`, `Team`, `Repository.get_contents`: https://pygithub.readthedocs.io/
- pdpyras `APISession` documentation (`list_all`, `rget`): https://pagerduty.github.io/pdpyras/
- PagerDuty API — On-Calls and Escalation Policies: https://developer.pagerduty.com/api-reference/
- node-postgres `Pool` parameterized query docs: https://node-postgres.com/
- PostgreSQL docs for `gen_random_uuid()`, ENUM types, array `@>` operator
- `react-organizational-chart` package on npm: exports `Tree`, `TreeNode`
- Slack Bolt for Python: https://slack.dev/bolt-python/
- Slack Block Kit reference: https://api.slack.com/block-kit

## Issues Found

1. **Okta SDK async iteration (incorrect).** The `OktaSync.sync_users` and `sync_groups_as_teams` methods used `async for user in self.client.list_users(...)`. The Okta Python SDK's list methods do not return async iterators; they return a tuple `(items, response, error)` and pagination is performed via `resp.has_next()` and `await resp.next()`. Rewrote both methods (and the nested group-user fetch) to use the correct tuple-unpacking + `while resp.has_next()` pagination pattern documented in the official SDK README.

2. **React component missing hook imports.** The `OrgChart` component called `useState` and `useEffect` but only imported the default `React`. Changed the import to `import React, { useState, useEffect } from 'react';` so the hooks resolve.

## Review Notes
- `datetime.utcnow()` in `FreshnessMonitor.check_all_sources` is deprecated as of Python 3.12 in favor of `datetime.now(datetime.UTC)`. It still works today but will be removed in a future Python release; consider updating if running on 3.12+.
- The TypeScript `ContactResolver.getBestChannel` calls `prefs.doNotDisturb?.overrideForSeverity?.includes(urgency)`, where `urgency` is typed `'critical' | 'high' | 'medium' | 'low'` but `overrideForSeverity` is `('critical' | 'high')[]`. Strict TypeScript will flag `.includes('medium' | 'low')` as a type error; runtime behavior is fine, but a cast or widened type would silence the compiler.
- The `pdpyras` library is still functional but Okta — sorry, PagerDuty — recommends the newer `pagerduty` Python package for new projects. `pdpyras` examples remain accurate for existing deployments.
- The SQL `notification_channels TEXT[] DEFAULT '{slack, email}'` uses PostgreSQL's array literal short form; `ARRAY['slack', 'email']` is more conventional but both are accepted.
- The search endpoint passes the raw `q` value into `ARRAY[$2]` for the `skills @>` containment check — this requires an exact skill match (not partial), which is likely the intent but worth flagging for readers who might expect substring matching across the skills array.
