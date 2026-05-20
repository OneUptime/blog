# Validation Summary: How to Use argocd app logs to Stream Pod Logs

## Status
validated

## Post Type
Tutorial / CLI guide

## Technologies Covered
- Argo CD CLI
- Kubernetes pod logs
- Argo CD RBAC
- Bash scripting
- jq

## Sources Consulted
- Argo CD `argocd app logs` command reference: https://argo-cd.readthedocs.io/en/release-3.2/user-guide/commands/argocd_app_logs/
- Argo CD RBAC configuration documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD proxy extensions documentation: https://argo-cd.readthedocs.io/en/stable/developer-guide/extensions/proxy-extensions/

## Issues Found
- The post used `--resource-name`, but the official `argocd app logs` flag is `--name`. Updated all resource filtering examples and scripts to use `--name`.
- The post used `--since-time`, which is not an official `argocd app logs` flag. Updated the time-filter example to use `--until-time` for an absolute timestamp and kept `--since-seconds` for relative start time filtering.
- The post said log streaming must be enabled with `server.enable.proxy.extension`. That setting is for Argo CD proxy extensions, not `argocd app logs`. Replaced the configuration snippet with a note that log access is controlled by Argo CD RBAC.
- The post stated that logs only come from currently running pods and that there is no direct equivalent of `kubectl logs --previous`. Updated the limitations to describe Kubernetes log availability more accurately and to note that current Argo CD versions support `--previous`.

## Review Notes
The post is technically relevant and the remaining command examples align with current Argo CD documentation. The examples assume the user is already authenticated to Argo CD and has sufficient RBAC permissions for the application.
