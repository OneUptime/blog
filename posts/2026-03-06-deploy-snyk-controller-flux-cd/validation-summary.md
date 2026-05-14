# Validation Summary: How to Deploy Snyk Controller with Flux CD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Snyk Controller / snyk-monitor
- Snyk Container Kubernetes integration
- Flux CD HelmRelease and Kustomization
- Kubernetes Secrets, ConfigMaps, Deployments, NetworkPolicy, and PersistentVolumeClaims
- Prometheus Operator PrometheusRule
- Snyk REST API

## Sources Consulted
- Snyk Controller Helm install documentation: https://docs.snyk.io/scan-with-snyk/snyk-container/kubernetes-integration/install-the-snyk-controller/install-the-snyk-controller-with-helm-azure-and-google-cloud-platform
- Snyk Controller prerequisites: https://docs.snyk.io/scan-with-snyk/snyk-container/kubernetes-integration/install-the-snyk-controller
- Snyk private registry authentication documentation: https://docs.snyk.io/scan-with-snyk/snyk-container/kubernetes-integration/install-the-snyk-controller/authenticate-to-private-container-registries
- Snyk Kubernetes integration overview: https://docs.snyk.io/scan-with-snyk/snyk-container/kubernetes-integration/overview-of-kubernetes-integration
- Snyk optional Helm installation settings: https://docs.snyk.io/scan-with-snyk/snyk-container/kubernetes-integration/install-the-snyk-controller/optional-installation-steps-for-snyk-controller-with-helm
- Snyk kubernetes-monitor chart values and templates: https://github.com/snyk/kubernetes-monitor
- Snyk REST API Projects reference: https://docs.snyk.io/snyk-api/reference/projects
- Snyk REST API Issues reference: https://docs.snyk.io/snyk-api/reference/issues
- Snyk REST API overview and versioning: https://docs.snyk.io/snyk-api/rest-api/about-the-rest-api
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/

## Issues Found
- The Snyk secret used `snykToken` and a separate `kubernetes.io/dockerconfigjson` secret. The current Snyk chart expects a secret referenced by `monitorSecrets` with `integrationId`, optional `serviceAccountApiToken`, and `dockercfg.json`. Updated the secret example accordingly.
- The Helm values used non-existent chart keys including `registryCredentials`, nested `resources`, `pvc.size`, nested `scope.excludedNamespaces`, `image.scanInitContainers`, `image.scanSidecarContainers`, and `workloadEvents.enabled`. Replaced them with the chart's current `requests`, `limits`, `temporaryStorageSize`, top-level `excludedNamespaces`, `policyOrgs`, and `workloadPoliciesMap` values.
- The namespace and workload annotation examples used unsupported Snyk annotation keys. Replaced them with a Rego workload policy ConfigMap, which is the supported mechanism for automatic workload import control.
- The standalone NetworkPolicy example would not restrict egress while the chart's default egress-allow policy remained active. Changed it to a Helm values override for the chart-managed NetworkPolicy.
- The ServiceMonitor example targeted a service and metrics endpoint that the Snyk chart does not create. Removed the ServiceMonitor and changed the down alert to use kube-state-metrics deployment availability.
- The Snyk REST API examples omitted the required `version` query parameter, used the wrong authorization prefix casing, and used unsupported filters. Updated the commands to use versioned REST endpoints and filter Kubernetes projects with `jq`.
- The troubleshooting command referenced a non-documented `/rest/openapi` endpoint and the old docker config secret. Updated it to call `/rest/self?version=2024-10-15` and inspect `dockercfg.json` in the `snyk-monitor` secret.
- The prerequisites described a generic API token and a Kubernetes version floor not stated in Snyk's install prerequisites. Updated the prerequisites to call out an Enterprise account, service account token, linux/amd64 node, and temporary storage.

## Review Notes
- The guide now assumes automatic import is configured through `policyOrgs` and the workload policy in Step 5. Without that policy, Snyk may scan and make workloads available for import, but the automatic import behavior depends on integration configuration.
- The Prometheus alerts depend on kube-state-metrics and kubelet/cAdvisor metrics being present in the monitoring stack.
