# KubeVela ComponentDefinition vs TraitDefinition for Reusable Platform APIs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Platform Engineering, Application Delivery

Description: Choose between KubeVela ComponentDefinition and TraitDefinition, shape stable parameters, and evolve a reusable application-facing platform API.

---

Use a `ComponentDefinition` when the capability is the deployable thing; use a `TraitDefinition` when the capability modifies or accompanies a component. A web service, worker, Helm chart, database, or raw Kubernetes object is a component. Scaling, ingress, sidecars, observability, and autoscaling are traits because application authors attach them to a component.

That distinction is more than taxonomy. KubeVela evaluates a component to produce its primary workload and optional auxiliary resources. It then evaluates attached traits in the component's context. A trait can patch the workload or emit sibling resources through `outputs`. Designing the boundary correctly prevents every component type from duplicating the same operational knobs.

## Compare the contracts

| Question | ComponentDefinition | TraitDefinition |
| --- | --- | --- |
| What does it represent? | A deployable artifact or service | Optional operational behavior |
| How is it referenced? | `components[].type` | `components[].traits[].type` |
| Typical output | Primary Deployment, Job, Helm release, or custom resource | Patch plus Service, Ingress, HPA, ScaledObject, or policy resource |
| Compatibility concerns | Owns workload shape and health | Must declare or honor compatible workload types |
| Reuse axis | Reused across Applications | Reused across component types that share a workload contract |

If removing the capability means there is no workload left, it is probably a component. If removing it leaves the workload running with fewer operational features, it is probably a trait.

## Start from user intent, not Kubernetes fields

Suppose a platform supports internal HTTP services. A useful component API might expose:

```cue
parameter: {
	image: string
	port:  *8080 | int & >0 & <=65535
	replicas: *2 | int & >=1 & <=20
	resources?: {
		cpu:    string
		memory: string
	}
}
```

This contract expresses what an application team needs. Avoid exposing a complete Deployment spec under `parameter`; doing so freezes Kubernetes implementation details into your public API and defeats the platform abstraction. Keep escape hatches rare, named, and governed.

Generate a scaffold with the version-matched CLI:

```bash
vela def init api-service --type component \
  --desc "Internal HTTP service with platform defaults" \
  --output api-service.cue
```

The component template should create a stable primary workload, set selectors consistently, and define health and status behavior. The official protocol identifies the workload through `spec.workload`, while the CUE template renders resources under `output` and optional `outputs`.

## Extract orthogonal behavior into a trait

Public routing should not be baked into every HTTP component. A route trait can accept a small contract:

```cue
parameter: {
	host: string
	path: *"/" | string
	port: int & >0 & <=65535
}
```

Generate its scaffold separately:

```bash
vela def init http-route --type trait \
  --desc "Expose an HTTP route through the platform ingress" \
  --output http-route.cue
```

A resource-producing trait must put its objects under uniquely named `outputs`, not the component's primary `output`. It can read `context.output` for the primary workload and `context.outputs` for auxiliary component resources. Use current `networking.k8s.io/v1` Ingress fields and a Service selector derived from the same component identity.

Declare compatibility rather than hoping every workload has a Deployment-shaped pod template:

```cue
"http-route": {
	type: "trait"
	attributes: {
		appliesToWorkloads: ["deployments.apps", "statefulsets.apps"]
		conflictsWith: ["external-route"]
	}
}
```

`appliesToWorkloads` declares where the trait is intended to be valid, but KubeVela v1.11.0 does not check it when applying an Application, so enforce that contract in platform validation. `conflictsWith` is also metadata only in v1.11.0; admission enforcement was merged after that release, so confirm that the installed build includes the fix before relying on early rejection. For a trait that wraps a resource requiring a workload reference, `workloadRefPath` can tell KubeVela where to inject it; when emitting a KEDA `ScaledObject`, many platforms instead render `scaleTargetRef` explicitly from the component context. Confirm behavior against the installed release.

## Define ownership field by field

Two capabilities should not continuously write the same field. Common collisions include:

- `scaler`, HPA, and KEDA all controlling `spec.replicas`;
- a component and route trait both creating the same Service;
- two traits using the same output key or Kubernetes object name;
- GitOps and KubeVela both reconciling the rendered Deployment; and
- a rollout controller and the component controller disagreeing about pod-template fields.

Document one owner for each mutable field. KubeVela's `apply-once` policy can exclude selected fields, such as replicas, from repeated reconciliation so an autoscaler can own them. This is an explicit contract, not a general cure for overlapping controllers.

## Design parameters for evolution

Treat definition parameters as a public API:

- provide safe defaults for optional behavior;
- validate ranges and enums in CUE;
- make new fields optional before applications depend on them;
- do not silently change a default that alters exposure, storage, identity, or availability;
- prefer additive changes over renaming or changing types; and
- publish examples and generated reference documentation.

Definitions participate in Application revisions. An old Application revision can snapshot runtime dependencies, but that does not eliminate migration planning for currently reconciled Applications. Test both new and existing parameter sets before replacing a shared definition.

Names should describe intent (`internal-service`, `scheduled-task`, `http-route`) rather than implementation (`deployment-with-service-v2`). The platform can later change implementation while preserving the contract.

## Test the API at three levels

First, render the definition itself:

```bash
vela def render api-service.cue
vela show api-service.cue
```

Second, dry-run representative Applications with local definitions:

```bash
vela dry-run --definition ./definitions/ \
  --file examples/minimal.yaml
```

Check the exact flags with `vela help dry-run` because CLI releases differ. Cover minimum/default parameters, every optional branch, invalid values, and trait compatibility. Inspect object names, selectors, ownership, RBAC, health, and generated API versions.

Third, apply to an isolated namespace or test cluster and exercise reconciliation, updates, deletion, revision behavior, and a rollback. CUE compilation alone cannot prove that an IngressClass exists or a custom controller accepts the generated resource.

## Publish and observe definitions

```bash
vela def apply api-service.cue
vela def apply http-route.cue
vela def list
vela show api-service
vela show http-route
```

Use a Git-reviewed delivery path in production rather than editing shared definitions interactively. Record the definition source revision and maintain conformance examples. Metrics and status messages should let application teams distinguish parameter validation, rendering, admission, scheduling, and health failures without reading the CUE implementation.

## Official Documentation

- [KubeVela OAM definition protocol](https://kubevela.io/docs/platform-engineers/oam/x-definition/)
- [KubeVela custom ComponentDefinition](https://kubevela.io/docs/platform-engineers/components/custom-component/)
- [KubeVela custom TraitDefinition](https://kubevela.io/docs/platform-engineers/traits/customize-trait/)
- [KubeVela definition management](https://kubevela.io/docs/platform-engineers/cue/definition-edit/)
- [KubeVela `vela def` commands](https://kubevela.io/docs/cli/vela_def/)
- [KubeVela `apply-once` policy reference](https://kubevela.io/docs/end-user/policies/references/#apply-once)

## Conclusion

Make the component the reusable deployable product and the trait an attachable operational capability. Keep parameters small and intent-based, declare workload compatibility and conflicts, assign one owner per mutable field, and test definition changes against real Applications. A good KubeVela platform API hides Kubernetes mechanics without hiding important operational choices.
