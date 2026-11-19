# How to Drain Long-Lived Connections Safely When HPA Scales Down

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, HPA, Autoscaling, Troubleshooting

Description: Coordinate HPA scale-down rate, Pod termination grace, application draining, and client reconnection so long-lived sessions survive planned capacity reductions.

---

HPA scale-down changes the workload's desired replica count. It does not understand which Pod has a long-running request, a WebSocket session, or a streaming RPC. The workload controller chooses Pods to terminate, and the application must handle that termination safely.

Plan the complete path: stop accepting new work, allow routing changes to propagate, finish or transfer existing work, and exit before the grace period expires.

## Understand the termination clock

When a Pod terminates, Kubernetes starts its termination grace period and runs any `preStop` hook before sending the normal termination signal to the container process. The hook consumes time from the same grace period. Endpoint changes occur alongside termination; they are not a globally synchronized barrier that finishes before the hook starts.

The [Pod termination documentation](https://v1-35.docs.kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination) explains this sequence. Ensure the application process receives and handles termination signals, including when a shell wrapper starts it.

A readiness change helps prevent new traffic, but already established connections can continue carrying work. The ingress, service mesh, application protocol, and clients all influence how those connections drain.

## Implement a bounded drain operation

A drain operation should be idempotent so a lifecycle hook and a signal handler can invoke it safely. Its responsibilities are application-specific:

1. Enter a draining state and report not ready.
2. Stop admitting new sessions or requests according to the protocol.
3. Allow accepted work to complete up to a deadline.
4. Close or migrate remaining sessions with a documented client retry behavior.

For HTTP/2 or gRPC, graceful connection shutdown may involve protocol-level signaling. For WebSockets, clients generally need a reconnect path and any resumable session state. An arbitrary sleep does not implement these behaviors.

This Deployment fragment assumes your image includes `/app/drain` and implements the described command. It is not a Kubernetes-supplied binary:

```yaml
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 90
      containers:
        - name: application
          image: example.invalid/stream-service:replace-with-your-image
          lifecycle:
            preStop:
              exec:
                command:
                  - /app/drain
                  - --timeout-seconds=45
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            periodSeconds: 3
            failureThreshold: 1
```

Design the command to stop admission and wait up to 45 seconds for accepted work. After it returns, the application's termination-signal handler should complete shutdown within the remaining budget. For example, reserve 30 seconds for final cleanup and 15 seconds of margin. These values must be measured against the actual protocol and infrastructure.

If sessions can last hours, no short grace period can guarantee natural completion. Build reconnection, resumable processing, or explicit session handoff rather than setting an arbitrarily enormous timeout.

## Limit how much capacity drains at once

Configure the HPA's downward behavior separately from application termination:

```yaml
behavior:
  scaleDown:
    stabilizationWindowSeconds: 300
    policies:
      - type: Pods
        value: 1
        periodSeconds: 120
```

This limits HPA-requested reductions to one replica over the policy window and retains recent higher recommendations during stabilization. It does not prevent a Deployment rollout, node failure, or another operator from terminating additional Pods.

A PodDisruptionBudget is useful for supported eviction operations, but it is not a guardrail against ordinary workload scale-down. Deployment replica reductions delete Pods through the workload controller rather than asking the eviction API for permission. The [disruption documentation](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/) explains the limits of disruption budgets.

Retain enough `minReplicas` for surviving Pods to absorb reconnecting clients. Apply jitter and backoff to reconnects so reducing one busy Pod does not create a synchronized connection storm.

## Observe draining as a real state

Track active connections, accepted requests, rejected new admissions, draining duration, forced closes, and completed work during termination. Keep these metrics separate from readiness: a not-ready Pod may still be completing useful work.

```bash
kubectl get pods -n production -l app=stream-service -w
kubectl get endpointslices -n production \
  -l kubernetes.io/service-name=stream-service -o yaml
kubectl describe hpa stream-service -n production
```

EndpointSlices can expose terminating and serving conditions, but consumers differ in how they use them. Verify your ingress and load-balancer behavior rather than assuming every traffic path follows the same rule.

## Test through the actual client path

Open long-lived connections through the production-equivalent ingress, then lower demand enough for a controlled HPA downscale. Confirm new connections avoid draining Pods, existing work finishes or resumes correctly, and the process exits before forced termination.

Also test a stream exceeding the drain deadline and multiple concurrent lifecycle events. Measure reconnect errors and latency on surviving Pods. A successful test is uninterrupted or explicitly recoverable user work, not merely a Pod that spends a long time in `Terminating`.
