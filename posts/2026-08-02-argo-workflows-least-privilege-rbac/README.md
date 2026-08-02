# Least-Privilege RBAC for Argo Workflows: Controllers, Executors, Users, and Retries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Workflows, Kubernetes, RBAC, Security, Service Accounts, Workflow Executor, Retry

Description: Design least-privilege Argo Workflows RBAC by separating controller, server, submitter, retry operator, and Workflow Pod identities and testing each required permission.

---

Argo Workflows does not have one universal service account. A production installation has several independent callers, and each needs a different permission set:

- the **workflow controller** reconciles Workflow resources and creates Pods;
- the **Argo Server** serves the UI and API under its configured auth mode;
- a **human or API client** submits, reads, retries, or deletes Workflows;
- each **Workflow Pod** runs as `spec.serviceAccountName` (or a template-level override) and includes the Argo executor, which can use a separate service account in Argo Workflows 4;
- artifact and cloud access may use a separate workload identity outside Kubernetes RBAC.

Combining those identities into one `cluster-admin` service account is easy, but it turns a compromised task or token into a cluster-wide incident. Least privilege starts by drawing the boundaries before writing any Role.

## Map the Actors Before the Verbs

| Actor | Identity source | Normal scope | Main responsibility |
| --- | --- | --- | --- |
| Workflow controller | Controller Deployment service account | Managed namespace(s), or cluster for cluster install | Reconcile Workflows; create/delete Pods and related resources |
| Argo Server | Server Deployment service account and/or caller/mapped SSO service account | Installation plus user namespaces | UI/API, archive, artifacts, authentication delegation |
| Submitter | User, group, or API service account | Team namespace | Create/read approved Workflows |
| Retry operator | User, group, or API service account | Team namespace | Read/update a failed Workflow and remove reset Pods |
| Workflow Pod / executor | Workflow or template `serviceAccountName`; optional executor-specific service account in Argo Workflows 4 | Workflow namespace | Report task results and perform task-specific API calls |
| Artifact client | Workflow Pod or Argo Server cloud identity | Bucket/container prefix | Upload/download artifacts and archived logs |

Kubernetes RBAC grants verbs to identities, not to YAML files. Always ask “which process makes this API call?” before adding a permission.

## 1. Scope the Workflow Controller Installation

The controller is a Kubernetes controller and necessarily has substantial privileges. Argo's security documentation lists duties such as updating Workflows and CronWorkflows, creating and deleting Pods, PVCs, and PodDisruptionBudgets, and reading templates, ConfigMaps, service accounts, and Secrets.

Choose the smallest installation topology that fits:

- a **namespace install** watches one namespace;
- a **managed namespace install** runs Argo components in one namespace and executes Workflows in a separate namespace;
- a **cluster install** watches all allowed namespaces and requires cluster-scoped RBAC.

For a single-team platform, do not deploy a cluster-scoped controller merely because the example manifest is convenient. For a shared platform, consider separate controllers or managed-namespace boundaries when teams have different trust levels.

Use the controller Role or ClusterRole shipped with the exact Argo release as the starting point. The required resources evolve with features such as artifact garbage collection, synchronization, offloaded node status, and alternate Pod layouts. Copying a blog's static controller Role is more likely to be both broken and over-broad.

Review the installed bindings:

```bash
CONTROLLER_SA="$(kubectl get deployment -n argo workflow-controller \
  -o jsonpath='{.spec.template.spec.serviceAccountName}')"

printf 'controller service account: %s\n' "$CONTROLLER_SA"

kubectl get rolebinding,clusterrolebinding -A -o json \
  | jq --arg ns argo --arg sa "$CONTROLLER_SA" '
      .items[]
      | select(any(.subjects[]?;
          .kind == "ServiceAccount" and .namespace == $ns and .name == $sa))
      | {kind, namespace: .metadata.namespace, name: .metadata.name, roleRef}
    '
```

Keep these boundaries:

- never run normal Workflow Pods as the controller service account;
- do not bind users to the controller's Role;
- keep user Workflows out of the Argo component namespace;
- restrict controller egress to the Kubernetes API, configured database, artifact store, and required integrations;
- pin and diff RBAC when upgrading Argo.

Argo explicitly warns that allowing users to create Workflows in the controller namespace can let them affect the controller. A namespace-scoped installation that accepts user submissions should therefore use a managed namespace separate from the component namespace.

## 2. Give Workflow Pods Only Executor Minimums

Workflow Pods use the service account named by `workflow.spec.serviceAccountName`, unless a Pod-producing template overrides it with its own `serviceAccountName`. If neither is set, Kubernetes uses the namespace's `default` service account. By default, the executor uses the same credentials; Argo Workflows 4 can instead supply the executor with a separate service-account token through `spec.executor.serviceAccountName` or a template-level `executor.serviceAccountName`. Argo's Workflow RBAC guide recommends against the shared default account in production.

For Argo Workflows 3.4 and later, the documented minimum executor Role is:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: report-runner
  namespace: workflows
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: argo-executor
  namespace: workflows
rules:
  - apiGroups: ["argoproj.io"]
    resources: ["workflowtaskresults"]
    verbs: ["create", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: report-runner-executor
  namespace: workflows
subjects:
  - kind: ServiceAccount
    name: report-runner
    namespace: workflows
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: argo-executor
```

Select it explicitly:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: report-
  namespace: workflows
spec:
  serviceAccountName: report-runner
  entrypoint: main
  templates:
    - name: main
      container:
        image: alpine:3.23
        command: [echo]
        args: ["report"]
```

That Role lets Argo's executor report task results. It does not grant the application permission to read Secrets, deploy resources, or list Pods. In the example, the main container and executor share `report-runner`, so both can use its token. With Argo Workflows 4, a stricter split can set `automountServiceAccountToken: false`, assign a dedicated account under `executor.serviceAccountName`, and bind the executor Role to that account; the executor account also needs the discoverable token Secret described by Argo's Service Account Secrets documentation.

Add application permissions separately. For example, a resource template that reads one named ConfigMap can use `resourceNames`:

```yaml
- apiGroups: [""]
  resources: ["configmaps"]
  resourceNames: ["report-settings"]
  verbs: ["get"]
```

If a Workflow creates Deployments, its runtime service account needs the corresponding `create` permission. If it only calls an external API and does not need Kubernetes credentials beyond the executor, keep the Role at the executor minimum.

Artifact repository authorization is commonly cloud IAM rather than Kubernetes RBAC. Bind the Workflow service account to only the required bucket or container prefix, and give the Argo Server separate read access if it must display artifacts.

## 3. Separate Workload Classes

One runtime service account per risk class is usually more practical than one per Workflow:

```text
report-runner       executor minimum + read report-settings
deploy-runner       executor minimum + deploy in staging namespace
backup-runner       executor minimum + backup Secret + object-store prefix
untrusted-runner    executor minimum, no cloud identity
```

Do not gradually add every task's permissions to a shared `workflow-runner`. That creates a union of privileges where every Workflow can use permissions intended for every other Workflow.

Template-level `serviceAccountName` can select another service account for particular Pod-producing templates. Use this only when the elevation is clear and the template itself is controlled; otherwise it becomes an easy privilege boundary to miss in review.

Also enforce Pod security with namespace admission controls, security contexts, image policy, and network policy. RBAC limits Kubernetes API calls; it does not prevent a container from using host networking, privileged mounts, or a cloud credential exposed by its environment.

## 4. Give Submitters Workflow Permissions, Not Pod-Creation Permissions

Argo's controller creates Pods on behalf of the submitter. A user minimally needs permission to create and read Workflows, not permission to create Pods directly:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: workflow-submitter
  namespace: workflows
rules:
  - apiGroups: ["argoproj.io"]
    resources: ["workflows"]
    verbs: ["create", "get", "list", "watch"]
  - apiGroups: ["argoproj.io"]
    resources: ["workflowtemplates"]
    verbs: ["get", "list"]
```

Read-only UI users usually also need read access to Pods, Pod logs, Events, and the Argo resources they browse:

```yaml
- apiGroups: [""]
  resources: ["pods", "pods/log", "events"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["argoproj.io"]
  resources:
    - workflows
    - workflowtemplates
    - cronworkflows
    - workflowtaskresults
  verbs: ["get", "list", "watch"]
```

Do not grant `secrets` read merely because the UI shows other resources. Secret references in Workflow specifications are resolved by the controller, kubelet, or Workflow Pod executor as appropriate; submitters do not normally need to retrieve the Secret values.

### Workflow creation is powerful

Argo is a Pod controller. Its security guide emphasizes that permission to create arbitrary Workflows is comparable to permission to create arbitrary Pods in that namespace. A submitter can define container images, volumes, security settings, and a Workflow service account unless the platform restricts the specification.

For controlled self-service, enable Workflow Restrictions:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: workflow-controller-configmap
  namespace: argo
data:
  workflowRestrictions: |
    templateReferencing: Secure
```

With `Strict` or `Secure` template referencing, submissions must use `workflowTemplateRef`, and security-sensitive fields such as `serviceAccountName`, `hostNetwork`, volumes, `podSpecPatch`, and additional templates must come from the approved WorkflowTemplate. `Secure` also detects a referenced template changing while a Workflow is running.

This is the main Argo-native control that turns “can create arbitrary Workflow Pods” into “can run an approved template with allowed inputs.”

## 5. Treat Argo Server Authorization According to Auth Mode

Argo Server can run in `client`, `server`, or `sso` auth modes, including more than one mode at once.

- In **client** mode, the caller supplies Kubernetes credentials, so Kubernetes RBAC for that caller controls operations.
- In **server** mode, requests use the Argo Server's service account; every caller effectively receives what that identity can do.
- In **SSO** mode without SSO RBAC, the server service account is used.
- With **SSO RBAC**, Argo maps claims such as groups to annotated service accounts and uses the matched identity.

Do not give the server service account cluster-admin simply to make the UI work. Start from the release manifest, choose the auth model deliberately, and grant only the namespaces and features the server serves. Archive access and artifact streaming can require database or object-store egress and permissions separate from Kubernetes RBAC.

For SSO RBAC, an annotated service account is only the identity-selection half. It still needs a RoleBinding in each namespace where it should operate:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: team-a-operator
  namespace: argo
  annotations:
    workflows.argoproj.io/rbac-rule: "'team-a' in groups"
    workflows.argoproj.io/rbac-rule-precedence: "10"
---
apiVersion: v1
kind: Secret
metadata:
  name: team-a-operator.service-account-token
  namespace: argo
  annotations:
    kubernetes.io/service-account.name: team-a-operator
type: kubernetes.io/service-account-token
```

Kubernetes 1.24 and later no longer creates this long-lived service-account token Secret automatically, but Argo requires a discoverable token Secret for SSO RBAC. Then bind the `team-a-operator` ServiceAccount from namespace `argo` to a Role in `team-a-workflows`. A matching SSO rule without the token Secret or target RoleBinding still results in forbidden operations.

## 6. Grant `argo retry` Separately from Runtime Retries

Two features called “retry” have different callers.

### Template `retryStrategy`

A `retryStrategy` is reconciled by the controller. Each new attempt runs with the same Workflow/template service account and needs the same executor and application permissions as the original attempt. The human who submitted the Workflow does not need a special retry verb for automatic attempts.

### Operator-driven `argo retry`

`argo retry` modifies an existing failed Workflow and resets failed nodes. The Argo Server implementation reads the Workflow, deletes Pods selected for reset when they still exist, and updates the same Workflow object. To retry a named Workflow without watching or streaming logs, a tightly scoped retry operator therefore needs:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: workflow-retry-operator
  namespace: workflows
rules:
  - apiGroups: ["argoproj.io"]
    resources: ["workflows"]
    verbs: ["get", "update"]
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["delete"]
```

Add `list` on Workflows if the operator selects Workflows with `--selector`, `--field-selector`, or `@latest`. Add `watch` on Workflows for `--wait` or `--watch`. The `--log` option needs `watch` on Workflows, `list` and `watch` on Pods, and `get` on `pods/log`. Test the exact Argo release and endpoint because auth mode and server deployment determine whose Kubernetes credentials execute the underlying calls.

Avoid bundling retry with submitter access automatically. Pod deletion is a materially stronger permission than read-only Workflow access.

`argo resubmit` is different: it reads a completed Workflow and creates a new Workflow object. Its caller typically needs `get` on the source Workflow and `create` on Workflows, but not `update` on the old object. This difference is useful when policy permits reruns but forbids mutation of historical objects.

## 7. Test Effective Permissions, Including Denials

Static YAML review is not enough. Test each identity:

```bash
kubectl auth can-i create workflowtaskresults.argoproj.io \
  -n workflows \
  --as=system:serviceaccount:workflows:report-runner

kubectl auth can-i patch workflowtaskresults.argoproj.io \
  -n workflows \
  --as=system:serviceaccount:workflows:report-runner

kubectl auth can-i get secrets \
  -n workflows \
  --as=system:serviceaccount:workflows:report-runner

kubectl auth can-i update workflows.argoproj.io \
  -n workflows \
  --as=system:serviceaccount:workflows:retry-bot

kubectl auth can-i delete pods \
  -n workflows \
  --as=system:serviceaccount:workflows:retry-bot
```

The first two should be `yes` for the executor. The Secret read should be `no` unless that workload explicitly needs it. The final two should be `yes` only for a retry operator.

Then run representative smoke tests:

1. submit an approved Workflow;
2. produce a parameter or artifact so executor reporting is exercised;
3. perform a permitted application API call;
4. verify a forbidden call is denied;
5. cause a controlled failure and test automatic retry;
6. run `argo retry` with the operator identity;
7. verify another namespace remains inaccessible.

RBAC audit logs should identify the expected service account for each call. If a task call appears as the controller or server identity, the boundary is not what you thought it was.

## Review Checklist

- Is the controller namespace separate from user Workflow namespaces?
- Is the controller scoped to only the namespaces it manages?
- Does every Workflow explicitly select a non-default runtime service account?
- Does every executor identity have only `workflowtaskresults` create/patch, with documented task permissions added only when it shares the runtime account?
- Are privileged workload classes split into separate accounts?
- Can submitters create arbitrary Workflow specs, or only approved WorkflowTemplates?
- Does the Argo Server auth mode match the intended caller identity?
- Are SSO-mapped accounts bound only in their team namespaces?
- Is retry permission separate and does it include only required Workflow get/update and Pod delete access, plus the read verbs needed by selected CLI modes?
- Are artifact-store roles scoped independently from Kubernetes RBAC?
- Have both allowed and denied paths been tested with `kubectl auth can-i` and real Workflows?
- Is release RBAC diffed during upgrades?

Least privilege in Argo is not one small Role. It is a set of deliberately separate identities whose permissions match the lifecycle stage they own.

## Official Documentation

- [Argo Workflows: Workflow RBAC](https://argo-workflows.readthedocs.io/en/latest/workflow-rbac/)
- [Argo Workflows: Field Reference](https://argo-workflows.readthedocs.io/en/latest/fields/)
- [Argo Workflows: Security](https://argo-workflows.readthedocs.io/en/latest/security/)
- [Argo Workflows: Workflow Restrictions](https://argo-workflows.readthedocs.io/en/latest/workflow-restrictions/)
- [Argo Workflows: Service Accounts](https://argo-workflows.readthedocs.io/en/latest/service-accounts/)
- [Argo Workflows: Service Account Secrets](https://argo-workflows.readthedocs.io/en/latest/service-account-secrets/)
- [Argo Workflows: Argo Server Auth Mode](https://argo-workflows.readthedocs.io/en/latest/argo-server-auth-mode/)
- [Argo Workflows: Argo Server SSO](https://argo-workflows.readthedocs.io/en/latest/argo-server-sso/)
- [Argo Workflows: `argo retry`](https://argo-workflows.readthedocs.io/en/latest/cli/argo_retry/)
- [Argo Workflows: Official Controller RBAC Manifests](https://github.com/argoproj/argo-workflows/tree/main/manifests/cluster-install-no-crds/workflow-controller-rbac)
