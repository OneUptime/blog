# Validation Summary: Gatekeeper Mutation vs Validation: What Happens When Both Target the Same Field?

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OPA Gatekeeper v3.23 mutation and validation
- Kubernetes admission control and admission webhooks
- Gatekeeper mutation CRDs
- Gatekeeper ConstraintTemplates and Constraints
- Rego
- Gator CLI
- kubectl server-side dry run

## Sources Consulted
- Gatekeeper mutation documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/mutation/
- Gatekeeper validation and mutation overview: https://open-policy-agent.github.io/gatekeeper/website/docs/#validation-and-mutation
- Gatekeeper v3.23.0 release notes: https://github.com/open-policy-agent/gatekeeper/releases/tag/v3.23.0
- Gatekeeper Gator CLI documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/gator/
- Gatekeeper handling Constraint violations documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/violations/
- Kubernetes dynamic admission control documentation: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes admission webhook good practices: https://kubernetes.io/docs/concepts/cluster-administration/admission-webhooks-good-practices/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes API dry-run documentation: https://kubernetes.io/docs/reference/using-api/api-concepts/#dry-run
- OPA object built-ins reference: https://www.openpolicyagent.org/docs/policy-reference/builtins/object

## Issues Found
- The `pathTests` example used unquoted `subPath` values containing `name: api`. A colon followed by a space is a YAML mapping delimiter, so the snippet did not parse. Quoted both paths to make the configuration valid YAML.
- The post recommended "Gator expansion" as a general way to test mutators. `gator expand` tests `ExpansionTemplate` pipelines and only applies supplied mutators in that expansion context; it does not reproduce ordinary API-server mutation. Changed the guidance to use server-side dry run for mutators and limited the `gator expand` statement to `ExpansionTemplate` pipelines.
- The post described `applyTo.operations` without its version and resource-shape limits. This field was added in Gatekeeper v3.23, and `AssignMetadata` has no `applyTo` field. Added the v3.23 minimum and clarified that `AssignMetadata` cannot use the operation selector.

## Review Notes
The central default-then-enforce explanation is correct: Kubernetes completes mutating admission before validating webhooks run, Gatekeeper validation evaluates the resulting object, and mutating webhook invocation order is not stable. The `AssignMetadata` example matches the current v1 CRD and correctly preserves existing labels. The Rego expression and `pathTests` example are intentionally partial snippets rather than complete standalone policy resources. The Gator and kubectl commands use current supported flags and syntax.
