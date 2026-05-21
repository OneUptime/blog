# Validation Summary: How to Test Istio Upgrades in a Staging Environment First

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes
- Helm
- istioctl
- kubectl
- Google Kubernetes Engine
- Prometheus and Grafana
- Shell scripting

## Sources Consulted
- Istio supported releases: https://istio.io/latest/docs/releases/supported-releases/
- Istio Helm installation documentation: https://istio.io/latest/docs/setup/install/helm/
- Istio Helm upgrade documentation: https://istio.io/latest/docs/setup/upgrade/helm/
- Istio in-place upgrade documentation: https://istio.io/latest/docs/setup/upgrade/in-place/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio httpbin sample manifest: https://raw.githubusercontent.com/istio/istio/release-1.30/samples/httpbin/httpbin.yaml
- Google Cloud gcloud container clusters create reference: https://cloud.google.com/sdk/gcloud/reference/container/clusters/create
- Kubernetes kubectl rollout reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/

## Issues Found
- The post used Istio 1.20.5 and 1.21.0 in install and upgrade examples. Those releases are out of support as of the review date, so the examples were updated to a supported 1.29.2 to 1.30.0 upgrade path.
- The GKE example used Kubernetes 1.28, which is not a supported Kubernetes version for current Istio 1.30. The example was updated to Kubernetes 1.33, which is in the supported range for Istio 1.29 and 1.30.
- The Helm install example did not create the `istio-system` namespace and did not wait for control plane or gateway readiness. The base chart command now uses `--create-namespace`, and the `istiod` and gateway commands use `--wait`.
- The `httpbin` workload was described as an Istio sample app but used the old `docker.io/kennethreitz/httpbin` image and port 80. The manifest was updated to match the current Istio sample pattern, using `docker.io/mccutchen/go-httpbin:v2.15.0`, port 8080, service port 8000, a ServiceAccount, and matching labels.
- The `test-app` namespace was referenced by the workload manifests without being created. A namespace resource with sidecar injection enabled was added to the sample manifest.
- The configuration sync code comment implied that the loop stripped cluster-specific metadata, but the loop only applied files. The comment was corrected to make the cleaning step explicit before applying.
- The automated curl checks still targeted `httpbin.test-app:80` after the sample service changed. They were updated to `httpbin.test-app:8000`.

## Review Notes
The remaining examples are intentionally illustrative and still assume that the Helm repository, kube contexts, test gateway hostname, `sleep` test deployment, values files, and traffic generation tools already exist in the reader's environment.
