# Validation Summary: Build a KubeVela Workflow That Waits for Infrastructure Before Deployment

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- KubeVela v1.11 Applications and workflows
- Kubernetes Applications, Secrets, ConfigMaps, Deployments, and custom resources
- KubeVela `depends-on-app` and `apply-component` workflow steps
- KubeVela workflow dependencies, timeouts, inputs, outputs, debugging, restart, and resume behavior
- KubeVela `webservice`, `helmchart`, `helm`, and `k8s-objects` component types
- Helm SDK and the KubeVela FluxCD addon
- `vela` and `kubectl` command-line tools

## Sources Consulted

- [KubeVela v1.11 built-in workflow step reference](https://kubevela.io/docs/end-user/workflow/built-in-workflow-defs/)
- [KubeVela v1.11 built-in component reference](https://kubevela.io/docs/end-user/components/references/)
- [KubeVela component orchestration and component dependencies](https://kubevela.io/docs/end-user/workflow/component-dependency-parameter/)
- [KubeVela workflow step dependencies](https://kubevela.io/docs/end-user/workflow/dependency/)
- [KubeVela workflow step timeout semantics](https://kubevela.io/docs/end-user/workflow/timeout/)
- [KubeVela workflow inputs and outputs](https://kubevela.io/docs/end-user/workflow/inputs-outputs/)
- [KubeVela workflow operations](https://kubevela.io/docs/end-user/workflow/operations/)
- [KubeVela workflow working mechanism](https://kubevela.io/docs/platform-engineers/workflow/working-mechanism/)
- [KubeVela workflow debugging guidance](https://kubevela.io/docs/platform-engineers/debug/debug/)
- [KubeVela `vela status` CLI reference](https://kubevela.io/docs/cli/vela_status/)
- [KubeVela `vela up` CLI reference](https://kubevela.io/docs/cli/vela_up/)
- [KubeVela `vela show` CLI reference](https://kubevela.io/docs/cli/vela_show/)
- [KubeVela v1.11.0 release](https://github.com/kubevela/kubevela/releases/tag/v1.11.0)
- [KubeVela v1.11.0 `depends-on-app` definition](https://github.com/kubevela/kubevela/blob/v1.11.0/vela-templates/definitions/internal/workflowstep/depends-on-app.cue)
- [KubeVela v1.11.0 native `helmchart` definition](https://github.com/kubevela/kubevela/blob/v1.11.0/vela-templates/definitions/internal/component/helmchart.cue)
- [KubeVela FluxCD addon reference](https://kubevela.io/docs/reference/addons/fluxcd/)
- [Kubernetes Secrets documentation](https://kubernetes.io/docs/concepts/configuration/secret/)
- [Kubernetes guidance for injecting Secret data into environment variables](https://kubernetes.io/docs/tasks/inject-data-application/distribute-credentials-secure/)

## Issues Found

- The timeout section said that a missing dependency could leave the release running indefinitely. The v1.11 `depends-on-app` implementation enters its conditional wait only after finding the Application or applying its same-name, same-namespace ConfigMap fallback. If neither source is usable, the step follows normal workflow error and retry handling instead of waiting indefinitely. The post now distinguishes that case from an existing Application that never reaches `running`, which can wait indefinitely without a step timeout.

## Review Notes

- The review targets the current KubeVela v1.11.0 release. The native Helm-SDK-backed `helmchart` component is a v1.11 feature; older installations may expose only other Helm component definitions. The post correctly tells readers to inspect installed schemas with `vela show` and not mix `helmchart` with the FluxCD addon's `helm` schema.
- The YAML snippets parse successfully. Their image digest, chart URL/version, resource API, and resource names are explicitly marked as placeholders or illustrative and must be replaced before deployment.
- Workflow debugging runs against the real environment and Application workflow debugging requires a debug policy (or deployment with `vela up --debug`). The post appropriately recommends read-only status inspection in production and test-namespace debugging.
