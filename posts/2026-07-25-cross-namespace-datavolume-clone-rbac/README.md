# How to Clone a CDI DataVolume Across Kubernetes Namespaces Without RBAC Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, KubeVirt, CDI, RBAC, DataVolume

Description: Grant the minimal CDI source permission for cross-namespace clones, create the target DataVolume, and verify clone strategy and status.

---

A cross-namespace CDI clone reads a source PVC in one namespace and creates a DataVolume in another. CDI checks whether the user or ServiceAccount creating the target may source clones from the source namespace.

The narrow permission is `create` on the virtual `datavolumes/source` subresource in the source namespace. CDI also accepts a user who can create Pods there, but granting broad Pod creation merely to authorize clones is usually excessive.

## Define the Source and Actor

This example uses:

```text
Source PVC:       golden-images/rhel9-golden
Target DV:        team-a/rhel9-root
Creating actor:   ServiceAccount team-a/vm-builder
```

A DataVolume clone ultimately references the source PVC. If the source was created by a DataVolume, its PVC normally has the same name.

Confirm it is ready:

```bash
kubectl get datavolume rhel9-golden -n golden-images
kubectl get pvc rhel9-golden -n golden-images
kubectl describe pvc rhel9-golden -n golden-images
```

Use a completed, consistent source. Efficient CDI clone strategies require the source not to be in use.

## Grant Minimal Source Permission

Create one reusable ClusterRole:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cdi-clone-source
rules:
  - apiGroups:
      - cdi.kubevirt.io
    resources:
      - datavolumes/source
    verbs:
      - create
```

Bind it only in the source namespace:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: allow-team-a-vm-builder-clones
  namespace: golden-images
subjects:
  - kind: ServiceAccount
    name: vm-builder
    namespace: team-a
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cdi-clone-source
```

Apply both:

```bash
kubectl apply -f cdi-clone-source-role.yaml
kubectl apply -f team-a-clone-source-binding.yaml
```

The RoleBinding's namespace is the security boundary. Binding this ClusterRole in `golden-images` authorizes sourcing from that namespace, not every namespace.

The actor still needs ordinary permission to create DataVolumes in `team-a`. CDI's controllers create the underlying PVC and clone resources with CDI-managed permissions. Grant the actor's target-namespace rights through your existing tenant role rather than adding unrelated rights to the source binding.

## Verify Authorization Before Creating Storage

Use impersonation if your administrator account is allowed:

```bash
kubectl auth can-i create datavolumes.cdi.kubevirt.io \
  --subresource=source \
  --namespace=golden-images \
  --as=system:serviceaccount:team-a:vm-builder

kubectl auth can-i create datavolumes.cdi.kubevirt.io \
  --namespace=team-a \
  --as=system:serviceaccount:team-a:vm-builder
```

Both should return `yes`. Test the exact actor used by the controller or pipeline, not your own cluster-admin identity.

## Create the Target DataVolume

For a clone that should inherit compatible source properties:

```yaml
apiVersion: cdi.kubevirt.io/v1beta1
kind: DataVolume
metadata:
  name: rhel9-root
  namespace: team-a
spec:
  source:
    pvc:
      namespace: golden-images
      name: rhel9-golden
  storage: {}
```

Apply it as the intended ServiceAccount through your workload or an impersonated administrative test:

```bash
kubectl apply -f rhel9-root.yaml \
  --as=system:serviceaccount:team-a:vm-builder

kubectl get datavolume,pvc -n team-a -w
```

`storage: {}` lets CDI derive clone storage details where supported. If you specify a target class, mode, or size, keep the target at least as large as the source and understand that class or mode differences can force host-assisted copying.

An explicit example is:

```yaml
storage:
  storageClassName: fast-rwo
  accessModes:
    - ReadWriteOnce
  volumeMode: Filesystem
  resources:
    requests:
      storage: 40Gi
```

Efficient CSI or snapshot clones generally require source and target to share StorageClass and volume mode.

## Diagnose an RBAC Rejection

Check authorization and DataVolume events:

```bash
kubectl describe datavolume rhel9-root -n team-a
kubectl get events -n team-a \
  --sort-by=.metadata.creationTimestamp
kubectl get rolebinding allow-team-a-vm-builder-clones \
  -n golden-images -o yaml
```

Common mistakes include:

- RoleBinding created in the target instead of source namespace
- subject namespace omitted or incorrect for a ServiceAccount
- binding names a User while automation uses a ServiceAccount
- permission granted on `datavolumes`, not `datavolumes/source`
- verb is `get` rather than `create`
- source PVC namespace or name is wrong

Do not solve the issue with a cluster-admin binding. The subresource exists to make narrow cross-namespace authorization possible.

## Verify the Clone Method and Completion

Describe the target PVC:

```bash
kubectl describe pvc rhel9-root -n team-a
kubectl get pvc rhel9-root -n team-a -o yaml
```

CDI records clone strategy and fallback details in annotations and events. A host-assisted clone is valid but slower and uses source and target Pods plus cluster network bandwidth. CSI cloning and snapshot cloning have additional prerequisites, including compatible storage and an unused source.

Wait for the DataVolume phase to become `Succeeded` before attaching it:

```bash
kubectl get datavolume rhel9-root -n team-a -w
```

## Official Documentation

- [CDI RBAC for PVC cloning](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/RBAC.md#pvc-cloning)
- [CDI DataVolume clone guide](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/clone-datavolume.md)
- [CDI efficient clone prerequisites](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/efficient-cloning.md)
- [Kubernetes RoleBindings](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
