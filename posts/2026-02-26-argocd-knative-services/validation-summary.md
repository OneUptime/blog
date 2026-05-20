# Validation Summary: How to Deploy Knative Services with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Knative Serving
- Knative Eventing
- Kourier
- Knative autoscaling
- Knative traffic splitting
- Argo CD custom health checks

## Sources Consulted
- Knative Serving YAML installation docs: https://knative.dev/docs/install/yaml-install/serving/install-serving-with-yaml/
- Knative Eventing YAML installation docs: https://knative.dev/docs/install/yaml-install/eventing/install-eventing-with-yaml/
- Knative traffic management docs: https://knative.dev/docs/serving/traffic-management/
- Knative autoscaling scale-to-zero docs: https://knative.dev/docs/serving/autoscaling/scale-to-zero/
- Knative autoscaling metrics docs: https://knative.dev/docs/serving/autoscaling/autoscaling-metrics/
- Knative ApiServerSource docs: https://knative.dev/docs/eventing/sources/apiserversource/getting-started/
- Knative ApiServerSource reference: https://knative.dev/docs/eventing/sources/apiserversource/reference/
- Knative Trigger docs: https://knative.dev/docs/eventing/triggers/
- Knative domain configuration docs: https://knative.dev/docs/serving/using-a-custom-domain/
- Knative private Services docs: https://knative.dev/docs/serving/services/private-services/
- Argo CD resource health docs: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD Knative Service health customization: https://github.com/argoproj/argo-cd/tree/master/resource_customizations/serving.knative.dev/Service

## Issues Found
- Updated Knative Serving manifest URLs from `knative-v1.13.0` to `knative-v1.22.0`, matching the current Knative YAML installation docs.
- Added the current Kourier manifest URL so the Argo CD application path points to a concrete, current install manifest.
- Added `percent: 0` to the tagged canary traffic target to match Knative's documented pattern for creating a direct test URL without routing main traffic to that target.
- Corrected the canary URL in the Mermaid diagram to include the namespace, matching the text example.
- Corrected the description of `autoscaling.knative.dev/scale-to-zero-pod-retention-period`; it keeps the last pod for a minimum period after the autoscaler decides to scale to zero, rather than directly setting an idle timeout.
- Corrected the `scale-to-zero-grace-period` comment; it is an upper bound for internal network programming before the last replica is removed, not the idle period before scale-to-zero.
- Added the Eventing MT Channel Broker manifest note and a `Broker` resource because the Trigger example references `broker: default`.
- Added ServiceAccount, Role, and RoleBinding resources for the ApiServerSource example because the named service account needs get/list/watch permissions for Kubernetes Events.
- Removed the obsolete `controller: true` field from the ApiServerSource resource list, aligning the example with the current `sources.knative.dev/v1` reference.
- Updated the Trigger filter to use the current `filters` field with an `exact` filter instead of the legacy `filter.attributes` form.
- Changed the Argo CD health-check wording to be version-aware because current Argo CD includes a built-in Knative Service health customization, while custom checks remain useful for versions or resources without built-in support.
- Corrected the `config-domain` example comment and selector. The selector matches labels on Knative routes/services, not a namespace; the example now uses `environment: production`.

## Review Notes
The guide is now technically valid as a GitOps-oriented example. In a production article, it would be useful to mention that installing Knative through raw upstream manifests via Argo CD requires deliberate upgrade management, and that Eventing broker choices should be selected based on durability and production requirements.
