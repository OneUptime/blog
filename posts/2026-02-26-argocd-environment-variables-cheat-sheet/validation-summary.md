# Validation Summary: ArgoCD Environment Variables Cheat Sheet

## Status
validated

## Post Type
Reference

## Technologies Covered
- Argo CD
- Kubernetes
- Helm
- Redis
- GitOps

## Sources Consulted
- Argo CD CLI environment variables: https://argo-cd.readthedocs.io/en/latest/user-guide/environment-variables/
- Argo CD high availability and performance tuning documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/high_availability/
- Argo CD argocd-server command reference: https://argo-cd.readthedocs.io/en/latest/operator-manual/server-commands/argocd-server/
- Argo CD argocd-application-controller command reference: https://argo-cd.readthedocs.io/en/latest/operator-manual/server-commands/argocd-application-controller/
- Argo CD argocd-repo-server command reference: https://argo-cd.readthedocs.io/en/latest/operator-manual/server-commands/argocd-repo-server/
- Argo CD upstream source code and manifests: https://github.com/argoproj/argo-cd
- Argo CD Helm chart values and templates: https://github.com/argoproj/argo-helm/tree/main/charts/argo-cd

## Issues Found
- The Kubernetes Deployment example was not valid as a standalone `apps/v1` Deployment because it lacked a selector, matching pod template labels, and a container image. Added those fields.
- Several API server environment variable names were incorrect or unsupported. Corrected `ARGOCD_SERVER_STATICASSETS` to `ARGOCD_SERVER_STATIC_ASSETS`, replaced component-specific Redis and metrics-port examples with supported variables, changed the server log variable to `ARGOCD_SERVER_LOG_LEVEL`, and removed unsupported RBAC/OIDC examples.
- Several application controller variables used the wrong prefix. Updated status processors, operation processors, self-heal timeout, repo-server address, log level, and log format to the supported `ARGOCD_APPLICATION_CONTROLLER_*` names.
- The hard resync variable was incorrect. Changed `ARGOCD_HARD_RESYNC_TIMEOUT` to `ARGOCD_HARD_RECONCILIATION_TIMEOUT`.
- The controller diff cache example was not a supported variable. Replaced it with `ARGOCD_APPLICATION_CONTROLLER_SERVER_SIDE_DIFF`.
- Several repo-server variables were incorrect or unsupported. Replaced unsupported port, Redis, Helm cache, Helm version, Kustomize build options, and TLS examples with supported repo-server, Git, Helm, and TLS variables.
- Redis variable names were incorrect. Changed `REDIS_DB` to `REDISDB`, `REDIS_MAX_RETRIES` to `REDIS_RETRY_COUNT`, and replaced unsupported `REDIS_TLS_ENABLED` with `REDIS_COMPRESSION`.
- Notification controller variables had incorrect names. Replaced unsupported namespace, self-service, metrics-port, and processing-worker examples with supported notification controller variables.
- The debug logging example used the wrong controller log environment variable. Changed it to `ARGOCD_APPLICATION_CONTROLLER_LOGLEVEL`.
- The secret reference example used an unsupported OIDC client secret environment variable. Replaced it with supported Redis credential variables.

## Review Notes
Argo CD commonly maps `argocd-cmd-params-cm` keys into environment variables in its official manifests and Helm chart. Some runtime settings are still better managed through the command parameters ConfigMap or command-line flags rather than raw custom `env` entries, especially for port and TLS-related settings.
