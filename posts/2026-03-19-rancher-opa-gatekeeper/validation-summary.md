# Validation Summary: How to Set Up OPA Gatekeeper with Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- OPA Gatekeeper
- Helm
- kubectl
- Rego

## Sources Consulted
- Rancher Helm Charts and Apps documentation: https://ranchermanager.docs.rancher.com/v2.11/how-to-guides/new-user-guides/helm-charts-in-rancher
- Rancher OPA Gatekeeper integration documentation (archived, includes deprecation notice and UI flow): https://ranchermanager.docs.rancher.com/v2.8/integrations-in-rancher/opa-gatekeeper
- Gatekeeper installation documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/install
- Gatekeeper ConstraintTemplate documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates
- Gatekeeper usage documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/howto
- Gatekeeper handling constraint violations documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/violations
- Gatekeeper metrics documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/metrics
- Gatekeeper policy library documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/library
- Gatekeeper Helm chart README: https://github.com/open-policy-agent/gatekeeper/blob/master/charts/gatekeeper/README.md
- Gatekeeper Helm chart values: https://raw.githubusercontent.com/open-policy-agent/gatekeeper/master/charts/gatekeeper/values.yaml
- Gatekeeper policy library repository README: https://github.com/open-policy-agent/gatekeeper-library
- Gatekeeper policy library privileged containers template: https://raw.githubusercontent.com/open-policy-agent/gatekeeper-library/master/library/pod-security-policy/privileged-containers/template.yaml
- Gatekeeper policy library allowed repos template: https://raw.githubusercontent.com/open-policy-agent/gatekeeper-library/master/library/general/allowedrepos/template.yaml

## Issues Found
- The post implied Rancher generally supports Gatekeeper through the UI and used outdated UI navigation. I updated the intro, prerequisites, and UI steps to reflect the current `Apps > Charts` path and to note that Rancher's built-in OPA Gatekeeper integration is deprecated and only applies to Rancher versions that still include it.
- The namespace label test showed a fully deterministic error example even though the missing-label set ordering is not guaranteed. I changed the wording to say the output is similar to the example.
- The privileged-container policy only checked `containers` and `initContainers`. I added `ephemeralContainers` so the example better matches current Pod container surfaces.
- The allowed-repositories policy only checked `containers`. I added `initContainers` and `ephemeralContainers` so the policy covers the full Pod spec shown in upstream library examples.
- Steps 5 and 6 did not include `kubectl apply` commands for the template and constraint manifests. I added the missing apply commands so the steps can be followed end to end.
- The metrics command used `kubectl get --raw /metrics -n gatekeeper-system`, which does not read Gatekeeper's metrics endpoint. I replaced it with a working port-forward example against the Gatekeeper audit deployment.
- The metric name `gatekeeper_constraint_template_status` is not a documented current Gatekeeper metric. I replaced the metrics list with documented audit metrics that match the corrected metrics command.
- The policy library install command `kubectl apply -f gatekeeper-library/library/` would not install the library correctly as written. I replaced it with `kubectl apply -k gatekeeper-library/library`, which uses the repository's Kustomize layout.

## Review Notes
- Rancher's OPA Gatekeeper integration is deprecated in Rancher documentation, with Kubewarden presented as the replacement. The post remains technically relevant because Gatekeeper itself can still be installed with Helm on Rancher-managed clusters.
- The custom ConstraintTemplates in the post are valid examples, but the upstream Gatekeeper policy library now commonly ships richer templates that also include CEL-based validation alongside Rego.
