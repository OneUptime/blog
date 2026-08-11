# Why Is a Woodpecker Kubernetes Job Stuck Pending? Check PVCs, Storage Classes, Resources, and Service Accounts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Woodpecker CI, Kubernetes, Persistent Volumes, Scheduling, Troubleshooting

Description: Trace a pending Woodpecker Kubernetes workflow through its temporary PVC, scheduler constraints, resources, and service-account permissions.

---

“Pending” spans more than one layer in a Woodpecker installation. A workflow can wait in Woodpecker because no suitable agent accepted it, or the Kubernetes backend can accept the workflow and then create a Pod that Kubernetes cannot start. Those states look similar in the CI interface but require different fixes.

For Woodpecker 3.17's Kubernetes backend, each step runs in a standalone Pod and a temporary PersistentVolumeClaim carries the workspace between steps for the lifetime of the pipeline. That makes storage provisioning part of the critical path even when the build itself does not appear to use persistent data.

## First Find the Object That Is Pending

Start in the execution namespace. `WOODPECKER_BACKEND_K8S_NAMESPACE` defaults to `woodpecker`; with `WOODPECKER_BACKEND_K8S_NAMESPACE_PER_ORGANIZATION=true`, it is a prefix and the actual namespace is `<prefix>-<organization-id>`. The agent StatefulSet can live in a different Helm release namespace, and its name depends on the Helm release, so set all three values for your installation:

~~~bash
WP_NAMESPACE=woodpecker
AGENT_NAMESPACE=woodpecker
AGENT_STATEFULSET=woodpecker-agent

kubectl -n "$WP_NAMESPACE" get pods,pvc,events \
  --sort-by=.metadata.creationTimestamp
kubectl -n "$WP_NAMESPACE" get pods \
  -l woodpecker-ci.org/task-uuid --show-labels
kubectl -n "$AGENT_NAMESPACE" logs "statefulset/$AGENT_STATEFULSET" \
  --all-pods=true --all-containers=true --tail=200
~~~

Interpret the result before changing anything:

- No new Pod or PVC usually means the workflow has not reached this Kubernetes agent, the agent cannot create objects, or admission rejected the request.
- A new PVC in `Pending` points to storage selection or provisioning.
- A Pod with `Node: <none>` and `FailedScheduling` events points to resource, placement, taint, or volume-topology constraints.
- A Pod assigned to a node but still in `Pending` may be pulling an image, mounting a volume, creating its sandbox, or waiting for a Secret.

Kubernetes defines `Pending` broadly: it includes both time before scheduling and time spent setting up containers. The event stream, not the phase alone, supplies the cause.

## Read Events Before Reading YAML

Identify the newest Woodpecker Pod and claim, then describe both:

~~~bash
kubectl -n "$WP_NAMESPACE" get pod -o wide
kubectl -n "$WP_NAMESPACE" describe pod <woodpecker-step-pod>

kubectl -n "$WP_NAMESPACE" get pvc
kubectl -n "$WP_NAMESPACE" describe pvc <woodpecker-workspace-pvc>

kubectl -n "$WP_NAMESPACE" events | tail -n 60
~~~

Look at the **Events** sections and container status for indicators such as `FailedScheduling`, `FailedBinding`, `ProvisioningFailed`, `FailedMount`, `FailedCreatePodSandBox`, or `ErrImagePull`. Do not delete the Pod immediately: short-lived events are often the most valuable evidence.

## 1. Check the Temporary Workspace PVC

The Kubernetes backend creates a pipeline volume with these agent settings:

- `WOODPECKER_BACKEND_K8S_VOLUME_SIZE`, default `10G`;
- `WOODPECKER_BACKEND_K8S_STORAGE_CLASS`, default unset;
- `WOODPECKER_BACKEND_K8S_STORAGE_RWX`, default `true`, meaning `ReadWriteMany`; set it to `false` to request `ReadWriteOnce`.

List the available classes, provisioners, and binding modes:

~~~bash
kubectl get storageclass
kubectl get storageclass -o custom-columns=\
'NAME:.metadata.name,PROVISIONER:.provisioner,MODE:.volumeBindingMode,DEFAULT:.metadata.annotations.storageclass\.kubernetes\.io/is-default-class'
kubectl -n "$WP_NAMESPACE" get pvc <claim> -o yaml
~~~

A StorageClass does not advertise its supported access modes. Check the CSI driver or storage-provider documentation to confirm whether it supports `ReadWriteMany` or `ReadWriteOnce`.

Common failures are:

- there is no default StorageClass and no suitable pre-provisioned classless PV while Woodpecker leaves the class unset;
- the configured class name was renamed or does not exist;
- its CSI provisioner is absent, unhealthy, or unauthorized;
- the provisioner cannot supply `ReadWriteMany` volumes;
- the 10 GB request exceeds namespace storage quota, causing the API to reject the claim, or exceeds the backend's capacity, causing provisioning to fail or remain pending;
- an `Immediate`-binding volume was provisioned in a zone that conflicts with the Pod's node constraints.

Choose a class that the cluster actually provides and an access mode it supports:

~~~yaml
env:
  WOODPECKER_BACKEND_K8S_STORAGE_CLASS: fast-rwo
  WOODPECKER_BACKEND_K8S_STORAGE_RWX: "false"
  WOODPECKER_BACKEND_K8S_VOLUME_SIZE: 10G
~~~

These are agent settings, not workflow keys. Restart or roll out the agent after changing them, then trigger a new disposable pipeline. Existing claims retain their original specification.

A claim using a StorageClass with `WaitForFirstConsumer` can legitimately remain pending until a consuming Pod is schedulable. Inspect the claim and Pod together. Kubernetes recommends this binding mode for topology-constrained storage because the scheduler can consider zone, affinity, selectors, taints, and resources before provisioning the volume.

## 2. Check CPU, Memory, Quotas, and Limits

An admitted Pod remains unscheduled if no eligible node can satisfy its effective resource requests. For regular containers this includes the sum of their requests; init containers, Pod-level resources, and RuntimeClass overhead can change the total. Woodpecker 3.17 supports per-step requests and limits:

~~~yaml
steps:
  - name: test
    image: golang:1.26
    commands:
      - go test ./...
    backend_options:
      kubernetes:
        resources:
          requests:
            cpu: 250m
            memory: 256Mi
          limits:
            cpu: "1"
            memory: 1Gi
~~~

Inspect what admission produced rather than assuming it matches the source file:

~~~bash
kubectl -n "$WP_NAMESPACE" get pod <pod> \
  -o jsonpath='{range .spec.initContainers[*]}init/{.name}{" requests="}{.resources.requests}{" limits="}{.resources.limits}{"\n"}{end}{range .spec.containers[*]}{.name}{" requests="}{.resources.requests}{" limits="}{.resources.limits}{"\n"}{end}{"pod resources="}{.spec.resources}{" overhead="}{.spec.overhead}{"\n"}'
kubectl -n "$WP_NAMESPACE" get resourcequota,limitrange
kubectl describe nodes | grep -E 'Name:|Allocatable:|Allocated resources:' -A 12
~~~

`0/N nodes are available: insufficient cpu` means requested CPU, not observed CPU usage, cannot fit. The remedies are to reduce an oversized request, free requested capacity, add suitable nodes, or adjust an incorrect namespace default. Also inspect GPU and ephemeral-storage requests, pod-count limits, and namespace quotas. Quota violations reject admission rather than producing `FailedScheduling`, so look for them in the agent or API error.

Do not remove all requests just to make the warning disappear. Woodpecker's documentation recommends defining resources for efficient scheduling. Use measurements and realistic requests so the scheduler can make a truthful placement decision.

## 3. Check Selectors, Architecture, Taints, and Volume Topology

Woodpecker adds `kubernetes.io/arch` based on the agent platform and can add agent-wide placement rules. Per-step node selectors and affinity are honored only when `WOODPECKER_BACKEND_K8S_POD_NODE_SELECTOR_ALLOW_FROM_STEP` and `WOODPECKER_BACKEND_K8S_POD_AFFINITY_ALLOW_FROM_STEP`, respectively, are enabled; both default to `false` in 3.17, while per-step tolerations default to allowed. A perfectly healthy cluster may have no node that satisfies the resulting constraints.

~~~bash
kubectl -n "$WP_NAMESPACE" get pod <pod> \
  -o jsonpath='{.spec.nodeSelector}{"\n"}{.spec.affinity}{"\n"}{.spec.tolerations}{"\n"}'
kubectl get nodes --show-labels
kubectl get nodes -o custom-columns=NAME:.metadata.name,TAINTS:.spec.taints
~~~

Match event text to the constraint:

- `didn't match Pod's node affinity/selector`: fix a stale label, architecture requirement, or hard affinity;
- `untolerated taint`: add only the required toleration or use an untainted pool;
- `volume node affinity conflict`: align the Pod with the volume's zone or use `WaitForFirstConsumer`;
- `Too many pods`: add node capacity or remove completed workloads.

Avoid weakening every taint and selector at once. They often encode real isolation requirements. Fix the smallest incorrect constraint and retrigger.

## 4. Separate the Agent Service Account from the Step Service Account

Two Kubernetes identities matter:

1. The Woodpecker agent Pod's ServiceAccount calls the Kubernetes API. With the default chart-created ServiceAccount and RBAC, the official Helm chart grants it create/delete access to PVCs, Services, and Secrets; create/delete/get/list/watch access to Pods; and get access to Pod logs in the execution namespace.
2. A pipeline step Pod can run as a ServiceAccount selected through `backend_options.kubernetes.serviceAccountName`. By default, Kubernetes mounts credentials for that account into the step, and those credentials govern what the step itself may do through the API.

Check the agent identity and its permissions:

~~~bash
AGENT_SA=$(kubectl -n "$AGENT_NAMESPACE" get statefulset "$AGENT_STATEFULSET" \
  -o jsonpath='{.spec.template.spec.serviceAccountName}')
printf 'agent service account: %s\n' "$AGENT_SA"

kubectl auth can-i create pods \
  --as="system:serviceaccount:${AGENT_NAMESPACE}:${AGENT_SA}" \
  -n "$WP_NAMESPACE"
kubectl auth can-i create persistentvolumeclaims \
  --as="system:serviceaccount:${AGENT_NAMESPACE}:${AGENT_SA}" \
  -n "$WP_NAMESPACE"
kubectl auth can-i delete secrets \
  --as="system:serviceaccount:${AGENT_NAMESPACE}:${AGENT_SA}" \
  -n "$WP_NAMESPACE"
~~~

These impersonation checks require the caller to have permission to impersonate ServiceAccounts. If Woodpecker logs `forbidden`, repair the Role and RoleBinding, or the ClusterRole and ClusterRoleBinding in per-organization mode, or reconcile the official Helm release. With per-organization namespaces enabled, the chart uses cluster-scoped permissions so the agent can create and work in those namespaces; a namespace-only Role is insufficient for that mode.

For a step-specific account, confirm it exists in the execution namespace:

~~~bash
kubectl -n "$WP_NAMESPACE" get serviceaccount build-deployer
kubectl auth can-i patch deployments \
  --as="system:serviceaccount:${WP_NAMESPACE}:build-deployer" \
  -n "$WP_NAMESPACE"
~~~

Woodpecker disables setting `serviceAccountName` from workflow steps by default. Enabling `WOODPECKER_BACKEND_K8S_SERVICE_ACCOUNT_NAME_ALLOW_FROM_STEP` lets repository authors select arbitrary accounts in the namespace, which can be a privilege-escalation path in a multi-tenant installation. Prefer a narrowly scoped, explicitly reviewed account and enable this feature only when repository writers are trusted.

## A Minimal Isolation Test

After correcting the infrastructure setting, use a small pipeline with modest requests and no custom service account or placement rules:

~~~yaml
steps:
  - name: kubernetes-smoke-test
    image: alpine:3.22
    commands:
      - id
      - test -w "$CI_WORKSPACE"
    backend_options:
      kubernetes:
        resources:
          requests:
            cpu: 50m
            memory: 64Mi
          limits:
            cpu: 200m
            memory: 128Mi
~~~

Watch the Pods in real time:

~~~bash
kubectl -n "$WP_NAMESPACE" get pods --watch
~~~

In another terminal, watch the claims:

~~~bash
kubectl -n "$WP_NAMESPACE" get pvc --watch
~~~

Once this passes, restore the custom StorageClass, resource size, ServiceAccount, node selector, and affinity one at a time. That turns a vague pending state into a controlled comparison.

## Official Documentation

- [Woodpecker Kubernetes backend](https://woodpecker-ci.org/docs/administration/configuration/backends/kubernetes)
- [Woodpecker official Helm chart](https://github.com/woodpecker-ci/helm/tree/main/charts/woodpecker/charts/agent)
- [Kubernetes Pod lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- [Kubernetes: debug running Pods](https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/)
- [Kubernetes StorageClasses and volume binding](https://kubernetes.io/docs/concepts/storage/storage-classes/)
- [Kubernetes resource management and FailedScheduling](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Kubernetes ServiceAccounts](https://kubernetes.io/docs/concepts/security/service-accounts/)
- [Kubernetes node assignment](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/)

## Conclusion

A pending Woodpecker Kubernetes job is not a single failure mode. Prove whether the agent created a PVC and Pod, then let their events direct the investigation. Validate the temporary workspace's class and access mode, the Pod's requests and scheduling constraints, and both relevant ServiceAccounts. Once one minimal workflow schedules, add constraints back individually instead of debugging storage, RBAC, and scheduling simultaneously.
