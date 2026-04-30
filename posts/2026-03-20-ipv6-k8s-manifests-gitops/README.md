# How to Deploy IPv6 Kubernetes Manifests with GitOps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Kubernetes, GitOps, Manifest, ArgoCD, Flux CD, Dual-Stack

Description: Write and deploy Kubernetes manifests with IPv6 service configuration, dual-stack settings, and IPv6-aware health checks using GitOps tools like ArgoCD and Flux CD.

## Introduction

Deploying IPv6-capable applications with GitOps requires Kubernetes manifests that explicitly configure IPv6 service families, dual-stack policies, and IPv6 endpoint URLs. These manifests are stored in Git repositories and continuously reconciled by ArgoCD or Flux CD. IPv6-specific configuration includes `ipFamilyPolicy`, `ipFamilies`, service type, and application-level environment variables for IPv6 addresses.

## Dual-Stack Service Manifest

```yaml
# kubernetes/services/app-service.yaml

apiVersion: v1
kind: Service
metadata:
  name: myapp
  namespace: production
  labels:
    app: myapp
spec:
  # Dual-stack: the service gets both IPv4 and IPv6 cluster IPs
  ipFamilyPolicy: PreferDualStack
  ipFamilies:
    - IPv4
    - IPv6

  selector:
    app: myapp
  type: ClusterIP
  ports:
    - name: http
      port: 8080
      targetPort: 8080
      protocol: TCP
```

## LoadBalancer Service with IPv6

```yaml
# kubernetes/services/app-lb.yaml

apiVersion: v1
kind: Service
metadata:
  name: myapp-lb
  namespace: production
  # Some cloud providers require additional annotations or subnet settings
  # for dual-stack load balancers.
spec:
  ipFamilyPolicy: RequireDualStack
  ipFamilies:
    - IPv4
    - IPv6
  type: LoadBalancer
  selector:
    app: myapp
  ports:
    - name: https
      port: 443
      targetPort: 8443
```

## Deployment with IPv6 Environment Configuration

```yaml
# kubernetes/deployments/myapp.yaml

apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: myapp
          image: registry.example.com/myapp:1.2.0
          ports:
            - containerPort: 8080
              protocol: TCP

          # Environment variables for IPv6-aware application
          env:
            - name: LISTEN_ADDR
              value: "[::]:8080"    # Bind to the IPv6 unspecified address; IPv4 handling depends on the app/runtime
            - name: DATABASE_HOST
              value: "[2001:db8::db]:5432"
            - name: REDIS_URL
              value: "redis://[2001:db8::6379]:6379"

          # Health check endpoints reached via the Pod IP
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
              # Kubernetes probes target the Pod IP unless httpGet.host is set
            initialDelaySeconds: 10
            periodSeconds: 30

          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
```

## ConfigMap with IPv6 Configuration

```yaml
# kubernetes/configs/app-config.yaml

apiVersion: v1
kind: ConfigMap
metadata:
  name: myapp-config
  namespace: production
data:
  # IPv6 configuration for the application
  ALLOWED_CIDRS: "2001:db8:100::/48,10.0.0.0/8"
  TRUSTED_PROXIES: "2001:db8:200::/48,fd00:100::/64"
  DNS_SERVER: "2001:db8::53"
  NTP_SERVER: "2001:db8::123"

  # Application-specific IPv6 settings
  IPV6_ONLY: "false"          # Accept both IPv4 and IPv6 clients
  BIND_ADDRESS: "::"          # Bind to the IPv6 unspecified address
```

## Kustomize Overlay for IPv6-Only Environment

```yaml
# kubernetes/overlays/ipv6-only/kustomization.yaml

apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base

# Patches for IPv6-only environment

patches:
  # Change service to IPv6-only
  - patch: |
      apiVersion: v1
      kind: Service
      metadata:
        name: myapp
      spec:
        ipFamilyPolicy: SingleStack
        ipFamilies:
          - IPv6
    target:
      kind: Service
      name: myapp

  # Update environment variable for IPv6-only bind
  - patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: myapp
      spec:
        template:
          spec:
            containers:
              - name: myapp
                env:
                  - name: LISTEN_ADDR
                    value: "[::]:8080"
                  - name: FORCE_IPV6
                    value: "true"
    target:
      kind: Deployment
      name: myapp
```

## ArgoCD Application for IPv6 Manifests

```yaml
# argocd/applications/myapp.yaml

apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp-ipv6
  namespace: argocd
spec:
  project: default

  source:
    repoURL: "https://git.example.com/org/myapp-k8s.git"
    targetRevision: main
    path: "kubernetes/overlays/ipv6-only"    # IPv6-specific overlay

  destination:
    server: https://kubernetes.default.svc
    namespace: production

  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

## Flux Kustomization for IPv6 Manifests

```yaml
# flux/kustomizations/myapp-ipv6.yaml

apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp-ipv6
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: myapp-k8s
  path: "./kubernetes/overlays/ipv6-only"
  prune: true

  # Substitute variables for IPv6 configuration
  postBuild:
    substitute:
      IPV6_PREFIX: "2001:db8:300::/64"
      DNS_SERVER: "2001:db8::53"
```

## Validate IPv6 Configuration

```bash
# Validate that the Service manifest is accepted by the API server
kubectl apply --dry-run=server -f kubernetes/services/app-service.yaml

# After applying, check that the Service has both cluster IP families
kubectl get svc myapp -o jsonpath-as-json='{.spec.clusterIPs}'
# Expected: ["10.96.1.1", "fd00::1"]

# After the Deployment is running, verify the Pod IP list
kubectl get pod myapp-xxx -o jsonpath-as-json='{.status.podIPs}'
# Expected: [{"ip":"10.244.0.1"}, {"ip":"fd00::10"}]

# Test IPv6 connectivity to the Service from inside the cluster
kubectl run -it --rm debug --restart=Never --image=nicolaka/netshoot -- \
    curl -6 http://[fd00::1]:8080/health
```

## Conclusion

Kubernetes manifests for IPv6 GitOps deployments specify `ipFamilyPolicy` and `ipFamilies` on services to control dual-stack or IPv6-only operation. Application containers that support IPv6 should listen on the IPv6 unspecified address (`::` or `[::]:PORT`, depending on the application's configuration format) rather than only `0.0.0.0` when IPv6 connectivity is required. Kustomize overlays enable environment-specific IPv6 configuration without duplicating base manifests. ArgoCD and Flux CD deploy these manifests from Git repositories without special IPv6 consideration - the manifests themselves carry the IPv6 configuration. Use `--dry-run=server` to validate manifests against the cluster before committing to Git, and verify assigned `clusterIPs` and `podIPs` after applying. Flux's `postBuild.substitute` enables parameterizing IPv6 prefixes and addresses per environment.
