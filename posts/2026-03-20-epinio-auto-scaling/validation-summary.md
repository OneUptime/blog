# Validation Summary: How to Configure Application Auto-Scaling in Epinio

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Epinio
- Epinio CLI
- Kubernetes
- Paketo Buildpacks
- Node.js

## Sources Consulted
- Epinio namespaces tutorial: https://docs.epinio.io/tutorials/namespace-tutorial
- Epinio single developer workflow: https://docs.epinio.io/tutorials/single-dev-workflow
- Epinio supported applications reference: https://docs.epinio.io/references/supported_applications
- Epinio CLI reference for `epinio push`: https://docs.epinio.io/references/commands/cli/epinio_push
- Epinio CLI reference for `epinio app logs`: https://docs.epinio.io/references/commands/cli/app/epinio_app_logs
- Epinio source for app detail output: https://github.com/epinio/epinio/blob/main/internal/cli/usercmd/app.go
- Epinio source for app environment command syntax: https://github.com/epinio/epinio/blob/main/internal/cli/cmd/appenv.go
- Epinio standard application chart values: https://github.com/epinio/helm-charts/blob/main/chart/application/values.yaml
- Epinio standard application chart deployment template: https://github.com/epinio/helm-charts/blob/main/chart/application/templates/deployment.yaml
- Paketo Node.js buildpack documentation: https://paketo.io/docs/howto/nodejs/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The post claimed to cover application auto-scaling and HPA, but the commands and workflow only covered manual instance scaling. Official Epinio documentation and the standard application chart document `replicaCount`-based scaling for applications, not built-in application HPA configuration. I corrected the title, tags, description, introduction, and conclusion to match the documented behavior.
- The original `app.sh` and `nc` example was not a reliable Epinio buildpack example. I replaced it with a Node.js example using `package.json` and `server.js`, which is compatible with the Paketo Node.js buildpack behavior documented by Paketo and used by Epinio.
- The route lookup commands were inaccurate. `epinio app show` does not provide a simple `Routes` line that makes `grep Routes | awk '{print $2}'` reliable, and the detailed app output exposes route values separately. I replaced those commands with URL extraction based on the actual output format and removed the platform-specific `open` command.
- I changed the live log example from `epinio app logs my-app --follow` to `epinio app logs --follow my-app` to match the documented command form.

## Review Notes
The standard Epinio application chart deploys applications with a Kubernetes `Deployment` and a configurable `replicaCount`. Application HPA would require additional chart-level customization that this post does not cover. The existing note about rolling updates is consistent with the standard chart using a `Deployment`, whose default update strategy in Kubernetes is `RollingUpdate`.
