# How to Debug CUE Evaluation Errors in a KubeVela ComponentDefinition

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Troubleshooting, Platform Engineering, Application Delivery

Description: Isolate KubeVela ComponentDefinition CUE failures by rendering locally, minimizing parameters, inspecting constraints and context, and testing safely.

---

A CUE evaluation error means KubeVela could not produce one concrete, valid resource graph from the definition, Application parameters, and runtime context. It occurs before a Kubernetes scheduler or container runtime can fix anything. Start with the earliest CUE message and the smallest render that reproduces it; downstream `Application` status often wraps the same root conflict in broader workflow errors.

Typical messages fall into a few groups:

- **conflicting values**: two constraints unify to an empty value, such as `replicas: >=2` and input `1`;
- **incomplete value**: a required field remains only `string`, `int`, or another unconstrained type when concrete YAML is required;
- **field not allowed**: a closed struct rejects an unexpected Application property;
- **undefined field**: the template reads a parameter or context path that does not exist;
- **cycle**: values depend on each other recursively; or
- **list/type mismatch**: the Application supplies a scalar where the definition expects a list or object.

## Preserve the failing inputs

Collect the exact definition revision, Application, CLI/core versions, and status before editing:

```bash
vela version
vela status payments --namespace apps -o yaml
kubectl get application payments --namespace apps -o yaml
vela def get api-service > /tmp/api-service.cue
```

`vela def get` retrieves the installed definition in CUE form. If the Application uses a snapshotted definition revision, also inspect the relevant `ApplicationRevision`; testing only today's shared definition can miss the historical failure.

Avoid repeatedly updating the production Application. Each change can generate a revision or restart its workflow and make the original evidence harder to correlate.

## Render the definition before the Application

The current CLI provides `vela def render`:

```bash
vela def vet ./api-service.cue
vela def render ./api-service.cue
vela def render ./api-service.cue --format cue
vela show ./api-service.cue
```

`vela def vet` checks the CUE syntax and definition wrapper, while render shows the Kubernetes definition or raw CUE template. Neither command supplies all Application parameters or runtime context, so a successful definition check is necessary but not sufficient.

Use the CUE CLI directly for standalone fragments:

```bash
cue fmt api-service.cue
cue vet api-service.cue
cue eval api-service.cue
```

KubeVela definitions have a wrapper understood by `vela def`; do not assume raw `cue export` precisely emulates the KubeVela evaluator. Use CUE tools for syntax and unification insight, then confirm with KubeVela's renderer.

## Dry-run one minimal Application

Create an Application containing one component and only required parameters:

```yaml
apiVersion: core.oam.dev/v1beta1
kind: Application
metadata:
  name: cue-minimal
spec:
  components:
    - name: api
      type: api-service
      properties:
        image: nginx:1.27
```

Run it against the local definition:

```bash
vela dry-run --definition ./api-service.cue --file ./minimal-app.yaml
```

Older and newer CLIs can expose slightly different flags; verify with `vela help dry-run`. If the minimal case succeeds, add one parameter and one trait at a time until the conflict returns. If it fails, remove optional template branches until one constraint remains responsible.

## Read CUE as constraints, not assignment

In CUE, repeated fields unify. They do not overwrite one another:

```cue
parameter: {
	replicas: *2 | int & >=1 & <=10
}

output: {
	apiVersion: "apps/v1"
	kind: "Deployment"
	spec: replicas: parameter.replicas
}
```

Input `replicas: 20` conflicts with `<=10`; it is not clamped to ten. Make the validation message discoverable through parameter documentation and test the boundary values.

A required unconstrained field remains incomplete:

```cue
parameter: image: string
output: spec: template: spec: containers: [{
	name:  context.name
	image: parameter.image
}]
```

The Application must provide `image`. If it should be optional, give it a safe default. Do not add arbitrary defaults just to silence incompleteness-an accidental default image, host, or storage class can be worse than a clear failure.

## Check optional fields and list shape

Guard optional output rather than referencing it unconditionally:

```cue
parameter: {
	command?: [...string]
}

container: {
	name:  context.name
	image: parameter.image
	if parameter.command != _|_ {
		command: parameter.command
	}
}
```

Then ensure YAML matches the type:

```yaml
command: ["/app/server", "--listen=:8080"]
```

Quoting a number changes it to a string. A single object is not equivalent to a one-element list. YAML parsers can also coerce unquoted values such as booleans, so quote values when the definition requires strings.

## Inspect context and output boundaries

Component templates normally produce the primary resource under `output` and auxiliary objects under `outputs`. Runtime fields such as `context.name`, `context.namespace`, and component identity are provided by KubeVela. A typo like `context.componentName` can remain invisible until the relevant branch evaluates.

Traits run with the component's rendered resources available through `context.output` and `context.outputs`. If an error appears only after attaching a trait, dry-run the component without traits, then add each trait separately. Look for:

- two definitions using the same output key;
- a trait assuming a Deployment-shaped primary output;
- selectors reading a label the component never sets;
- a trait patch conflicting with a closed component field; or
- an optional auxiliary output referenced as mandatory.

Use `appliesToWorkloads` to reject structurally incompatible traits early.

## Debug in a safe environment

KubeVela's `vela debug` can inspect rendered variables and resources for an Application. The official documentation warns that workflow debugging runs in the real environment. Add the documented debug policy and use it only in an isolated test cluster or namespace:

```bash
vela up --file minimal-app.yaml --debug
vela debug cue-minimal
```

For a production failure, prefer read-only status, revision inspection, local render, and a cloned test case. If evaluation reaches Kubernetes but admission rejects the object, CUE succeeded; switch to server-side schema, webhook, RBAC, and event troubleshooting.

## Prevent regressions

Maintain table-driven examples for defaults, optional branches, invalid bounds, every supported trait, and upgrades from old parameter shapes. Format and render definitions in CI, dry-run representative Applications, and validate generated resources against the Kubernetes versions you support. Version shared definition changes and avoid interactive production edits.

## Official Documentation

- [KubeVela `vela def render`](https://kubevela.io/docs/cli/vela_def_render/)
- [KubeVela definition management and dry-run](https://kubevela.io/docs/platform-engineers/cue/definition-edit/)
- [KubeVela debugging](https://kubevela.io/docs/platform-engineers/debug/debug/)
- [KubeVela ComponentDefinition](https://kubevela.io/docs/platform-engineers/components/custom-component/)
- [CUE language tour: unification](https://cuelang.org/docs/tour/basics/constraints/)
- [CUE command reference](https://cuelang.org/docs/reference/command/cue-help/)

## Conclusion

Debug CUE failures by preserving the exact revision, rendering the definition, reproducing with one minimal component, and then adding parameters and traits incrementally. Interpret CUE fields as unified constraints, guard optional values, verify list and scalar types, and separate evaluation failures from Kubernetes admission or runtime failures. Fix the smallest conflicting constraint and lock it down with render and dry-run tests.
