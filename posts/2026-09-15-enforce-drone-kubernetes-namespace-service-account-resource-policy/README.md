# How to Enforce Namespace, Service Account, and Resource Policies in Drone

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Drone, Kubernetes, Security, Resource Management, CI/CD

Description: Apply administrator-owned Drone Kubernetes policies and verify the resulting namespace, workload identity, and resource limits.

A Drone pipeline can request a namespace, service account, and compute resources. Administrators should define the allowed values independently when repository authors should not control those boundaries. The Kubernetes runner's policy file provides that override layer; Kubernetes RBAC, quotas, and admission policy provide additional enforcement around it.

The [Drone policy documentation](https://docs.drone.io/runner/kubernetes/configuration/policies/) describes first-match selection and the fields a policy can override.

## Write complete policies for each matching group

Mount an administrator-owned `policy.yml` into the runner:

```yaml
kind: policy
name: payments
match:
  repo:
    - acme/payments
metadata:
  namespace: ci-payments
service_account: ci-build
resources:
  request:
    cpu: 2000
    memory: 2GiB
  limit:
    cpu: 2000
    memory: 2GiB

---
kind: policy
name: default
metadata:
  namespace: ci-untrusted
service_account: ci-build
resources:
  request:
    cpu: 1000
    memory: 1GiB
  limit:
    cpu: 1000
    memory: 1GiB
```

Policy resource keys use singular `request` and `limit`. Pipeline YAML uses `resources.requests` for its request and step-level `resources.limits` for limits. Mixing those formats can leave the intended settings unapplied.

The first matching policy wins; it does not inherit missing values from the default policy. Include every required boundary in each policy, and place the catch-all last. A newly added repository should receive the restrictive default until an administrator intentionally assigns something else.

Set this on the runner:

```text
DRONE_POLICY_FILE=/etc/drone/policy.yml
```

The path must refer to the mounted file inside the runner container. Drone loads it at startup, as documented for [DRONE_POLICY_FILE](https://docs.drone.io/runner/kubernetes/configuration/reference/drone-policy-file/). Roll the runner using a controlled drain process when changing it; do not assume editing a ConfigMap immediately changes the active policy.

## Distinguish the two service accounts

The runner's own Kubernetes identity creates and manages build pods. The policy's `service_account` sets the identity attached to the resulting build pod. These are different permission sets. The [runner policy implementation](https://github.com/drone-runners/drone-runner-kube/blob/master/engine/policy/policy.go) assigns that field to the pod's `ServiceAccountName`.

Create a low-privilege workload account in each target namespace:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ci-build
  namespace: ci-payments
automountServiceAccountToken: false
```

Create the namespace first, and create the corresponding account in `ci-untrusted`. Do not bind application test accounts to the runner's pod-management Role. When tests need Kubernetes API access, grant only that documented requirement and verify token mounting on the generated pod. Kubernetes explains these identity and token concepts in its [service account guide](https://kubernetes.io/docs/concepts/security/service-accounts/).

## Bound aggregate use with a namespace quota

A per-container memory limit does not constrain how many builds can start. Add a Kubernetes quota for aggregate requests and pod count:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: ci-budget
  namespace: ci-payments
spec:
  hard:
    requests.cpu: "8"
    requests.memory: 8Gi
    pods: "8"
```

Choose these values from measured builds and actual node capacity. Kubernetes [resource quotas](https://kubernetes.io/docs/concepts/policy/resource-quotas/) apply admission limits within a namespace; they do not reserve a dedicated node or guarantee execution latency.

The Drone runner distributes a pipeline request across its containers while applying limits per container. Inspect the resulting pod rather than multiplying a step count by the pipeline request.

## Verify effective values, including an attempted override

In a staging repository, submit a pipeline that requests another namespace, a different service account, and a larger resource request. Inspect the build pod while it exists:

```sh
kubectl get pods -n ci-payments
kubectl get pod BUILD_POD -n ci-payments -o yaml
kubectl describe resourcequota ci-budget -n ci-payments
```

Confirm the namespace and workload account match the policy, then inspect every container's requests and limits. Test a repository that should receive the default policy too. If a policy file cannot be loaded, verify that the runner fails visibly instead of accepting unintended defaults in your installed version.

Finally, constrain the runner's RBAC to the namespaces it must manage. Enforce pod security and network restrictions at Kubernetes admission and networking layers. A policy file is useful, but it should not be the only barrier between arbitrary build code and a privileged cluster identity.
