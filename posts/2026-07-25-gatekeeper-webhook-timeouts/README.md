# How to Troubleshoot Gatekeeper Webhook Timeouts and Kubernetes API Latency

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Gatekeeper, Kubernetes, Webhook, Latency, Troubleshooting

Description: Isolate Gatekeeper webhook timeout causes across request scope, Service networking, TLS, capacity, policy evaluation, and external data.

---

Every matching Gatekeeper admission call blocks the Kubernetes API request it evaluates. A slow webhook delays users and controllers; a timeout then invokes the webhook's failure policy.

Do not start by increasing `timeoutSeconds`. First determine where the time is spent.

## Recognize the failure mode

Common API errors include:

```text
failed calling webhook "validation.gatekeeper.sh"
context deadline exceeded
Client.Timeout exceeded while awaiting headers
x509: certificate signed by unknown authority
no endpoints available for service
```

These point to different layers. TLS and missing endpoints are reachability failures, not slow Rego. A clean timeout with busy Gatekeeper Pods is more likely capacity, policy, or an external provider.

Record:

- Exact timestamp and API server.
- Resource group, version, kind, namespace, and operation.
- Whether every request or only one policy path is affected.
- Whether the request was allowed or rejected after the timeout.
- Current `failurePolicy` and `timeoutSeconds`.

## Inspect the webhook configuration

```bash
kubectl get validatingwebhookconfiguration \
  gatekeeper-validating-webhook-configuration \
  -o jsonpath='{range .webhooks[*]}{.name}{"\n  failurePolicy: "}{.failurePolicy}{"\n  timeoutSeconds: "}{.timeoutSeconds}{"\n"}{end}'
```

Kubernetes allows webhook timeouts from 1 to 30 seconds. Gatekeeper's release manifest commonly uses a short timeout because admission should normally complete in milliseconds.

A timeout longer than the API request's overall deadline does not help. Gatekeeper's documentation warns that the main request can fail before webhook failure policy is invoked.

## Check Service reachability

Verify the components without changing them:

```bash
kubectl get service,endpoints,endpointslices \
  -n gatekeeper-system
kubectl get pods -n gatekeeper-system -o wide
kubectl describe service -n gatekeeper-system \
  gatekeeper-webhook-service
```

Look for:

- No ready endpoints.
- Pods ready in one zone only.
- Service selector mismatch.
- NetworkPolicy blocking control-plane traffic.
- Private-cluster firewall rules blocking the target port.
- DNS or CNI incidents.
- Certificate errors or a stale `caBundle`.

Managed control planes call the webhook from outside ordinary workload networking in some environments. A test from an application Pod does not prove the API server has the same path.

## Check resource pressure and concurrency

```bash
kubectl top pods -n gatekeeper-system
kubectl get pods -n gatekeeper-system \
  -o custom-columns=NAME:.metadata.name,READY:.status.containerStatuses[0].ready,RESTARTS:.status.containerStatuses[0].restartCount
kubectl describe pods -n gatekeeper-system
```

`kubectl top` requires Metrics Server. Use container metrics to confirm CPU throttling and runtime telemetry to investigate garbage-collection pauses; use Pod status and `kubectl describe` to identify out-of-memory kills and restarts. Also check for too few replicas. Gatekeeper uses the container CPU limit to set Go concurrency through `automaxprocs`. Excessive thread concurrency can starve CPU and increase latency.

The `--max-serving-threads` flag caps concurrent policy evaluations. Tune it only with load tests; a higher value can increase memory and CPU contention.

## Measure Gatekeeper itself

Gatekeeper exposes Prometheus metrics on port 8888 by default. Key series include:

- `gatekeeper_validation_request_duration_seconds`
- `gatekeeper_validation_request_count_total`
- `gatekeeper_mutation_request_duration_seconds`
- ConstraintTemplate ingestion and sync duration metrics

For a temporary local read:

```bash
kubectl port-forward -n gatekeeper-system <webhook-pod> 8888:8888
curl -s http://127.0.0.1:8888/metrics \
  | grep gatekeeper_validation_request
```

Compare latency by admission status and across replicas. If Gatekeeper latency is low but API clients are slow, investigate the API server, network, or other admission webhooks.

Enable `--log-stats-admission` for a bounded diagnostic window. It logs per-template execution statistics that can identify a slow Constraint kind. The official docs warn that stats logging can generate high volume.

## Isolate policy cost

Latency grows with the number of matching Constraints and the work each evaluation performs. Look for:

- Broad matches on all kinds.
- Large nested loops over containers or inventory.
- Referential queries over high-cardinality synchronized data.
- Duplicate or overlapping Constraints.
- Large regular expressions or avoidable repeated computation.
- Logging or violation details that serialize large objects.
- External data calls.

Use Gator to compare Rego policy versions:

```bash
gator bench --filename=policies/ --engine=rego
```

Gator bench measures policy compute only. It excludes network, TLS, API server, and webhook overhead, so use it for relative comparisons rather than a production latency promise.

## Treat external data as part of the deadline

An external data provider adds another network and service dependency. Set the Provider timeout below the remaining webhook budget, batch keys, enable appropriate caching, and monitor provider errors.

Gatekeeper caps mutation provider calls at the smaller of the Provider timeout and remaining admission deadline. A slow provider can consume nearly the entire request even when Rego is fast.

Decide failure behavior explicitly. A provider failure, Gatekeeper webhook failure, and policy denial are different events and may have different security consequences.

## Reduce scope before raising the timeout

Kubernetes recommends limiting webhook scope and using small timeouts. Reduce unnecessary calls with:

- Specific API groups and resources.
- Namespace selectors.
- Object selectors where labels are trustworthy.
- Match conditions supported by the cluster version.
- Constraints that select only relevant kinds and namespaces.

Mutating webhooks run sequentially, while validating webhooks can run in parallel. Slow mutation can therefore delay validation and the whole admission chain. Gatekeeper mutation and validation metrics should be examined separately.

If a timeout increase is still required, make a small measured change, verify the API server's overall deadline, and reevaluate fail-open versus fail-closed impact.

## Official documentation

- [Gatekeeper metrics and execution statistics](https://open-policy-agent.github.io/gatekeeper/website/docs/metrics/)
- [Gatekeeper performance tuning](https://open-policy-agent.github.io/gatekeeper/website/docs/performance-tuning/)
- [Gatekeeper admission timeout behavior](https://open-policy-agent.github.io/gatekeeper/website/docs/customize-admission/)
- [Kubernetes admission webhook good practices](https://kubernetes.io/docs/concepts/cluster-administration/admission-webhooks-good-practices/)
