# Validation Summary: How to Integrate ArgoCD with Open Policy Agent (OPA)

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Argo CD Applications, hooks, sync waves, and custom health checks
- OPA Gatekeeper Helm chart, ConstraintTemplates, Constraints, admission control, audit, and metrics
- Conftest policy checks
- Kubernetes Jobs and manifests
- Rego policy snippets

## Sources Consulted
- Argo CD sync phases, hooks, and waves: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD resource health customizations: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Gatekeeper ConstraintTemplates documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- Gatekeeper constraints and match fields: https://open-policy-agent.github.io/gatekeeper/website/docs/howto/
- Gatekeeper audit documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/audit/
- Gatekeeper constraint violation and enforcementAction documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/violations/
- Gatekeeper metrics documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/metrics/
- Gatekeeper Helm chart v3.22.0 Chart.yaml and values.yaml: https://github.com/open-policy-agent/gatekeeper/tree/v3.22.0/charts/gatekeeper
- Conftest output and test command documentation: https://www.conftest.dev/output/
- Conftest options documentation: https://www.conftest.dev/options/

## Issues Found
- The Gatekeeper Application used chart version `3.14.0`, which is outdated relative to the current Gatekeeper docs reviewed. Updated it to `3.22.0`.
- The Gatekeeper Helm values included `audit.replicas`, but the official Gatekeeper chart pins the audit deployment to one replica and does not expose that value. Removed the ignored value.
- The `K8sContainerLimits` template and constraint defined `cpu` and `memory` parameters that the Rego policy never used. Removed those unused parameters so the example matches its actual behavior: requiring CPU and memory limits to be present.
- The no-latest-image Rego rule checked for any colon in the full image string, which misses untagged images from registries with ports such as `localhost:5000/nginx`. Updated the rule to check only the final image name segment.
- The sync-wave explanation implied ordering across independent Argo CD Applications. Clarified that sync waves must be applied within one application or to child `Application` resources in an app-of-apps setup.
- The Conftest hook pointed `--policy` at the Gatekeeper policies directory. Clarified that Conftest needs Rego policy files and changed the example policy path to `conftest/policy/`.

## Review Notes
- The Conftest PreSync hook is illustrative and assumes an image/runtime that includes the shell and Git tooling used by the script. In production, a pinned custom image with `conftest`, `git`, and any required credentials setup would be preferable.
- The Gatekeeper examples use legacy `targets[].rego` syntax, which remains supported. Gatekeeper 3.19+ also supports Rego v1 syntax through `targets[].code[]`.
