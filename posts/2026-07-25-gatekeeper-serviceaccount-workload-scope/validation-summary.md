# Validation Summary: How to Apply a Gatekeeper Policy Only to One ServiceAccount or Workload

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- OPA Gatekeeper
- Kubernetes
- Kubernetes ServiceAccounts and RBAC
- Rego
- Gatekeeper Constraints and ConstraintTemplates
- Gatekeeper workload expansion
- `kubectl` and the `gator` CLI

## Sources Consulted

- [Gatekeeper: How to use Gatekeeper and Constraint match fields](https://open-policy-agent.github.io/gatekeeper/website/docs/howto/#the-match-field)
- [Gatekeeper: Admission Review Input](https://open-policy-agent.github.io/gatekeeper/website/docs/input/)
- [Gatekeeper: ConstraintTemplates](https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/)
- [Gatekeeper: OPA Versions](https://open-policy-agent.github.io/gatekeeper/website/docs/opa-versions/)
- [Gatekeeper: Working with Workload Resources](https://open-policy-agent.github.io/gatekeeper/website/docs/workload-resources/)
- [Gatekeeper: Validating Workload Resources using ExpansionTemplate](https://open-policy-agent.github.io/gatekeeper/website/docs/expansion/)
- [Gatekeeper: The gator CLI](https://open-policy-agent.github.io/gatekeeper/website/docs/gator/)
- [Gatekeeper: Handling Constraint Violations](https://open-policy-agent.github.io/gatekeeper/website/docs/violations/)
- [Kubernetes: Authenticating with ServiceAccount tokens](https://kubernetes.io/docs/reference/access-authn-authz/authentication/#service-account-tokens)
- [Kubernetes: Configure Service Accounts for Pods](https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/)
- [Kubernetes: Using RBAC Authorization](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [Kubernetes: Extending Kubernetes](https://kubernetes.io/docs/concepts/extend-kubernetes/)
- [Kubernetes: kubectl apply](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/)
- [Open Policy Agent: Object built-ins](https://www.openpolicyagent.org/docs/policy-reference/builtins/object)

## Issues Found

- The post said to protect an individual workload label with RBAC. Kubernetes RBAC authorizes operations on resources rather than arbitrary object fields, so it cannot protect only one label. The warning now says that RBAC can restrict who updates the workload, recommends admission policy for requiring the label, and notes that any owner-controlled selector, including `spec.serviceAccountName`, is not a security boundary by itself.
- The server-side dry-run examples used Deployment manifests even though the sample Constraint matches only Pods. A dry-run Deployment is not persisted, so its controllers do not create a Pod and the Pod-only Constraint is not exercised unless Gatekeeper workload expansion is configured. The examples now use Pod manifests and explicitly state the workload-expansion exception.

## Review Notes

- The Rego snippets compiled successfully in OPA v1.17.1, the OPA version embedded in Gatekeeper v3.23.0, using Gatekeeper's default Rego v0 compatibility. Gatekeeper 3.19 and later also support opt-in Rego v1 syntax through `targets[].code[]`.
- All YAML snippets parsed successfully, and the complete Deployment example passed `kubectl` client-side resource validation.
- The repeatable `gator test -f` flags accept both files and directories as shown.
- The post does not target a specific Kubernetes or Gatekeeper version; the APIs and commands were checked against the current official documentation.
