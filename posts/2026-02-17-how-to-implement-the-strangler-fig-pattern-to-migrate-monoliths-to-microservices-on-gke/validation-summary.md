# Validation Summary: How to Use the Strangler Fig Pattern to Migrate Monoliths to Microservices

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Google Kubernetes Engine
- Kubernetes Deployments, Services, probes, and kubectl
- Istio Gateway and VirtualService traffic routing
- Docker and Node.js
- npm
- Python Flask
- Google Cloud Firestore Python and Node.js clients
- Google Cloud Build
- Google Artifact Registry
- Strangler Fig migration pattern

## Sources Consulted
- Istio install with istioctl: https://istio.io/latest/docs/setup/install/istioctl/
- Istio sidecar injection: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio configuration profiles for GKE: https://istio.io/latest/docs/setup/additional-setup/config-profiles/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Google Cloud Service Mesh migration from Istio, including Istio install on GKE: https://cloud.google.com/service-mesh/docs/migrate/from-istio
- Artifact Registry transition from Container Registry: https://docs.cloud.google.com/artifact-registry/docs/transition/transition-from-gcr
- Artifact Registry Docker image names: https://docs.cloud.google.com/artifact-registry/docs/docker/names
- Cloud Build container image builds: https://docs.cloud.google.com/build/docs/building/build-containers
- Node.js release schedule / EOL information: https://github.com/nodejs/Release
- npm ci documentation: https://docs.npmjs.com/cli/v11/commands/npm-ci/
- Kubernetes Services: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes probes: https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/
- kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs
- kubectl set image reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/
- Firestore Python client documentation: https://docs.cloud.google.com/python/docs/reference/firestore/latest
- Firestore Node.js client documentation: https://cloud.google.com/nodejs/docs/reference/firestore/latest/firestore/firestore
- Firestore Node.js FieldValue documentation: https://cloud.google.com/nodejs/docs/reference/firestore/latest/firestore/fieldvalue

## Issues Found
- The Dockerfile used `node:20-slim`, but Node.js 20 is end-of-life as of the current review date. Updated it to `node:24-slim`.
- The Dockerfile used `npm ci --production`. Updated it to `npm ci --omit=dev`, which is the current npm configuration form for omitting development dependencies.
- The Kubernetes manifests and Cloud Build command used `gcr.io` image names. Container Registry is shut down for writes, and Artifact Registry is the recommended current service, so image names were updated to `us-central1-docker.pkg.dev/my-project/app/...`.
- The Istio setup command used the old GKE Istio add-on path with `gcloud container clusters update --update-addons=Istio=ENABLED`. Replaced it with `istioctl install --set profile=default --set values.global.platform=gke --skip-confirmation`, matching current Istio/GKE guidance.
- The namespace label command did not include `--overwrite`, which can fail if the namespace was already labeled. Added `--overwrite`, matching Istio documentation examples.
- Istio manifests used `networking.istio.io/v1beta1`. Updated Gateway and VirtualService examples to the current stable `networking.istio.io/v1` API.
- The JavaScript dual-write example used `Firestore` without importing it and used a client-side timestamp expression for a field described as Firestore data. Added the official `@google-cloud/firestore` import and changed the timestamp to `FieldValue.serverTimestamp()`.

## Review Notes
The routing, Kubernetes Service, readiness probe, `kubectl logs`, `kubectl set image`, Flask route, and Firestore Python examples are technically plausible after the corrections. In a production migration, the dual-write section should also discuss idempotency, reconciliation, transactional boundaries, and failure handling, but that is an architectural completeness concern rather than a correctness error in the current tutorial.
