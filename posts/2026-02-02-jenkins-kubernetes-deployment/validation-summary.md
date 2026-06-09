# Validation Summary: How to Deploy to Kubernetes from Jenkins

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Jenkins (Declarative & Scripted Pipelines, JCasC, Jenkins CLI)
- Jenkins plugins: Kubernetes Plugin, Kubernetes CLI Plugin, Docker Pipeline, Pipeline: Stage View, Git, Credentials Binding, Slack Notification
- Kubernetes (Deployments, Services, ServiceAccounts, RBAC, Ingresses, Rolling Updates)
- kubectl (set image, rollout, apply, create token, create secret, patch, get)
- Helm 3 (upgrade --install, values files)
- Docker / Docker-in-Docker
- Prometheus (PromQL queries)
- Groovy (pipeline scripting)
- Bash / shell scripting

## Sources Consulted
- Jenkins Pipeline documentation: https://www.jenkins.io/doc/book/pipeline/
- Jenkins Kubernetes Plugin: https://plugins.jenkins.io/kubernetes/
- Jenkins Docker Pipeline Plugin: https://plugins.jenkins.io/docker-workflow/
- Jenkins Configuration as Code (JCasC): https://www.jenkins.io/projects/jcasc/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes Deployment / Rolling Update docs: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- kubectl reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- `kubectl create token` (introduced in k8s 1.24): https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- Helm CLI reference: https://helm.sh/docs/helm/helm_upgrade/
- Slack Notification Jenkins plugin: https://plugins.jenkins.io/slack/
- Networking API for Ingress (networking.k8s.io/v1): https://kubernetes.io/docs/concepts/services-networking/ingress/

## Issues Found
- **JCasC code block mislabeled as `groovy` with `//` comments.** The Jenkins Configuration as Code snippet under "Dynamic Jenkins Agents on Kubernetes" is YAML, not Groovy. Changed the code fence language from `groovy` to `yaml` and replaced `//` line comments with `#` (the correct YAML comment syntax). This affects only presentation/syntax-highlighting accuracy; the JCasC field names (`serverUrl`, `jenkinsUrl`, `jenkinsTunnel`, `containerCapStr`, `maxRequestsPerHostStr`, `retentionTimeout`, etc.) are all valid for the Kubernetes plugin's JCasC schema.

## Review Notes
- The post recommends Jenkins 2.400+. In recent Jenkins versions, the UI menu paths have been simplified: "Manage Jenkins > Manage Plugins" is now "Manage Jenkins > Plugins", and "Manage Credentials" is now "Credentials". The post's older labels still resolve correctly for most users so I have not rewritten them.
- The Jenkins CLI `install-plugin` command is still supported but is deprecated. The recommended modern alternative is the Jenkins Plugin Installation Manager Tool (`jenkins-plugin-manager.jar`). The shown command still works, so this is informational only.
- The canary validation Prometheus query URL in the `Validate Canary` stage embeds special characters (`{`, `}`, `'`, `~`) without URL-encoding. curl typically forwards the URL as-is and Prometheus parses it, but the more robust pattern used later in the "Monitoring Deployments" stage (with `--data-urlencode`) is preferred for production use.
- The `slackSend` `message` parameter uses Groovy triple-quoted strings with leading indentation. Slack will preserve the leading whitespace in the rendered message; this is cosmetic and not a technical error.
- In Declarative Pipeline, calling a top-level Groovy helper function (e.g. `deployToEnvironment(...)`) directly from `steps {}` is supported because the helper wraps pipeline steps such as `withCredentials` and `sh`; some teams prefer wrapping the call in a `script {}` block for clarity, but the shown form works.
- The `kubectl rollout history` parsing using `tail -2 | head -1 | awk '{print $1}'` correctly captures the previous revision number given the standard header layout of the command's output.
- Image tags such as `docker:24-dind`, `bitnami/kubectl:latest`, `alpine/helm:latest`, `node:20-alpine`, and `jenkins/inbound-agent:latest` are valid and exist on Docker Hub at the time of review.
