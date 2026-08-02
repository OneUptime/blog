# Argo Rollouts Blue-Green Deployment: Configuring Active and Preview Services Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Rollouts, Kubernetes, Blue-Green Deployment, Active Service, Preview Service, Promotion, Analysis, Zero Downtime

Description: Configure Argo Rollouts blue-green active and preview Services with safe selectors, protected preview access, readiness gates, analysis, promotion, and rollback.

---

Argo Rollouts blue-green deployment runs the current and candidate ReplicaSets side by side, but keeps production traffic on one Kubernetes Service until promotion:

- `activeService` is mandatory and carries production traffic;
- `previewService` is optional and exposes the newest candidate for tests before promotion.

Argo changes each Service's `rollouts-pod-template-hash` selector. During an update, active remains on the old ReplicaSet while preview moves to the new one. Promotion is a selector switch: active begins selecting the candidate, then the old ReplicaSet stays alive for a configurable delay before scaling down.

The safe design keeps production routing attached only to active, restricts preview access, makes readiness meaningful, provides enough capacity for both stacks, and verifies rollback before old Pods disappear.

## The Service Contract

Create both Services with the same stable application selector and port mapping:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: checkout-active
  namespace: shop
  labels:
    app: checkout
    exposure: production
spec:
  type: ClusterIP
  selector:
    app: checkout
  ports:
    - name: http
      port: 80
      targetPort: http
---
apiVersion: v1
kind: Service
metadata:
  name: checkout-preview
  namespace: shop
  labels:
    app: checkout
    exposure: preview
spec:
  type: ClusterIP
  selector:
    app: checkout
  ports:
    - name: http
      port: 80
      targetPort: http
```

The Rollouts controller adds the dynamic hash selector. A live Service will look similar to:

```yaml
selector:
  app: checkout
  rollouts-pod-template-hash: 7bf84f9696
```

Do not hard-code that hash in Git or use a script to update it. Argo owns the revision-specific value. Keep the base selector, ports, Service type, and approved annotations in source control.

Both Services must be in the Rollout's namespace. `activeService` and `previewService` contain names, not cross-namespace references.

## Configure a Manual Promotion Gate

The following Rollout creates a two-Pod preview, waits for it to become available and pass analysis, then pauses for manual promotion:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: checkout
  namespace: shop
spec:
  replicas: 6
  revisionHistoryLimit: 3
  minReadySeconds: 30
  selector:
    matchLabels:
      app: checkout
  template:
    metadata:
      labels:
        app: checkout
    spec:
      terminationGracePeriodSeconds: 60
      containers:
        - name: checkout
          image: registry.example.com/shop/checkout:2.5.0
          ports:
            - name: http
              containerPort: 8080
          readinessProbe:
            httpGet:
              path: /ready
              port: http
            periodSeconds: 5
            timeoutSeconds: 2
            failureThreshold: 3
          lifecycle:
            preStop:
              exec:
                command: [sh, -c, 'sleep 10']
  strategy:
    blueGreen:
      activeService: checkout-active
      previewService: checkout-preview
      autoPromotionEnabled: false
      previewReplicaCount: 2
      scaleDownDelaySeconds: 60
      antiAffinity:
        preferredDuringSchedulingIgnoredDuringExecution:
          weight: 100
      prePromotionAnalysis:
        templates:
          - templateName: checkout-preview-smoke
        args:
          - name: preview-url
            value: http://checkout-preview.shop.svc.cluster.local
```

`autoPromotionEnabled` defaults to true, so set it to false explicitly when a human approval is required. `autoPromotionSeconds` is not a delayed manual gate when auto-promotion is false; Argo's documentation says it is ignored in that case.

The `preStop` hook is only an example of connection-draining time. Your image must contain `sh` and `sleep`, and the application or proxy should stop accepting new work before termination. Design draining for the actual protocol rather than copying a fixed delay blindly.

## Run Smoke Tests Against Preview

A Job-based AnalysisTemplate can test the preview Service from inside the cluster:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: checkout-preview-smoke
  namespace: shop
spec:
  args:
    - name: preview-url
  metrics:
    - name: readiness
      provider:
        job:
          spec:
            backoffLimit: 0
            activeDeadlineSeconds: 60
            template:
              spec:
                restartPolicy: Never
                containers:
                  - name: smoke
                    image: curlimages/curl:8.14.1
                    args:
                      - --fail
                      - --show-error
                      - --max-time
                      - "10"
                      - "{{args.preview-url}}/ready"
```

The AnalysisRun succeeds when the Job succeeds and blocks the Service switch if it fails. NetworkPolicy, service-mesh policy, DNS, and the AnalysisRun Pod's ServiceAccount must permit the test path.

A readiness endpoint alone is not a complete release test. Add checks for critical behavior, schema compatibility, downstream connectivity, and a revision identifier. Keep tests idempotent and ensure they cannot modify production data unsafely.

## Understand the Exact Sequence

Argo documents the blue-green lifecycle as follows:

1. At fully promoted steady state, active and preview both select the current ReplicaSet.
2. A change under `spec.template` creates a new ReplicaSet.
3. Preview switches to the new hash; active stays on the old hash.
4. The candidate scales to `previewReplicaCount`, or full `spec.replicas` if no preview count is set.
5. Once candidate Pods are available, pre-promotion analysis runs.
6. With automatic promotion disabled, the Rollout pauses.
7. On promotion, the candidate first scales to full `spec.replicas` if preview was smaller.
8. Active switches to the candidate hash.
9. Post-promotion analysis runs if configured.
10. The candidate becomes stable, and the old ReplicaSet scales down after the configured delay.

Initial Rollout creation is a special case. If active does not already point to a ReplicaSet, Argo immediately directs it to the initial ReplicaSet. Establish and validate the first stable revision before relying on a later Pod-template update to exercise the preview gate.

## Protect Preview as a Real Endpoint

“Preview” does not mean private. A ClusterIP is reachable from allowed cluster workloads, and an Ingress, Gateway, or mesh route can make it externally reachable.

Use a deliberate access model:

- keep public DNS, Ingress, and Gateway routes attached to `checkout-active` only;
- expose preview through an internal test route or `kubectl port-forward` when possible;
- apply NetworkPolicy and service-mesh authorization to approved test clients;
- require normal application authentication;
- use isolated test tenants or accounts for state-changing checks;
- prevent search crawlers, webhooks, and background workers from discovering preview accidentally.

For a temporary operator test:

```bash
kubectl port-forward -n shop service/checkout-preview 18080:80
curl --fail --show-error http://127.0.0.1:18080/version
```

Port-forwarding uses the preview Service selector to choose a backing Pod, then forwards directly to that Pod. This is useful for confirming that the selector resolves to a candidate Pod, but it does not exercise normal Service proxying or prove that a separate ingress or mesh route works.

## Validate Before Promotion

Watch the Rollout and inspect the routing objects:

```bash
kubectl argo rollouts get rollout checkout -n shop --watch

kubectl get service checkout-active checkout-preview -n shop -o json \
  | jq -r '.items[] | [.metadata.name, (.spec.selector | tojson)] | @tsv'

kubectl get replicasets -n shop -l app=checkout \
  -o custom-columns='NAME:.metadata.name,HASH:.metadata.labels.rollouts-pod-template-hash,DESIRED:.spec.replicas,READY:.status.readyReplicas,IMAGE:.spec.template.spec.containers[0].image'

kubectl get endpointslice -n shop \
  -l kubernetes.io/service-name=checkout-active -o yaml
kubectl get endpointslice -n shop \
  -l kubernetes.io/service-name=checkout-preview -o yaml
```

Before approving, confirm:

- active's hash maps to the previously promoted image;
- preview's hash maps to the intended candidate image;
- every preview EndpointSlice endpoint maps to a candidate Pod, and its `ready` condition is true before it is treated as a normal Service traffic target;
- active request success, latency, and saturation remain normal;
- preview smoke and metric analyses passed;
- six candidate Pods can schedule before the active switch;
- database and message formats are backward compatible with both versions running.

Then promote one step normally:

```bash
kubectl argo rollouts promote checkout -n shop
```

Avoid `--full` for routine approval because it skips remaining pauses and analysis.

## Capacity Is Part of Availability

Blue-green can temporarily run full old and new stacks. ResourceQuota, node capacity, topology spread, PVC constraints, and license/downstream limits must accommodate both.

`previewReplicaCount` reduces resource use while testing, but promotion still requires scaling the candidate to `spec.replicas` before the active Service switch. A two-Pod preview does not let a six-Pod production rollout promote on a cluster with space for only two new Pods.

The HPA can target the Rollout. Without `previewReplicaCount`, Argo's HPA documentation says active and preview ReplicaSets scale together during a blue-green update. With a preview count, the candidate stays pinned at that count before promotion while active responds to the HPA. Account for the resulting cost and capacity in load tests.

Preferred anti-affinity encourages old and new Pods onto different nodes without making scheduling impossible. Use required anti-affinity only when the cluster topology can always satisfy it; otherwise the safety rule itself can block every preview.

## Readiness and Availability Are the Promotion Gate

Pod phase `Running` is insufficient. Argo waits for candidate availability, so readiness should reflect ability to serve traffic. `minReadySeconds` adds a stability period after readiness before a Pod counts as available.

Avoid probes that return success before caches, migrations, listener sockets, or required dependencies are usable. Also avoid coupling readiness to every optional remote dependency in a way that flaps all endpoints during a minor downstream incident.

Do not use blue-green `maxUnavailable` as a cutover capacity control. For a blue-green strategy, that field controls Pod unavailability during restart operations; template updates instead bring the candidate to the target replica count before switching active. The blue-green strategy has no `maxSurge` field, so ensure the cluster can run the required old and candidate capacity directly.

## Choose a Scale-Down Delay from Real Propagation

The active selector changes quickly in Kubernetes, but EndpointSlice consumers and network data planes converge asynchronously. Argo defaults blue-green `scaleDownDelaySeconds` to 30 seconds to avoid killing old Pods while some nodes still route to them.

Set the delay longer than the measured worst case for:

- kube-proxy or eBPF service-map updates;
- ingress, Gateway, or mesh endpoint propagation;
- external load-balancer target registration and health checks;
- connection draining for long-lived clients.

```yaml
scaleDownDelaySeconds: 120
scaleDownDelayRevisionLimit: 2
```

`scaleDownDelayRevisionLimit` bounds how many old ReplicaSets remain scaled while delays overlap. A short delay saves resources but increases stale-target risk; a long delay increases capacity cost. Observe the actual data plane.

Argo's documentation explicitly warns that blue-green with AWS ALB is not supported without a chance of downtime because target-group replacement is not atomic or inherently safe. Argo's target-group verification and ping-pong options belong to its ALB traffic-routing integration for canary strategies; they do not make this plain blue-green Service-selector pattern atomic. Do not assume a Kubernetes Service selector switch alone provides zero downtime through ALB.

## Add Post-Promotion Analysis for Automatic Reversal

Pre-promotion tests cannot reproduce full production traffic. A `postPromotionAnalysis` can evaluate live signals after active switches:

```yaml
strategy:
  blueGreen:
    activeService: checkout-active
    previewService: checkout-preview
    autoPromotionEnabled: false
    scaleDownDelaySeconds: 120
    postPromotionAnalysis:
      templates:
        - templateName: checkout-live-health
```

If post-promotion analysis fails or errors, Argo documents that the Rollout aborts and switches traffic back to the previous stable ReplicaSet. When `scaleDownDelaySeconds` is set explicitly, keep the analysis duration within that window: when the delay expires, Argo cancels a still-running AnalysisRun and scales down the old ReplicaSet. If the delay is omitted, Argo keeps the old ReplicaSet until post-promotion analysis completes, with a minimum 30-second delay. Make analysis queries specific, bounded, and tolerant of low-traffic no-data cases.

Test the failure path deliberately. An AnalysisTemplate that can never obtain data may block or abort production in surprising ways.

## Abort and Recover

Before promotion, abort should leave active on the previous stable revision. While a rollout is still progressing after an active switch, post-promotion failure or manual abort needs the old ReplicaSet and a functioning selector reversal. Once the rollout is fully promoted, `abort` is not a rollback mechanism; restore a previous Pod template through Git or use an explicit undo workflow.

```bash
kubectl argo rollouts abort checkout -n shop
kubectl argo rollouts get rollout checkout -n shop
kubectl get service checkout-active checkout-preview -n shop -o yaml
kubectl get endpointslice -n shop \
  -l kubernetes.io/service-name=checkout-active -o yaml
```

Verify real requests after abort, not only Rollout phase. Persistent connections may remain on a revision until clients reconnect, and external controllers may lag behind Kubernetes state.

An abort can change live routing but does not change the desired image stored in Git. Restore the known-good Pod template through the source of truth so GitOps and Rollouts converge on a healthy state.

## Database and Queue Compatibility

Blue-green controls traffic, not shared-state compatibility. During preview and the scale-down delay, both revisions exist and may run background work. Use expand-contract schema changes, version-tolerant message formats, idempotent consumers, and explicit leader/worker behavior.

If preview Pods must not process production queues or scheduled work, provide an explicit preview mode in configuration or separate the worker Rollout. Do not rely on the preview Service receiving no production HTTP traffic; Pods can still initiate work themselves.

## Common Mistakes

### Public routing points to preview

Attach production Ingress/Gateway backends only to active. Preview exposure should be separate, authenticated, and intentional.

### GitOps removes the hash selector

Delegate only `spec.selector.rollouts-pod-template-hash` to Rollouts through precise ignore/field-ownership configuration. Reapplying the base-only selector can make a Service temporarily select both revisions.

### Promotion stalls at full scale

`previewReplicaCount` saved capacity during testing, but the cluster cannot scale the candidate to full `spec.replicas`. Check quota, scheduling, storage, and affinity.

### Active has no endpoints after promotion

Inspect candidate readiness, Service `targetPort`, base labels, hash selector, and EndpointSlices. Do not patch active to a random hash without mapping it to an owned, healthy ReplicaSet.

### Old Pods disappear before clients converge

Increase and measure the scale-down delay, implement connection draining, and use provider-specific target verification.

## Safe Blue-Green Checklist

- Active and preview are separate, same-namespace Services.
- Both start with the same valid base selector and port mapping.
- Only active is wired to production routing.
- Preview access is authenticated and network-restricted.
- `autoPromotionEnabled: false` is explicit when approval is required.
- Readiness and `minReadySeconds` represent real availability.
- Pre-promotion analysis tests the preview Service.
- Full duplicate capacity exists before promotion.
- Shared data and background jobs are version-compatible.
- Scale-down delay exceeds measured data-plane convergence.
- Post-promotion analysis and abort are tested.
- GitOps does not overwrite Argo's hash selector.

## Official Documentation

- [Argo Rollouts: Blue-green deployment strategy](https://argo-rollouts.readthedocs.io/en/stable/features/bluegreen/)
- [Argo Rollouts: Blue-green analysis](https://argo-rollouts.readthedocs.io/en/stable/features/analysis/#bluegreen-pre-promotion-analysis)
- [Argo Rollouts: Job metric provider](https://argo-rollouts.readthedocs.io/en/stable/analysis/job/)
- [Argo Rollouts: Rollout specification](https://argo-rollouts.readthedocs.io/en/stable/features/specification/)
- [Argo Rollouts: HPA support](https://argo-rollouts.readthedocs.io/en/stable/features/hpa-support/)
- [Argo Rollouts: AWS ALB traffic routing](https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/alb/)
- [Kubernetes: Services](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Kubernetes: Configure probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [Kubernetes: Pod lifecycle and termination](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
