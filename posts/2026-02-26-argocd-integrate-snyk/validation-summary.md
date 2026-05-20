# Validation Summary: How to Integrate ArgoCD with Snyk for Security Scanning

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Argo CD
- Argo Events
- Kubernetes Jobs and Secrets
- Snyk CLI
- Snyk Container
- Snyk Infrastructure as Code
- Snyk Kubernetes Monitor Helm chart
- Helm
- Trivy

## Sources Consulted
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- Argo Events Data Filter documentation: https://argoproj.github.io/argo-events/sensors/filters/data/
- Argo Events Webhook EventSource documentation: https://argoproj.github.io/argo-events/eventsources/setup/webhook/
- Argo Events HTTP Trigger documentation: https://argoproj.github.io/argo-events/sensors/triggers/http-trigger/
- Argo Events Parameterization documentation: https://argoproj.github.io/argo-events/tutorials/02-parameterization/
- Snyk CLI container test documentation: https://docs.snyk.io/cli-ide-and-ci-cd-integrations/snyk-cli/commands/container-test
- Snyk CLI IaC test documentation: https://docs.snyk.io/developer-tools/snyk-cli/commands/iac-test/
- Snyk CLI commands and options summary: https://docs.snyk.io/developer-tools/snyk-cli/cli-commands-and-options-summary
- Snyk Container CI/CD strategies documentation: https://docs.snyk.io/scm-ide-and-ci-cd-integrations/snyk-ci-cd-integrations/snyk-ci-cd-integration-deployment-and-strategies/snyk-container-specific-ci-cd-strategies
- Snyk Controller installation documentation: https://docs.snyk.io/scan-with-snyk/snyk-container/kubernetes-integration/install-the-snyk-controller
- Snyk Controller Helm installation documentation: https://docs.snyk.io/scan-with-snyk/snyk-container/kubernetes-integration/install-the-snyk-controller/install-the-snyk-controller-with-helm-azure-and-google-cloud-platform
- Snyk Controller private registry authentication documentation: https://docs.snyk.io/scan-with-snyk/snyk-container/kubernetes-integration/install-the-snyk-controller/authenticate-to-private-container-registries
- Snyk Kubernetes Monitor Helm chart repository index and chart values: https://snyk.github.io/kubernetes-monitor/index.yaml
- Snyk Webhook events and payloads documentation: https://docs.snyk.io/snyk-api/using-specific-snyk-apis/webhooks-apis/webhooks

## Issues Found
- The Snyk Controller Argo CD Application used an outdated chart revision and Helm values that did not match the current chart. Updated `targetRevision` to `2.23.3`, changed `policyOrgs` to a list, replaced invalid nested `resources` values with chart-supported `requests` and `limits`, and changed the invalid namespace list under `scope` to `scope: Cluster`.
- The Snyk Controller secret example omitted the required `serviceAccountApiToken` key. Added `--from-literal=serviceAccountApiToken=$SNYK_SERVICE_ACCOUNT_TOKEN`.
- The container scan example piped JSON through `jq`, but the selected Snyk CLI image does not guarantee `jq` is available. Switched to `--json-file-output=/tmp/scan-result.json` and `cat` to avoid an undeclared runtime dependency.
- The multi-image scanning script used Bash associative arrays while invoking `sh -c`. Replaced the associative array with a POSIX-compatible file and `while read` loop.
- The Argo Events data filter treated `body.newIssues` as a string and compared it numerically. Updated the filter to use `body.newIssues.#` with `type: number`, which matches Argo Events data filter comparator behavior and Snyk's webhook payload shape.

## Review Notes
- The Snyk Webhooks API documentation notes that webhooks are beta and recommends validating `X-Hub-Signature`; the post's example is a minimal notification pattern and does not include signature validation.
- Helm and kubectl were not installed in the local environment, so local dry-run validation with those CLIs was not available. The Kubernetes and Helm snippets were checked against official schema examples and the current Snyk chart values.
