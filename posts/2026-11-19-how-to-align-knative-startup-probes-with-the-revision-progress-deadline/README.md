# How to Align Knative Startup Probes with the Revision Progress Deadline

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Knative, Kubernetes, Troubleshooting

Description: Budget Knative cold starts across startup probes and Revision progress deadlines, configure a per-Revision deadline, and diagnose initial-scale failures from actual timings.

A slow-starting application has a generous startup probe, yet its Knative Revision fails with an initial-scale error before that probe budget is exhausted. Two independent mechanisms are involved: Kubernetes controls container startup probing, and Knative limits how long the initial rollout may take.

Give necessary initialization enough time in both places, then measure the whole path from scheduling to a ready Revision.

## Identify the two clocks

A startup probe delays the kubelet's ordinary liveness and readiness checks until startup succeeds. If startup keeps failing beyond its configured allowance, Kubernetes restarts the container. The [Kubernetes probe documentation](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/) describes these mechanics. Knative rewrites application readiness probes for the queue-proxy to execute, so do not assume that the startup probe delays those readiness checks; `/ready` must remain unsuccessful until initialization is complete.

Knative separately applies a Revision progress deadline. Its [probing guide](https://knative.dev/docs/serving/services/configure-probing/#progress-deadline-and-startup-probes) says this deadline must exceed the maximum time the startup probe may need. The observed rollout can also include scheduling, image pulls, initialization, and volume setup.

Do not equate `failureThreshold * periodSeconds` with an exact end-to-end deadline. It is a useful probe-budget estimate; initial delay, probe duration, scheduling, and other startup work require additional consideration.

## Configure a workload-specific budget

Suppose measurements show that application initialization can need about six minutes. The following illustrative Service allows roughly eight minutes of repeated startup checks and a twelve-minute Revision progress deadline. Replace the image and timing values for your application:

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: slow-api
  namespace: applications
spec:
  template:
    metadata:
      annotations:
        serving.knative.dev/progress-deadline: "12m"
    spec:
      containers:
        - name: app
          image: registry.example.com/apps/slow-api:build-42
          ports:
            - containerPort: 8080
          startupProbe:
            httpGet:
              path: /startup
              port: 8080
            periodSeconds: 5
            timeoutSeconds: 1
            failureThreshold: 96
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
          livenessProbe:
            httpGet:
              path: /live
              port: 8080
            periodSeconds: 10
```

The application must implement those endpoints. `/startup` should succeed when one-time initialization finishes, `/ready` when the instance can serve a request, and `/live` while the process is healthy. `/live` should fail when the process is stuck and restarting it would help. Avoid making liveness depend on a temporary outage in a shared backend.

The [deployment configuration reference](https://knative.dev/docs/serving/configuration/deployment/#configuring-progress-deadlines) documents the annotation and its duration format. Put it under the Service template's metadata so it belongs to the new Revision. A global `config-deployment` value changes the default for the installation; it is usually unnecessary for one unusual workload.

The twelve-minute value is an example, not a guarantee that every cluster can finish the rollout in that time. If image pulls and mounts consume five minutes before initialization begins, revisit the full budget and the underlying delay.

## Read the evidence in time order

Collect the current Revision, pod events, restart counts, and timestamped application logs:

```bash
kubectl -n applications get ksvc slow-api -o yaml
kubectl -n applications get revisions -l serving.knative.dev/service=slow-api
kubectl -n applications get pods -l serving.knative.dev/service=slow-api
kubectl -n applications describe pod slow-api-example-pod
kubectl -n applications logs slow-api-example-pod -c app --timestamps
```

Replace the pod name. Compare image-pull completion, container start, initialization completion, probe success, and the Revision condition transition. A container that repeatedly restarts suggests a different problem from a healthy process whose Revision deadline expires first.

An initial-scale failure is a symptom, not proof that the application needs a longer deadline. Failed mounts, an unreachable registry, a wrong listening port, or an init container that never exits can consume any budget you give them.

After fixing the cause or adjusting the measured budget, create a new Revision through the Service template. Test an uncached image pull and a cold start after scale-to-zero, then confirm an actual request succeeds. Keep the measured startup distribution available so a later image or storage change does not silently outgrow the configured allowance.
