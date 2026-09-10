# How to Finish In-Flight Requests Before a Kubernetes Spot Node Dies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, AWS, Spot, Graceful Shutdown, High Availability

Description: Coordinate readiness, preStop, application shutdown, and ALB target draining so bounded requests can finish before a Spot node disappears.

---

A replacement Pod can be healthy while requests on the old Pod still fail. Spot interruption handling needs two outcomes: enough remaining capacity to accept new requests, and enough time for accepted requests to finish. Replica count solves only the first problem.

This walkthrough assumes EKS, an interruption handler that starts node draining, and AWS Load Balancer Controller with ALB IP targets. The application must support graceful shutdown. The timing values below are an example budget for requests bounded to 40 seconds, not a promise that every interruption provides that much time.

## Make shutdown an application feature

Implement three separate behaviors in the application:

- `/ready` returns success during normal operation and failure after a drain flag is set.
- A drain operation changes readiness without immediately killing accepted requests.
- The process handles its configured stop signal by closing its listener, waiting for active requests with a deadline, then flushing essential state and exiting.

Do not make the liveness probe fail during this transition. A process that is deliberately finishing requests is healthy enough to continue that work. Also check the image entrypoint: a shell wrapper must forward signals or replace itself with the application using `exec`.

For a file-based drain flag, use an application-owned path such as `/tmp/draining`. The readiness handler should check the file on each probe, and the application should remove stale flags when starting. This is an application contract; adding the YAML alone does not implement those behaviors.

## Put propagation time inside the Pod budget

Merge this fragment into the existing Deployment's Pod template. The example image must contain `/bin/sh`, `touch`, and `sleep`; for a minimal image, provide a dedicated executable with the same behavior.

```yaml
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 70
      containers:
        - name: api
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            periodSeconds: 2
            failureThreshold: 1
            timeoutSeconds: 1
          lifecycle:
            preStop:
              exec:
                command:
                  - /bin/sh
                  - -c
                  - touch /tmp/draining; sleep 10
```

Kubernetes starts the termination grace countdown before running `preStop`; the stop signal follows the hook. EndpointSlice updates proceed concurrently, and terminating endpoints have `ready: false`. The application therefore needs a small overlap while routing converges. [Kubernetes Pod termination](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination-flow)

During the ten-second hook, keep serving requests already routed to the listener. After the hook, the signal handler stops accepting new connections and gives active work up to 45 seconds. That leaves 15 seconds within the 70-second Pod budget for flushes and scheduling jitter. Measure the overlap on your actual network path, including ingress proxies and service meshes.

A 70-second grace period cannot make EC2 keep a reclaimed instance alive. Notice delivery and node draining have already consumed part of the interruption window before the Pod enters termination.

## Align the ALB target group

For an existing Ingress named `api`, set the target type and target group attribute in its declarative manifest:

```yaml
metadata:
  annotations:
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/target-group-attributes: deregistration_delay.timeout_seconds=45
```

Preserve any other target group attributes already configured. This annotation is a comma-separated attribute map; replacing it carelessly can remove unrelated settings. These keys are documented by [AWS Load Balancer Controller](https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/ingress/annotations/#target-group-attributes).

ALB's default deregistration delay is 300 seconds. A deregistering target stops receiving new requests, but it must remain alive to finish existing connections. A delay greater than the node's remaining lifetime cannot preserve those connections. [ALB deregistration delay](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-target-group-attributes.html#deregistration-delay)

This example assumes the application's maximum request duration fits within the 45-second target drain. Long streaming responses, WebSockets, and asynchronous work need separate policies. For reconnecting clients, make retries safe with request identifiers or application idempotency keys.

## Verify the complete request path

First test ordinary Pod deletion against a staging replica. Watch endpoint changes in one terminal:

```bash
kubectl get endpointslices \
  -l kubernetes.io/service-name=api --watch -o yaml
```

In another terminal, tail the selected Pod's logs and record the request ID, drain-flag time, stop-signal time, last completed request, and process exit. Start a deliberately slow request through the public ALB before deleting that specific Pod:

```bash
kubectl delete pod api-example-abc12 --wait=false
```

Replace the name with the Pod receiving the request. A request generator that records backend identity makes this deterministic. Sending one request to a replicated Service does not establish which Pod handled it.

Inspect target state separately:

```bash
aws elbv2 describe-target-health \
  --target-group-arn "$TARGET_GROUP_ARN" \
  --query 'TargetHealthDescriptions[].{Target:Target.Id,State:TargetHealth.State}'
```

A successful test shows no new application work admitted after the listener closes, an existing slow request completing, and the process exiting before its deadline. A persistent `draining` display alone does not prove traffic is still active.

## Repeat with a real interruption path

Run a scoped AWS Fault Injection Service Spot interruption experiment on staging after the Pod deletion test succeeds. This includes the event queue, interruption controller, eviction behavior, and the physical instance deadline. AWS provides a dedicated [Spot interruption experiment tutorial](https://docs.aws.amazon.com/fis/latest/userguide/fis-tutorial-spot-interruptions.html).

Test concurrent requests near the maximum duration and a delayed interruption notification. If shutdown exceeds the available window, shorten work units or move that request class to capacity with a suitable recovery design. Increasing every timeout usually increases the amount of unfinished work.

## Conclusion

Finishing in-flight requests requires measured routing convergence, an application that drains correctly, and compatible Pod and load-balancer deadlines. Test accepted requests through the external endpoint and then exercise the actual Spot interruption path.

## Official Documentation

- [Kubernetes container lifecycle hooks](https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/)
- [Kubernetes Pod termination](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination-flow)
- [AWS Load Balancer Controller annotations](https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/ingress/annotations/)
- [ALB target group attributes](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-target-group-attributes.html)
- [AWS FIS Spot interruption tutorial](https://docs.aws.amazon.com/fis/latest/userguide/fis-tutorial-spot-interruptions.html)
