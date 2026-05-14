# Validation Summary: How to Use Flagger for Database Migration Canary with Flux

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Flux CD
- Flagger
- Kubernetes Deployments, Services, Jobs, and `kubectl`
- PostgreSQL PL/pgSQL triggers
- Flyway database migrations
- Prometheus metrics and PromQL
- GitOps progressive delivery

## Sources Consulted
- Flagger webhooks documentation: https://docs.flagger.app/main/usage/webhooks
- Flagger metrics documentation: https://docs.flagger.app/main/usage/metrics
- Flagger canary service and rollout behavior documentation: https://docs.flagger.app/usage/how-it-works
- Flagger loadtester package API: https://pkg.go.dev/github.com/fluxcd/flagger/pkg/loadtester
- Flagger loadtester source for `bash`, `cmd`, and `kubectl` task behavior: https://github.com/fluxcd/flagger/tree/main/pkg/loadtester
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes DNS documentation for Service names: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/#namespaces-and-dns
- Redgate Flyway target setting documentation: https://documentation.red-gate.com/flyway/reference/configuration/flyway-namespace/flyway-target-setting
- Redgate Flyway undo command documentation: https://documentation.red-gate.com/flyway/reference/commands/undo
- Redgate Flyway undo migration documentation: https://documentation.red-gate.com/flyway/flyway-concepts/migrations/undo-migrations

## Issues Found
- The expand migration trigger only handled `UPDATE`, so new rows inserted during the canary could leave one of the two email columns unsynchronized. Updated the trigger to run on `BEFORE INSERT OR UPDATE` and handle inserts explicitly.
- The SQL migration examples were fenced as `yaml`, which was inaccurate for SQL files. Changed those fences to `sql`.
- The migration Job example used a non-standard `flagger.app/pre-rollout` annotation, implying Flagger would run an annotated Job automatically. Removed the annotation and clarified that the Job is applied by the pre-rollout webhook.
- The standalone migration Job was named `my-app-migration`, while the webhook waited for `my-app-expand-migration`. Renamed the example Job to match the webhook.
- The webhook examples called generated Services on port `8080`, but the Flagger Service exposes port `80` with `targetPort: 8080`. Updated the in-cluster URLs to use the Service port.
- The post implied `post-rollout` runs only after successful promotion. Flagger runs post-rollout hooks after promotion or rollback, so the contract migration hook now checks the Canary `promoted` condition before running.
- The rollback example used Flagger `type: rollback` as though it were an after-failure callback. Flagger rollback hooks actively request rollback during analysis, so the example now uses a guarded `post-rollout` cleanup hook.
- The Flyway rollback example did not mention that `flyway undo` requires Flyway undo support and matching undo migrations. Added a caveat directly in the rollback Job example.
- The webhook examples used `kubectl` from the Flagger loadtester without stating the runtime requirements. Added a note that the loadtester image must include `kubectl`, have access to the manifests, and have the required RBAC.

## Review Notes
- YAML snippets were parsed locally with PyYAML after editing.
- The examples still assume application-specific Prometheus metric names and database health endpoints exist; those are reasonable placeholders but must be adapted to the reader's app.
- The guarded post-rollout migration pattern depends on the loadtester service account being allowed to read the Canary resource as well as create and wait for Jobs.
