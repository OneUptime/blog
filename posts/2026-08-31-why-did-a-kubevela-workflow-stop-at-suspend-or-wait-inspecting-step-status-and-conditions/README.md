# Why Did a KubeVela Workflow Stop at `suspend` or `wait`? Inspecting Step Status and Conditions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Workflow, Troubleshooting, Application Delivery

Description: Distinguish intentional KubeVela suspension from dependency, health, timeout, and custom wait failures by reading workflow phases and conditions.

---

A workflow stopped at `suspend` is usually doing exactly what its author requested. KubeVela's built-in `suspend` step pauses until an operator resumes it or its optional `duration` expires. By contrast, `wait` is not a universal built-in step name across KubeVela releases; it may be a custom `WorkflowStepDefinition`, a UI description of a running dependency, or a Helm component's `wait` property. Inspect the installed definition before choosing a command.

Do not blindly run `vela workflow resume`. Resume is correct for an approved suspension, but it does not make an unhealthy component ready, satisfy a `depends-on-app` gate, repair a custom step, or undo a timeout.

## Read the workflow, not just the headline status

```bash
vela version
vela status checkout --namespace apps --detail
vela status checkout --namespace apps --tree --detail
vela status checkout --namespace apps -o yaml
kubectl get application checkout --namespace apps -o yaml
```

Capture:

- workflow `finished`, `suspend`, and `terminated` flags;
- each step's name, type, phase, reason, and message;
- step dependencies and skipped steps;
- Application conditions and observed generation;
- current publish version and revision; and
- component health beneath the blocked step.

Preserve this state before resuming, restarting, or editing. A new attempt can replace the most useful failure message.

## Recognize an intentional `suspend`

A manual gate looks like:

```yaml
workflow:
  steps:
    - name: deploy-staging
      type: deploy
      properties:
        policies: ["staging"]
    - name: approve-production
      type: suspend
      properties:
        message: "Verify staging evidence before production"
    - name: deploy-production
      type: deploy
      properties:
        policies: ["production"]
```

Status should show the earlier step succeeded, `approve-production` running or suspending, and workflow suspension true. Review the required evidence and authorization, then resume the exact Application and namespace:

```bash
vela workflow resume checkout --namespace apps --type app
```

The CLI also supports selecting a step in versions documented by `vela workflow resume --help`. Use it only when the workflow design calls for that behavior.

An automatic suspension can be written with `duration`:

```yaml
- name: soak
  type: suspend
  properties:
    duration: 10m
```

If it does not resume, compare controller time, duration syntax, controller logs, and the installed `suspend` schema. Duration support exists in KubeVela v1.4 and later according to the official reference.

## Check `deploy` with `auto: false`

The built-in `deploy` step has an `auto` property. `auto: false` intentionally suspends before deployment, even when there is no explicit `suspend` step:

```yaml
- name: deploy-production
  type: deploy
  properties:
    auto: false
    policies: ["production"]
```

The step message and rendered workflow reveal this. Treat it as the same approval boundary: verify destination, policies, artifact digest, and change authorization before resume.

## Identify a dependency wait

Workflow step `dependsOn` prevents a step from starting until named predecessors complete. `depends-on-app` waits for another Application to run, and `apply-component` waits for the component's health logic. Their status is not an operator suspension.

```bash
vela status infrastructure --namespace platform
vela status infrastructure --namespace platform --tree --detail
vela show depends-on-app --namespace apps
vela show apply-component --namespace apps
```

Check for a misspelled dependency name, failed predecessor, missing Application, wrong namespace, or unhealthy resource. If the gate waits on component health, inspect readiness probes and the ComponentDefinition's health policy. Resume cannot bypass those conditions.

In DAG mode, a step can remain pending while a dependency is still running or retrying. Once a dependency is terminally failed or skipped, the dependent step is normally skipped unless its `if` condition allows it to run. Draw the dependency chain from `dependsOn` and find the first non-succeeded ancestor rather than debugging the last pending step.

## Determine what `wait` actually means

First query the platform API:

```bash
vela show wait --namespace apps
vela def get wait --type workflow-step --namespace apps
vela def get wait --type workflow-step --namespace vela-system
vela def list --type workflow-step --namespace apps
vela def list --type workflow-step --namespace vela-system
```

Definitions are namespaced. The `show` command checks `apps` first and falls back to `vela-system`; the explicit `def` commands reveal the source in either location.

If `wait` is a custom `WorkflowStepDefinition`, review its source, inputs, timeout, conditions, external calls, and logs. A custom step might wait for a Kubernetes condition, an HTTP response, a metric, or manual approval. Do not infer semantics from the name.

If `wait` appears as `properties.options.wait` inside a current `helmchart` component, it is a Helm operation property that asks the Helm SDK install or upgrade path to wait for rendered resources to become ready. Inspect the component and its generated resources; `vela workflow resume` is unrelated. The current reference also documents health and single-replica caveats, so use the schema for your installed version.

If a UI says “waiting,” inspect raw Application status to discover the actual step type and phase.

## Check timeouts and termination

Step timeouts require KubeVela v1.5 or later. A workflow step can declare:

```yaml
- name: approval
  type: suspend
  timeout: 15m
```

The official timeout example shows that an unresumed suspend step becomes `failed` with reason `Timeout`, workflow `terminated` becomes true, and the following step in its linear workflow is skipped. Once timed out, this is no longer a live suspension. Review the failed release and choose restart, rollback, or a new publish version according to the release procedure.

Distinguish:

- **suspending** with workflow `suspend: true`: can normally resume;
- **terminated/failed**: requires an explicit recovery decision;
- **pending**: a dependency or required input has not become available;
- **running**: step is actively reconciling or polling; and
- **skipped**: workflow logic decided not to execute it.

## Inspect logs and debug safely

```bash
vela workflow logs checkout --namespace apps --type app --step <step-name>
```

The official CLI notes that step logs are available only when the definition configures logging. Missing output is not proof that the step did nothing. For an Application, the workflow debug command requires a `debug` policy; a WorkflowRun uses the `workflowrun.oam.dev/debug: "true"` annotation. It can then expose CUE variables, but official guidance warns that debugging runs against the real environment. Reproduce custom waits in a test namespace and use read-only status/controller logs in production.

For controller-level failures:

```bash
kubectl get pods --namespace vela-system
kubectl logs --namespace vela-system deployment/<vela-core-deployment> \
  --since=30m
```

Discover the real Deployment name first. Correlate logs by Application namespace/name, generation, and time.

## Recover according to the phase

- Approved manual gate: resume once, then watch the next step.
- Unhealthy dependency: repair it or publish corrected desired state; do not bypass health.
- Custom wait bug: fix and version the WorkflowStepDefinition, then test a restart in isolation.
- Timeout or failure: inspect side effects before restart; steps must be idempotent.
- Wrong release: suspend if still executing, then follow KubeVela revision rollback guidance.

Never remove workflow status fields or finalizers to force progress. That can orphan side effects and break resource tracking.

## Official Documentation

- [KubeVela suspend and resume](https://kubevela.io/docs/end-user/workflow/suspend/)
- [KubeVela built-in workflow steps](https://kubevela.io/docs/end-user/workflow/built-in-workflow-defs/)
- [KubeVela workflow timeout](https://kubevela.io/docs/end-user/workflow/timeout/)
- [KubeVela workflow dependencies](https://kubevela.io/docs/end-user/workflow/dependency/)
- [KubeVela workflow command group](https://kubevela.io/docs/cli/vela_workflow/)
- [KubeVela workflow logs](https://kubevela.io/docs/cli/vela_workflow_logs/)

## Conclusion

Read the exact step type, phase, message, dependencies, and workflow flags before acting. Resume intentional `suspend` and `auto: false` gates only after approval; repair dependency health rather than bypassing it; and look up any `wait` definition because it is not one universal operation. Timeouts turn a pause into a failed release, so recovery then requires side-effect review and an explicit restart or rollback decision.
