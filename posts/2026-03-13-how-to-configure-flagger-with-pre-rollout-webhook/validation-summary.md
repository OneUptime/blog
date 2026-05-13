# Validation Summary: How to Configure Flagger with pre-rollout Webhook

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flagger Canary resources
- Flagger webhooks
- Flagger load tester
- Kubernetes Deployments and Services
- Kubernetes `kubectl run`
- YAML and JSON configuration

## Sources Consulted
- Flagger documentation, Webhooks: https://docs.flagger.app/main/usage/webhooks
- Flagger documentation, Deployment Strategies: https://docs.flagger.app/main/usage/deployment-strategies
- Flagger loadtester package documentation: https://pkg.go.dev/github.com/fluxcd/flagger/pkg/loadtester
- Flagger loadtester source, `server.go`: https://raw.githubusercontent.com/fluxcd/flagger/main/pkg/loadtester/server.go
- Flagger loadtester source, `bash.go`: https://raw.githubusercontent.com/fluxcd/flagger/main/pkg/loadtester/bash.go
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The post described webhook success and failure in several places as HTTP 200 versus non-200. Flagger's webhook documentation states that webhook success is determined by HTTP 2xx responses, so I updated the wording to "2xx" and "non-2xx" where appropriate. I left the load tester `bash` success description as HTTP 200 because the current load tester implementation writes `http.StatusOK` for successful blocking bash tasks.
- The external webhook payload example omitted the `checksum` field shown in Flagger's documented webhook payload. I added a representative checksum value to the JSON example.
- The database migration example used `kubectl run ... -- /app/check-migrations ...` without `--command`. Current `kubectl run` behavior treats extra arguments as container args by default unless `--command` is set, so I added `--command` to make the example execute the migration checker as the container command.
- The database migration example referenced `$CANARY_VERSION`, but the snippet did not define that environment variable. I replaced it with the concrete version used earlier in the example metadata.
- The prerequisites mentioned user `kubectl` access but not the service account permissions required when the load tester itself runs `kubectl`. I added an RBAC prerequisite matching Flagger's documentation note.

## Review Notes
- The Flagger load tester supports `type: bash`, `type: cmd`, `type: helmv3`, and `type: kubectl`. The post's `type: bash` examples are valid for blocking checks when the needed binaries are present in the load tester image.
- The sample service names such as `my-app-canary.default` and `flagger-loadtester.test` are plausible Kubernetes DNS short names in the namespaces shown, but real clusters should adjust namespaces and ports to match their Flagger installation.
