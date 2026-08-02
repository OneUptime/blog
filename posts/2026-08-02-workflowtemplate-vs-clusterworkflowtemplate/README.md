# WorkflowTemplate vs. ClusterWorkflowTemplate: Choosing the Right Reuse Boundary

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Workflows, WorkflowTemplate, ClusterWorkflowTemplate, Kubernetes, Multi-Tenancy, RBAC, GitOps

Description: Choose namespaced WorkflowTemplates or cluster-scoped ClusterWorkflowTemplates based on ownership, tenancy, RBAC, dependencies, change risk, and reuse across namespaces.

---

`WorkflowTemplate` and `ClusterWorkflowTemplate` can hold reusable Argo Workflows definitions and be called from steps or DAG tasks. Their decisive difference is Kubernetes scope:

- A `WorkflowTemplate` is namespaced and is reused within its namespace.
- A `ClusterWorkflowTemplate` is cluster-scoped and can be accessed across namespaces in the cluster.

That scope is an ownership and change-management boundary—not just a way to save duplicated YAML. A cluster template can affect many teams at once, while a namespaced template can evolve with one tenant or application.

## First, Separate `template` from `WorkflowTemplate`

Argo uses similar names for two different concepts:

- A lowercase **template** is one entry under `spec.templates`. It may be a `container`, `script`, `dag`, `steps`, `resource`, `suspend`, or another supported template type.
- A **WorkflowTemplate** is a Kubernetes custom resource that contains reusable workflow configuration, including one or more lowercase templates.

For example, `print-message` is a template inside the `WorkflowTemplate` resource:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: WorkflowTemplate
metadata:
  name: team-utilities
  namespace: team-a
spec:
  templates:
    - name: print-message
      inputs:
        parameters:
          - name: message
      container:
        image: alpine:3.23
        command: [echo]
        args: ["{{inputs.parameters.message}}"]
```

Changing the resource kind to `ClusterWorkflowTemplate` changes where that library lives and who can consume or administer it. It does not change the meaning of the inner container template.

## Scope Comparison

| Concern | `WorkflowTemplate` | `ClusterWorkflowTemplate` |
| --- | --- | --- |
| Kubernetes scope | Namespaced | Cluster-scoped |
| Name uniqueness | Within one namespace | Across the cluster |
| Reference default | `clusterScope` omitted or false | `clusterScope: true` |
| Typical owner | Application or namespace team | Platform or workflow-platform team |
| Change blast radius | Consumers in one namespace | Consumers in many namespaces |
| RBAC administration | `Role` and `RoleBinding` can be enough | Editing normally requires cluster-scoped RBAC |
| Namespaced dependencies | Naturally colocated | Must be available in each workflow namespace |
| Best use | Tenant-specific pipelines and policies | Stable organization-wide building blocks |

The word “cluster” does not mean a workflow runs outside a namespace. A submitted `Workflow` is still namespaced, its pods run in that namespace, and its service account and other namespaced resources are resolved there.

## Reference One Template from a WorkflowTemplate

External template references belong on a task in a `steps` or `dag` template. A workflow in `team-a` can call the namespaced resource shown above:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: use-team-utilities-
  namespace: team-a
spec:
  entrypoint: main
  serviceAccountName: workflow-runner
  templates:
    - name: main
      dag:
        tasks:
          - name: greet
            templateRef:
              name: team-utilities
              template: print-message
            arguments:
              parameters:
                - name: message
                  value: hello-from-team-a
```

No `clusterScope` field is needed. Argo resolves `team-utilities` as a `WorkflowTemplate` in the workflow's namespace.

This boundary is useful when `team-a` owns the image, parameters, rollout schedule, and permissions. Another namespace can have a separate `team-utilities` resource with the same Kubernetes name and different implementation.

## Reference One Template from a ClusterWorkflowTemplate

A shared cluster resource omits `metadata.namespace`:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ClusterWorkflowTemplate
metadata:
  name: platform-utilities-v1
spec:
  templates:
    - name: print-message
      inputs:
        parameters:
          - name: message
      container:
        image: alpine:3.23
        command: [echo]
        args: ["{{inputs.parameters.message}}"]
```

The consumer opts into cluster scope explicitly:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: use-platform-utilities-
  namespace: team-a
spec:
  entrypoint: main
  serviceAccountName: workflow-runner
  templates:
    - name: main
      steps:
        - - name: greet
            templateRef:
              name: platform-utilities-v1
              template: print-message
              clusterScope: true
            arguments:
              parameters:
                - name: message
                  value: hello-from-a-cluster-template
```

Without `clusterScope: true`, Argo looks for a namespaced `WorkflowTemplate` with that name. A “template not found” error can therefore mean the scope flag is wrong even when `kubectl get clusterworkflowtemplate platform-utilities-v1` succeeds.

## Reference an Entire Workflow Spec

Both resource types can be submittable definitions with an `entrypoint`, arguments, and templates. A thin `Workflow` can reference the whole `WorkflowTemplate`:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: team-release-
  namespace: team-a
spec:
  workflowTemplateRef:
    name: team-release
  arguments:
    parameters:
      - name: version
        value: 2026.08.02
```

For a cluster-scoped definition, add the scope flag:

```yaml
spec:
  workflowTemplateRef:
    name: platform-release-v2
    clusterScope: true
  arguments:
    parameters:
      - name: version
        value: 2026.08.02
```

Use `templateRef` to invoke a specific inner template from a DAG or steps task. Use top-level `workflowTemplateRef` to construct a Workflow from the reusable resource's workflow spec. Mixing those two mechanisms is a common schema error.

The CLI provides corresponding direct submission forms:

```bash
argo submit \
  --namespace team-a \
  --from workflowtemplate/team-release \
  -p version=2026.08.02

argo submit \
  --namespace team-a \
  --from clusterworkflowtemplate/platform-release-v2 \
  -p version=2026.08.02
```

## Choose WorkflowTemplate for Tenant-Owned Behavior

A namespaced `WorkflowTemplate` is usually the right default when any of these are true:

- only one namespace consumes it;
- the application team owns its lifecycle;
- it references team-specific ConfigMaps, Secrets, PVCs, image pull secrets, or service accounts;
- different tenants require different defaults or compliance controls;
- release timing should not depend on a cluster administrator; or
- the same logical name should have independent implementations in several namespaces.

Namespace scope aligns the template with the Kubernetes objects it commonly depends on. A `Role` and `RoleBinding` can let the team manage its WorkflowTemplates without granting permission to edit a cluster-wide library.

Duplication is not automatically a design failure. If two teams need similar YAML but must release, audit, and roll it back independently, two namespaced resources may be the safer boundary.

## Choose ClusterWorkflowTemplate for a Platform Contract

A `ClusterWorkflowTemplate` is a good fit when:

- many namespaces need the same stable implementation;
- a platform team owns and supports the contract;
- centralized security review is required;
- fixing one implementation for all consumers is desirable;
- inputs and outputs are intentionally portable across namespaces; and
- cluster-scoped RBAC and GitOps ownership are already defined.

Examples include a standardized source checkout, organization-approved vulnerability scan, provenance generation, notification adapter, or a constrained deployment primitive.

The shared template should expose explicit inputs instead of relying on hidden namespace state. If it needs a Secret named `registry-credentials`, document that every consumer namespace must provide a compatible Secret—or accept its name as a parameter where the field supports parameterization.

## Cluster Scope Does Not Grant Runtime Privilege

Argo's workflow RBAC documentation states that workflow pods run with `workflow.spec.serviceAccountName`, or the workflow namespace's `default` service account when it is omitted. The scope of the reusable template does not transfer the template author's Kubernetes identity into the consumer namespace.

Use a dedicated service account:

```yaml
spec:
  serviceAccountName: workflow-runner
```

Bind only the permissions the workflow needs in each namespace. Argo explicitly advises against using the shared `default` service account in production.

This has two consequences for a ClusterWorkflowTemplate:

1. A resource operation that works in `team-a` can fail in `team-b` because their `workflow-runner` service accounts have different RBAC.
2. A cluster template that names or assumes a namespaced service account, Secret, ConfigMap, PVC, or artifact-repository configuration is portable only if that dependency exists consistently in every consuming namespace.

Test the contract under a representative least-privilege service account in every tenant class. Testing once in the platform namespace is insufficient.

## Separate Submitter, Template-Editor, and Runtime Permissions

There are at least three permission planes:

- **Submitter permissions:** who can create Workflows or submit from templates in a namespace.
- **Template administration:** who can create, update, or delete WorkflowTemplates or ClusterWorkflowTemplates.
- **Runtime permissions:** what the workflow pod's service account can do.

For a namespace team that manages only namespaced templates, a Role can be scoped narrowly:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: workflow-template-editor
  namespace: team-a
rules:
  - apiGroups: [argoproj.io]
    resources: [workflowtemplates]
    verbs: [get, list, watch, create, update, patch, delete]
```

Cluster template editors require a cluster-scoped rule:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cluster-workflow-template-editor
rules:
  - apiGroups: [argoproj.io]
    resources: [clusterworkflowtemplates]
    verbs: [get, list, watch, create, update, patch, delete]
```

Bind the second role only to the platform automation or administrators responsible for the cluster library. Editing a widely referenced ClusterWorkflowTemplate can alter future workflow executions in many namespaces.

Argo also provides workflow restrictions that can require users to submit through `workflowTemplateRef`. Strict modes reduce the fields a submitter can override, and the secure mode additionally checks that a referenced WorkflowTemplate has not changed between operations. These controls can turn reviewed templates into a meaningful submission boundary, but they do not replace Kubernetes RBAC or pod security controls.

## Account for the Controller's Installation Scope

Argo supports cluster, namespace, and managed-namespace installations. A cluster-scoped template being visible in the Kubernetes API does not make a namespace-scoped controller execute Workflows everywhere.

- A cluster install watches and executes Workflows across namespaces according to its configuration and RBAC.
- A namespace install executes Workflows only in its installed namespace.
- A managed-namespace install executes them in its configured managed namespace.

Choose `ClusterWorkflowTemplate` only where the controller installation and permissions support the intended consumers. Resource scope cannot widen the controller's watch scope.

## Version Shared Contracts Deliberately

An in-place update to a shared name has a broad blast radius. Prefer compatibility rules similar to an API:

- add inputs with safe defaults when possible;
- keep input and output names stable within a major contract version;
- pin container images to reviewed release identifiers or digests;
- publish breaking changes under a new resource name such as `platform-scan-v2`;
- migrate consumers explicitly; and
- remove the old resource only after usage is gone.

This is especially important for ClusterWorkflowTemplates, but it also helps namespaced libraries with many CronWorkflows or event-driven submitters.

Use GitOps to review both resource changes and consumer references. A cluster template repository should identify owners, expected service accounts, required namespaced dependencies, supported inputs, outputs, deprecation dates, and rollback procedure.

## Common Failure Modes

### Missing `clusterScope: true`

Argo searches for a namespaced WorkflowTemplate and reports that the reference cannot be resolved. Add the flag only when the named resource is a ClusterWorkflowTemplate.

### Adding `clusterScope: true` to a Namespaced Template

Argo searches the cluster-scoped resource collection instead. Remove the flag and ensure the Workflow and WorkflowTemplate share a namespace.

### Putting `templateRef` at the Wrong Level

Reference an external inner template from a step or DAG task. To reference an entire reusable workflow definition, use `workflowTemplateRef` in the Workflow spec.

### Assuming Cluster Scope Makes Secrets Global

Secrets, ConfigMaps, PVCs, service accounts, and most application resources remain namespaced. Create them in each workflow namespace or redesign the contract.

### Letting Every Team Edit the Cluster Library

That removes the governance value and makes one accidental update a cluster-wide incident. Separate read/submit access from cluster-template administration.

### Omitting `serviceAccountName`

Argo then uses the namespace's `default` service account, which the official workflow RBAC guidance does not recommend for production. Declare a dedicated identity and test its actual permissions.

## Migrate from WorkflowTemplate to ClusterWorkflowTemplate

Use a staged migration:

1. Confirm the template is genuinely identical across namespaces.
2. List all namespaced dependencies and define how each consumer supplies them.
3. Change `kind` to `ClusterWorkflowTemplate` and remove `metadata.namespace` in a new manifest.
4. Give the shared resource a versioned, cluster-unique name.
5. Establish cluster-scoped edit RBAC and GitOps ownership.
6. Add `clusterScope: true` to each `templateRef` or `workflowTemplateRef` consumer.
7. Test under each namespace's workflow service account and artifact-repository configuration.
8. Migrate consumers gradually, then delete old namespaced resources only after references are gone.

Moving in the other direction means creating one WorkflowTemplate per target namespace, removing `clusterScope: true`, and assigning ownership and rollout policy to those namespaces.

## Decision Checklist

Choose a `WorkflowTemplate` if the answer to any of these is “yes”:

- Does one tenant own the behavior?
- Does it depend heavily on namespaced resources?
- Must tenants release or roll back independently?
- Would a global change be an unacceptable blast radius?

Choose a `ClusterWorkflowTemplate` when all of these are true:

- Multiple namespaces need the same contract.
- A platform owner will review and support it.
- Inputs, outputs, images, and namespaced prerequisites are documented.
- Runtime service accounts remain least-privilege in each namespace.
- Breaking changes will be versioned and migrated deliberately.

The best reuse boundary follows authority. Namespaced reuse keeps control with the tenant. Cluster-scoped reuse creates a platform API and should be operated with the same discipline as one.

## Official Documentation

- [Argo Workflows: WorkflowTemplates](https://argo-workflows.readthedocs.io/en/latest/workflow-templates/)
- [Argo Workflows: ClusterWorkflowTemplates](https://argo-workflows.readthedocs.io/en/latest/cluster-workflow-templates/)
- [Argo Workflows: Service accounts](https://argo-workflows.readthedocs.io/en/latest/service-accounts/)
- [Argo Workflows: Workflow RBAC](https://argo-workflows.readthedocs.io/en/latest/workflow-rbac/)
- [Argo Workflows: Security model](https://argo-workflows.readthedocs.io/en/latest/security/)
- [Argo Workflows: Workflow restrictions](https://argo-workflows.readthedocs.io/en/latest/workflow-restrictions/)
- [Argo Workflows: Installation scopes](https://argo-workflows.readthedocs.io/en/latest/installation/)
- [Argo Workflows: Field reference](https://argo-workflows.readthedocs.io/en/latest/fields/)
- [Kubernetes: RBAC authorization](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
