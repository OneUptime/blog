# How to Handle Privileged Init Container Requirements in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Security, Kubernetes, Init Containers, Pod Security

Description: How to manage the privileged init container requirements of Istio sidecar injection and work within security-restricted Kubernetes environments.

---

When Istio injects its sidecar into a pod, it also injects an init container called `istio-init` that requires the `NET_ADMIN` and `NET_RAW` Linux capabilities. These capabilities let the init container modify the pod's iptables rules to redirect traffic through Envoy. In many production environments, granting these capabilities is a security concern. This post covers how to handle this requirement across different Kubernetes security frameworks.

## What Capabilities Does istio-init Need?

The `istio-init` container needs two specific Linux capabilities:

- **NET_ADMIN**: Required to modify iptables rules in the pod's network namespace
- **NET_RAW**: Required to create raw sockets, used during iptables setup

Here's what the injected init container looks like:

```yaml
initContainers:
- name: istio-init
  image: docker.io/istio/proxyv2:1.22.0
  args:
  - istio-iptables
  - "-p"
  - "15001"
  - "-z"
  - "15006"
  - "-u"
  - "1337"
  - "-m"
  - REDIRECT
  - "-i"
  - "*"
  - "-x"
  - ""
  - "-b"
  - "*"
  - "-d"
  - "15090,15021,15020"
  securityContext:
    capabilities:
      add:
      - NET_ADMIN
      - NET_RAW
    runAsNonRoot: false
    runAsUser: 0
```

Notice it also runs as root (UID 0). This is because iptables modifications typically require root privileges in addition to the NET_ADMIN capability.

## Working with Pod Security Standards

Kubernetes has Pod Security Standards (PSS) that replace the older PodSecurityPolicies. The three levels are Privileged, Baseline, and Restricted.

The `istio-init` container requires at least the **Baseline** level because it needs NET_ADMIN and NET_RAW capabilities. The **Restricted** level blocks these capabilities entirely.

If your namespace is enforced with the Restricted standard:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: my-namespace
  labels:
    pod-security.kubernetes.io/enforce: restricted
```

Then pods with `istio-init` will be rejected. You have a few options.

### Option 1: Use the Istio CNI Plugin

The cleanest solution is to switch to the Istio CNI plugin. With CNI, the network rules are configured at the node level by a DaemonSet, so the init container is not needed at all.

```bash
istioctl install --set components.cni.enabled=true
```

This removes the init container from injected pods, making them compatible with the Restricted security standard.

### Option 2: Relax Security for the Namespace

If you can't use CNI, you can set the namespace to Baseline enforcement:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: my-namespace
  labels:
    pod-security.kubernetes.io/enforce: baseline
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/audit: restricted
```

This allows the init container to run while still warning and auditing against the Restricted standard. You get visibility into what would break if you moved to Restricted.

### Option 3: Use a Policy Exception

With OPA Gatekeeper or Kyverno, you can create targeted exceptions for the Istio init container specifically.

For Kyverno:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: allow-istio-init
spec:
  validationFailureAction: Enforce
  background: true
  rules:
  - name: allow-istio-init-capabilities
    match:
      any:
      - resources:
          kinds:
          - Pod
    preconditions:
      all:
      - key: "{{ request.object.spec.initContainers[?name == 'istio-init'] | length(@) }}"
        operator: GreaterThan
        value: 0
    validate:
      message: "Istio init container is allowed NET_ADMIN and NET_RAW"
      podSecurity:
        level: baseline
        version: latest
        exclude:
        - controlName: Capabilities
          images:
          - "docker.io/istio/proxyv2:*"
```

For OPA Gatekeeper, you'd create a ConstraintTemplate that exempts init containers with the name `istio-init` and image matching `istio/proxyv2`.

## Working with PodSecurityPolicies (Legacy)

If your cluster still uses the deprecated PodSecurityPolicies, you need a PSP that allows the required capabilities:

```yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: istio-init-psp
spec:
  privileged: false
  allowedCapabilities:
  - NET_ADMIN
  - NET_RAW
  runAsUser:
    rule: RunAsAny
  seLinux:
    rule: RunAsAny
  fsGroup:
    rule: RunAsAny
  supplementalGroups:
    rule: RunAsAny
  volumes:
  - '*'
```

Bind this PSP to the service accounts that run Istio-injected pods:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: istio-init-psp-role
rules:
- apiGroups:
  - policy
  resources:
  - podsecuritypolicies
  resourceNames:
  - istio-init-psp
  verbs:
  - use
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: istio-init-psp-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: istio-init-psp-role
subjects:
- kind: Group
  name: system:serviceaccounts
  apiGroup: rbac.authorization.k8s.io
```

## Reducing the Sidecar's Security Context

Even if the init container needs elevated privileges, the sidecar itself (`istio-proxy`) doesn't need NET_ADMIN. Starting with Istio 1.10+, the sidecar runs without elevated privileges by default:

```yaml
containers:
- name: istio-proxy
  securityContext:
    allowPrivilegeEscalation: false
    capabilities:
      drop:
      - ALL
    readOnlyRootFilesystem: true
    runAsNonRoot: true
    runAsUser: 1337
```

This is good practice and compatible with most security policies. The init container does the privileged work during startup, and then the running sidecar operates with minimal permissions.

## OpenShift Considerations

OpenShift has its own Security Context Constraints (SCCs) that are more restrictive than standard Kubernetes. For Istio to work on OpenShift, you typically need to grant the `anyuid` SCC to the service accounts:

```bash
oc adm policy add-scc-to-group anyuid system:serviceaccounts:istio-system
oc adm policy add-scc-to-group anyuid system:serviceaccounts:my-namespace
```

Or create a custom SCC:

```yaml
apiVersion: security.openshift.io/v1
kind: SecurityContextConstraints
metadata:
  name: istio-init-scc
allowedCapabilities:
- NET_ADMIN
- NET_RAW
runAsUser:
  type: RunAsAny
seLinuxContext:
  type: RunAsAny
```

## Auditing Init Container Permissions

To check what capabilities are actually being used in your cluster, you can query pod specs:

```bash
kubectl get pods -A -o jsonpath='{range .items[*]}{.metadata.namespace}{"\t"}{.metadata.name}{"\t"}{range .spec.initContainers[*]}{.name}{": "}{.securityContext.capabilities.add}{"\n"}{end}{end}' | grep istio-init
```

This gives you a list of all pods with `istio-init` and their granted capabilities.

## Best Practice Summary

For new installations, use the Istio CNI plugin. It removes the need for privileged init containers entirely and is the recommended approach for security-sensitive environments.

For existing installations where CNI migration isn't feasible right now, use targeted policy exceptions that only allow the necessary capabilities for the `istio-init` container. Don't broadly relax your security policies just for Istio.

And regardless of which approach you take, make sure the `istio-proxy` sidecar itself runs with minimal privileges. The init container's elevated privileges are temporary (it runs and exits), but the sidecar runs for the lifetime of the pod, so keeping it locked down matters more from a security standpoint.
