# Validation Summary: Open Source vs Open Core: What's the Difference?

## Status
not-code-blog

## Post Type
Opinion piece / explainer — a conceptual discussion of open source vs. open core licensing models with no code, commands, or configuration snippets.

## Technologies Covered
- Open source licensing (MIT, Apache 2.0, AGPL, GPL)
- Source-available licensing (SSPL, Elastic License, BSL)
- Grafana
- GitLab
- Elasticsearch / Elastic
- Sentry
- General observability and DevOps tooling

## Sources Consulted
- Not applicable — the post was classified as "not-code-blog" so no formal technical verification was performed against external sources.

## Issues Found
No formal review was performed because the post contains no code, terminal commands, or configuration snippets that require validation. However, a couple of factual notes (not corrected, per the not-code-blog workflow) are recorded under Review Notes below.

## Review Notes
- The post is an opinion/educational piece, which is consistent with the "not-code-blog" classification per the review instructions.
- Factual claims that future revisions may want to revisit:
  - **Sentry**: The post describes the self-hosted version as "open source," but Sentry's self-hosted code moved from BSD to the Business Source License (BSL) in 2019 and to the Functional Source License (FSL) in 2023. By OSI standards, this is source-available rather than open source — which contradicts the post's own definitions later in the article.
  - **Elasticsearch**: The post mentions the 2021 license change from Apache 2.0 to SSPL/Elastic License but does not mention that Elastic added AGPLv3 as a third license option in August 2024. The historical claim is still accurate, but the current licensing picture is more nuanced.
  - **Grafana**: The AGPLv3 relicensing (from Apache 2.0) occurred in 2021 — the post's characterization is accurate.
- These are conceptual/factual notes rather than code-level corrections, so no edits were made to the post under the not-code-blog workflow.
