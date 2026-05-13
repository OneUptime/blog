# How to Set Up Flux CD on OpenShift with Security Context Constraints

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, OpenShift, Security Context Constraints, SCC

Description: Deploy Flux CD on OpenShift while complying with Security Context Constraints, enabling GitOps-driven workload management in enterprise OpenShift environments.

---

## Introduction

OpenShift is Red Hat's enterprise Kubernetes platform with significant security additions, the most notable being Security Context Constraints (SCCs). SCCs are OpenShift's mechanism for controlling what a pod can do - replacing the upstream Kubernetes PodSecurityPolicy (deprecated) with a more granular and powerful system. SCCs determine whether a pod can run as root, use host networking, mount specific volume types, and more.

Deploying Flux CD on OpenShift requires understanding which SCCs Flux's controllers need and creating the appropriate bindings. Flux's controllers are generally well-behaved - they do not need root access or host networking - but they do need to run as a non-root UID that is fixed in the Flux manifests. Getting the SCC configuration right from the start avoids frustrating "forbidden: unable to validate" errors.

## Prerequisites

- OpenShift 4.x cluster with cluster-admin access
- `oc` (OpenShift CLI) and `flux` CLI on your workstation
- A Git repository for Flux CD bootstrap
- `kubectl` configured to use OpenShift context

## Step 1: Understand Required SCC for Flux Controllers

Flux's controllers typically require:
- Run as non-root user (UID 65534 for `nobody`)
- Standard volume types (emptyDir, configMap, secret, persistentVolumeClaim)

The built-in `nonroot` SCC is the SCC used by Flux's official OpenShift installation manifest. On OpenShift 4.11 and later, `restricted-v2` is normally granted by default, but it uses namespace-allocated UID ranges and does not allow Flux's fixed `runAsUser: 65534` setting without patching the generated manifests.

## Step 2: Create the flux-system Namespace

```bash
# Create the flux-system namespace with OpenShift labels

oc create namespace flux-system

# Label the namespace (not needed for SCC assignment but useful for policies)
oc label namespace flux-system \
  app.kubernetes.io/managed-by=flux-system
```

## Step 3: Add SCC RBAC for Flux

For most Flux deployments, you do not need to create a custom SCC. Add RBAC that allows Flux's service accounts to use the built-in `nonroot` SCC:

```yaml
# clusters/openshift/flux-system/flux-scc.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: flux-scc
rules:
  - apiGroups:
      - security.openshift.io
    resources:
      - securitycontextconstraints
    resourceNames:
      - nonroot
    verbs:
      - use
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: flux-scc
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: flux-scc
subjects:
  - kind: ServiceAccount
    name: source-controller
    namespace: flux-system
  - kind: ServiceAccount
    name: source-watcher
    namespace: flux-system
  - kind: ServiceAccount
    name: kustomize-controller
    namespace: flux-system
  - kind: ServiceAccount
    name: helm-controller
    namespace: flux-system
  - kind: ServiceAccount
    name: notification-controller
    namespace: flux-system
  - kind: ServiceAccount
    name: image-reflector-controller
    namespace: flux-system
  - kind: ServiceAccount
    name: image-automation-controller
    namespace: flux-system
```

```bash
oc apply -f clusters/openshift/flux-system/flux-scc.yaml
```

## Step 4: Patch Flux Manifests for OpenShift

When using the Flux CLI bootstrap flow, add the SCC manifest and OpenShift patches to the `flux-system` kustomization before running bootstrap:

```yaml
# clusters/openshift/flux-system/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
  - flux-scc.yaml
patches:
  - patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: all
      spec:
        template:
          spec:
            securityContext:
              $patch: delete
            containers:
              - name: manager
                securityContext:
                  runAsUser: 65534
                  seccompProfile:
                    $patch: delete
    target:
      kind: Deployment
      labelSelector: app.kubernetes.io/part-of=flux
  - patch: |-
      - op: remove
        path: /metadata/labels/pod-security.kubernetes.io~1warn
      - op: remove
        path: /metadata/labels/pod-security.kubernetes.io~1warn-version
    target:
      kind: Namespace
      labelSelector: app.kubernetes.io/part-of=flux
```

## Step 5: Bootstrap Flux CD on OpenShift

```bash
export GITHUB_TOKEN=ghp_your_github_token

# Bootstrap Flux
flux bootstrap github \
  --owner=my-org \
  --repository=openshift-fleet \
  --branch=main \
  --path=clusters/openshift-prod \
  --personal

# Check Flux pods started successfully
oc get pods -n flux-system
```

## Step 6: Handle Application SCC Requirements via Flux

When deploying applications via Flux that need specific SCCs:

```yaml
# clusters/openshift-prod/apps/myapp/scc-binding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: myapp-scc
  namespace: myapp
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: system:openshift:scc:anyuid  # Only if myapp truly requires it
subjects:
  - kind: ServiceAccount
    name: myapp
    namespace: myapp
```

```yaml
# clusters/openshift-prod/apps/myapp/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp
  namespace: flux-system
spec:
  interval: 5m
  path: ./clusters/openshift-prod/apps/myapp
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

## Step 7: Verify SCC Assignment

```bash
# Check which SCC is being used by Flux pods
oc get pod -n flux-system \
  -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.metadata.annotations.openshift\.io/scc}{"\n"}{end}'

# Check whether a pod spec can be admitted by an SCC before applying
oc adm policy scc-review -f my-pod.yaml -n flux-system
```

## Best Practices

- Use the `nonroot` SCC for Flux controllers when following the official OpenShift installation flow; only escalate to more permissive SCCs if you get specific admission errors.
- Never use `anyuid` or `privileged` SCC for Flux system controllers; they do not need it and it violates least-privilege principles.
- Manage SCC bindings for application workloads in Git alongside the application manifests so SCC grants are reviewed and audited.
- Use `oc adm policy scc-review` or `oc adm policy scc-subject-review` to test whether a pod can be admitted before deploying.
- Integrate OpenShift's audit logs with your SIEM to track when SCC bindings are created or modified via Flux.

## Conclusion

Deploying Flux CD on OpenShift with proper SCC configuration is straightforward once you understand the SCC model. Flux's controllers are designed to run with minimal privileges, making them compatible with OpenShift's built-in `nonroot` SCC in most cases. By managing SCC bindings through Flux alongside application manifests, your entire security posture is declarative, reviewed, and auditable.
