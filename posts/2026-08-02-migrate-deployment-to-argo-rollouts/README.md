# How to Migrate a Kubernetes Deployment to Argo Rollouts Without Downtime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Rollouts, Kubernetes, Deployment, Migration, Canary Deployment, Progressive Delivery, Zero Downtime, GitOps

Description: Migrate a live Kubernetes Deployment to Argo Rollouts with workloadRef, side-by-side capacity, readiness checks, a controlled traffic handoff, and a tested rollback path.

---

Changing `kind: Deployment` to `kind: Rollout` is syntactically simple, but deleting the Deployment before replacement Pods are Ready can create an outage. Argo's migration documentation explicitly recommends running the Rollout beside a production Deployment before scaling down or deleting the Deployment.

The safest general migration uses a Rollout `workloadRef` with `scaleDown: onsuccess`:

- the Deployment keeps serving traffic while the Rollout starts its own Pods;
- the Rollout copies the referenced Deployment's Pod template but does not manage the Deployment's existing Pods;
- the Deployment is scaled down only after the Rollout becomes healthy;
- the Service can continue selecting the application throughout the overlap.

This costs temporary duplicate capacity, which is exactly what creates the safety margin.

## Understand the Two Supported Migration Models

Argo documents two approaches:

1. **Convert the resource:** change `apps/v1` to `argoproj.io/v1alpha1`, change `Deployment` to `Rollout`, and replace the Deployment strategy with `canary` or `blueGreen`.
2. **Reference the Deployment:** create a Rollout whose `workloadRef` points to the existing Deployment and choose how Argo scales that Deployment down.

For a live service, the second approach makes the coexistence period and cutover explicit. A direct conversion is appropriate when an orchestrated side-by-side handoff already exists, but applying a Rollout manifest and immediately deleting the Deployment is not a zero-downtime plan.

The available `workloadRef.scaleDown` modes are:

| Mode | Deployment behavior |
| --- | --- |
| `never` | Argo does not scale down the Deployment; the operator cuts over manually |
| `onsuccess` | Argo scales down the Deployment after the Rollout becomes healthy |
| `progressively` | Argo scales down the Deployment as the Rollout scales up |

`onsuccess` prioritizes availability and a clear rollback window. `progressively` uses less surge capacity but reduces the old safety pool during the handoff. `never` is useful when a change window requires an explicit human cutover.

## Prerequisites

Before touching the workload, verify all of the following:

- the Argo Rollouts CRDs and controller are installed and healthy;
- the application has a meaningful readiness probe;
- the production Service selector is understood and has healthy endpoints;
- the cluster has capacity for old and new Pods simultaneously;
- PodDisruptionBudgets, quotas, affinity, and topology rules allow the new Pods to schedule;
- the Rollout controller can watch the application's namespace;
- GitOps will not immediately revert manual replica or resource changes;
- rollback has been rehearsed with the same Service and selector design.

```bash
kubectl api-resources --api-group=argoproj.io | grep -w Rollout
kubectl get deployment -n argo-rollouts
kubectl get deployment checkout -n shop -o yaml > checkout-deployment-before.yaml
kubectl get service checkout -n shop -o yaml > checkout-service-before.yaml
kubectl get endpointslice -n shop \
  -l kubernetes.io/service-name=checkout
kubectl rollout status deployment/checkout -n shop
```

Store snapshots securely; rendered Deployments can include internal configuration names and operational metadata.

## Start with a Healthy Deployment

Assume the existing resources look like this:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: checkout
  namespace: shop
spec:
  replicas: 6
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
          image: registry.example.com/shop/checkout:2.4.0
          ports:
            - name: http
              containerPort: 8080
          readinessProbe:
            httpGet:
              path: /ready
              port: http
            periodSeconds: 5
            failureThreshold: 3
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

The Service selector intentionally matches the application identity, not a ReplicaSet hash. During migration it can include Ready Pods from both controllers. Kubernetes Services route to Ready endpoints, so an accurate readiness probe is the main guard against sending requests to a Pod that has started but cannot serve.

Before continuing, confirm the endpoint count and run a synthetic request through the same path clients use. Do not infer availability from `Running` Pod phase alone.

## Create a Rollout That References the Deployment

Create the Rollout alongside the Deployment:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: checkout-rollout
  namespace: shop
spec:
  replicas: 6
  selector:
    matchLabels:
      app: checkout
  workloadRef:
    apiVersion: apps/v1
    kind: Deployment
    name: checkout
    scaleDown: onsuccess
  strategy:
    canary:
      maxSurge: 25%
      maxUnavailable: 0
      steps:
        - setWeight: 10
        - pause:
            duration: 10m
        - setWeight: 50
        - pause:
            duration: 10m
```

Do not add `spec.template` to this Rollout; `workloadRef` supplies the Pod template from the Deployment. Keep `spec.selector` aligned with that template and the Service.

Apply and watch it:

```bash
kubectl apply -f checkout-rollout.yaml
kubectl argo rollouts get rollout checkout-rollout -n shop --watch
```

Argo's getting-started documentation notes that the initial creation of a Rollout scales directly to 100% and skips canary update steps because there is no previous Rollout revision to compare. The migration safety therefore comes from running beside the Deployment and waiting for health—not from expecting the initial Rollout to pause at 10%.

With `onsuccess`, the expected sequence is:

1. six Deployment Pods remain available;
2. the Rollout creates six of its own Pods from the referenced template;
3. the common Service sees Ready endpoints from both sets during overlap;
4. after the Rollout is healthy, Argo scales the referenced Deployment to zero.

Plan quota, node capacity, connection pools, downstream limits, and licensing for the temporary doubled replica count.

## Verify the Handoff, Not Just the Rollout Phase

Watch controllers, Pods, endpoints, and requests together:

```bash
kubectl get deployment checkout -n shop -w
kubectl get rollout checkout-rollout -n shop -w
kubectl get pods -n shop -l app=checkout \
  -o custom-columns='NAME:.metadata.name,OWNER:.metadata.ownerReferences[0].kind,READY:.status.containerStatuses[0].ready,IP:.status.podIP'
kubectl get endpointslice -n shop \
  -l kubernetes.io/service-name=checkout -o yaml
```

Check Rollout conditions and the workload generation observed from the referenced Deployment:

```bash
kubectl get rollout checkout-rollout -n shop -o json \
  | jq '{
      phase: .status.phase,
      message: .status.message,
      readyReplicas: .status.readyReplicas,
      workloadObservedGeneration: .status.workloadObservedGeneration,
      workloadGeneration: .metadata.annotations["rollout.argoproj.io/workload-generation"]
    }'
```

Argo patches the Rollout with `rollout.argoproj.io/workload-generation` corresponding to the referenced Deployment generation. Comparing it with `status.workloadObservedGeneration` helps show whether the Rollout has observed the current Deployment template.

During and after the handoff, validate:

- the Service never reaches zero Ready endpoints;
- request success rate, latency, and saturation stay within objectives;
- both old and new Pods use the expected image, config, Secrets, ServiceAccount, and security context;
- termination grace and connection draining prevent dropped long-lived requests;
- the Deployment reaches zero only after enough Rollout Pods are Ready.

## Make the First Real Update Progressive

With `workloadRef`, update the referenced Deployment's Pod template. Argo's migration documentation specifies that updates are made to the Deployment template, and the Rollout observes its generation.

For GitOps, change the image in the Deployment manifest:

```yaml
spec:
  template:
    spec:
      containers:
        - name: checkout
          image: registry.example.com/shop/checkout:2.5.0
```

Then watch the Rollout:

```bash
kubectl argo rollouts get rollout checkout-rollout -n shop --watch
kubectl argo rollouts status checkout-rollout -n shop --timeout 20m
```

This update creates a new Rollout revision and evaluates the canary steps. Without a configured traffic router, `setWeight` is approximated by the ratio of canary to stable Pods; it is not exact request-level routing. A six-replica application cannot represent every percentage precisely. Use an integrated traffic router when the migration requires fine-grained traffic control independent of replica count.

An indefinite pause uses `pause: {}` and requires promotion:

```bash
kubectl argo rollouts promote checkout-rollout -n shop
```

Do not use `--full` unless intentionally skipping every remaining step and analysis.

## Migration with a Traffic Router

Ingress-controller or service-mesh traffic management changes the handoff. A traffic-routed canary normally has distinct `stableService` and `canaryService`, and the Rollouts controller adds the current ReplicaSet hash to their selectors. The router then splits traffic between those Services.

During migration, make sure the production route initially continues to reach the Deployment. Argo's migration guide says the switch to Rollout-managed traffic occurs only once required Rollout Pods are running and healthy, but it also recommends a temporary Service or Ingress for extra validation.

A cautious sequence is:

1. deploy the Rollout and its stable/canary Services without changing the production route;
2. expose them through a temporary hostname or internal route;
3. validate the Rollout-managed endpoints and router resources;
4. point production routing at the Rollout-managed service topology;
5. verify traffic and only then scale down the Deployment.

Exact resources differ for Istio, NGINX, ALB, and Gateway API. Follow the provider-specific Argo documentation; do not copy an Istio `VirtualService` design into an ingress controller that uses annotations.

## Roll Back During the Migration

The safest reversal restores Deployment capacity before removing Rollout capacity:

```bash
kubectl scale deployment checkout -n shop --replicas=6
kubectl rollout status deployment/checkout -n shop

# Verify production Service endpoints and application health first.
kubectl scale rollout checkout-rollout -n shop --replicas=0
```

If GitOps owns replica counts, make equivalent changes in Git so reconciliation does not undo the recovery. If the Deployment template has already moved to a bad new version, restore the known-good template before scaling it up.

For router-based migration, shift production routing back to the Deployment-backed Service only after that Service has sufficient Ready endpoints. Scaling old Pods and switching traffic in the wrong order can recreate the outage the migration was designed to avoid.

## Common Failure Modes

### The Deployment scaled down before Rollout Pods became healthy

Confirm `scaleDown` is `onsuccess`, inspect Rollout conditions, and check whether another actor changed Deployment replicas. GitOps, an HPA, and the Rollouts controller must have clearly defined ownership.

### The new Pods never schedule

Temporary double capacity was not available. Check ResourceQuota, node allocatable resources, topology/anti-affinity, PVC provisioning, and PodDisruptionBudgets before reducing the old replica count.

### The Service has no endpoints

Compare the Service selector with labels on Ready Rollout Pods. With traffic management, also inspect the stable and canary Service selectors that Argo modifies. Never hand-edit Rollout-managed hash selector values as a lasting fix.

### The initial deployment did not pause at the first canary step

That is documented behavior: initial Rollout creation skips update steps. Validate the initial side-by-side cutover, then test the progressive strategy with a subsequent Pod-template update.

### Direct kind conversion produced two controllers

A Deployment and Rollout are different API resources even when they have the same name. Applying the Rollout does not delete the Deployment. List both kinds and make ownership/cutover explicit:

```bash
kubectl get deployment,rollout,replicaset,pod -n shop -l app=checkout
```

## Final Cutover Checklist

- Rollout CRD and controller are healthy.
- Existing Deployment is fully available before migration.
- Readiness probes represent ability to serve real traffic.
- Side-by-side capacity is available.
- `workloadRef` and `scaleDown` behavior are reviewed.
- Service/router endpoints are observed throughout the handoff.
- The first post-migration image change exercises the canary steps.
- Monitoring and analysis use production-relevant signals.
- Rollback scales the known-good workload before removing the replacement.
- GitOps, HPA, and controller ownership do not conflict.

## Official Documentation

- [Argo Rollouts: Migrating to Rollouts](https://argo-rollouts.readthedocs.io/en/stable/migrating/)
- [Argo Rollouts: Canary strategy](https://argo-rollouts.readthedocs.io/en/stable/features/canary/)
- [Argo Rollouts: Rollout specification](https://argo-rollouts.readthedocs.io/en/stable/features/specification/)
- [Argo Rollouts: Getting started](https://argo-rollouts.readthedocs.io/en/stable/getting-started/)
- [Argo Rollouts: Traffic management overview](https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/)
- [Kubernetes: Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Kubernetes: Services](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Kubernetes: Configure liveness, readiness, and startup probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
