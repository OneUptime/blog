# Validation Summary: How to Implement Golden Paths

## Status
validated

## Post Type
Technical guide / implementation tutorial

## Technologies Covered
- Platform engineering Golden Paths
- Cookiecutter project templates
- Node.js and TypeScript
- Docker and npm
- GitHub Actions
- GitHub Container Registry
- Trivy
- Kubernetes manifests
- OpenTelemetry JavaScript SDK
- Backstage Software Templates
- Open Policy Agent and Rego

## Sources Consulted
- npm CLI documentation for `npm ci` and `omit`: https://docs.npmjs.com/cli/v10/commands/npm-ci/
- Docker metadata action documentation: https://github.com/docker/metadata-action
- GitHub documentation for SARIF uploads: https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/upload-sarif-file
- Trivy GitHub Action documentation: https://github.com/aquasecurity/trivy-action
- Azure Kubernetes deploy action Marketplace documentation: https://github.com/marketplace/actions/deploy-to-kubernetes-cluster
- Azure Kubernetes set context action Marketplace documentation: https://github.com/marketplace/actions/azure-kubernetes-set-context
- Kubernetes documentation for liveness/readiness probes and pod security settings: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- OpenTelemetry JavaScript Node.js documentation: https://opentelemetry.io/docs/languages/js/getting-started/nodejs/
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry OTLP exporter configuration documentation: https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/
- Backstage Software Templates documentation: https://backstage.io/docs/features/software-templates/writing-templates/
- Backstage UI options documentation for `OwnerPicker`: https://backstage.io/docs/features/software-templates/ui-options-examples/
- Open Policy Agent Rego policy language documentation: https://www.openpolicyagent.org/docs/policy-language
- Open Policy Agent `contains` keyword documentation: https://www.openpolicyagent.org/docs/policy-reference/keywords/contains

## Issues Found
- Dockerfile used `npm ci --only=production`. Changed it to `npm ci --omit=dev`, the current documented npm option for omitting dev dependencies from the installed tree.
- Dockerfile created a `nodejs` group but did not attach the `nodejs` user to it. Added `-G nodejs` to the Alpine `adduser` command.
- GitHub Actions used Docker metadata SHA tags that default to a short SHA while the Trivy scan referenced the full `${{ github.sha }}` tag. Changed the metadata tag to `type=sha,prefix=,format=long`.
- GitHub Actions security job uploaded SARIF without the documented `security-events: write` permission and scanned a GHCR image without logging in. Added the required permissions and registry login.
- GitHub Actions deploy job used `azure/k8s-deploy` without setting Kubernetes context. Added Azure login, AKS context setup, current Azure action versions, and the required workflow permissions.
- The Cookiecutter workflow snippet included GitHub Actions expressions and Docker metadata `{{version}}` syntax that Jinja would try to render. Wrapped the workflow body in a `{% raw %}` block.
- Kubernetes section claimed the snippet included pod disruption budgets, but no `PodDisruptionBudget` was shown. Updated the sentence to describe the settings actually present.
- OpenTelemetry JavaScript snippet used `new Resource()` and `SemanticResourceAttributes`, which are not exported by current packages. Updated it to `resourceFromAttributes` and current semantic convention constants.
- OpenTelemetry OTLP exporters used the generic `OTEL_EXPORTER_OTLP_ENDPOINT` as a signal-specific URL. Updated the snippet to use `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` and `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT`.
- OpenTelemetry HTTP auto-instrumentation used `ignoreIncomingPaths`, which is not a current option. Replaced it with `ignoreIncomingRequestHook`.
- Backstage `OwnerPicker` used deprecated `allowedKinds`. Changed it to `catalogFilter`.
- Rego examples used pre-Rego-v1 rule syntax. Updated them to `import rego.v1` and `deny/warn contains msg if` syntax.

## Review Notes
The post is technically relevant and suitable for validation after the corrections above. A targeted TypeScript package check was used to confirm current OpenTelemetry package exports and catch the obsolete HTTP instrumentation option; full project execution was not applicable because the article provides template snippets rather than a complete runnable repository.
