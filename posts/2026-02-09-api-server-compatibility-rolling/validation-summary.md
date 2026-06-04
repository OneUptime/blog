# Validation Summary: How to Handle API Server Request Compatibility During Rolling Upgrades

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes API server
- Kubernetes version skew policy
- kubectl
- Kubernetes API deprecation and metrics
- Kubernetes admission webhooks
- Go Kubernetes API machinery
- kind
- Helm

## Sources Consulted
- Kubernetes Version Skew Policy: https://kubernetes.io/releases/version-skew-policy/
- Kubernetes kubectl version reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Kubernetes Deprecated API Migration Guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- Kubernetes Deprecation Policy: https://kubernetes.io/docs/reference/using-api/deprecation-policy/
- Kubernetes Metrics Reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Kubernetes API health endpoints: https://kubernetes.io/docs/reference/using-api/health-checks
- Kubernetes ValidatingWebhookConfiguration v1 reference: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/validating-webhook-configuration-v1/
- Helm install reference: https://docs.helm.sh/docs/helm/helm_install/
- kind releases and node image guidance: https://github.com/kubernetes-sigs/kind/releases

## Issues Found
- The version skew description said kubelets can be at N-2. Current Kubernetes policy allows kubelets up to three minor versions older than kube-apiserver for supported releases, with additional narrowing when HA API servers are skewed. Updated the text accordingly and added the HA API server one-minor-version limit.
- The post said clients specify API versions only through the `apiVersion` field. Updated this to include request paths as well as submitted object `apiVersion` fields.
- Several examples used `kubectl version --short`, but current kubectl reference lists `--client` and `-o json|yaml`, not `--short`. Replaced those calls with JSON output and `jq`, and used `/version` for repeated API server checks.
- The API routing script parsed the core `v1` API as API group `v1`, which is incorrect because the core API group is empty. Updated the script to handle core and named API groups separately and avoid running `kubectl get` with an empty resource.
- The deprecated API usage script attempted to discover deprecated object usage by listing resources and checking returned `.apiVersion` values, which is unreliable because the API server returns objects in the requested served version. Replaced this with a check of the official `apiserver_requested_deprecated_apis` metric and a manifest/chart scan for pre-GA API versions.
- The Go snippet called `fmt.Errorf` without importing `fmt`, and used `package main` without a `main` function. Added the missing import and changed the snippet to a library package name.
- The API health monitor used `/healthz`, which Kubernetes has deprecated since v1.16. Updated it to use `/readyz`.
- The API latency example read a single histogram bucket and labeled it as seconds of latency. Replaced it with an average request duration calculation from histogram sum and count metrics.
- The webhook example matched `extensions/v1beta1` Ingress, which has not been served since Kubernetes v1.22. Updated it to use `networking.k8s.io/v1` Ingress and `matchPolicy: Equivalent`.
- The controller skew example created an `extensions/v1beta1` Ingress, which fails on Kubernetes 1.22 and later, including the 1.29 examples in the post. Replaced the hard-coded removed API manifest with fixture paths that must use API versions still served by both versions in the upgrade path.

## Review Notes
The post is now technically valid as a general guide. The kind example uses an unpinned `kindest/node` tag; kind recommends digest pinning for reproducibility, but the command form itself is valid.
