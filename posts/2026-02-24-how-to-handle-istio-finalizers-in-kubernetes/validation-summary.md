# Validation Summary: How to Handle Istio Finalizers in Kubernetes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes finalizers and namespace finalization
- kubectl JSONPath and patch commands
- Istio configuration resources and CRDs
- Istio ambient mode and waypoint-related Gateway handling
- Legacy Istio in-cluster operator and IstioOperator resources
- Kubernetes admission webhooks

## Sources Consulted
- Kubernetes documentation: Finalizers - https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/
- Kubernetes documentation: kubectl patch - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes documentation: Dynamic Admission Control - https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes documentation: Namespaces and finalizers - https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Istio documentation: Install with Istioctl - https://istio.io/latest/docs/setup/install/istioctl/
- Istio documentation: Uninstall Istio - https://istio.io/latest/docs/setup/install/istioctl/#uninstall-istio
- Istio documentation: In-cluster operator deprecation announcement - https://istio.io/latest/blog/2024/in-cluster-operator-deprecation-announcement/
- Istio source: generated CRDs for resource names and shortNames - https://github.com/istio/istio/blob/1.29.2/manifests/charts/base/files/crd-all.gen.yaml
- Istio source: validating webhook template operations - https://github.com/istio/istio/blob/1.29.2/manifests/charts/istio-control/istio-discovery/templates/validatingwebhookconfiguration.yaml

## Issues Found
- The post used `sc` and `ef` as Istio resource shortcuts. Current Istio CRDs do not define those short names, and `sc` commonly resolves to Kubernetes StorageClass. Changed these examples to use `sidecar` and `envoyfilter`.
- The post described the IstioOperator resource as a current/common finalizer location for `istioctl install`. Current `istioctl` installs consume IstioOperator YAML as input, while the in-cluster operator was deprecated in Istio 1.23 and removed from Istio core in Istio 1.24. Updated the section to describe this as legacy operator behavior.
- The post said Istio validation webhooks can block deletion. Istio's validating webhook is configured for create and update operations, not normal delete validation. Updated the wording to say stale webhooks can block cleanup changes when kubectl operations hit webhook errors.
- The VirtualService example used `kubectl get vs -A | grep Terminating`, which is not a reliable way to detect deleting custom resources. Changed it to query `.metadata.deletionTimestamp`.
- The conclusion stated that manually removing Istio finalizers is safe in most cases. Softened this to explain that it can be low-risk after the owning controller is gone, but it still skips controller cleanup and should be understood first.

## Review Notes
The post is technically relevant and now matches current Kubernetes finalizer behavior and current Istio installation/operator guidance. The local environment did not have `kubectl` installed, so CLI syntax was checked against official kubectl documentation instead of local `--help` output.
