# Validation Summary: How to Configure Webhook Namespace Selectors

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio sidecar injection
- Kubernetes MutatingAdmissionWebhook
- Kubernetes namespace selectors and object selectors
- Kubernetes namespace labels
- kubectl
- Helm
- IstioOperator

## Sources Consulted
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio check-inject documentation: https://istio.io/latest/docs/ops/diagnostic-tools/check-inject/
- Istio Helm installation documentation: https://istio.io/latest/docs/setup/install/helm/
- Istio Helm upgrade documentation: https://istio.io/latest/docs/setup/upgrade/helm/
- Istio istiod Helm chart values: https://raw.githubusercontent.com/istio/istio/master/manifests/charts/istio-control/istio-discovery/values.yaml
- Istio istiod mutating webhook template: https://raw.githubusercontent.com/istio/istio/master/manifests/charts/istio-control/istio-discovery/templates/mutatingwebhook.yaml
- Kubernetes dynamic admission control documentation: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes namespaces documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The selector inspection command only displayed `.webhooks[0].namespaceSelector`, which is misleading for current Istio installs because the injector configuration can contain multiple webhook entries for namespace, object, and revision matching. Updated the command to show each webhook entry's name, namespaceSelector, and objectSelector.
- The default selector example implied that only `istio-injection=enabled` namespaces can trigger injection. Current Istio behavior also supports pod-level and revision-based injection paths. Updated the explanation and JSON example to make the namespace-based webhook scope clear without excluding the other supported paths.
- The opt-out section recommended applying the same `NotIn disabled` selector to every generated webhook entry. That can create overlapping matches in recent Istio configurations. Replaced it with installer-level configuration using `sidecarInjectorWebhook.enableNamespacesByDefault`.
- The excluded namespace examples omitted `kube-public` in the labeling commands and `istio-system` in the `kubernetes.io/metadata.name` selector example. Added both where appropriate.
- The revision label guidance described `istio-injection=enabled` and `istio.io/rev` as mutually exclusive. Istio documents that `istio-injection` takes precedence when both are present, so the wording was corrected to say they should not both be used on the same namespace.
- The Kubernetes namespace-name label version was listed as Kubernetes 1.21+. Kubernetes documentation marks `kubernetes.io/metadata.name` automatic labeling as stable in Kubernetes 1.22, so the post now says Kubernetes 1.22+.
- The Helm example set `sidecarInjectorWebhook.enableNamespacesByDefault=false` while describing customization for the opt-out model. Changed it to `true`.
- The post said custom webhook YAML could be provided through Helm values. Current Istio documentation points users toward rendering and post-rendering for advanced Helm chart customization, so this was corrected.

## Review Notes
The dry-run `kubectl run --dry-run=server -o yaml` example is technically valid because Kubernetes sends dry-run admission requests to compatible webhooks and does not persist the object. In future revisions, the post could mention `istioctl experimental check-inject` as a more purpose-built diagnostic command.
