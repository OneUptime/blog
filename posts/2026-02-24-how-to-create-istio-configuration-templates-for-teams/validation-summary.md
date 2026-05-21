# Validation Summary: How to Create Istio Configuration Templates for Teams

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Istio VirtualService, DestinationRule, and AuthorizationPolicy
- Kubernetes custom resources
- Helm charts and templates
- Kustomize bases and overlays
- istioctl analyze
- kubeconform schema validation
- GitHub Actions

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio istioctl installation docs: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl/
- Istio supported releases: https://istio.io/latest/docs/releases/supported-releases/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Helm OCI registry documentation: https://helm.sh/docs/v3/topics/registries/
- Helm named templates documentation: https://helm.sh/docs/chart_template_guide/named_templates/
- kubeval repository notice: https://github.com/instrumenta/kubeval
- kubeconform documentation: https://github.com/yannh/kubeconform

## Issues Found
- The Helm templates used `include "istio-service.labels"` but did not define that helper. Added a `templates/_helpers.tpl` snippet with the expected label helper so the chart can render.
- The Istio networking examples used `networking.istio.io/v1beta1`. Updated VirtualService and DestinationRule examples to the current `networking.istio.io/v1` API version shown in Istio's current reference docs.
- The AuthorizationPolicy values used `service` for entries that were rendered into source principal service account names. Renamed the value key to `serviceAccount` to match Istio's principal format and avoid implying that a Kubernetes Service name is used there.
- The Kustomize overlay left the VirtualService host placeholder unresolved. Updated the example patch to replace `spec.hosts` and route destinations with the checkout service FQDN, and used a stable resource name for the base object.
- The CI workflow installed Istio with the full release download command but then invoked `istioctl` as though it were already on PATH. Switched to the official `downloadIstioctl` installer and invoked the installed binary path.
- The CI workflow used `kubeval`, which is no longer maintained. Replaced it with `kubeconform` and added an install step.
- The kubeconform command would fail on missing CRD schemas for Istio resources unless schemas were supplied. Added `-ignore-missing-schemas`, leaving Istio CRD-specific validation to `istioctl analyze`.
- The template version test loop echoed an Istio version variable but did not actually use that version. Updated it to download and run the matching Istio release's `istioctl`.
- The version test loop used Istio 1.18, 1.19, and 1.20, which are unsupported by 2026. Updated the examples to supported/current releases as of the review date.
- The Helm publishing section described pushing to ChartMuseum or OCI with an OCI-only command. Clarified that the shown `helm push ... oci://...` command is for OCI registries.

## Review Notes
The examples are now technically consistent with current Istio, Helm, Kustomize, and validation tooling. In a production chart, consider adding `values.schema.json`, fully qualified service host helpers, and explicit Istio CRD schemas for kubeconform if schema validation of Istio custom resources is required in addition to `istioctl analyze`.
