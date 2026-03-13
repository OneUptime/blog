# How to Add Security Context with Post-Renderer in HelmRelease

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, HelmRelease, Kubernetes, GitOps, Helm, Post-Renderers, Security Context, Pod Security

Description: Learn how to add and modify security contexts for pods and containers in Helm chart resources using Flux post-renderers.

---

## Introduction

Security contexts in Kubernetes define privilege and access control settings for pods and containers. They control critical security properties such as the user and group a process runs as, whether the root filesystem is read-only, Linux capabilities, and whether privilege escalation is allowed. Enforcing proper security contexts is essential for meeting security compliance requirements and following the principle of least privilege.

Many Helm charts ship with default security contexts that may not meet your organization's security standards. Some charts run containers as root by default or grant unnecessary capabilities. Flux post-renderers allow you to override or add security context settings to any workload without modifying the chart source, ensuring all deployments comply with your security policies.

This guide demonstrates how to use Flux post-renderers to configure both pod-level and container-level security contexts.

## Prerequisites

Before you begin, ensure you have:

- A Kubernetes cluster with Flux CD installed
- A HelmRelease deployed through Flux
- kubectl access to the cluster
- Understanding of Kubernetes security contexts and Pod Security Standards

## Adding Pod-Level Security Context

The pod security context applies to all containers in the pod. To set it using a post-renderer:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: production
spec:
  interval: 5m
  chart:
    spec:
      chart: my-app
      version: "2.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  postRenderers:
    - kustomize:
        patches:
          - target:
              kind: Deployment
              name: my-app
            patch: |
              apiVersion: apps/v1
              kind: Deployment
              metadata:
                name: my-app
              spec:
                template:
                  spec:
                    securityContext:
                      runAsNonRoot: true
                      runAsUser: 1000
                      runAsGroup: 1000
                      fsGroup: 1000
                      seccompProfile:
                        type: RuntimeDefault
```

This ensures the pod runs as a non-root user with a specific UID and GID, and uses the default seccomp profile.

## Adding Container-Level Security Context

Container security contexts provide finer-grained control per container:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: production
spec:
  interval: 5m
  chart:
    spec:
      chart: my-app
      version: "2.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  postRenderers:
    - kustomize:
        patches:
          - target:
              kind: Deployment
              name: my-app
            patch: |
              apiVersion: apps/v1
              kind: Deployment
              metadata:
                name: my-app
              spec:
                template:
                  spec:
                    securityContext:
                      runAsNonRoot: true
                      runAsUser: 1000
                      fsGroup: 1000
                    containers:
                      - name: my-app
                        securityContext:
                          allowPrivilegeEscalation: false
                          readOnlyRootFilesystem: true
                          capabilities:
                            drop:
                              - ALL
```

This combines pod-level settings with container-level restrictions. The container runs with a read-only root filesystem, no privilege escalation, and all Linux capabilities dropped.

## Applying Security Context to All Deployments

To enforce security standards across all Deployments in a chart:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-platform
  namespace: production
spec:
  interval: 5m
  chart:
    spec:
      chart: my-platform
      version: "3.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  postRenderers:
    - kustomize:
        patches:
          - target:
              kind: Deployment
            patch: |
              apiVersion: apps/v1
              kind: Deployment
              metadata:
                name: placeholder
              spec:
                template:
                  spec:
                    securityContext:
                      runAsNonRoot: true
                      seccompProfile:
                        type: RuntimeDefault
```

This applies the pod security context to every Deployment in the chart, enforcing non-root execution and the default seccomp profile.

## Hardening with Restricted Pod Security Standards

To comply with the Kubernetes Restricted Pod Security Standard:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: production
spec:
  interval: 5m
  chart:
    spec:
      chart: my-app
      version: "2.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  postRenderers:
    - kustomize:
        patches:
          - target:
              kind: Deployment
              name: my-app
            patch: |
              apiVersion: apps/v1
              kind: Deployment
              metadata:
                name: my-app
              spec:
                template:
                  spec:
                    securityContext:
                      runAsNonRoot: true
                      runAsUser: 65534
                      runAsGroup: 65534
                      fsGroup: 65534
                      seccompProfile:
                        type: RuntimeDefault
                    containers:
                      - name: my-app
                        securityContext:
                          allowPrivilegeEscalation: false
                          readOnlyRootFilesystem: true
                          capabilities:
                            drop:
                              - ALL
                    initContainers:
                      - name: init
                        securityContext:
                          allowPrivilegeEscalation: false
                          readOnlyRootFilesystem: true
                          capabilities:
                            drop:
                              - ALL
```

This configuration meets the Restricted Pod Security Standard by enforcing non-root execution, dropping all capabilities, preventing privilege escalation, and enabling read-only root filesystem.

## Adding Writable Temporary Directories

When using `readOnlyRootFilesystem: true`, applications that need writable directories require emptyDir volumes:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: production
spec:
  interval: 5m
  chart:
    spec:
      chart: my-app
      version: "2.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  postRenderers:
    - kustomize:
        patches:
          - target:
              kind: Deployment
              name: my-app
            patch: |
              apiVersion: apps/v1
              kind: Deployment
              metadata:
                name: my-app
              spec:
                template:
                  spec:
                    securityContext:
                      runAsNonRoot: true
                      runAsUser: 1000
                    containers:
                      - name: my-app
                        securityContext:
                          readOnlyRootFilesystem: true
                          allowPrivilegeEscalation: false
                          capabilities:
                            drop:
                              - ALL
                        volumeMounts:
                          - name: tmp
                            mountPath: /tmp
                          - name: cache
                            mountPath: /var/cache
                    volumes:
                      - name: tmp
                        emptyDir:
                          sizeLimit: 100Mi
                      - name: cache
                        emptyDir:
                          sizeLimit: 500Mi
```

This provides writable `/tmp` and `/var/cache` directories backed by emptyDir volumes while keeping the root filesystem read-only.

## Selective Security for Different Containers

When a pod has multiple containers with different security requirements:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: production
spec:
  interval: 5m
  chart:
    spec:
      chart: my-app
      version: "2.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  postRenderers:
    - kustomize:
        patches:
          - target:
              kind: Deployment
              name: my-app
            patch: |
              apiVersion: apps/v1
              kind: Deployment
              metadata:
                name: my-app
              spec:
                template:
                  spec:
                    securityContext:
                      runAsNonRoot: true
                      fsGroup: 1000
                    containers:
                      - name: my-app
                        securityContext:
                          allowPrivilegeEscalation: false
                          readOnlyRootFilesystem: true
                          capabilities:
                            drop:
                              - ALL
                      - name: nginx-proxy
                        securityContext:
                          allowPrivilegeEscalation: false
                          readOnlyRootFilesystem: true
                          capabilities:
                            drop:
                              - ALL
                            add:
                              - NET_BIND_SERVICE
```

The nginx proxy container retains the `NET_BIND_SERVICE` capability to bind to ports below 1024, while the main application drops all capabilities.

## Verifying Security Context

After deployment, verify the security context:

```bash
kubectl get deployment my-app -n production -o jsonpath='{.spec.template.spec.securityContext}' | jq .
kubectl get deployment my-app -n production -o jsonpath='{.spec.template.spec.containers[0].securityContext}' | jq .
```

Check running pods:

```bash
kubectl exec -n production deployment/my-app -- id
kubectl exec -n production deployment/my-app -- cat /proc/1/status | grep -i cap
```

## Conclusion

Flux post-renderers provide an effective way to enforce security contexts across all Helm chart workloads. By adding pod-level and container-level security contexts through post-renderers, you can meet Pod Security Standards compliance requirements without modifying upstream charts. Always test security context changes thoroughly, as they can affect application behavior, especially when enabling read-only root filesystems or dropping Linux capabilities. Start with the Restricted Pod Security Standard as your target and make minimal exceptions as needed.
