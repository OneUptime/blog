# Validation Summary: How to Deploy Aqua Security with Flux CD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Aqua Security Enterprise Helm charts
- Flux CD HelmRelease and Kustomization APIs
- Kubernetes namespaces, secrets, services, network policies, and pod security labels
- Prometheus Operator ServiceMonitor and PrometheusRule resources
- PostgreSQL-backed Aqua Server deployment

## Sources Consulted
- Aqua Helm repository index: https://helm.aquasec.com/index.yaml
- Aqua Helm charts repository README: https://github.com/aquasecurity/aqua-helm
- Aqua `server` chart values and templates: https://github.com/aquasecurity/aqua-helm/tree/2022.4/server
- Aqua `enforcer` chart values and templates: https://github.com/aquasecurity/aqua-helm/tree/2022.4/enforcer
- Aqua `gateway` chart package/templates from https://helm.aquasec.com/charts/gateway-2022.4.18.tgz
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux CLI `get helmreleases` documentation: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Pod Security Standards namespace label documentation: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Prometheus Operator ServiceMonitor documentation: https://prometheus-operator.dev/docs/developer/getting-started/

## Issues Found
- The post used non-existent Aqua chart versions `2024.4.x`. The official Aqua Helm repository currently publishes the Enterprise `server` and `enforcer` charts under `2022.4.x`, so both HelmRelease examples were corrected.
- The Aqua server values used unsupported keys such as `db.external.passwordSecret`, `web.tls`, `web.adminPassword`, `license`, `scanner`, and `cyberCenter`. These were replaced with chart-supported values under `global.db`, `admin`, `web.TLS`, and service `ports`.
- The Aqua license token was modeled as a separate unused secret. The server chart expects `license-token` in the configured admin secret, so the secret example now places `license-token` with `admin-password`.
- The enforcer values used unsupported keys such as `gate`, `token`, `enforcerGroup`, `enforcerConfig`, and `hostProtection`. These were replaced with `global.gateway`, `enforcerTokenSecretName`, `enforcerTokenSecretKey`, `securityContext`, and `hostPID`.
- Generated Aqua resource names and labels were inaccurate. Health checks, NetworkPolicy selectors, ServiceMonitor selectors, and verification commands now use release-derived names such as `aqua-server-console`, `aqua-server-gateway`, `aqua-server-console-svc`, and `aqua-enforcer-ds`.
- The runtime policy ConfigMap section implied that a ConfigMap directly configures Aqua runtime policies. It now states that the ConfigMap stores a payload for external automation to apply through the Aqua Console or API.
- The conclusion claimed this deployment included vulnerability scanning, micro-segmentation, drift prevention, and admission control even though the corrected manifests deploy only Console, Gateway, and Enforcer components. The conclusion was narrowed to the components actually deployed.

## Review Notes
- All YAML and JSON code blocks in the post parse successfully after the corrections.
- The ServiceMonitor and PrometheusRule examples are syntactically valid, but they still assume Aqua metrics are exposed at the configured path and with the example metric names in the target environment.
