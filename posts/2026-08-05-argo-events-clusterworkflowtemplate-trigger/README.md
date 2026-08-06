# Trigger a ClusterWorkflowTemplate from Argo Events Without Duplication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Events, Argo Workflows, ClusterWorkflowTemplate, Sensor, Kubernetes RBAC, Reusable Workflows

Description: Submit a thin Workflow from Argo Events that references a ClusterWorkflowTemplate, parameterizes only inputs, and preserves one reusable spec.

---

Do not copy a `ClusterWorkflowTemplate`'s templates into every Argo Events Sensor. The Sensor should create a thin namespaced `Workflow` whose `spec.workflowTemplateRef` names the cluster-scoped template and sets `clusterScope: true`.

This keeps responsibility clear:

- the `ClusterWorkflowTemplate` owns shared workflow logic;
- the Sensor owns event selection and input mapping;
- the generated Workflow records one execution in a target namespace.

Creating a Workflow from a `ClusterWorkflowTemplate` with `workflowTemplateRef.clusterScope: true` is supported by Argo Workflows v2.9 and later. Check the installed Argo Workflows version and CRD before using this pattern.

## Define a Submittable ClusterWorkflowTemplate

When the thin Workflow does not set an `entrypoint`, the cluster template needs one, along with any argument declarations that callers override:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ClusterWorkflowTemplate
metadata:
  name: build-and-publish
spec:
  entrypoint: pipeline
  arguments:
    parameters:
      - name: repository
      - name: revision
      - name: event-id
  templates:
    - name: pipeline
      dag:
        tasks:
          - name: build
            template: build
          - name: publish
            dependencies: [build]
            template: publish
    - name: build
      container:
        image: ghcr.io/example/builder@sha256:replace-with-real-digest
        args:
          - build
          - '{{workflow.parameters.repository}}'
          - '{{workflow.parameters.revision}}'
    - name: publish
      container:
        image: ghcr.io/example/publisher@sha256:replace-with-real-digest
        args:
          - publish
          - '{{workflow.parameters.revision}}'
```

Replace placeholder digests with real approved images. A `ClusterWorkflowTemplate` is cluster-scoped, but its executions are still namespaced Workflows and pods.

## Submit a Thin Workflow from the Sensor

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Sensor
metadata:
  name: build-events
  namespace: argo-events
spec:
  template:
    serviceAccountName: build-workflow-trigger
  dependencies:
    - name: build-request
      eventSourceName: build-hook
      eventName: requests
      filters:
        data:
          - path: body.repository
            type: string
            value: ['^example/[a-z0-9-]+$']
  triggers:
    - template:
        name: submit-build
        conditions: build-request
        argoWorkflow:
          operation: submit
          source:
            resource:
              apiVersion: argoproj.io/v1alpha1
              kind: Workflow
              metadata:
                generateName: event-build-
                namespace: builds
                labels:
                  workflow-purpose: build
              spec:
                serviceAccountName: build-workflow
                workflowTemplateRef:
                  name: build-and-publish
                  clusterScope: true
                arguments:
                  parameters:
                    - name: repository
                      value: unset
                    - name: revision
                      value: unset
                    - name: event-id
                      value: unset
          parameters:
            - src:
                dependencyName: build-request
                dataKey: body.repository
              dest: spec.arguments.parameters.0.value
            - src:
                dependencyName: build-request
                dataKey: body.revision
              dest: spec.arguments.parameters.1.value
            - src:
                dependencyName: build-request
                dataKey: body.eventId
              dest: spec.arguments.parameters.2.value
```

The trigger contains no task templates or container details. It carries execution metadata, the cluster template reference, and event-derived arguments.

The `clusterScope: true` flag is essential. Without it, Argo Workflows interprets the name as a namespaced `WorkflowTemplate` reference and reports that the template is not found.

## Do Not Confuse Two Reference Types

Argo Workflows has two related fields:

- `workflowTemplateRef` at `Workflow.spec` creates the Workflow from an entire WorkflowTemplate or ClusterWorkflowTemplate spec;
- `templateRef` inside a DAG task or steps entry calls one named template from an external template resource.

For a Sensor that submits the whole reusable pipeline, use `workflowTemplateRef`. Use `templateRef` inside the cluster template only when composing it from other reusable template fragments.

## Grant Submission and Template Read Access

The Sensor service account needs `create` and `list` access to Workflows in `builds`. In the Kubernetes-client mode shown here, the `argoWorkflow` trigger runs the Argo CLI, which validates `workflowTemplateRef` before creation and checks for `get`, `list`, and `watch` access to `ClusterWorkflowTemplate` resources. Keep the namespaced and cluster-scoped rules separate:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: submit-build-workflows
  namespace: builds
rules:
  - apiGroups: ["argoproj.io"]
    resources: ["workflows"]
    verbs: ["create", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: submit-build-workflows
  namespace: builds
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: submit-build-workflows
subjects:
  - kind: ServiceAccount
    name: build-workflow-trigger
    namespace: argo-events
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: read-cluster-workflow-templates
rules:
  - apiGroups: ["argoproj.io"]
    resources: ["clusterworkflowtemplates"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: read-cluster-workflow-templates
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: read-cluster-workflow-templates
subjects:
  - kind: ServiceAccount
    name: build-workflow-trigger
    namespace: argo-events
```

`ClusterWorkflowTemplate` is cluster-scoped, so a namespaced Role cannot grant access to it. The Workflow controller independently needs `get`, `list`, and `watch`; a standard cluster-scoped Argo Workflows installation normally grants those permissions to its controller service account. Verify both identities through audit logs and `kubectl auth can-i`.

The ClusterRole above permits reading every cluster template. Kubernetes can restrict `list` and `watch` with `resourceNames` only when the client includes a matching `metadata.name` field selector, which the Argo CLI access check does not do. Treat cluster-wide template visibility as an intentional platform trust boundary. If that is too broad, use a Kubernetes resource trigger with `operation: create` so the Sensor only creates the thin Workflow and the Workflow controller resolves the reference.

## Keep Namespace Policy in the Thin Workflow

Cluster scope makes logic reusable, not universally safe. The namespaced Workflow remains the place to apply:

- workflow pod service account, when the controller's template-reference policy permits that override;
- target namespace;
- labels and annotations for ownership and cost;
- event id and business inputs;
- namespace-specific defaults allowed by policy.

Use admission policy to prevent a Sensor from selecting an unapproved `serviceAccountName`, host namespace, privileged pod setting, or arbitrary cluster template. The ability to submit a shared template should not become the ability to inject arbitrary pod specs.

On current Argo Workflows v4 releases, `workflowRestrictions.templateReferencing: Strict` or `Secure` rejects `serviceAccountName` and other security-sensitive fields in the thin Workflow by default. In that mode, define the pod service account in the `ClusterWorkflowTemplate` or explicitly allow the override in the controller configuration. The example above assumes the default restriction mode or an approved override policy.

## Decide How Template Updates Affect Runs

A new Workflow is resolved from the current `ClusterWorkflowTemplate`. Workflows already admitted and reconciled store a resolved workflow spec in status so active execution is not simply a live pointer to every future template edit. Still, a replay tomorrow may use a newer template than the original event used.

For reproducibility:

- version template names for breaking changes, such as `build-and-publish-v2`;
- record template identity and application revision as labels or parameters;
- review updates through GitOps and policy;
- keep old versions until replay and rollback windows expire.

Do not assume a mutable template name plus a historical event produces byte-for-byte identical execution.

## Validate Before Connecting Events

First submit the reference directly:

```bash
argo -n builds submit \
  --from clusterworkflowtemplate/build-and-publish \
  -p repository=example/payments \
  -p revision=8b65f2a \
  -p event-id=manual-test
```

Then verify Sensor permissions:

```bash
kubectl auth can-i create workflows.argoproj.io \
  --as=system:serviceaccount:argo-events:build-workflow-trigger \
  -n builds

kubectl auth can-i get clusterworkflowtemplates.argoproj.io/build-and-publish \
  --as=system:serviceaccount:argo-events:build-workflow-trigger

kubectl auth can-i list clusterworkflowtemplates.argoproj.io \
  --as=system:serviceaccount:argo-events:build-workflow-trigger

kubectl auth can-i watch clusterworkflowtemplates.argoproj.io \
  --as=system:serviceaccount:argo-events:build-workflow-trigger
```

Finally send a nonproduction event and inspect the thin Workflow:

```bash
kubectl -n builds get workflows -l events.argoproj.io/sensor=build-events
kubectl -n builds get workflow event-build-xxxxx -o yaml
```

Confirm `spec.workflowTemplateRef.clusterScope`, arguments, service account, labels, and resolved status.

## Official Documentation

- [Argo Workflows ClusterWorkflowTemplates](https://argo-workflows.readthedocs.io/en/latest/cluster-workflow-templates/)
- [Argo Workflows WorkflowTemplates](https://argo-workflows.readthedocs.io/en/latest/workflow-templates/)
- [Argo Workflows workflow restrictions](https://argo-workflows.readthedocs.io/en/latest/workflow-restrictions/)
- [Argo Events Argo Workflow trigger](https://argoproj.github.io/argo-events/sensors/triggers/argo-workflow/)
- [Argo Events trigger parameterization](https://argoproj.github.io/argo-events/tutorials/02-parameterization/)
- [Kubernetes RBAC](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)

## Conclusion

Reference a `ClusterWorkflowTemplate` from a thin namespaced Workflow and set `clusterScope: true`. Keep task logic in the shared template, event mapping in the Sensor, and namespace security on the execution. Grant only the required verbs, treat cluster-template visibility as a platform trust boundary, version breaking template changes, and test the reference directly before adding the event path.
