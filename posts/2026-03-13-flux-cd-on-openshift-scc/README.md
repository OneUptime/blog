# How to Set Up Flux CD on OpenShift with Security Context Constraints

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, OpenShift, Security Context Constraints, SCC

Description: Deploy Flux CD on OpenShift while complying with Security Context Constraints, enabling GitOps-driven workload management in enterprise OpenShift environments.

---

## Introduction

OpenShift is Red Hat's enterprise Kubernetes platform with significant security additions, the most notable being Security Context Constraints (SCCs). SCCs are OpenShift's mechanism for controlling what a pod can do - replacing the upstream Kubernetes PodSecurityPolicy (deprecated) with a more granular and powerful system. SCCs determine whether a pod can run as root, use host networking, mount specific volume types, and more.

Deploying Flux CD on OpenShift requires understanding which SCCs Flux's controllers need and creating the appropriate bindings. Flux's controllers are generally well-behaved - they do not need root access or host networking - but they do require specific capabilities for reading Git repositories, applying manifests, and managing Helm charts. Getting the SCC configuration right from the start avoids frustrating "forbidden: unable to validate" errors.

## Prerequisites

- OpenShift 4.x cluster with cluster-admin access
- `oc` (OpenShift CLI) and `flux` CLI on your workstation
- A Git repository for Flux CD bootstrap
- `kubectl` configured to use OpenShift context

## Step 1: Understand Required SCC for Flux Controllers

Flux's controllers typically require:
- Run as non-root user (UID 65534 for `nobody`)
- Read-only root filesystem
- Drop all capabilities
- Standard volume types (emptyDir, configMap, secret, persistentVolumeClaim)

The `restricted-v2` SCC in OpenShift 4.11+ or `restricted` SCC in older versions is usually sufficient.

## Step 2: Create the flux-system Namespace

```bash
# Create the flux-system namespace with OpenShift labels
oc create namespace flux-system

# Label the namespace (not needed for SCC assignment but useful for policies)
oc label namespace flux-system \
  app.kubernetes.io/managed-by=flux-system
```

## Step 3: Create a Custom SCC for Flux (if needed)

For most Flux deployments, the built-in `restricted` SCC is sufficient. If you need to customize:

```yaml
# clusters/openshift/flux-system/flux-scc.yaml
apiVersion: security.openshift.io/v1
kind: SecurityContextConstraints
metadata:
  name: flux-restricted
  annotations:
    kubernetes.io/description: "SCC for Flux CD controllers"
allowPrivilegedContainer: false
allowPrivilegeEscalation: false
allowHostDirVolumePlugin: false
allowHostIPC: false
allowHostNetwork: false
allowHostPID: false
allowHostPorts: false
# Flux controllers run as non-root
runAsUser:
  type: MustRunAsNonRoot
seLinuxContext:
  type: MustRunAs
  seLinuxOptions:
    type: spc_t
fsGroup:
  type: MustRunAs
  ranges:
    - min: 1000
      max: 65534
supplementalGroups:
  type: RunAsAny
volumes:
  - configMap
  - emptyDir
  - projected
  - secret
  - persistentVolumeClaim
readOnlyRootFilesystem: false
defaultAllowPrivilegeEscalation: false
requiredDropCapabilities:
  - ALL
```

```bash
oc apply -f clusters/openshift/flux-system/flux-scc.yaml
```

## Step 4: Bind the SCC to Flux Service Accounts

```yaml
# clusters/openshift/flux-system/flux-scc-binding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: flux-scc-use
rules:
  - apiGroups: ["security.openshift.io"]
    resources: ["securitycontextconstraints"]
    resourceNames: ["restricted"]
    verbs: ["use"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: flux-scc-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: flux-scc-use
subjects:
  - kind: ServiceAccount
    name: source-controller
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
oc apply -f clusters/openshift/flux-system/flux-scc-binding.yaml
```

## Step 5: Bootstrap Flux CD on OpenShift

```bash
export GITHUB_TOKEN=ghp_your_github_token

# Bootstrap Flux - OpenShift uses a slightly different API server
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
  # Apply RBAC before the Deployment
  dependsOn:
    - name: myapp-rbac
```

## Step 7: Verify SCC Assignment

```bash
# Check which SCC is being used by Flux pods
oc get pod -n flux-system \
  -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.metadata.annotations.openshift\.io/scc}{"\n"}{end}'

# Validate a new pod's SCC assignment before applying
oc adm policy who-can use scc restricted -n flux-system
```

## Best Practices

- Start with the `restricted` or `restricted-v2` SCC for Flux controllers; only escalate to more permissive SCCs if you get specific admission errors.
- Never use `anyuid` or `privileged` SCC for Flux system controllers; they do not need it and it violates least-privilege principles.
- Manage SCC bindings for application workloads in Git alongside the application manifests so SCC grants are reviewed and audited.
- Use `oc adm policy simulate-scc` to test which SCC a pod would be assigned before deploying.
- Integrate OpenShift's audit logs with your SIEM to track when SCC bindings are created or modified via Flux.

## Conclusion

Deploying Flux CD on OpenShift with proper SCC configuration is straightforward once you understand the SCC model. Flux's controllers are designed to run with minimal privileges, making them compatible with OpenShift's default `restricted` SCC in most cases. By managing SCC bindings through Flux alongside application manifests, your entire security posture is declarative, reviewed, and auditable.
