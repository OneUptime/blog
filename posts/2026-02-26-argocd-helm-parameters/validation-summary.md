# Validation Summary: How to Pass Helm Parameters as ArgoCD Application Parameters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Applications and ApplicationSets
- Helm chart values and parameters
- Kubernetes manifests
- GitHub Actions
- GitLab CI
- Jenkins Declarative Pipeline

## Sources Consulted
- Argo CD Helm user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_set/
- Argo CD `argocd app unset` command reference: https://argo-cd.readthedocs.io/en/release-2.10/user-guide/commands/argocd_app_unset/
- Helm "Using Helm" guide: https://helm.sh/docs/v3/intro/using_helm/
- Helm `helm upgrade` command reference: https://v3.helm.sh/docs/helm/helm_upgrade/
- GitHub Actions workflow commands documentation: https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions
- Jenkins Pipeline syntax documentation: https://www.jenkins.io/doc/book/pipeline/syntax/
- Jenkins "Using a Jenkinsfile" documentation: https://www.jenkins.io/doc/book/pipeline/jenkinsfile/

## Issues Found
- The post described JSON parameters and referenced `set-json`, but Argo CD Application Helm parameters expose `--set`/`--set-string` style behavior and the current `argocd app set` reference does not document a `--helm-set-json` flag. Changed the section to recommend `valuesObject` for complex arrays and objects.
- The post said each parameter is equivalent to `helm install --set key=value`. Argo CD uses Helm to inflate manifests with `helm template`, not to install releases directly. Updated the wording accordingly.
- The GitHub Actions example used `${{ env.IMAGE_TAG }}` for a value written through `$GITHUB_ENV`. GitHub documents `$GITHUB_ENV` values as runner environment variables available to subsequent steps, so the example now uses `$IMAGE_TAG` inside the `run` script.
- The Jenkins Declarative Pipeline example was missing the required `agent` directive. Added `agent any`.
- The Jenkins shell step used Groovy interpolation for CI variables and credentials. Updated it to use shell environment expansion inside a single-quoted `sh` block, matching Jenkins Pipeline guidance and avoiding credential interpolation in Groovy strings.

## Review Notes
- The remaining Argo CD CLI examples, `forceString` usage, Application/ApplicationSet field names, Helm value precedence, and array-index parameter examples match the official documentation reviewed.
