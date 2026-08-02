# Can Argo Rollouts Do a Canary Without a Service Mesh? Replica-Based Routing Explained

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Rollouts, Kubernetes, Canary Deployment, ReplicaSets, Services, Traffic Routing, Service Mesh, Progressive Delivery

Description: Run Argo Rollouts canaries without a service mesh by understanding replica-weighted Services, setWeight approximation, operational limits, and when a traffic router is still needed.

---

Yes. Argo Rollouts can perform a canary update without a service mesh or any traffic-routing integration. This is called a basic canary: Argo approximates the requested `setWeight` by changing how many Pods belong to the new and stable ReplicaSets, while a normal Kubernetes Service selects Ready Pods from both versions.

The key word is **approximates**. A Service does not understand “10% canary.” It has a set of endpoints, and the networking data plane distributes connections or requests among them according to its own behavior. With ten equally capable Pods, one canary and nine stable Pods may produce roughly 10% canary traffic over a sufficiently large sample. With three Pods, 10% cannot be represented by a whole Pod.

You can also configure fine-grained, router-managed traffic weights without a service mesh by integrating Rollouts with the NGINX Ingress Controller, the AWS Load Balancer Controller's ALB integration, or the documented Gateway API traffic-router plugin. The traffic-router plugin framework is an alpha feature. These routers enforce a configured weight independently of Pod count, although finite samples and stickiness can still make observed request proportions differ from that target. “No service mesh” does not have to mean “replica weighting only.”

## How a Basic Canary Works

A basic Rollout has:

- one `Rollout` that owns stable and new ReplicaSets;
- one ordinary Service whose selector matches Pods from both ReplicaSets;
- canary steps such as `setWeight` and `pause`;
- no `strategy.canary.trafficRouting` block.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: checkout
  namespace: shop
spec:
  replicas: 10
  selector:
    matchLabels:
      app: checkout
  template:
    metadata:
      labels:
        app: checkout
    spec:
      containers:
        - name: checkout
          image: registry.example.com/shop/checkout:2.5.0
          resources:
            requests:
              cpu: 100m
          ports:
            - name: http
              containerPort: 8080
          readinessProbe:
            httpGet:
              path: /ready
              port: http
            periodSeconds: 5
  strategy:
    canary:
      maxSurge: 1
      maxUnavailable: 0
      steps:
        - setWeight: 10
        - pause:
            duration: 10m
        - setWeight: 25
        - pause:
            duration: 10m
        - setWeight: 50
        - pause: {}
---
apiVersion: v1
kind: Service
metadata:
  name: checkout
  namespace: shop
spec:
  selector:
    app: checkout
  ports:
    - name: http
      port: 80
      targetPort: http
```

When the Pod template changes, Argo creates a new ReplicaSet and progresses through the steps. At each `setWeight`, it chooses whole-number stable and canary replica counts that best approximate the requested ratio while honoring availability and surge constraints. The Service continues selecting `app: checkout`; Argo distinguishes revisions internally with the `rollouts-pod-template-hash` label.

Do not add a specific hash to this shared Service. That would pin it to one ReplicaSet and defeat replica-based distribution.

## `setWeight` Is Constrained by Whole Pods

Without traffic management, the Rollouts documentation describes the split as a best effort. For ten total replicas:

- 10% can be represented as one canary and nine stable Pods;
- 40% can be represented as four canary and six stable Pods;
- 41% is closer to four of ten than five of ten, so the documented example uses four canary Pods;
- when two possible whole-Pod ratios are equally close, Argo rounds up.

The smaller the replica count, the coarser the steps. With four endpoints, the natural increments are approximately 25 percentage points. With three, they are about 33 percentage points. Surge and unavailable settings can temporarily change the denominator while an update converges, so treat this as an operational intuition rather than a formula for every instant.

Inspect what Argo actually chose:

```bash
kubectl argo rollouts get rollout checkout -n shop

kubectl get replicasets -n shop -l app=checkout \
  -o custom-columns='NAME:.metadata.name,DESIRED:.spec.replicas,READY:.status.readyReplicas,HASH:.metadata.labels.rollouts-pod-template-hash'

kubectl get pods -n shop -l app=checkout \
  -L rollouts-pod-template-hash
```

The requested step is visible in Rollout status; the ReplicaSet counts show the achievable approximation.

## Why Replica Ratio Is Not an Exact Traffic Ratio

Even when the endpoint ratio is exactly 1:9, observed request traffic may not be 10%. Kubernetes Services expose endpoints, not percentage weights. Several effects skew traffic:

- persistent HTTP/1.1 connections send many requests over a connection selected earlier;
- HTTP/2 and gRPC multiplex many calls over a small number of connections;
- upstream proxies maintain connection pools instead of selecting a new endpoint per request;
- Service `sessionAffinity: ClientIP` deliberately keeps a client on one backend;
- clients and nodes do not necessarily generate equal request volumes;
- topology-aware routing can restrict which endpoints a client sees;
- canary Pods may become Ready at different times;
- concurrency-based measurements can overrepresent a slower canary even at the same arrival rate;
- retries can amplify traffic to one version.

Replica weighting is therefore most convincing for high-volume, short-lived, statistically distributed traffic with equally sized Pods. It is a weak blast-radius control for a small number of long-lived gRPC streams or a few high-value clients.

Measure actual requests by revision. Add the Pod-template hash, application version, or another bounded release label to request metrics and logs. Do not declare a canary safe solely because the ReplicaSet has the expected Pod count.

## Readiness Is the Routing Gate

The shared Service should send traffic only to Ready endpoints. Make readiness reflect the ability to serve real production requests:

```yaml
readinessProbe:
  httpGet:
    path: /ready
    port: http
  initialDelaySeconds: 2
  periodSeconds: 5
  timeoutSeconds: 2
  failureThreshold: 3
```

Readiness should cover required initialization and critical local dependencies without turning every transient remote dependency failure into an endpoint-flapping storm. Use `minReadySeconds` when a Pod must remain Ready for a stability period before Rollouts treats it as available:

```yaml
spec:
  minReadySeconds: 30
```

`maxUnavailable: 0` preserves desired availability during the update, while `maxSurge` provides space to start replacement Pods. Confirm ResourceQuota and node capacity allow the surge; an unavailable budget cannot create capacity that the cluster lacks.

## Pauses and Analysis Still Work Without a Router

Progressive delivery is more than traffic splitting. Basic canaries support timed and indefinite pauses:

```yaml
steps:
  - setWeight: 10
  - pause:
      duration: 10m
  - analysis:
      templates:
        - templateName: checkout-success-rate
  - setWeight: 50
  - pause: {}
```

An indefinite pause requires promotion:

```bash
kubectl argo rollouts promote checkout -n shop
```

AnalysisRuns can query metrics and abort an unhealthy update regardless of whether traffic is split by replica count or a router. Make queries revision-aware; a service-wide success rate can hide a canary regression behind much larger stable traffic.

For example, prefer a query grouped or filtered by the canary revision/hash over a single aggregate for all `app=checkout` Pods. Keep metric label cardinality controlled and ensure the telemetry path preserves the revision attribute.

## HPA Behavior

An HPA can target a Rollout through its scale subresource. Without a traffic manager, stable and canary Pods share the Rollout selector, so the HPA sees them as one group and calculates a total desired replica count. Rollouts then distributes that total according to the current step.

This changes the granularity dynamically. A 10% step is easier to approximate at 20 replicas than at 3. It also means a version-specific performance regression can affect the combined average used by the HPA.

The `averageUtilization` CPU target below is calculated relative to CPU requests, so the selected Pods' containers must define `resources.requests.cpu`, as the Rollout example above does.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: checkout
  namespace: shop
spec:
  scaleTargetRef:
    apiVersion: argoproj.io/v1alpha1
    kind: Rollout
    name: checkout
  minReplicas: 10
  maxReplicas: 30
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 65
```

Do not let GitOps continuously force `spec.replicas` while the HPA also owns it. Follow your GitOps tool's documented pattern for ignoring or omitting the HPA-managed replica field.

## What You Give Up Without a Traffic Router

A basic canary cannot provide:

- fine-grained router-managed percentages independent of replica count;
- header-, cookie-, or user-cohort routing managed by Rollouts;
- request mirroring/shadowing;
- traffic weight independent of canary scale;
- reliable small blast radii for connection-heavy protocols;
- independent stable and canary capacity while holding a different traffic ratio.

Argo's `setCanaryScale` feature is supported only with traffic routing because a basic canary must control the canary replica count to approximate weight. With a router, you can run several canary Pods at `setWeight: 0` for testing, or send a controlled traffic percentage to a deliberately sized canary pool.

## No Mesh, but Router-Managed Weights

If a service mesh is too heavy for the requirement, choose a supported edge integration already present in the cluster, or evaluate the alpha Gateway API traffic-router plugin:

- NGINX Ingress Controller uses stable and canary Ingress resources and canary annotations;
- AWS ALB uses ALB weighted target-group actions;
- Gateway API support is provided through the documented alpha traffic-router plugin;
- other supported ingress controllers and traffic providers are listed in Argo's traffic-management overview.

With traffic management, a canary Rollout normally specifies separate Services:

```yaml
strategy:
  canary:
    stableService: checkout-stable
    canaryService: checkout-canary
    trafficRouting:
      # provider-specific configuration goes here
    steps:
      - setWeight: 5
      - pause:
          duration: 10m
```

The Rollouts controller modifies the stable and canary Service selectors so each selects only its corresponding ReplicaSet, while the router controls the traffic split. Follow the exact provider documentation and RBAC requirements.

## Decide with the Blast Radius, Not the Tool List

Basic replica weighting is a good fit when:

- the application already runs enough replicas to express useful steps;
- traffic has many independent connections or requests;
- Pods have similar capacity and performance;
- approximate exposure is acceptable;
- revision-specific metrics and an abort path exist.

Use an integrated traffic router when:

- configuring 1%, 5%, or another low target independently of replica count matters;
- the application has only a few replicas;
- traffic uses long-lived or sticky connections;
- you need headers, cohorts, or mirroring;
- canary scale must be independent of traffic weight;
- the cost of a bad request reaching canary is high.

The absence of a mesh is not the deciding factor. The deciding factor is whether whole-Pod approximation gives a trustworthy enough blast radius for this workload.

## Operational Checklist

- Omit `trafficRouting` for a basic replica-weighted canary.
- Use one shared Service selector that matches both Rollout revisions.
- Keep `rollouts-pod-template-hash` out of that shared Service selector.
- Choose enough replicas for meaningful weight granularity.
- Configure readiness, `maxUnavailable`, surge capacity, and pauses.
- Measure real traffic and health by revision, not only by Service aggregate.
- Test HPA behavior during each canary step.
- Abort a deliberately bad canary in a staging environment.
- Add an ingress or Gateway traffic provider when approximation is insufficient.

## Official Documentation

- [Argo Rollouts: Canary deployment strategy](https://argo-rollouts.readthedocs.io/en/stable/features/canary/)
- [Argo Rollouts: Traffic management overview](https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/)
- [Argo Rollouts: HPA support](https://argo-rollouts.readthedocs.io/en/stable/features/hpa-support/)
- [Argo Rollouts: Rollout specification](https://argo-rollouts.readthedocs.io/en/stable/features/specification/)
- [Argo Rollouts: Analysis and progressive delivery](https://argo-rollouts.readthedocs.io/en/stable/features/analysis/)
- [Kubernetes: Services](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Kubernetes: EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [Kubernetes: Horizontal Pod Autoscaling](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
