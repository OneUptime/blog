# Validation Summary: How to Decompose a Monolithic Application into Microservices

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Kubernetes Engine
- Kubernetes Ingress, Deployments, Services, readiness probes, and rolling updates
- Cloud SQL for PostgreSQL
- PostgreSQL schema and table migration commands
- Kubernetes DNS-based service discovery
- Cloud Pub/Sub Python client library
- OpenTelemetry and Cloud Trace
- Artifact Registry
- Microservice decomposition patterns, including bounded contexts, strangler fig, and saga

## Sources Consulted
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Ingress API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/ingress-v1/
- Kubernetes Deployment rolling update documentation: https://kubernetes.io/docs/tasks/run-application/update-deployment-rolling/
- Kubernetes namespaces and DNS documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- GKE Ingress for Application Load Balancers: https://cloud.google.com/kubernetes-engine/docs/concepts/ingress
- GKE external Application Load Balancer with Ingress documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/load-balance-ingress
- GKE container-native load balancing documentation: https://cloud.google.com/kubernetes-engine/docs/concepts/container-native-load-balancing
- Cloud SQL PostgreSQL instance creation documentation: https://cloud.google.com/sql/docs/postgres/create-instance
- gcloud sql instances create reference: https://cloud.google.com/sdk/gcloud/reference/sql/instances/create
- gcloud sql databases create reference: https://cloud.google.com/sdk/gcloud/reference/sql/databases/create
- Pub/Sub publishing documentation for Python: https://cloud.google.com/pubsub/docs/publisher
- Google-built OpenTelemetry Collector on GKE documentation: https://cloud.google.com/stackdriver/docs/instrumentation/opentelemetry-collector-gke
- OpenTelemetry Cloud Trace exporter documentation: https://google-cloud-opentelemetry.readthedocs.io/en/stable/cloud_trace/cloud_trace.html
- Artifact Registry Container Registry shutdown documentation: https://cloud.google.com/artifact-registry/docs/transition/prepare-gcr-shutdown

## Issues Found
- The Deployment image used `gcr.io/my-project/product-service:v1`. Container Registry is deprecated and has been shut down for direct writes, so this was changed to an Artifact Registry image path, `us-central1-docker.pkg.dev/my-project/app-images/product-service:v1`.
- The `product-service` Service omitted `type: NodePort` while being used as a GKE Ingress backend. GKE Ingress requires `NodePort` unless container-native load balancing with NEGs is used, so `type: NodePort` was added with a clarifying comment.
- The Kubernetes DNS comment implied short service names resolve universally. Kubernetes short service names resolve within the same namespace, so the comment was narrowed to that case.
- The OpenTelemetry Collector DaemonSet snippet lacked a Collector configuration and would not be a complete GKE tracing setup. It was replaced with the current Google-documented deployment command for the Google-built OpenTelemetry Collector manifests.

## Review Notes
The remaining examples are intentionally illustrative and omit production hardening such as TLS, authentication, retry policies, IAM setup, database credentials beyond `DB_HOST`, and full contract-test implementation. The Cloud Trace Python exporter example is technically valid for direct export; teams using the Collector path would typically configure an OTLP exporter instead.
