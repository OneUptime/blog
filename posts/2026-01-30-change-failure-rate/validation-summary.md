# Validation Summary: How to Build Change Failure Rate

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- DORA metrics / Change Failure Rate
- TypeScript
- GitHub Actions
- Kubernetes JavaScript client
- SQL schema design
- Express.js
- Mermaid diagrams

## Sources Consulted
- DORA metrics guide: https://dora.dev/guides/dora-metrics/
- DORA metrics history: https://dora.dev/insights/dora-metrics-history/
- GitHub Actions contexts reference: https://docs.github.com/en/actions/reference/workflows-and-actions/contexts
- GitHub Actions expressions reference: https://docs.github.com/en/actions/reference/workflows-and-actions/expressions
- Kubernetes client libraries documentation: https://kubernetes.io/docs/reference/using-api/client-libraries/
- Kubernetes JavaScript client documentation: https://kubernetes-client.github.io/javascript/
- Express 5 API reference: https://expressjs.com/en/api/
- TypeScript 3.7 optional chaining release notes: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html

## Issues Found
- The post described CFR as one of four DORA metrics. Current DORA documentation describes five software delivery performance metrics, with deployment rework rate added in 2024. Changed the wording to "one of the DORA metrics" to stay current without restructuring the article.
- The post labeled its CFR range table as "DORA benchmarks" with fixed elite/high/medium/low bands. Current DORA documentation no longer presents those exact bands as the current benchmark model. Changed the label to "Common CFR target bands" and removed DORA-specific performance-tier wording.
- The `cfr_daily` SQL table allowed `service` to be nullable while using it in a composite primary key, which makes all-service aggregate rows ambiguous and is inconsistent with primary key behavior. Changed the column to `service VARCHAR(255) NOT NULL DEFAULT 'all'`.

## Review Notes
The remaining TypeScript, GitHub Actions, Kubernetes client, SQL, and Express examples are illustrative snippets and are technically plausible when integrated with the omitted helper functions and production persistence layer. The Kubernetes watcher remains a simplified example; a production controller should handle duplicate watch events, resource versions, rollout completion, and reconnect behavior.
