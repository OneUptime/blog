# How to Fix OpenStack CCM Cannot Patch services/status Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, OpenStack, RBAC, Security, Troubleshooting

Description: Diagnose the exact Kubernetes identity behind an OpenStack CCM services/status denial and repair its RBAC without granting cluster-admin.

---

An Octavia load balancer can exist and accept connections while its Kubernetes Service remains pending. One explanation is that OpenStack Cloud Controller Manager created the cloud resource but Kubernetes refused its attempt to publish `status.loadBalancer`.

A log message containing `cannot patch resource "services/status" in API group ""` identifies a Kubernetes authorization failure. OpenStack application credentials and Octavia project roles do not grant that permission. Diagnose the Kubernetes identity named in the error before changing any cloud access policy.

## Capture the denied identity and operation

Read the relevant controller logs and Service events:

```bash
kubectl -n kube-system get pods
kubectl -n kube-system logs pod/OCCM_POD --since=15m
kubectl -n production describe service web
kubectl -n production get service web -o yaml
```

Replace the pod and Service names. Note whether the denial names a ServiceAccount such as `system:serviceaccount:kube-system:cloud-controller-manager`, or a different user. The controller can use separate credentials for individual loops when configured to do so, so the identity in the denial is the best evidence.

Inspect the pod's assigned ServiceAccount and startup arguments:

```bash
kubectl -n kube-system get pod OCCM_POD \
  -o jsonpath='{.spec.serviceAccountName}{"\n"}{.spec.containers[*].args}{"\n"}'
```

A correct ServiceAccount name with a binding in the wrong namespace is still a broken binding. Likewise, a Helm release may have created a release-prefixed ServiceAccount while an old ClusterRoleBinding still references the upstream example name.

## Test the exact subresource permission

Use an administrative identity allowed to impersonate the controller. Substitute the user from the actual denial:

```bash
kubectl auth can-i patch services --subresource=status \
  --namespace production \
  --as=system:serviceaccount:kube-system:cloud-controller-manager

kubectl auth can-i patch services \
  --namespace production \
  --as=system:serviceaccount:kube-system:cloud-controller-manager
```

These are different checks. Use `--subresource=status` in the command: `services/status` there would mean a Service named `status`. Kubernetes RBAC policy rules represent a subresource using a slash in the resource name, so a grant on `services` does not automatically grant `services/status`. The empty API group in the error refers to the core API group; the RBAC rule must use `apiGroups: [""]`. This is explained in the [Kubernetes RBAC reference](https://kubernetes.io/docs/reference/access-authn-authz/rbac/#referring-to-resources).

If the impersonation request itself is forbidden, run the checks through an authorized administrator. That result does not prove whether the controller has the underlying permission.

Inspect the relevant bindings and roles rather than assuming their names:

```bash
kubectl get clusterrolebindings -o json | jq '
  .items[]
  | select(any(.subjects[]?;
      .kind == "ServiceAccount" and
      .namespace == "kube-system" and
      .name == "cloud-controller-manager"))
  | {name: .metadata.name, roleRef: .roleRef, subjects: .subjects}'
```

Check namespaced RoleBindings too if this installation intentionally limits the namespaces the controller can manage.

## Repair the managed RBAC definition

The [upstream OCCM v1.36.0 role](https://github.com/kubernetes/cloud-provider-openstack/blob/v1.36.0/manifests/controller-manager/cloud-controller-manager-roles.yaml) explicitly grants `patch` on `services/status`. Compare the role distributed with your installed OCCM release or chart, then repair the authoritative definition. Reapplying an unrelated latest manifest can alter more permissions than the incident requires.

For a cluster-wide controller missing only this permission, a narrowly scoped supplemental grant can make the change easy to review:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: occm-service-status-patcher
rules:
  - apiGroups: [""]
    resources: ["services/status"]
    verbs: ["patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: occm-service-status-patcher
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: occm-service-status-patcher
subjects:
  - kind: ServiceAccount
    name: cloud-controller-manager
    namespace: kube-system
```

Replace the subject with the denied ServiceAccount and apply the file through your deployment workflow. This is a supplement for one diagnosed missing permission, not a complete CCM role. The controller also needs permissions for watching Services, updating annotations, recording events, node management, and potentially leader election.

For a controller intended to operate only in one namespace, a RoleBinding in that namespace can bind this ClusterRole without granting the permission cluster-wide. Choose the scope that matches the controller's established responsibility.

## Verify publication without replacing the Service

Repeat `kubectl auth can-i` and observe the existing Service. RBAC changes generally do not require restarting the controller; its retries can succeed with the new authorization. Allow the next retry and inspect fresh logs:

```bash
kubectl -n production get service web --watch
kubectl -n production get service web \
  -o jsonpath='{.status.loadBalancer.ingress}{"\n"}'
```

Confirm the reported address belongs to the intended Octavia load balancer and test application traffic. Service status publication and data-plane health are separate checks.

If the permission check says yes but the live denial continues, compare the error's user with your test subject again. Then check the namespace, requested verb, API group, and any configured authorization webhook. Do not infer a cloud quota problem from an explicit Kubernetes authorization error.

Deleting the Service is unnecessary for this repair and can remove a working load balancer. Similarly, manually writing its status can hide the symptom until the next reconciliation without fixing the controller.

## Conclusion

Fixing `services/status` requires granting the actual controller identity the correct Kubernetes subresource permission. Keep that grant in the installed chart or manifests, then confirm both status publication and application reachability on the existing Service.

## Official Documentation

- [Kubernetes RBAC authorization](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [OCCM v1.36.0 ClusterRoles](https://github.com/kubernetes/cloud-provider-openstack/blob/v1.36.0/manifests/controller-manager/cloud-controller-manager-roles.yaml)
- [kubectl auth can-i](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/)
