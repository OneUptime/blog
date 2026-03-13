# How to Configure Notification Controller Concurrency Workers in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Performance, Concurrency, Notification Controller

Description: Improve alert delivery speed in Flux by configuring the notification-controller concurrency workers for parallel event processing.

---

## What the Notification Controller Handles

The notification-controller is responsible for two things: dispatching alerts based on events from other Flux controllers, and receiving webhooks that trigger reconciliations. When many events fire at the same time, such as after a large deployment wave, the controller must process each alert delivery sequentially unless you increase its concurrency.

## Why Concurrency Matters for Notifications

Notification delivery involves HTTP calls to external services like Slack, Microsoft Teams, PagerDuty, or generic webhooks. Each call may take hundreds of milliseconds or more depending on network latency and the responsiveness of the target service. With the default concurrency of one, a slow webhook endpoint can delay all other alert deliveries.

## Configuring Concurrent Workers

The notification-controller supports the same `--concurrent` flag as the other Flux controllers.

### Create the Patch

```yaml
# clusters/my-cluster/flux-system/notification-controller-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: notification-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          args:
            - --watch-all-namespaces=true
            - --log-level=info
            - --log-encoding=json
            - --enable-leader-election
            - --concurrent=10
```

### Add to Kustomization

```yaml
# clusters/my-cluster/flux-system/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  - path: notification-controller-patch.yaml
    target:
      kind: Deployment
      name: notification-controller
```

### Apply

```bash
git add clusters/my-cluster/flux-system/
git commit -m "Increase notification-controller concurrency to 10"
git push
```

## Sizing Recommendations

The notification-controller is generally lightweight compared to the kustomize or helm controllers. Its main cost is network I/O for outbound webhook calls:

- Under 10 Provider/Alert pairs: default is usually fine
- 10 to 30 Provider/Alert pairs: `--concurrent=5`
- Over 30 Provider/Alert pairs: `--concurrent=10`

## Handling Slow Webhook Endpoints

If one of your alert providers has high latency, increasing concurrency prevents it from blocking deliveries to other providers. However, the notification-controller does not implement per-provider rate limiting, so be careful not to overwhelm external services with too many concurrent requests.

## Resource Adjustments

The notification-controller uses relatively little CPU and memory, but you should still bump limits when increasing concurrency:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: notification-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
```

## Verifying

```bash
kubectl get deployment notification-controller -n flux-system \
  -o jsonpath='{.spec.template.spec.containers[0].args}' | tr ',' '\n'
```

## Summary

Increasing notification-controller concurrency ensures that alert deliveries do not pile up during busy reconciliation periods. Set the `--concurrent` flag via a Kustomize patch and monitor webhook delivery times to confirm the improvement.
