# Validation Summary: How to Execute Resource Actions from the ArgoCD CLI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD CLI
- Argo CD resource actions
- Kubernetes workloads and custom resources
- Argo Rollouts
- Bash scripting with jq
- GitHub Actions
- GitLab CI
- Argo CD REST API

## Sources Consulted
- Argo CD `argocd app actions run` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_actions_run/
- Argo CD `argocd app actions list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_actions_list/
- Argo CD resource actions documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/resource_actions/
- Argo CD API documentation / Swagger specification: https://github.com/argoproj/argo-cd/blob/master/assets/swagger.json
- Argo CD CLI source for `app actions`: https://github.com/argoproj/argo-cd/blob/master/cmd/argocd/commands/app_actions.go
- Current Argo CD CLI help output from `argocd` v3.4.2.

## Issues Found
- The example output for `argocd app actions list` only showed `NAME` and `DISABLED`, but the current CLI prints `GROUP`, `KIND`, `NAME`, `ACTION`, and `DISABLED`. Updated the sample output.
- The post used `scale-up`, `scale-down`, `scale-to-5`, and `scale-to-2` as if they were built-in Deployment CLI actions. Current Argo CD has a parameterized `scale` action for Deployments, and the CLI currently has no action-parameter flag. Replaced those examples with built-in `pause` and `resume` actions that the CLI can run.
- The scripting examples used `argocd app resources -o json`, but current `argocd app resources` only supports tree outputs. Replaced those calls with `argocd app get -o json` and filtered `.status.resources`.
- The direct REST API action execution example used the deprecated `/resource/actions` POST shape incorrectly by putting the action in the query string and sending no request body. Updated it to use `/resource/actions/v2` with a JSON body.
- The error-handling script parsed `.name` and `.disabled` from `argocd app actions list -o json`, but the current CLI JSON output uses exported field names `Action` and `Disabled`. Updated the jq filters.

## Review Notes
The Argo CD CLI command examples were checked against current official command help and documentation. The post now avoids CLI examples that require action parameters, because the current CLI source still has a TODO for parameter support in `app actions run`.
