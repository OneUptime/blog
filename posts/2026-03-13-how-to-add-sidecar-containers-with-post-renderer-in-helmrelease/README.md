# How to Add Sidecar Containers with Post-Renderer in HelmRelease

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, HelmRelease, Kubernetes, GitOps, Helm, Post-Renderer, Sidecar, Containers

Description: Learn how to inject sidecar containers into Helm chart deployments using Flux post-renderers without modifying the original chart.

---

## Introduction

Sidecar containers are a fundamental pattern in Kubernetes. They run alongside the main application container in the same pod, providing supporting functionality such as logging, monitoring, proxying, or security. While service meshes like Istio inject sidecars automatically through admission webhooks, many other sidecar patterns require explicit configuration in the pod specification.

When deploying applications through Helm charts, adding sidecar containers can be challenging if the chart does not support them through its values interface. Flux post-renderers solve this problem by allowing you to inject additional containers into any pod specification rendered by a Helm chart, without maintaining a chart fork.

This guide shows you how to use Flux post-renderers to add sidecar containers to Helm chart deployments with practical, production-ready examples.

## Prerequisites

Before following this guide, make sure you have:

- A Kubernetes cluster with Flux CD installed
- A HelmRelease managed by Flux
- kubectl access to the cluster
- Understanding of Kubernetes pod specifications

## Adding a Basic Sidecar Container

To add a sidecar container to a Deployment, use a strategic merge patch in the post-renderer:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 10m
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
                    containers:
                      - name: log-forwarder
                        image: fluent/fluent-bit:2.2
                        resources:
                          requests:
                            cpu: 50m
                            memory: 64Mi
                          limits:
                            cpu: 100m
                            memory: 128Mi
                        volumeMounts:
                          - name: app-logs
                            mountPath: /var/log/app
                    volumes:
                      - name: app-logs
                        emptyDir: {}
```

This patch adds a Fluent Bit log forwarder sidecar that shares a log volume with the main application container.

## Adding a Monitoring Sidecar

A common pattern is adding a metrics exporter sidecar to applications that do not natively expose Prometheus metrics:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: legacy-app
  namespace: production
spec:
  interval: 5m
  chart:
    spec:
      chart: legacy-app
      version: "1.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  postRenderers:
    - kustomize:
        patches:
          - target:
              kind: Deployment
              name: legacy-app
            patch: |
              apiVersion: apps/v1
              kind: Deployment
              metadata:
                name: legacy-app
              spec:
                template:
                  metadata:
                    annotations:
                      prometheus.io/scrape: "true"
                      prometheus.io/port: "9102"
                  spec:
                    containers:
                      - name: exporter
                        image: prom/statsd-exporter:v0.26.0
                        ports:
                          - name: metrics
                            containerPort: 9102
                        resources:
                          requests:
                            cpu: 10m
                            memory: 32Mi
                          limits:
                            cpu: 50m
                            memory: 64Mi
```

This adds a StatsD exporter sidecar along with the Prometheus scrape annotations needed for automatic metrics discovery.

## Adding a Security Sidecar

For security-focused deployments, you might add an authentication proxy sidecar:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: internal-dashboard
  namespace: production
spec:
  interval: 5m
  chart:
    spec:
      chart: internal-dashboard
      version: "1.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  postRenderers:
    - kustomize:
        patches:
          - target:
              kind: Deployment
              name: internal-dashboard
            patch: |
              apiVersion: apps/v1
              kind: Deployment
              metadata:
                name: internal-dashboard
              spec:
                template:
                  spec:
                    containers:
                      - name: oauth-proxy
                        image: quay.io/oauth2-proxy/oauth2-proxy:v7.5.1
                        args:
                          - --provider=oidc
                          - --upstream=http://localhost:8080
                          - --http-address=0.0.0.0:4180
                          - --email-domain=*
                        ports:
                          - name: proxy
                            containerPort: 4180
                        env:
                          - name: OAUTH2_PROXY_CLIENT_ID
                            valueFrom:
                              secretKeyRef:
                                name: oauth-credentials
                                key: client-id
                          - name: OAUTH2_PROXY_CLIENT_SECRET
                            valueFrom:
                              secretKeyRef:
                                name: oauth-credentials
                                key: client-secret
                          - name: OAUTH2_PROXY_COOKIE_SECRET
                            valueFrom:
                              secretKeyRef:
                                name: oauth-credentials
                                key: cookie-secret
                        resources:
                          requests:
                            cpu: 50m
                            memory: 64Mi
                          limits:
                            cpu: 100m
                            memory: 128Mi
```

This adds an OAuth2 proxy sidecar that handles authentication before traffic reaches the application.

## Adding Sidecars to Multiple Deployments

If your chart produces multiple Deployments that all need the same sidecar, target all Deployments:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: microservices
  namespace: production
spec:
  interval: 5m
  chart:
    spec:
      chart: microservices
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
            patch: |
              apiVersion: apps/v1
              kind: Deployment
              metadata:
                name: placeholder
              spec:
                template:
                  spec:
                    containers:
                      - name: fluentbit
                        image: fluent/fluent-bit:2.2
                        volumeMounts:
                          - name: shared-logs
                            mountPath: /var/log/app
                    volumes:
                      - name: shared-logs
                        emptyDir: {}
```

By not specifying a name in the target selector, the patch applies to all Deployments in the chart.

## Verifying Sidecar Injection

After deploying, verify that the sidecar was injected:

```bash
kubectl get pods -n production -l app.kubernetes.io/name=my-app -o jsonpath='{range .items[*]}{.metadata.name}: {range .spec.containers[*]}{.name} {end}{"\n"}{end}'
```

Check the sidecar container logs:

```bash
kubectl logs deployment/my-app -n production -c log-forwarder
```

## Conclusion

Flux post-renderers make it straightforward to inject sidecar containers into Helm chart deployments. Whether you need logging sidecars, metrics exporters, authentication proxies, or any other supporting container, strategic merge patches let you add them without modifying the original Helm chart. Always include appropriate resource requests and limits for sidecars to prevent them from consuming excessive cluster resources, and verify the injection after deployment to ensure the containers are running correctly.
