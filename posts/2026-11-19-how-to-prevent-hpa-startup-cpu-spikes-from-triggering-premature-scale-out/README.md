# How to Prevent HPA Startup CPU Spikes from Triggering Premature Scale-Out

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, HPA, Autoscaling, Troubleshooting

Description: Align startup and readiness probes with CPU warmup so HPA evaluates serving capacity without mistaking initialization work for sustained demand.

---

A newly started process compiles code, fills caches, or loads a model. CPU rises, the HPA adds more Pods, and those Pods repeat the same expensive startup. If the metric includes initialization work as ordinary serving demand, scaling can amplify the warmup burst.

The fix begins with truthful readiness. The HPA needs to distinguish a Pod that is using CPU to initialize from one that is Ready and struggling with real requests.

## Capture one startup timeline

For a representative Pod, record container start, CPU sample windows, Ready transitions, first requests, and the end of warmup:

```bash
kubectl get pod checkout-example -n production -o json |
  jq '{start: .status.startTime,
       conditions: .status.conditions,
       containers: .status.containerStatuses}'
kubectl get --raw \
  '/apis/metrics.k8s.io/v1beta1/namespaces/production/pods/checkout-example'
kubectl describe hpa checkout -n production
```

Correlate these with application logs. A single `kubectl top` snapshot cannot tell whether a CPU measurement spans both initialization and normal request processing.

Separate a warmup-only test from a test with traffic. If CPU remains elevated after the Pod is genuinely Ready and receiving requests, suppressing the signal could hide a real need for capacity.

## Make probes reflect the application lifecycle

A startup probe delays liveness and readiness probes until startup succeeds. Implement an endpoint that succeeds only when required initialization finishes. A readiness endpoint should then report whether this instance can accept traffic.

This fragment belongs in the Deployment's Pod template; the endpoints are application endpoints you must implement:

```yaml
spec:
  template:
    spec:
      containers:
        - name: application
          image: example.invalid/checkout:replace-with-your-image
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 500m
          startupProbe:
            httpGet:
              path: /startup-complete
              port: 8080
            periodSeconds: 5
            failureThreshold: 36
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            periodSeconds: 5
            failureThreshold: 2
```

The startup probe provides roughly a three-minute failure budget. Size it from measured startup behavior, with enough margin for normal cold starts. If it never succeeds, Kubernetes eventually restarts the container; increasing the budget cannot repair an initialization deadlock.

A port-open check is often too weak. The server may listen before caches, dependencies, or routing state are ready. Conversely, including a nonessential dependency in readiness can remove healthy capacity during an unrelated incident. The [probe documentation](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/) explains the lifecycle and configuration of these probes.

## Understand the CPU-specific controller filters

The [HPA readiness documentation](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/#pod-readiness-and-autoscaling-metrics) describes two controller options:

| Option | Default | Purpose |
| --- | --- | --- |
| `--horizontal-pod-autoscaler-cpu-initialization-period` | 5 minutes | Applies startup CPU sample eligibility checks |
| `--horizontal-pod-autoscaler-initial-readiness-delay` | 30 seconds | Helps classify early readiness changes |

The initialization period is not a blanket five-minute pause. A Ready Pod can contribute CPU metrics within that period when the sample window lies entirely after the relevant Ready transition. If readiness succeeds while warmup is still consuming CPU, those later measurements can enter the calculation.

These settings are cluster-wide controller configuration, not fields on an individual HPA. On a managed cluster, verify the provider's configuration and supported controls. Before changing a shared initialization period, assess other workloads with different startup characteristics.

The behavior is specific to CPU resource calculations. Do not assume it excludes a custom concurrency gauge or memory metric during startup. Check those signals independently.

## Keep serving capacity while initialization is excluded

Ignoring initialization samples does not create spare capacity. New unready Pods can dampen a scale-up calculation, and existing Pods still have to serve requests while replacements warm up.

Maintain sufficient `minReplicas` for the expected demand during startup. Ensure nodes have resources available, reduce image and initialization delays, and consider a demand metric that becomes useful before CPU saturates. Never mark a Pod Ready early merely to change HPA arithmetic.

## Verify with a rollout and a burst

First restart a small number of Pods at steady traffic. Confirm that startup spikes do not create sustained unnecessary replicas, and that Ready transitions align with actual serving capability. Then increase traffic enough to require real scale-out and verify that the HPA still reacts.

Watch request latency, errors, ready endpoints, CPU, and replica count together. The desired outcome is stable warmup handling while real demand still produces enough usable capacity. Keep probes and controller tuning in the same operational notes so future changes to startup code do not silently invalidate the assumptions.
