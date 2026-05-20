# Validation Summary: How to Implement Policy-As-Code with ArgoCD and OPA

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- Argo CD Applications, sync waves, hooks, and notifications
- Kubernetes admission control and workload manifests
- OPA Gatekeeper ConstraintTemplates and Constraints
- Rego policy language
- Conftest policy testing
- Prometheus metrics for Gatekeeper

## Sources Consulted
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD sync phases and waves: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD notification triggers: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD notification examples: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/examples/
- Gatekeeper ConstraintTemplates documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- Gatekeeper handling constraint violations: https://open-policy-agent.github.io/gatekeeper/website/docs/violations/
- Gatekeeper audit documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/audit/
- Gatekeeper runtime flags: https://open-policy-agent.github.io/gatekeeper/website/docs/runtime-flags/
- Gatekeeper metrics documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/metrics/
- Gatekeeper OPA version matrix: https://open-policy-agent.github.io/gatekeeper/website/docs/opa-versions/
- Gatekeeper GitHub releases: https://github.com/open-policy-agent/gatekeeper/releases
- Conftest usage documentation: https://www.conftest.dev/
- Conftest policy sharing documentation: https://www.conftest.dev/sharing/
- Conftest options documentation: https://www.conftest.dev/options/

## Issues Found
- The Gatekeeper Helm chart example pinned `targetRevision: 3.14.0`, which is outdated as of the review date. Updated it to `3.22.2`, the current Gatekeeper release identified in the official release information.
- The ConstraintTemplate matched `Deployment`, `StatefulSet`, and `DaemonSet` resources but read containers from `input.review.object.spec.containers`. Those workload kinds store containers under `spec.template.spec.containers`, so the policy would not evaluate the intended fields. Updated both Rego rules to use `input.review.object.spec.template.spec.containers`.
- The gradual rollout section described `warn` and `dryrun` in a confusing order and implied a separate dry-run step after warn. Updated the text to state that both `dryrun` and `warn` avoid blocking deployments, while `warn` also returns admission warnings.
- The audit result explanation said the constraint status would show all existing violations. Gatekeeper limits reported violations by `constraintViolationsLimit`, so the text now says it shows audited violations up to that configured limit.
- The PreSync Conftest hook assumed manifests were available at `/manifests` without defining a volume or explaining how they got there. Updated the hook to clone a manifest repository into an `emptyDir` volume before running Conftest.
- The Conftest example pulled policies and then tested with `--policy /policies`, but no `/policies` path was created. Replaced it with Conftest's documented `test --update <url> <file>` flow for pulling policies and testing in one command.
- The monitoring section referenced `gatekeeper_constraint_template_status`, which is not a documented Gatekeeper metric. Replaced it with `gatekeeper_constraint_templates` and `gatekeeper_constraint_template_ingestion_count`.
- The monitoring section described audit results as historical compliance data. Gatekeeper's documented `gatekeeper_violations` metric represents audited violations, so the wording was corrected to avoid implying a historical data store.

## Review Notes
- The post is technically relevant and contains working implementation guidance after the corrections.
- The examples still use simplified placeholder repositories and registries such as `myorg` and `registry.myorg.com`; readers must replace those with real repositories and authentication where needed.
