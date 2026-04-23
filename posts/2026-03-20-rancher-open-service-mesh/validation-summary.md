# Validation Summary: How to Set Up Open Service Mesh with Rancher

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rancher
- Kubernetes
- Open Service Mesh (OSM)
- Helm
- Service Mesh Interface (SMI)
- Envoy
- Prometheus
- Grafana
- Jaeger

## Sources Consulted
- Open Service Mesh GitHub repository and project status: https://github.com/openservicemesh/osm
- OSM Helm chart index: https://openservicemesh.github.io/osm/index.yaml
- OSM Helm chart metadata (`v1.2.4`): https://raw.githubusercontent.com/openservicemesh/osm/v1.2.4/charts/osm/Chart.yaml
- Install the OSM CLI: https://release-v1-2.docs.openservicemesh.io/docs/guides/cli/
- Install the OSM Control Plane: https://release-v1-2.docs.openservicemesh.io/docs/guides/install/
- Setup OSM: https://release-v1-2.docs.openservicemesh.io/docs/getting_started/setup_osm/
- Namespace addition: https://release-v1-2.docs.openservicemesh.io/docs/guides/app_onboarding/namespaces/
- Application Protocol Selection: https://release-v1-2.docs.openservicemesh.io/docs/guides/app_onboarding/app_protocol_selection/
- Configure Traffic Policies: https://release-v1-2.docs.openservicemesh.io/docs/getting_started/traffic_policies/
- Traffic Splitting: https://release-v1-2.docs.openservicemesh.io/docs/guides/traffic_management/traffic_split/
- Metrics: https://release-v1-2.docs.openservicemesh.io/docs/guides/observability/metrics/
- Tracing: https://release-v1-2.docs.openservicemesh.io/docs/guides/observability/tracing/
- Ingress: https://release-v1-2.docs.openservicemesh.io/docs/guides/traffic_management/ingress/

## Issues Found
- The post used a nonexistent OSM CLI release (`v1.3.0`) and implied the project was still current. I updated it to the last official release, `v1.2.4`, and noted that OSM is archived.
- The Kubernetes prerequisite was too loose. I changed it from `1.22+` to `1.22.9+` to match the published Helm chart compatibility metadata for `v1.2.4`.
- The Helm values file included `enablePrometheusScraping`, which is not a valid `v1.2.4` chart value. I removed it.
- The install verification step used `osm verify connectivity` with no required arguments. I replaced it with the official control-plane inspection command.
- The manual namespace-enrollment example only added the `openservicemesh.io/monitored-by` label. I added the required `openservicemesh.io/sidecar-injection=enabled` annotation because sidecar injection does not happen from the label alone.
- The application manifests were not runnable as written. The backend `Deployment` was missing the required `selector` and pod labels, and the later SMI policy examples referenced service accounts and Kubernetes services that had never been created. I added `ServiceAccount`, `Service`, `serviceAccountName`, selectors, labels, and `appProtocol` fields so the manifests align with OSM's documented HTTP policy requirements.
- The rollout command used `deployment` instead of the documented `deployments` form for restarting all deployments in the namespace. I corrected it.
- The `TrafficSplit` example used a short service name for `spec.service`; OSM's traffic-splitting guide documents this as a service FQDN. I updated it to `backend.production.svc.cluster.local` and clarified that the leaf services must already exist.
- The Prometheus port-forward used `9090`, but the OSM `v1.2.4` chart and docs use port `7070`. I corrected the command.
- The ingress example omitted the requirement that a `Service` source namespace be monitored by OSM so it can discover service endpoints. I added the required namespace-label step for `ingress-nginx`.
- Two troubleshooting commands used invalid CLI syntax. I fixed `osm proxy get config_dump` to use the pod name as a positional argument and replaced the nonexistent `osm policy check-pods-in-traffic-target` command with the supported `osm policy check-pods` form.

## Review Notes
- The post is technically relevant and remains publishable after correction, but it now accurately reflects that OSM is an archived project.
- The traffic-splitting example is still conditional on `backend-v1` and `backend-v2` Services existing in the same namespace; that assumption is now stated explicitly in the snippet.
- Because OSM is archived, this tutorial should be treated as version-pinned maintenance guidance rather than a recommendation for a new long-term platform choice.
