# Validation Summary: Link Unplanned Fix Deployments to Production Incidents and Original Changes

## Status
validated

## Post Type
Technical guide with a conceptual relationship model, Mermaid diagram, and executable SQL reporting query.

## Technologies Covered
- DORA deployment rework rate and production incident attribution
- GitHub Deployments REST API, deployment statuses, and deployment history
- OneUptime incident identifiers, private notes, and custom fields
- SQL joins, nullable relationships, and revision-based reporting views
- Mermaid flowcharts

## Sources Consulted
- DORA metric definitions: https://dora.dev/guides/dora-metrics/
- GitHub Deployments REST API: https://docs.github.com/en/rest/deployments/deployments
- GitHub deployment status API and retention: https://docs.github.com/en/rest/deployments/statuses#data-retention
- GitHub deployment history: https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/view-deployment-history
- OneUptime incident overview: https://oneuptime.com/docs/en/incidents/index
- OneUptime incident custom fields: https://oneuptime.com/docs/en/incidents/settings#custom-fields
- SQLite SELECT and join semantics: https://www.sqlite.org/lang_select.html
- Mermaid flowchart syntax: https://mermaid.js.org/syntax/flowchart.html

## Issues Found
No technical issues found.

## Review Notes
- Reviewed on 2026-11-20. README.md required no changes.
- DORA defines deployment rework rate using unplanned deployments resulting from production incidents. The post correctly separates that classification from determining the original contributing deployment or change.
- GitHub documents deployments as requests to deploy a ref. The documented deployment response includes `id`, `sha`, `environment`, and `statuses_url`; actual rollout evidence must come from status reporting and deployment tooling.
- GitHub deployment history supports the listed commit, environment, workflow-log, and source pull-request information. The post appropriately qualifies availability; deployments originating from external forks may lack source pull-request and branch links.
- Confirmed GitHub's documented 90-day retention of previous deployment statuses and the exception preserving the current status.
- OneUptime documents the copyable incident ID in the Incident Details card, internal private notes, and project-scoped custom fields suitable for storing references. The post accurately presents the relationship graph as integration-owned data.
- The schema block is explicitly conceptual, not executable DDL or a product API contract. Implementers must create the tables, constraints, revision storage, and current-link views described in the prose before running the query.
- Executed the exact SQL query extracted from README.md against an in-memory SQLite 3.54.1 database with representative tables and latest-revision views. Assertions passed for pending attribution returning null original fields, confirmed attribution returning D912/I42/D911/C310, multiple confirmed contributors producing multiple rows, a confirmed deployment with an unknown change, inclusion of failed repair outcomes, and later attribution or remediation rejections superseding earlier confirmations.
- The confirmed-attribution predicate is correctly placed in the LEFT JOIN condition, preserving repairs without confirmed attribution. The distinct-deployment counting guidance correctly addresses relationship-row multiplication.
- Checked Mermaid direction, quoted node labels, node reuse, and labeled arrows against official syntax documentation. No diagram rendering test was performed.
- All six technical documentation links resolve to relevant official resources. The author profile link is attribution rather than a technical source. There are no terminal commands, configuration files, or version-pinned API calls in the post.
