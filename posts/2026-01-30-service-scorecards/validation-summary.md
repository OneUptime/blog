# Validation Summary: How to Implement Service Scorecards

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- PostgreSQL (UUID, JSONB, gen_random_uuid)
- TypeScript
- Node.js / Express
- React / TSX
- YAML (configuration schema)
- GitHub Actions workflows
- Slack Web API / Block Kit (@slack/web-api)
- Mermaid diagrams (flowchart, pie)
- SRE concepts: SLOs, error budgets, golden signals

## Sources Consulted
- PostgreSQL CREATE TABLE / CREATE INDEX docs: https://www.postgresql.org/docs/current/sql-createtable.html, https://www.postgresql.org/docs/current/sql-createindex.html
- Google SRE book "Monitoring Distributed Systems" (Four Golden Signals): https://sre.google/sre-book/monitoring-distributed-systems/
- GitHub Actions configuration variables (`vars.*`) documentation: https://docs.github.com/en/actions/learn-github-actions/variables
- Express routing docs: https://expressjs.com/en/guide/routing.html
- Slack Block Kit reference: https://api.slack.com/reference/block-kit/blocks
- Mermaid flowchart and pie chart syntax: https://mermaid.js.org/syntax/flowchart.html, https://mermaid.js.org/syntax/pie.html

## Issues Found
- **Invalid PostgreSQL syntax in `CREATE TABLE scorecard_results`** — the schema mixes PostgreSQL-specific features (`UUID`, `JSONB`, `gen_random_uuid()`, `TIMESTAMP DEFAULT NOW()`) with an inline `INDEX idx_service_calculated (...)` clause. PostgreSQL does not support inline `INDEX` definitions inside `CREATE TABLE`; that is MySQL syntax. Running the original snippet against PostgreSQL would fail with a syntax error. Fixed by removing the inline `INDEX` clause and adding an explicit `CREATE INDEX idx_service_calculated ON scorecard_results (service_id, calculated_at DESC);` statement immediately after the table definition.

## Review Notes
- The "golden signals" check (`obs-002`) uses `('latency', 'error_rate', 'throughput', 'saturation')`. The Google SRE book canonically names them latency, traffic, errors, and saturation, but `throughput` and `error_rate` are widely accepted equivalents in industry usage, so no change was made.
- The TypeScript placeholder methods (`executeQuery`, `getManualCheckResult`, `getServiceName`) have non-`void` return types but empty bodies. They are explicitly commented as "implement based on your stack", so they are intentional pseudocode for a tutorial and were left as-is.
- In `slack-reporter.ts`, `engine` is referenced without being instantiated in scope; this is illustrative pseudocode consistent with the rest of the post and was left as-is.
- In `scorecard-api.ts`, the `category` query parameter is destructured but unused; minor stylistic note, not a correctness issue.
- All `mermaid` diagrams use valid syntax for their respective diagram types. The pie chart weights sum to 100, matching the `categoryWeights` map in the TypeScript engine.
- `vars.SERVICE_ID` in the GitHub Actions workflow is the correct syntax for GitHub Actions configuration variables.
