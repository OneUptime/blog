# Trigger WorkflowTemplates Across Namespaces with Argo Events

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Events, Argo Workflows, WorkflowTemplate, Kubernetes RBAC, ServiceAccount, Namespaces

Description: Trigger a namespaced WorkflowTemplate from an Argo Events Sensor in another namespace with explicit target metadata and least-privilege RBAC.

---

An Argo Events Sensor submits a Workflow into its own namespace by default. To target another namespace, set `metadata.namespace` on the Workflow resource embedded in the trigger and grant the Sensor's service account permissions in that target namespace.

The template lookup boundary is equally important: a namespaced `WorkflowTemplate` must be in the same namespace as the submitted Workflow. A Sensor in `argo-events` can submit a Workflow in `payments-prod` that references a `WorkflowTemplate` in `payments-prod`; it cannot make a namespaced reference jump to a third namespace.

## Map the Three Identities

Do not collapse these service accounts into one:

| Identity | Namespace | Purpose |
| --- | --- | --- |
| Sensor pod service account | `argo-events` | submits and inspects the Workflow |
| Workflow pod service account | `payments-prod` | runs workload pods and reports task results |
| Workflow controller service account | installation namespace | reconciles Workflows in watched namespaces |

This guide uses `payments-workflow-trigger` for the Sensor and `payments-workflow` for workflow pods.

## Create the Target WorkflowTemplate

```yaml
apiVersion: argoproj.io/v1alpha1
kind: WorkflowTemplate
metadata:
  name: deploy-payments
  namespace: payments-prod
spec:
  entrypoint: deploy
  serviceAccountName: payments-workflow
  arguments:
    parameters:
      - name: revision
      - name: event-id
  templates:
    - name: deploy
      container:
        image: ghcr.io/example/deployer@sha256:replace-with-real-digest
        args:
          - deploy
          - --revision
          - '{{workflow.parameters.revision}}'
```

The image digest is a placeholder and must be replaced with a real approved image. `serviceAccountName` in this template affects workflow pods, not the Sensor.

## Create the Sensor Service Account

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: payments-workflow-trigger
  namespace: argo-events
```

Bind that cross-namespace subject to a Role in the target namespace:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: submit-payments-workflows
  namespace: payments-prod
rules:
  - apiGroups: ["argoproj.io"]
    resources: ["workflows"]
    verbs: ["create", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: submit-payments-workflows
  namespace: payments-prod
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: submit-payments-workflows
subjects:
  - kind: ServiceAccount
    name: payments-workflow-trigger
    namespace: argo-events
```

A RoleBinding can bind a service account from another namespace. A ClusterRoleBinding is not required merely because the subject is cross-namespace. Argo Events' general example uses broad verbs for several workflow resources; production policy should be narrowed to the operations actually used by your installed Argo Events and Argo Workflows versions.

The Argo Workflow trigger currently invokes the `argo` CLI and lists the submitted Workflow by labels after submission, which is why `list` appears above. Validate permissions against the exact operation and release.

The workflow controller, not the Sensor, resolves `workflowTemplateRef`, so this submit operation does not require the Sensor service account to read `WorkflowTemplate` resources.

## Point the Trigger at the Target Namespace

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Sensor
metadata:
  name: payments-release
  namespace: argo-events
spec:
  template:
    serviceAccountName: payments-workflow-trigger
  dependencies:
    - name: release
      eventSourceName: release-hook
      eventName: requests
      filters:
        data:
          - path: body.service
            type: string
            value: ['^payments$']
          - path: body.environment
            type: string
            value: ['^production$']
  triggers:
    - template:
        name: deploy-payments
        conditions: release
        argoWorkflow:
          operation: submit
          source:
            resource:
              apiVersion: argoproj.io/v1alpha1
              kind: Workflow
              metadata:
                generateName: deploy-payments-
                namespace: payments-prod
              spec:
                workflowTemplateRef:
                  name: deploy-payments
                arguments:
                  parameters:
                    - name: revision
                      value: unset
                    - name: event-id
                      value: unset
          parameters:
            - src:
                dependencyName: release
                dataKey: body.revision
              dest: spec.arguments.parameters.0.value
            - src:
                dependencyName: release
                dataKey: body.eventId
              dest: spec.arguments.parameters.1.value
```

The decisive field is `metadata.namespace: payments-prod` inside the trigger's source resource. Putting a namespace on the Sensor, EventSource, or WorkflowTemplate reference does not redirect Workflow creation.

## Grant the Workflow Pod Its Own Permissions

Current Argo Workflows uses `WorkflowTaskResult` resources for executor results. The official minimum executor RBAC grants workflow pods `create` and `patch` on `workflowtaskresults`:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: payments-workflow
  namespace: payments-prod
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: workflow-executor
  namespace: payments-prod
rules:
  - apiGroups: ["argoproj.io"]
    resources: ["workflowtaskresults"]
    verbs: ["create", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: payments-workflow-executor
  namespace: payments-prod
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: workflow-executor
subjects:
  - kind: ServiceAccount
    name: payments-workflow
    namespace: payments-prod
```

Add workload-specific permissions separately. Do not give deployment, Secret, or cloud permissions to the Sensor just because workflow pods need them.

## Confirm the Controller Watches the Target

RBAC can be correct while no controller reconciles the Workflow. Argo Workflows can be installed cluster-wide or in namespace-scoped mode with either its installation namespace or one separate managed namespace. Confirm that the workflow controller is configured to watch `payments-prod` and has permissions there.

Check status after submission:

```bash
kubectl -n payments-prod get workflows
kubectl -n payments-prod describe workflow deploy-payments-xxxxx
kubectl -n argo-events logs -l sensor-name=payments-release --since=10m
```

A Workflow that remains without controller-driven status suggests controller scope or controller RBAC, while a Sensor `forbidden` error points to the Sensor service account.

## Validate Permissions Before Sending Events

Use impersonation to verify exact rights:

```bash
kubectl auth can-i create workflows.argoproj.io \
  --as=system:serviceaccount:argo-events:payments-workflow-trigger \
  -n payments-prod

kubectl auth can-i list workflows.argoproj.io \
  --as=system:serviceaccount:argo-events:payments-workflow-trigger \
  -n payments-prod

kubectl auth can-i create workflows.argoproj.io \
  --as=system:serviceaccount:argo-events:payments-workflow-trigger \
  -n another-team
```

The first two should return `yes`; the last should return `no`. Authorization checks may themselves require impersonation permission for the human or CI identity running them.

Then submit a known fixture and verify the Workflow's namespace, template reference, service account, arguments, and labels.

## Common Cross-Namespace Failures

- **Workflow appears in `argo-events`:** `metadata.namespace` was omitted or placed at the wrong level.
- **Sensor gets `forbidden`:** the RoleBinding subject namespace/name is wrong, or the target Role lacks an operation the trigger performs.
- **Template not found:** the `WorkflowTemplate` is not in the Workflow's namespace, or the name differs.
- **Workflow exists but never runs:** controller watch scope, controller RBAC, quota, or scheduling problem.
- **Pods are forbidden writing results:** workflow pod service account lacks executor permissions.
- **Unexpected broad access:** a ClusterRoleBinding granted cluster-wide verbs when a target RoleBinding would suffice.

## Official Documentation

- [Argo Events Argo Workflow trigger](https://argoproj.github.io/argo-events/sensors/triggers/argo-workflow/)
- [Argo Events example RBAC](https://github.com/argoproj/argo-events/tree/master/examples/rbac)
- [Argo Workflows WorkflowTemplates](https://argo-workflows.readthedocs.io/en/latest/workflow-templates/)
- [Argo Workflows service accounts](https://argo-workflows.readthedocs.io/en/latest/service-accounts/)
- [Argo Workflows workflow RBAC](https://argo-workflows.readthedocs.io/en/latest/workflow-rbac/)
- [Kubernetes RBAC](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)

## Conclusion

Cross-namespace submission needs an explicit Workflow namespace, a template in that same target namespace, and a RoleBinding there for the Sensor's service account. Keep Sensor submission rights, workflow pod rights, and controller watch rights separate, then prove both allowed and denied paths with impersonated authorization checks.
