# How to Configure Pod Security Policies in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Security, Pod Security

Description: Learn how to configure Pod Security Policies in Rancher to control what privileges containers can use in your clusters.

Pod Security Policies (PSPs) provide cluster-level controls that restrict what containers can do, including running as root, using host networking, or mounting sensitive paths. Although PSPs are deprecated in Kubernetes 1.21+ in favor of Pod Security Standards, many existing clusters still use them. This guide covers configuring PSPs in Rancher.

## Prerequisites

- A Rancher-launched RKE cluster running Kubernetes v1.24 or earlier
- Admin access to the Rancher UI
- kubectl access to the cluster

## Important Note on Deprecation

Pod Security Policies are deprecated as of Kubernetes 1.21 and removed in Kubernetes 1.25. For clusters running Kubernetes 1.25+, use Pod Security Standards instead (covered in a separate guide). This guide is relevant for clusters running Kubernetes 1.24 or earlier.

## Step 1: Enable Pod Security Policies in Rancher

### For New Clusters

When creating a new Rancher-launched RKE cluster, enable PSPs during cluster creation:

1. Go to **Cluster Management** > **Create**.
2. Configure your cluster settings.
3. In the **Advanced Options**, enable **Pod Security Policy Support**.
4. Select a default PSP such as **restricted-noroot**, **restricted**, or **unrestricted**.
5. Complete the cluster creation.

### For Existing Clusters

Edit the existing RKE cluster configuration:

1. Go to **Cluster Management**.
2. Click the three-dot menu on the cluster.
3. Select **Edit Config**.
4. Enable **Pod Security Policy Support**.
5. Select the default PSP.
6. Save the changes.

## Step 2: Understand Built-in PSP Templates

Rancher ships with three built-in PSPs: `restricted-noroot`, `restricted`, and `unrestricted`. The `restricted-noroot` and `unrestricted` policies map closely to the examples below:

### Restricted-NoRoot PSP

```yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: restricted-noroot
  annotations:
    seccomp.security.alpha.kubernetes.io/allowedProfileNames: 'docker/default,runtime/default'
    apparmor.security.beta.kubernetes.io/allowedProfileNames: 'runtime/default'
    seccomp.security.alpha.kubernetes.io/defaultProfileName: 'runtime/default'
    apparmor.security.beta.kubernetes.io/defaultProfileName: 'runtime/default'
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
  - ALL
  volumes:
  - configMap
  - emptyDir
  - projected
  - secret
  - downwardAPI
  - persistentVolumeClaim
  hostNetwork: false
  hostIPC: false
  hostPID: false
  runAsUser:
    rule: MustRunAsNonRoot
  seLinux:
    rule: RunAsAny
  supplementalGroups:
    rule: MustRunAs
    ranges:
    - min: 1
      max: 65535
  fsGroup:
    rule: MustRunAs
    ranges:
    - min: 1
      max: 65535
  readOnlyRootFilesystem: false
```

### Restricted PSP

This policy is a more permissive variant of `restricted-noroot` that still enforces most restrictions, but does not require containers to run as a non-root user.

### Unrestricted PSP

```yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: unrestricted
  annotations:
    seccomp.security.alpha.kubernetes.io/allowedProfileNames: '*'
spec:
  privileged: true
  allowPrivilegeEscalation: true
  allowedCapabilities:
  - '*'
  volumes:
  - '*'
  hostNetwork: true
  hostPorts:
  - min: 0
    max: 65535
  hostIPC: true
  hostPID: true
  runAsUser:
    rule: RunAsAny
  seLinux:
    rule: RunAsAny
  supplementalGroups:
    rule: RunAsAny
  fsGroup:
    rule: RunAsAny
```

## Step 3: Create a Custom PSP

Create a PSP tailored to your application needs. Save as `custom-psp.yaml`:

```yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: custom-app-psp
  annotations:
    seccomp.security.alpha.kubernetes.io/allowedProfileNames: runtime/default
    seccomp.security.alpha.kubernetes.io/defaultProfileName: runtime/default
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
  - ALL
  allowedCapabilities:
  - NET_BIND_SERVICE
  hostNetwork: false
  hostIPC: false
  hostPID: false
  runAsUser:
    rule: MustRunAsNonRoot
  seLinux:
    rule: RunAsAny
  fsGroup:
    rule: MustRunAs
    ranges:
    - min: 1
      max: 65535
  supplementalGroups:
    rule: MustRunAs
    ranges:
    - min: 1
      max: 65535
  volumes:
  - configMap
  - emptyDir
  - projected
  - secret
  - downwardAPI
  - persistentVolumeClaim
  readOnlyRootFilesystem: true
```

Apply the PSP:

```bash
kubectl apply -f custom-psp.yaml
```

## Step 4: Create RBAC for the PSP

PSPs require RBAC bindings to take effect. Create a ClusterRole and bind it:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: use-custom-psp
rules:
- apiGroups: ['policy']
  resources: ['podsecuritypolicies']
  verbs: ['use']
  resourceNames:
  - custom-app-psp
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: default-custom-psp
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: use-custom-psp
subjects:
- kind: Group
  apiGroup: rbac.authorization.k8s.io
  name: system:serviceaccounts:production
```

This binds the custom PSP to all service accounts in the `production` namespace.

## Step 5: Assign PSPs to Projects in Rancher

Rancher allows PSP assignment at the project level:

1. Navigate to the cluster.
2. Click **Explore**, then go to **Cluster** > **Projects/Namespaces**.
3. Click on a project and select **Edit Config**.
4. In project settings, select the PSP to apply.
5. Save the changes.

All pods created in namespaces within that project will be subject to the assigned PSP.

## Step 6: Test PSP Enforcement

Deploy a test pod that violates the custom PSP:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: test-privileged
  namespace: production
spec:
  containers:
  - name: test
    image: nginx
    securityContext:
      privileged: true
```

```bash
kubectl apply -f test-privileged.yaml
```

This should be rejected with an error message indicating PSP violation:

```plaintext
Error from server (Forbidden): error when creating "test-privileged.yaml":
pods "test-privileged" is forbidden: PodSecurityPolicy: unable to validate against any pod security policy
```

Deploy a compliant pod:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: test-restricted
  namespace: production
spec:
  containers:
  - name: test
    image: busybox:1.36
    command: ["sh", "-c", "sleep 3600"]
    securityContext:
      runAsNonRoot: true
      runAsUser: 1000
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      seccompProfile:
        type: RuntimeDefault
      capabilities:
        drop:
        - ALL
```

## Step 7: Handle System Workloads

System components like kube-proxy, CNI plugins, and monitoring agents may need elevated privileges. Bind the built-in `unrestricted` PSP to system namespaces:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: use-unrestricted-psp
rules:
- apiGroups: ['policy']
  resources: ['podsecuritypolicies']
  verbs: ['use']
  resourceNames:
  - unrestricted
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: system-unrestricted-psp
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: use-unrestricted-psp
subjects:
- kind: Group
  apiGroup: rbac.authorization.k8s.io
  name: system:serviceaccounts:kube-system
- kind: Group
  apiGroup: rbac.authorization.k8s.io
  name: system:serviceaccounts:cattle-system
```

## Step 8: Migrate from PSPs to Pod Security Standards

If you are planning to upgrade to Kubernetes 1.25+, start migrating from PSPs to Pod Security Standards:

1. List your PSPs and inspect related RBAC bindings, for example:

```bash
kubectl get psp
kubectl get rolebinding,clusterrolebinding -A -o json | jq '.items[] | select(.roleRef.kind=="ClusterRole") | select(.roleRef.name | contains("psp"))'
```

2. Map your PSPs to equivalent Pod Security Standards levels (privileged, baseline, restricted).
3. Apply Pod Security Standards labels to namespaces.
4. Test workloads with Pod Security Standards before removing PSPs.

## Conclusion

Pod Security Policies provide granular control over container privileges in Rancher-managed clusters. While they are being replaced by Pod Security Standards in newer Kubernetes versions, PSPs remain important for clusters running Kubernetes 1.24 or earlier. By defining appropriate policies, binding them via RBAC, and testing enforcement, you can prevent containers from running with unnecessary privileges.
