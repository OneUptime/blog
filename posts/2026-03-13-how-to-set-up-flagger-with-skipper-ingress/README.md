# How to Set Up Flagger with Skipper Ingress

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flagger, Skipper, Ingresses, Canary, Kubernetes, Progressive Delivery, Traffic Splitting

Description: Learn how to set up Flagger with Skipper ingress controller for progressive canary deployments with annotation-based traffic routing.

---

## Introduction

Skipper is an HTTP router and reverse proxy developed by Zalando. It serves as a Kubernetes ingress controller with advanced traffic management features, including traffic splitting via annotations. Flagger integrates with Skipper to perform progressive canary deployments by managing Ingress annotations that control traffic weight distribution.

The Flagger-Skipper integration is annotation-based. Flagger creates and updates Kubernetes Ingress resources with Skipper-specific annotations that control how much traffic goes to the canary backend. This approach works without custom resources, using standard Kubernetes Ingress with Skipper annotations.

This guide walks through setting up Skipper, installing Flagger with the Skipper provider, and configuring canary deployments.

## Prerequisites

- A running Kubernetes cluster
- Helm installed
- kubectl access to your cluster
- Prometheus installed for metrics collection

## Step 1: Install Skipper

Skipper is not available as an official Helm chart. Install Skipper as the ingress controller using manifests:

```bash
kubectl create namespace skipper
```

Deploy Skipper as a DaemonSet:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: skipper-ingress
  namespace: skipper
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: skipper-ingress
rules:
  - apiGroups:
      - networking.k8s.io
    resources:
      - ingresses
    verbs:
      - get
      - list
      - watch
  - apiGroups:
      - ""
    resources:
      - namespaces
      - services
      - endpoints
      - pods
    verbs:
      - get
      - list
      - watch
  - apiGroups:
      - discovery.k8s.io
    resources:
      - endpointslices
    verbs:
      - get
      - list
      - watch
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: skipper-ingress
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: skipper-ingress
subjects:
  - kind: ServiceAccount
    name: skipper-ingress
    namespace: skipper
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: skipper-ingress
  namespace: skipper
spec:
  selector:
    matchLabels:
      app: skipper-ingress
  template:
    metadata:
      labels:
        app: skipper-ingress
    spec:
      serviceAccountName: skipper-ingress
      containers:
        - name: skipper-ingress
          image: registry.opensource.zalan.do/teapot/skipper:latest
          args:
            - skipper
            - -kubernetes
            - -kubernetes-in-cluster
            - -kubernetes-path-mode=path-prefix
            - -address=:9999
            - -proxy-preserve-host
            - -serve-host-metrics
            - -serve-route-metrics
            - -route-response-metrics
            - -route-backend-metrics
            - -route-backend-error-counters
            - -enable-connection-metrics
            - -metrics-flavour=prometheus
            - -histogram-metric-buckets=.01,1,10,100
          ports:
            - containerPort: 9999
              hostPort: 9999
              name: ingress-port
            - containerPort: 9911
              name: metrics-port
---
apiVersion: v1
kind: Service
metadata:
  name: skipper-ingress
  namespace: skipper
  annotations:
    prometheus.io/path: /metrics
    prometheus.io/port: "9911"
    prometheus.io/scrape: "true"
spec:
  selector:
    app: skipper-ingress
  ports:
    - name: http
      port: 9999
      targetPort: 9999
    - name: metrics
      port: 9911
      targetPort: 9911
```

Apply the resources:

```bash
kubectl apply -f skipper.yaml
```

Verify Skipper is running:

```bash
kubectl get pods -n skipper
```

## Step 2: Install Prometheus

Skipper exports metrics in Prometheus format. Install Prometheus:

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install prometheus prometheus-community/prometheus \
  --namespace monitoring \
  --create-namespace \
  --set server.persistentVolume.enabled=false \
  --set alertmanager.enabled=false
```

Configure Prometheus to scrape Skipper's metrics endpoint. Add a scrape config for the Skipper pods on the metrics port.

## Step 3: Install Flagger

Install Flagger with the Skipper provider:

```bash
helm repo add flagger https://flagger.app
helm repo update

kubectl apply -f https://raw.githubusercontent.com/fluxcd/flagger/main/artifacts/flagger/crd.yaml

helm upgrade -i flagger flagger/flagger \
  --namespace skipper \
  --set crd.create=false \
  --set meshProvider=skipper \
  --set metricsServer=http://prometheus-server.monitoring:80 \
  --set selectorLabels=app
```

## Step 4: Install the Load Tester

Deploy the load tester:

```bash
helm upgrade -i flagger-loadtester flagger/loadtester \
  --namespace test \
  --create-namespace
```

## Step 5: Deploy the Application

Deploy a sample application with an Ingress:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: podinfo
  namespace: default
  labels:
    app: podinfo
spec:
  replicas: 2
  selector:
    matchLabels:
      app: podinfo
  template:
    metadata:
      labels:
        app: podinfo
    spec:
      containers:
        - name: podinfo
          image: stefanprodan/podinfo:6.0.0
          ports:
            - containerPort: 9898
              name: http
          command:
            - ./podinfo
            - --port=9898
---
apiVersion: v1
kind: Service
metadata:
  name: podinfo
  namespace: default
spec:
  selector:
    app: podinfo
  ports:
    - port: 9898
      targetPort: 9898
```

Apply the resources:

```bash
kubectl apply -f deployment.yaml
```

## Step 6: Create the Canary Resource

Create a Canary resource for Skipper:

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: podinfo
  namespace: default
spec:
  provider: skipper
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: podinfo
  ingressRef:
    apiVersion: networking.k8s.io/v1
    kind: Ingress
    name: podinfo
  service:
    port: 9898
    targetPort: 9898
  analysis:
    interval: 30s
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
      - name: request-duration
        thresholdRange:
          max: 500
        interval: 1m
    webhooks:
      - name: acceptance-test
        type: pre-rollout
        url: http://flagger-loadtester.test/
        timeout: 30s
        metadata:
          type: bash
          cmd: "curl -sf http://podinfo-canary.default:9898/healthz"
      - name: load-test
        type: rollout
        url: http://flagger-loadtester.test/
        timeout: 5s
        metadata:
          type: cmd
          cmd: >
            hey -z 1m -q 10 -c 2
            -host podinfo.example.com
            http://skipper-ingress.skipper:9999/
```

Note the `ingressRef` field, which is specific to ingress-based providers. It tells Flagger which Ingress resource to manage.

## Step 7: Create the Ingress Resource

Create the Ingress that Flagger will manage:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: podinfo
  namespace: default
  annotations:
    kubernetes.io/ingress.class: skipper
spec:
  rules:
    - host: podinfo.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: podinfo
                port:
                  number: 9898
```

Apply both resources:

```bash
kubectl apply -f ingress.yaml
kubectl apply -f canary.yaml
```

## How Skipper Traffic Routing Works with Flagger

Flagger manages traffic splitting by adding Skipper-specific annotations to a generated canary Ingress resource. During canary analysis, Flagger creates a canary Ingress from the referenced apex Ingress and updates the annotations on the canary Ingress to control traffic distribution.

Skipper uses the `zalando.org/backend-weights` annotation for traffic splitting:

```yaml
metadata:
  annotations:
    zalando.org/backend-weights: '{"podinfo-primary": 90, "podinfo-canary": 10}'
```

Flagger updates this annotation at each analysis step on the generated `podinfo-canary` Ingress, increasing the canary weight according to the step weight configuration.

## Step 8: Trigger a Canary Deployment

Update the container image:

```bash
kubectl set image deployment/podinfo podinfo=stefanprodan/podinfo:6.0.1
```

Watch the canary progress:

```bash
kubectl describe canary podinfo
```

You should see the `zalando.org/backend-weights` annotation updating on the generated `podinfo-canary` Ingress as the canary progresses:

```bash
kubectl get ingress podinfo-canary -o jsonpath='{.metadata.annotations}'
```

## Custom Metrics for Skipper

Skipper exports route-level metrics that you can query in Prometheus. Create MetricTemplates for Skipper-specific metrics:

```yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: skipper-latency
  namespace: default
spec:
  provider:
    type: prometheus
    address: http://prometheus-server.monitoring:80
  query: |
    histogram_quantile(0.99,
      sum(
        rate(
          skipper_serve_route_duration_seconds_bucket{
            route=~"{{ printf "kube(ew)?_%s__%s_canary__.*__%s_canary(_[0-9]+)?" namespace ingress service }}",
            le="+Inf"
          }[{{ interval }}]
        )
      ) by (le)
    )
```

The exact metric names depend on your Skipper configuration and version. Check the available metrics in your Prometheus instance.

## Predicate-Based Routing

Skipper supports predicates for advanced routing rules. You can add predicates to the Ingress annotations:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: podinfo
  namespace: default
  annotations:
    kubernetes.io/ingress.class: skipper
    zalando.org/skipper-predicate: "Method(\"GET\", \"POST\")"
spec:
  rules:
    - host: podinfo.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: podinfo
                port:
                  number: 9898
```

Flagger preserves these annotations when managing the Ingress during canary analysis.

## Conclusion

Flagger integrates with Skipper ingress controller through annotation-based traffic management. The setup involves installing Skipper with Prometheus metrics enabled, deploying Flagger with the Skipper mesh provider, and creating Canary resources with an `ingressRef` pointing to the managed Ingress. Flagger controls traffic distribution by creating a canary Ingress and updating the `zalando.org/backend-weights` annotation on that generated Ingress, allowing progressive traffic shifting during canary analysis. This annotation-based approach works within standard Kubernetes Ingress resources, requiring no custom routing resources.
