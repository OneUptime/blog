# How to Set Up Flux CD on Red Hat OpenShift with Security Context Constraints

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, openshift, security context constraints, scc, kubernetes, gitops, red hat, continuous delivery

Description: A detailed guide to deploying Flux CD on Red Hat OpenShift while properly configuring Security Context Constraints for secure GitOps operations.

---

## Introduction

Red Hat OpenShift is an enterprise Kubernetes platform with enhanced security features, including Security Context Constraints (SCCs). SCCs control the actions that pods can perform and the resources they can access, providing an additional layer of security beyond standard Kubernetes RBAC. When deploying Flux CD on OpenShift, you must configure SCCs properly to allow Flux controllers to function while maintaining the platform's security posture.

This guide covers installing Flux CD on OpenShift and configuring the required Security Context Constraints.

## Prerequisites

Before you begin, ensure you have:

- An OpenShift 4.12+ cluster with cluster-admin access
- The `oc` CLI tool installed and configured
- `kubectl` and `flux` CLI installed
- A GitHub account with a personal access token
- Access to the OpenShift web console (optional but helpful)

## Understanding Security Context Constraints

OpenShift SCCs are cluster-level resources that control pod security. The built-in SCCs include:

- `restricted` - The default, most restrictive SCC
- `nonroot` - Similar to restricted but allows any non-root UID
- `anyuid` - Allows pods to run as any user, including root
- `privileged` - Allows full access to host resources

Flux controllers need specific permissions to function. By default, they run as non-root users, which aligns well with OpenShift's security model.

## Installing the Flux CLI

Install the Flux CLI:

```bash
# Install Flux CLI
curl -s https://fluxcd.io/install.sh | sudo bash

# Verify the installation
flux --version
```

## Logging into OpenShift

Authenticate with your OpenShift cluster:

```bash
# Login to OpenShift
oc login https://api.ocp-cluster.example.com:6443 \
  --username=kubeadmin \
  --password=<your-password>

# Verify access
oc get nodes
oc whoami
```

## Running Flux Pre-flight Checks

Check cluster compatibility:

```bash
# Run pre-flight checks
flux check --pre
```

On OpenShift, you may see warnings about pod security. These are expected and will be resolved through SCC configuration.

## Creating the Flux Namespace with OpenShift Annotations

Create the flux-system namespace with appropriate labels and annotations:

```yaml
# flux-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: flux-system
  labels:
    # OpenShift namespace labels
    openshift.io/cluster-monitoring: "true"
    # Pod security admission labels
    pod-security.kubernetes.io/enforce: privileged
    pod-security.kubernetes.io/audit: privileged
    pod-security.kubernetes.io/warn: privileged
```

```bash
# Apply the namespace
oc apply -f flux-namespace.yaml
```

## Creating Security Context Constraints for Flux

Define a custom SCC that grants Flux controllers the permissions they need without giving them full privileged access:

```yaml
# flux-scc.yaml
apiVersion: security.openshift.io/v1
kind: SecurityContextConstraints
metadata:
  name: flux-controllers
  annotations:
    kubernetes.io/description: >
      SCC for Flux CD controllers. Allows non-root execution
      with specific capabilities required for GitOps operations.
# Allow the controllers to run as non-root
allowPrivilegedContainer: false
allowPrivilegeEscalation: false
# Flux controllers need to write to their own filesystem
readOnlyRootFilesystem: false
# Run as the user specified in the container image
runAsUser:
  type: MustRunAsNonRoot
seLinuxContext:
  type: MustRunAs
fsGroup:
  type: RunAsAny
supplementalGroups:
  type: RunAsAny
# Flux needs network access for Git operations and Helm downloads
allowHostNetwork: false
allowHostPorts: false
allowHostPID: false
allowHostIPC: false
# Required volume types for Flux
volumes:
  - configMap
  - downwardAPI
  - emptyDir
  - persistentVolumeClaim
  - projected
  - secret
  - ephemeral
# Drop all capabilities by default
requiredDropCapabilities:
  - ALL
```

Apply the SCC:

```bash
# Create the custom SCC
oc apply -f flux-scc.yaml
```

## Binding the SCC to Flux Service Accounts

Create a ClusterRole and ClusterRoleBinding to assign the SCC to Flux service accounts:

```yaml
# flux-scc-binding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: flux-scc-role
rules:
  - apiGroups:
      - security.openshift.io
    resources:
      - securitycontextconstraints
    resourceNames:
      - flux-controllers
    verbs:
      - use
---
# Bind the SCC to all Flux controller service accounts
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: flux-scc-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: flux-scc-role
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
# Apply the SCC bindings
oc apply -f flux-scc-binding.yaml
```

## Bootstrapping Flux CD on OpenShift

Now bootstrap Flux with your GitHub repository:

```bash
# Set GitHub credentials
export GITHUB_TOKEN=<your-github-personal-access-token>
export GITHUB_USER=<your-github-username>

# Bootstrap Flux CD
flux bootstrap github \
  --owner=$GITHUB_USER \
  --repository=openshift-gitops \
  --branch=main \
  --path=./clusters/openshift \
  --personal \
  --components-extra=image-reflector-controller,image-automation-controller
```

## Verifying the Installation

Confirm that Flux controllers are running with the correct SCC:

```bash
# Check Flux pods
oc get pods -n flux-system

# Verify which SCC each pod is using
oc get pods -n flux-system -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.metadata.annotations.openshift\.io/scc}{"\n"}{end}'

# Run the Flux health check
flux check
```

Each pod should show it is using the `flux-controllers` SCC.

## Configuring SCCs for Flux-Managed Workloads

When Flux deploys workloads, those workloads also need appropriate SCCs. Create SCCs for your application namespaces:

```yaml
# app-scc.yaml
apiVersion: security.openshift.io/v1
kind: SecurityContextConstraints
metadata:
  name: flux-managed-apps
  annotations:
    kubernetes.io/description: >
      SCC for applications deployed by Flux CD.
      Provides a restricted but functional security context.
allowPrivilegedContainer: false
allowPrivilegeEscalation: false
readOnlyRootFilesystem: true
runAsUser:
  type: MustRunAsNonRoot
seLinuxContext:
  type: MustRunAs
fsGroup:
  type: MustRunAs
  ranges:
    - min: 1000
      max: 65534
supplementalGroups:
  type: MustRunAs
  ranges:
    - min: 1000
      max: 65534
volumes:
  - configMap
  - downwardAPI
  - emptyDir
  - persistentVolumeClaim
  - projected
  - secret
requiredDropCapabilities:
  - ALL
```

## Deploying Applications with SCCs

Create an application deployment that works with OpenShift SCCs:

```yaml
# apps/base/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: demo-app
  labels:
    managed-by: flux
```

```yaml
# apps/base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: demo-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      # Security context compatible with OpenShift restricted SCC
      securityContext:
        runAsNonRoot: true
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: web-app
          image: registry.access.redhat.com/ubi9/nginx-122:latest
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL
          volumeMounts:
            - name: tmp
              mountPath: /tmp
            - name: cache
              mountPath: /var/cache/nginx
            - name: run
              mountPath: /var/run
      volumes:
        - name: tmp
          emptyDir: {}
        - name: cache
          emptyDir: {}
        - name: run
          emptyDir: {}
```

```yaml
# apps/base/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: web-app
  namespace: demo-app
spec:
  selector:
    app: web-app
  ports:
    - port: 8080
      targetPort: 8080
```

```yaml
# apps/base/route.yaml
# OpenShift Route instead of Ingress
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: web-app
  namespace: demo-app
spec:
  to:
    kind: Service
    name: web-app
  port:
    targetPort: 8080
  tls:
    termination: edge
    insecureEdgeTerminationPolicy: Redirect
```

```yaml
# apps/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - deployment.yaml
  - service.yaml
  - route.yaml
```

```yaml
# clusters/openshift/apps/demo-app.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: demo-app
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/base
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: web-app
      namespace: demo-app
  timeout: 3m
```

## Deploying Helm Charts with SCC Awareness

When deploying Helm charts on OpenShift, you often need to configure SCC-compatible values:

```yaml
# infrastructure/sources/bitnami.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: bitnami
  namespace: flux-system
spec:
  interval: 24h
  url: https://charts.bitnami.com/bitnami
```

```yaml
# infrastructure/controllers/postgresql.yaml
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: postgresql
  namespace: flux-system
spec:
  interval: 15m
  chart:
    spec:
      chart: postgresql
      version: ">=15.0.0"
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
  targetNamespace: database
  install:
    createNamespace: true
  values:
    # OpenShift-compatible security settings
    primary:
      podSecurityContext:
        enabled: true
        fsGroup: 1000650000
      containerSecurityContext:
        enabled: true
        runAsUser: 1000650000
        runAsNonRoot: true
        allowPrivilegeEscalation: false
        capabilities:
          drop:
            - ALL
        seccompProfile:
          type: RuntimeDefault
    volumePermissions:
      enabled: false
    shmVolume:
      enabled: false
```

## Monitoring SCC Violations

Set up alerts for SCC violations that might affect Flux-managed workloads:

```yaml
# clusters/openshift/apps/scc-monitoring.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack
  namespace: flux-system
spec:
  type: slack
  channel: openshift-alerts
  secretRef:
    name: slack-webhook
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: scc-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
  exclusionList:
    - ".*upgrade.*"
```

## Integrating with OpenShift GitOps (ArgoCD)

If your organization already uses OpenShift GitOps (ArgoCD), you can run Flux alongside it for specific use cases:

```yaml
# Flux manages specific namespaces
# while OpenShift GitOps manages others
# Use namespace selectors to avoid conflicts

# clusters/openshift/apps/flux-scope.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: flux-managed-apps
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/flux-managed
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Only manage resources in specific namespaces
  patches:
    - patch: |
        apiVersion: v1
        kind: Namespace
        metadata:
          name: not-important
          labels:
            managed-by: flux-cd
      target:
        kind: Namespace
```

## Troubleshooting SCC Issues

Common SCC-related issues and solutions:

```bash
# Check which SCC a pod is using
oc get pod <pod-name> -n flux-system -o jsonpath='{.metadata.annotations.openshift\.io/scc}'

# List all SCCs and their priorities
oc get scc

# Describe the custom Flux SCC
oc describe scc flux-controllers

# Check SCC-related events
oc get events -n flux-system --field-selector reason=FailedCreate

# Debug SCC admission failures
oc adm policy who-can use scc flux-controllers

# Verify service account SCC bindings
oc adm policy who-can use scc flux-controllers -n flux-system

# Check Flux controller logs for permission errors
oc logs -n flux-system deploy/source-controller | grep -i "permission\|denied\|forbidden"
oc logs -n flux-system deploy/kustomize-controller | grep -i "permission\|denied\|forbidden"

# Force reconciliation after SCC changes
flux reconcile kustomization flux-system --with-source
```

## Best Practices for SCCs with Flux

When working with Flux on OpenShift, follow these guidelines:

1. Always use the most restrictive SCC that allows your workload to function
2. Avoid granting `privileged` or `anyuid` SCCs unless absolutely necessary
3. Use OpenShift-compatible container images (UBI-based) when possible
4. Set explicit security contexts in your deployments to match SCC requirements
5. Test SCC configurations in a non-production cluster before deploying to production

## Conclusion

You now have Flux CD running on Red Hat OpenShift with properly configured Security Context Constraints. This setup ensures that your GitOps workflow operates within OpenShift's security framework. The custom SCC provides Flux controllers with the permissions they need while maintaining the security posture expected in enterprise OpenShift environments. All workloads deployed through Flux inherit the appropriate SCCs, ensuring consistent security across your entire deployment pipeline.
