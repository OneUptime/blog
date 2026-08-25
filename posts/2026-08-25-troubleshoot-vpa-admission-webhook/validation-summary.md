# Validation Summary: How to Troubleshoot the VPA Admission Webhook: CA Bundles, Certificates, and Mutation Failures

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered

- Kubernetes
- Vertical Pod Autoscaler (VPA) 1.7.1
- Mutating admission webhooks
- Services and EndpointSlices
- TLS certificates and CA bundles
- Kubernetes RBAC and Leases
- `kubectl`, JSONPath, OpenSSL, and server-side dry-run

## Sources Consulted

- [VPA 1.7.1 installation documentation](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/docs/installation.md), [admission-controller Deployment](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/deploy/admission-controller-deployment.yaml), and [Service](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/deploy/admission-controller-service.yaml)
- [VPA webhook registration and rules](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/pkg/admission-controller/config.go) and [VPA RBAC](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/deploy/vpa-rbac.yaml)
- [VPA certificate generation](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/pkg/admission-controller/gencerts.sh) and [certificate reload/CA-bundle patching](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/pkg/admission-controller/certs.go)
- [VPA admission-controller and updater flags](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/docs/flags.md), [updater defaults](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/pkg/updater/config/config.go), and [status-lease check](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/pkg/updater/logic/updater.go)
- [VPA admission matching](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/pkg/admission-controller/resource/vpa/matcher.go), [controller-owner matching](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/pkg/utils/vpa/api.go), and [resource patch calculation](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/pkg/admission-controller/resource/pod/patch/resource_updates.go)
- [VPA admission-controller FAQ](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/docs/faq.md), [components](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/docs/components.md), and [failure-policy/LimitRange examples](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/docs/examples.md)
- [Official VPA Helm chart defaults and Secret projections](https://github.com/kubernetes/autoscaler/blob/22115908908a2fc94a4f3c47f28f1fb754fe585a/vertical-pod-autoscaler/charts/vertical-pod-autoscaler/values.yaml) and [admission-controller chart template](https://github.com/kubernetes/autoscaler/blob/22115908908a2fc94a4f3c47f28f1fb754fe585a/vertical-pod-autoscaler/charts/vertical-pod-autoscaler/templates/admission-controller-deployment.yaml)
- [Kubernetes dynamic admission control](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/) and [`MutatingWebhookConfiguration` v1 API reference](https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/mutating-webhook-configuration-v1/)
- [Kubernetes EndpointSlice documentation](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/), [API dry-run documentation](https://kubernetes.io/docs/reference/using-api/api-concepts/#dry-run), and [`kubectl create` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/)
- [Kubernetes admission-webhook good practices](https://kubernetes.io/docs/concepts/cluster-administration/admission-webhooks-good-practices/), [LimitRange documentation](https://kubernetes.io/docs/concepts/policy/limit-range/), and [owners/dependents documentation](https://kubernetes.io/docs/concepts/overview/working-with-objects/owners-dependents/)
- [`kubectl auth can-i` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/), [kubectl JSONPath reference](https://kubernetes.io/docs/reference/kubectl/jsonpath/), and [OpenSSL `x509` reference](https://docs.openssl.org/1.1.1/man1/x509/)

## Issues Found

- The exact names, `app=vpa-admission-controller` selector, namespace, and Secret JSONPath were presented too broadly. They are correct for the upstream `hack/vpa-up.sh` raw-manifest installation, but the official Helm chart can use release-derived names, different labels, and different Secret data keys. The post now scopes those values to the raw-manifest installation and tells Helm users to inspect rendered manifests before substituting them.
- The self-registration prose referred to RBAC operations as “get, replace, and patch.” Kubernetes RBAC has no `replace` verb, and VPA self-registration performs GET, DELETE, and CREATE while CA reload performs GET and PATCH. The prose now names `get`, `delete`, `create`, and `patch`, matching the existing commands and upstream RBAC.
- The raw-manifest Secret inventory omitted `caKey.pem`. The post now lists all four generated entries: `caKey.pem`, `caCert.pem`, `serverCert.pem`, and `serverKey.pem`.
- The CA-rotation wording implied that an externally managed `caBundle` always needs an update during serving-certificate rotation. It now states that the bundle must be updated when the issuing CA changes; a new leaf certificate signed by the existing CA does not require a trust change.
- “No `startupBoost`” was ambiguous because current VPA supports both pod-level and per-container startup boost. The post now specifies that neither form may be configured when using an `Off` VPA as a non-mutating recommendation source.

## Review Notes

- All shown `kubectl`, JSONPath, `grep`, base64, and OpenSSL syntax was checked and is valid for the scoped raw-manifest installation. All six links in the post resolve to the intended official sections.
- `kubectl auth can-i --as=...` requires the reviewing user to have impersonation permission; this is an authorization prerequisite, not a command error.
- Review was performed against the current VPA 1.7.1 release and current Kubernetes documentation on 2026-08-25. Some examples in the upstream VPA FAQ/components pages still display legacy `v1beta1` output, but the post correctly uses `admissionregistration.k8s.io/v1`.
