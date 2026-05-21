# Validation Summary: How to Implement Admission Control for ArgoCD Deployments

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD Applications, sync options, sync waves, and notifications
- Kubernetes admission controllers and dynamic admission webhooks
- OPA Gatekeeper Helm chart, ConstraintTemplates, constraints, audit, and namespace exemptions
- Rego policies for Gatekeeper
- Kubernetes resource manifests

## Sources Consulted
- Kubernetes Dynamic Admission Control: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes Admission Controllers: https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- Argo CD Sync Phases and Waves: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD Sync Options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Notifications Triggers: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD Notifications Templates: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/templates/
- Gatekeeper ConstraintTemplates: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- Gatekeeper Handling Constraint Violations: https://open-policy-agent.github.io/gatekeeper/website/docs/violations/
- Gatekeeper Exempting Namespaces: https://open-policy-agent.github.io/gatekeeper/website/docs/exempt-namespaces/
- Gatekeeper Runtime Flags: https://open-policy-agent.github.io/gatekeeper/website/docs/runtime-flags/
- Gatekeeper Helm chart values for v3.15.0: https://raw.githubusercontent.com/open-policy-agent/gatekeeper/v3.15.0/charts/gatekeeper/values.yaml

## Issues Found
- The post said it covered Kyverno, but did not include any Kyverno implementation. Removed Kyverno from the description and summary so the scope matches the content.
- The Argo CD sync failure explanation implied any rejected Pod from a workload would fail the Argo CD sync. Clarified that Argo CD reports a sync failure when admission rejects a resource Argo CD applies directly, while controller-created Pods can fail after the Deployment itself was accepted.
- The Gatekeeper Helm values placed `exemptNamespaces` at the chart root. In the Gatekeeper v3.15.0 chart, this setting belongs under `controllerManager.exemptNamespaces`; updated the YAML and clarified that it allows those namespaces to use the `admission.gatekeeper.sh/ignore` label.
- The `templates.gatekeeper.sh/v1` `K8sRequireNonRoot` ConstraintTemplate did not include a structural `openAPIV3Schema`. Added an empty `type: object` schema, as required for v1 ConstraintTemplates.
- The resource limits section claimed to cover every container, but the constraint matches only Pod resources. Updated the wording to "every Pod container."
- The warn-mode explanation claimed Argo CD would show warnings in sync output. Gatekeeper warn mode returns Kubernetes warning headers for admission requests without failing them; updated the text to avoid overstating Argo CD-specific behavior.
- The notification trigger name and expression were misleading. Renamed the trigger from `on-sync-status-unknown` to `on-sync-failed` and used optional access for `operationState`, matching Argo CD notifications guidance for optional status fields.

## Review Notes
The examples intentionally match Pod resources for resource and non-root checks. For teams that want Argo CD syncs of Deployments or StatefulSets to fail before workload controllers create Pods, future revisions could add workload-template policies or Gatekeeper expansion templates.
