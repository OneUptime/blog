# How to Use Canary Analysis Automated Rollback Tests with Flagger on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Flagger, Canary Deployment, Automated Rollback, Progressive Delivery

Description: Learn how to configure Flagger for automated canary analysis with rollback capabilities, using metrics-driven decisions to safely deploy applications on Kubernetes.

---

Canary deployments reduce risk by gradually rolling out changes, but manual canary analysis is slow and error-prone. Flagger automates canary analysis using metrics from Prometheus, automatically promoting successful canaries or rolling back failures based on configurable thresholds.

In this guide, we'll configure Flagger for automated canary deployments with metric-based analysis, implement automatic rollback on failure, and test the complete canary workflow.

## Installing Flagger

```bash
# Flagger's Linkerd provider requires Linkerd, Linkerd Viz, and Linkerd-SMI
# to be installed first.
kubectl apply -k github.com/fluxcd/flagger//kustomize/linkerd

# Verify installation
kubectl -n flagger-system rollout status deploy/flagger

# Install the Flagger load tester used by the canary webhook
kubectl create ns test
kubectl annotate namespace test linkerd.io/inject=enabled
kubectl apply -k https://github.com/fluxcd/flagger//kustomize/tester?ref=main
```

## Creating Canary Resource

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: myapp
  namespace: test
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  progressDeadlineSeconds: 60
  service:
    port: 80
  analysis:
    interval: 1m
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
    - name: load-test
      type: rollout
      url: http://flagger-loadtester.test/
      metadata:
        cmd: "hey -z 1m -q 10 -c 2 http://myapp-canary.test:80/"
```

## Simulating Canary Promotion

```bash
# Trigger canary by updating deployment
kubectl -n test set image deployment/myapp myapp=myapp:v2

# Watch canary progress
watch kubectl -n test get canary myapp
```

## Testing Automatic Rollback

```bash
# Deploy bad canary that will fail metrics
kubectl -n test set image deployment/myapp myapp=myapp:broken
```

Flagger detects failed metrics and automatically rolls back.

## Conclusion

Flagger provides automated canary analysis with rollback capabilities, making progressive delivery safe and practical. Metric-driven decisions ensure only healthy changes reach production while automatic rollback prevents failed deployments from causing incidents.

Integrate Flagger into deployment workflows to reduce manual canary management while maintaining safety through automated analysis and rollback.
