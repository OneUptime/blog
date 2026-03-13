# How to Deploy Custom Controllers with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, Custom Controllers, Operator, GitOps, CRDs, controller-runtime

Description: A practical guide to deploying and managing custom Kubernetes controllers and operators using Flux CD for automated cluster operations.

---

## Introduction

Custom controllers extend Kubernetes by watching for changes to resources and taking automated actions. They are the backbone of the Kubernetes operator pattern, enabling you to manage complex applications through declarative Custom Resource Definitions (CRDs). Deploying custom controllers through Flux CD ensures that your operators are version-controlled, consistently deployed, and automatically updated across clusters.

This guide covers deploying custom controllers with Flux CD, managing CRDs safely, handling upgrades, and configuring RBAC for controller permissions.

## Prerequisites

- Kubernetes cluster v1.26 or later
- Flux CD v2 installed and bootstrapped
- kubectl access to the cluster
- A container registry for your custom controller images

## Repository Structure

```yaml
# Organize controller deployments clearly
# infrastructure/
#   controllers/
#     my-controller/
#       crds/
#         kustomization.yaml
#         myresource-crd.yaml
#       base/
#         kustomization.yaml
#         namespace.yaml
#         deployment.yaml
#         rbac.yaml
#         service-account.yaml
#       production/
#         kustomization.yaml
#       staging/
#         kustomization.yaml
```

## Deploying CRDs Separately

Always deploy CRDs before the controller to avoid startup failures:

```yaml
# clusters/my-cluster/controller-crds.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-controller-crds
  namespace: flux-system
spec:
  interval: 30m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/controllers/my-controller/crds
  # Never prune CRDs to prevent accidental data loss
  prune: false
  wait: true
```

```yaml
# infrastructure/controllers/my-controller/crds/myresource-crd.yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: myresources.myorg.io
  labels:
    app.kubernetes.io/managed-by: flux
  annotations:
    # Indicate the controller version that matches this CRD
    controller.myorg.io/version: "v1.5.0"
spec:
  group: myorg.io
  versions:
    - name: v1
      served: true
      storage: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              required:
                - replicas
                - image
              properties:
                replicas:
                  type: integer
                  minimum: 1
                  maximum: 100
                image:
                  type: string
                config:
                  type: object
                  properties:
                    logLevel:
                      type: string
                      enum: ["debug", "info", "warn", "error"]
                    metricsEnabled:
                      type: boolean
            status:
              type: object
              properties:
                phase:
                  type: string
                readyReplicas:
                  type: integer
                conditions:
                  type: array
                  items:
                    type: object
                    properties:
                      type:
                        type: string
                      status:
                        type: string
                      lastTransitionTime:
                        type: string
                        format: date-time
                      reason:
                        type: string
                      message:
                        type: string
      subresources:
        status: {}
      additionalPrinterColumns:
        - name: Phase
          type: string
          jsonPath: .status.phase
        - name: Ready
          type: integer
          jsonPath: .status.readyReplicas
        - name: Age
          type: date
          jsonPath: .metadata.creationTimestamp
  scope: Namespaced
  names:
    plural: myresources
    singular: myresource
    kind: MyResource
    shortNames:
      - mr
```

## Controller RBAC Configuration

```yaml
# infrastructure/controllers/my-controller/base/service-account.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-controller
  namespace: my-controller-system
  labels:
    app.kubernetes.io/managed-by: flux
```

```yaml
# infrastructure/controllers/my-controller/base/rbac.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: my-controller-role
rules:
  # Permissions to manage custom resources
  - apiGroups: ["myorg.io"]
    resources: ["myresources"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["myorg.io"]
    resources: ["myresources/status"]
    verbs: ["get", "update", "patch"]
  - apiGroups: ["myorg.io"]
    resources: ["myresources/finalizers"]
    verbs: ["update"]
  # Permissions to manage downstream Kubernetes resources
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: [""]
    resources: ["services", "configmaps"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: [""]
    resources: ["events"]
    verbs: ["create", "patch"]
  # Leader election permissions
  - apiGroups: ["coordination.k8s.io"]
    resources: ["leases"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: my-controller-rolebinding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: my-controller-role
subjects:
  - kind: ServiceAccount
    name: my-controller
    namespace: my-controller-system
```

## Controller Deployment

```yaml
# infrastructure/controllers/my-controller/base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-controller
  namespace: my-controller-system
  labels:
    app: my-controller
    app.kubernetes.io/managed-by: flux
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-controller
  template:
    metadata:
      labels:
        app: my-controller
    spec:
      serviceAccountName: my-controller
      # Run on different nodes for high availability
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: my-controller
                topologyKey: kubernetes.io/hostname
      containers:
        - name: controller
          image: ghcr.io/myorg/my-controller:v1.5.0
          args:
            # Enable leader election for HA
            - "--leader-elect=true"
            # Set log verbosity
            - "--zap-log-level=info"
            # Metrics bind address
            - "--metrics-bind-address=:8080"
            # Health probe bind address
            - "--health-probe-bind-address=:8081"
          ports:
            - name: metrics
              containerPort: 8080
            - name: healthz
              containerPort: 8081
          livenessProbe:
            httpGet:
              path: /healthz
              port: healthz
            initialDelaySeconds: 15
            periodSeconds: 20
          readinessProbe:
            httpGet:
              path: /readyz
              port: healthz
            initialDelaySeconds: 5
            periodSeconds: 10
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            runAsNonRoot: true
            capabilities:
              drop:
                - ALL
```

## Deploying Controller with Helm

For controllers distributed as Helm charts:

```yaml
# infrastructure/controllers/cert-manager/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: cert-manager
  namespace: cert-manager
spec:
  interval: 30m
  chart:
    spec:
      chart: cert-manager
      version: "1.14.x"
      sourceRef:
        kind: HelmRepository
        name: jetstack
        namespace: flux-system
  install:
    createNamespace: true
    # Install CRDs with the chart
    crds: CreateReplace
  upgrade:
    # Update CRDs on upgrade
    crds: CreateReplace
  values:
    replicaCount: 2
    installCRDs: true
    prometheus:
      enabled: true
      servicemonitor:
        enabled: true
```

## Flux Kustomization for Controller Deployment

```yaml
# clusters/my-cluster/my-controller.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-controller
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/controllers/my-controller/production
  prune: true
  wait: true
  # Ensure CRDs are installed before the controller
  dependsOn:
    - name: my-controller-crds
  # Health check the controller deployment
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: my-controller
      namespace: my-controller-system
```

## Environment-Specific Configuration

```yaml
# infrastructure/controllers/my-controller/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - service-account.yaml
  - rbac.yaml
  - deployment.yaml
```

```yaml
# infrastructure/controllers/my-controller/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../base
patches:
  - target:
      kind: Deployment
      name: my-controller
    patch: |
      - op: replace
        path: /spec/replicas
        # Run 2 replicas in production for HA
        value: 2
      - op: replace
        path: /spec/template/spec/containers/0/args
        value:
          - "--leader-elect=true"
          - "--zap-log-level=info"
          - "--metrics-bind-address=:8080"
          - "--health-probe-bind-address=:8081"
```

```yaml
# infrastructure/controllers/my-controller/staging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../base
patches:
  - target:
      kind: Deployment
      name: my-controller
    patch: |
      - op: replace
        path: /spec/replicas
        # Single replica in staging
        value: 1
      - op: replace
        path: /spec/template/spec/containers/0/args
        value:
          - "--leader-elect=false"
          - "--zap-log-level=debug"
          - "--metrics-bind-address=:8080"
          - "--health-probe-bind-address=:8081"
```

## Deploying Custom Resources

Once the controller is running, deploy custom resources managed by it:

```yaml
# apps/my-resources/production/web-service.yaml
apiVersion: myorg.io/v1
kind: MyResource
metadata:
  name: web-service
  namespace: production
spec:
  replicas: 3
  image: ghcr.io/myorg/web-service:v2.0.0
  config:
    logLevel: info
    metricsEnabled: true
```

```yaml
# clusters/my-cluster/my-resources.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-resources
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/my-resources/production
  prune: true
  wait: true
  # Custom resources depend on the controller being ready
  dependsOn:
    - name: my-controller
```

## Monitoring Controllers

```yaml
# infrastructure/controllers/my-controller/base/servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: my-controller
  namespace: my-controller-system
spec:
  selector:
    matchLabels:
      app: my-controller
  endpoints:
    - port: metrics
      interval: 30s
      path: /metrics
```

## Verifying Controller Deployment

```bash
# Check controller pods
kubectl get pods -n my-controller-system

# View controller logs
kubectl logs -n my-controller-system -l app=my-controller --tail=50

# Check CRDs are installed
kubectl get crds | grep myorg.io

# Verify custom resources
kubectl get myresources --all-namespaces

# Check Flux reconciliation
flux get kustomizations my-controller
flux get kustomizations my-controller-crds
```

## Best Practices

1. Always deploy CRDs separately from the controller with `prune: false`
2. Use leader election when running multiple controller replicas
3. Implement proper RBAC with least-privilege permissions
4. Add health checks and readiness probes to controller deployments
5. Use pod anti-affinity to distribute controller replicas across nodes
6. Version CRDs alongside controller images to maintain compatibility
7. Run controllers with non-root security contexts and read-only filesystems
8. Monitor controller metrics for reconciliation latency and error rates

## Conclusion

Deploying custom controllers through Flux CD provides a reliable, GitOps-driven approach to extending Kubernetes. By separating CRD management from controller deployment, implementing proper RBAC, and using Flux dependencies, you ensure that your operators are safely deployed and automatically updated. This pattern scales well for managing multiple controllers across many clusters while maintaining version control and auditability.
