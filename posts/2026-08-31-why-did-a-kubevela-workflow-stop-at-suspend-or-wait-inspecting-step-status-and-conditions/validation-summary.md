# Validation Summary: Why Did a KubeVela Workflow Stop at `suspend` or `wait`? Inspecting Step Status and Conditions

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- KubeVela Applications and application workflows
- KubeVela CLI
- KubeVela `WorkflowStepDefinition` resources and CUE workflow operations
- Kubernetes and `kubectl`
- Helm SDK-backed KubeVela `helmchart` components

## Sources Consulted

- [KubeVela: Suspend and Resume](https://kubevela.io/docs/end-user/workflow/suspend/)
- [KubeVela: Built-in WorkflowStep Type](https://kubevela.io/docs/end-user/workflow/built-in-workflow-defs/)
- [KubeVela: Timeout of Step](https://kubevela.io/docs/end-user/workflow/timeout/)
- [KubeVela: Workflow Dependency](https://kubevela.io/docs/end-user/workflow/dependency/)
- [KubeVela: Workflow Operations](https://kubevela.io/docs/end-user/workflow/operations/)
- [KubeVela CLI: `vela status`](https://kubevela.io/docs/cli/vela_status/)
- [KubeVela CLI: `vela workflow resume`](https://kubevela.io/docs/cli/vela_workflow_resume/)
- [KubeVela CLI: `vela workflow logs`](https://kubevela.io/docs/cli/vela_workflow_logs/)
- [KubeVela CLI: `vela def get`](https://kubevela.io/docs/cli/vela_def_get/) and [`vela def list`](https://kubevela.io/docs/cli/vela_def_list/)
- [KubeVela: Debug Workflow](https://kubevela.io/docs/platform-engineers/debug/debug/)
- [KubeVela: Built-in Components Type, including `helmchart`](https://kubevela.io/docs/end-user/components/references/)
- [KubeVela workflow engine: workflow step phases](https://github.com/kubevela/workflow/blob/6b7aedc67359c4658b098c40b36c50b9c21f9ddf/api/v1alpha1/types.go#L165-L181), [dependency pending checks](https://github.com/kubevela/workflow/blob/6b7aedc67359c4658b098c40b36c50b9c21f9ddf/pkg/tasks/custom/task.go#L373-L395), and [dependency completion behavior](https://github.com/kubevela/workflow/blob/6b7aedc67359c4658b098c40b36c50b9c21f9ddf/pkg/executor/workflow.go#L794-L831)
- [KubeVela source: built-in `suspend`](https://github.com/kubevela/kubevela/blob/a85ef5133995e93a7584b8fb1cc24e8f634e74ec/vela-templates/definitions/internal/workflowstep/suspend.cue), [`deploy`](https://github.com/kubevela/kubevela/blob/a85ef5133995e93a7584b8fb1cc24e8f634e74ec/vela-templates/definitions/internal/workflowstep/deploy.cue), and [`depends-on-app`](https://github.com/kubevela/kubevela/blob/a85ef5133995e93a7584b8fb1cc24e8f634e74ec/vela-templates/definitions/internal/workflowstep/depends-on-app.cue) definitions
- [KubeVela source: `apply-component` health waiting](https://github.com/kubevela/kubevela/blob/a85ef5133995e93a7584b8fb1cc24e8f634e74ec/pkg/workflow/providers/oam/apply.go#L73-L107)
- [Kubernetes: `kubectl logs`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)

## Issues Found

- The resource-tree form of `vela status` does not show the normal workflow flag and step summary. Added a non-tree detailed status command so readers can inspect workflow state while retaining the tree command for component resources.
- Resume and workflow-log examples relied on the CLI's Application-first lookup. Added `--type app` to identify the Application explicitly when an Application and WorkflowRun could share a name.
- Definition lookup commands implicitly searched only `vela-system`, which could miss an Application-namespace override. Qualified `vela show`, `vela def get`, and `vela def list` with the `apps` and `vela-system` namespaces, and restricted `def` queries to `workflow-step` definitions.
- The DAG explanation incorrectly said a dependent could remain pending because its dependency was terminally skipped or failed. Corrected it: pending applies while the dependency is unfinished or retrying; a terminally failed or skipped dependency normally causes the dependent step to be skipped unless its `if` condition permits execution.
- The `helmchart` explanation did not name the current field path. Corrected it to `properties.options.wait` and clarified that it configures Helm SDK install/upgrade readiness waiting.
- The timeout example omitted its minimum version and overstated the effect on every later step. Added the KubeVela v1.5+ requirement and described the documented result precisely: step phase `failed`, reason `Timeout`, workflow `terminated: true`, and the following default step in the linear example skipped.
- The phase legend used `suspended`, but the current raw step phase is `suspending` and the workflow separately exposes `suspend: true`. Corrected the phase name and expanded `pending` to include unresolved required inputs.
- Workflow debugging was described without its prerequisite. Added that Applications require a `debug` policy and WorkflowRuns require the `workflowrun.oam.dev/debug: "true"` annotation.

## Review Notes

The corrected post was reviewed against the current KubeVela v1.11 documentation and upstream source. Its explicit version caveats remain important: suspend `duration` is supported in v1.4+, step `timeout` in v1.5+, and CLI/schema details should be checked against the installed release. The current v1.11 `helmchart` component and its `properties.options.wait` behavior are version-specific, so the post correctly tells readers to inspect their installed schema.
