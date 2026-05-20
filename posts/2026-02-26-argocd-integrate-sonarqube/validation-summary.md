# Validation Summary: How to Integrate ArgoCD with SonarQube for Code Quality

## Status
validated

## Post Type
Tutorial / Integration guide

## Technologies Covered
- Argo CD
- Argo Workflows
- Kubernetes
- Helm
- SonarQube Server / Community Build
- SonarScanner CLI
- SonarQube Web API
- Kaniko

## Sources Consulted
- Argo CD resource hooks documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/resource_hooks/
- Argo CD external URL links documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/external-url/
- Argo CD annotations and labels documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/annotations-and-labels/
- Argo Workflows WorkflowTemplate documentation: https://argo-workflows.readthedocs.io/en/latest/workflow-templates/
- Argo Workflows DAG documentation: https://argo-workflows.readthedocs.io/en/latest/walk-through/dag/
- Argo Workflows volumes documentation: https://argo-workflows.readthedocs.io/en/latest/walk-through/volumes/
- SonarQube Helm chart repository and values: https://github.com/SonarSource/helm-chart-sonarqube/tree/master/charts/sonarqube
- SonarQube quality gates documentation: https://docs.sonarsource.com/sonarqube-server/quality-standards-administration/managing-quality-gates/introduction-to-quality-gates
- SonarQube token documentation: https://docs.sonarsource.com/sonarqube-server/user-guide/managing-tokens
- SonarQube Web API metadata from `/api/webservices/list` on SonarSource's public SonarQube instance: https://next.sonarqube.com/sonarqube/api/webservices/list
- SonarQube metrics API from SonarSource's public SonarQube instance: https://next.sonarqube.com/sonarqube/api/metrics/search

## Issues Found
- The SonarQube Helm chart example used chart version `10.3.0` with the old bundled `postgresql` dependency. Current chart releases have removed that deprecated dependency, require selecting either Community Build or a paid edition, and require a monitoring passcode. Updated the Argo CD Application example to `targetRevision: 2026.3.0`, set `community.enabled: true`, configured monitoring passcode Secret references, and switched database configuration to `jdbcOverwrite` for an external PostgreSQL database.
- The PreSync hook used `curlimages/curl:latest` while running `python3`, which is not available in that image. Changed the hook image to Alpine and added installation of `curl` and `python3` before running the script.
- The Argo Workflows quality gate polling step only failed on `ERROR`, but SonarQube's documented quality gate API can also return `WARN` and `NONE`. Updated the check to fail on `ERROR`, `WARN`, or `NONE`.
- The Git update step used `$(GIT_TOKEN)`, which shell interprets as command substitution. Changed it to `${GIT_TOKEN}` so the environment variable is expanded correctly.
- The SonarQube quality gate API example used removed `gateId` parameters and attempted to read a removed `id` field from `qualitygates/show`. Updated the commands to use `gateName`, matching the current Web API.
- The quality gate example attempted to create a condition on `new_security_hotspots`, but SonarQube's current Web API forbids that metric for quality gate conditions. Changed the example to require `new_security_hotspots_reviewed` to be at least 100%.

## Review Notes
The examples still assume supporting infrastructure exists, including Argo CD projects, credentials, registry access, an external PostgreSQL database, and Kubernetes Secrets. Those assumptions are now called out where the SonarQube Helm values depend on them.
