# Validation Summary: How to Create Rollback Automation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js / Express (health check endpoint)
- Kubernetes (Deployment, RollingUpdate strategy, readiness/liveness probes)
- GitHub Actions (CI/CD workflow)
- kubectl (rollout status, rollout undo, set image, exec)
- Docker (inspect, pull, run, stop, rm)
- Bash scripting
- PostgreSQL (up/down migrations)
- Slack GitHub Action (slackapi/slack-github-action)
- OneUptime (webhook integration, illustrative)

## Sources Consulted
- Kubernetes Deployments documentation — https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Probes documentation — https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- `kubectl rollout` reference — https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#rollout
- GitHub Actions `actions/checkout` — https://github.com/actions/checkout
- `azure/k8s-set-context` action — https://github.com/Azure/k8s-set-context
- `slackapi/slack-github-action` (v1) — https://github.com/slackapi/slack-github-action
- Docker CLI reference (`docker inspect`, `docker run`) — https://docs.docker.com/reference/cli/docker/
- Express.js routing/response API — https://expressjs.com/en/4x/api.html
- PostgreSQL CREATE TABLE / CREATE INDEX docs — https://www.postgresql.org/docs/current/

## Issues Found
No technical issues found.

## Review Notes
- The `kubernetes.io/change-cause` annotation is correctly used; it surfaces in `kubectl rollout history` output.
- `revisionHistoryLimit: 5` is valid (Kubernetes default is 10); lowering it is a reasonable trade-off described accurately in the comment.
- The shared `/health` endpoint pattern is used for both readiness and liveness probes. This works but is sometimes considered an anti-pattern: if a downstream dependency fails, the liveness probe failures will restart healthy containers without resolving the issue. A common refinement is to point liveness at a lightweight "process is alive" check and readiness at the dependency-aware health endpoint. The post's approach is still valid Kubernetes config and a common starting point.
- The GitHub Actions step uses `kubectl exec deploy/api-server -- curl ...` to validate the health endpoint. This depends on `curl` being available inside the application container image, which is not always the case (e.g., distroless or scratch base images). Readers using minimal images may need to install `curl` or use a sidecar/`kubectl port-forward` + host-side curl instead.
- `slackapi/slack-github-action@v1` is pinned correctly and the `channel-id` / `slack-message` / `SLACK_BOT_TOKEN` inputs match the v1 API. Note that v2 of the action uses a different input shape (`payload` / `webhook-type`); readers upgrading should consult the action's release notes.
- The "Testing Your Rollback Automation" script deploys an intentionally broken image and then checks that the image was reverted. The post relies on the Kubernetes Deployment's failed readiness probes plus the surrounding CI workflow to perform the actual rollback — Kubernetes itself does not auto-rollback a Deployment on probe failure (it only halts the rollout). This is consistent with the rest of the post, but worth noting that the script tests the system end-to-end rather than any auto-rollback behavior native to `kind: Deployment`.
- SQL migrations use `SERIAL PRIMARY KEY`; modern PostgreSQL (10+) recommends `GENERATED ALWAYS AS IDENTITY`, but `SERIAL` remains valid and widely used.
