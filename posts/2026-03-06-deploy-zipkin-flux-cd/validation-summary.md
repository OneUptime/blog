# Validation Summary: How to Deploy Zipkin with Flux CD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Zipkin
- Zipkin Dependencies
- Kubernetes
- Flux CD
- HelmRelease and HelmRepository
- Elasticsearch
- Spring Boot Micrometer Tracing
- Prometheus Operator ServiceMonitor
- NGINX Ingress

## Sources Consulted
- OpenZipkin server README: https://github.com/openzipkin/zipkin/blob/master/zipkin-server/README.md
- OpenZipkin quickstart: https://zipkin.io/pages/quickstart.html
- OpenZipkin API documentation: https://zipkin.io/zipkin-api/
- OpenZipkin Dependencies README: https://github.com/openzipkin/zipkin-dependencies/blob/master/README.md
- OpenZipkin Helm chart repository: https://github.com/openzipkin/zipkin-helm
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Spring Boot tracing documentation: https://docs.spring.io/spring-boot/reference/actuator/tracing.html
- Elastic Helm charts README: https://github.com/elastic/helm-charts

## Issues Found
- The post said Zipkin does not have an official Helm chart for production use. OpenZipkin publishes a Helm chart, so the text now says the guide intentionally uses raw Kubernetes manifests.
- The Elasticsearch HelmRelease referenced an `elastic` HelmRepository that was not defined. Added the Flux `HelmRepository` manifest and pinned the Elastic chart range to `8.5.x`, matching the final Elastic Helm chart release line.
- The Elasticsearch section presented the direct Elastic Helm chart as production guidance without noting Elastic's ECK recommendation and the chart maintenance status. Added a short caveat while preserving the example.
- The Flux Kustomization used `targetNamespace` even though resources in the guide have explicit namespaces, including `flux-system` for the HelmRepository. Removed `targetNamespace` and moved the example Kustomization path outside the reconciled zipkin directory.
- The Zipkin ConfigMap included `SELF_TRACING_SAMPLE_RATE`, which is not a documented Zipkin server environment variable. Removed it.
- The `QUERY_ENABLED` comment incorrectly described it as a health-check setting. Updated the comment to match Zipkin's documented behavior: it controls the query API and UI.
- The post used a separate Elasticsearch ILM/index-template Job that did not create a Zipkin-compatible index template or attach the ILM policy to Zipkin indices. Replaced it with the documented Zipkin behavior: `ES_ENSURE_TEMPLATES=true`.
- The Zipkin Dependencies CronJob ran hourly, but the job processes traces for the current UTC day and upstream documentation recommends scheduling it just before midnight UTC. Updated the schedule to `55 23 * * *`.
- The Spring Boot example used older Sleuth environment variables. Updated it to Spring Boot 3 Micrometer Tracing variables: `MANAGEMENT_ZIPKIN_TRACING_ENDPOINT` and `MANAGEMENT_TRACING_SAMPLING_PROBABILITY`.
- The ServiceMonitor scraped `/metrics`, but Zipkin's Prometheus exposition endpoint is `/prometheus`. Updated the scrape path.
- The port-forward instructions pointed users to the root URL, while Zipkin documents the UI as mounted at `/zipkin`. Updated the verification note to use `http://localhost:9411/zipkin`.
- The conclusion claimed ILM-based automatic retention management. Updated it to describe Zipkin-managed Elasticsearch index templates instead.

## Review Notes
- The Elasticsearch Helm chart used in the example is archived and should be replaced with ECK for a stronger production guide in a future revision.
- The example disables Elasticsearch security for simplicity; production deployments should enable authentication and TLS and pass credentials to Zipkin with the documented Elasticsearch environment variables.
