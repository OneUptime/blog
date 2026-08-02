# How to Run Smoke Tests with Job and Web Analysis in Argo Rollouts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Rollouts, Smoke Testing, AnalysisTemplate, Kubernetes jobs, Webhook, Progressive Delivery

Description: Gate an Argo Rollout with containerized Job smoke tests and JSON-returning Web metrics while controlling routing, credentials, timeouts, and failure behavior.

---

Argo Rollouts can make a deployment decision from more than time-series metrics. A Job metric runs a Kubernetes Job and uses its terminal condition. A Web metric calls an HTTP endpoint, extracts JSON, and evaluates a condition.

Use a Job when the test needs a container, cluster networking, multiple commands, or specialized tooling. Use Web analysis when a trusted test service already exposes a compact JSON decision. Both become safer release gates when they test the canary explicitly and have bounded execution.

## Route the Test to the Canary

The test target matters more than the provider. Calling the normal production Service may sample stable pods and pass while the canary is broken.

With canary traffic management, configure `stableService` and `canaryService`, then direct the smoke test to the canary Service:

```yaml
strategy:
  canary:
    stableService: payments-stable
    canaryService: payments-canary
    steps:
      - setWeight: 10
      - pause:
          duration: 2m
      - analysis:
          templates:
            - templateName: payments-smoke-job
      - setWeight: 50
```

The pause gives pods, endpoints, and telemetry time to settle before the test. For header-based routing, send the managed canary header instead. For blue-green, target the preview Service before promotion.

## Run a Containerized Job Metric

An AnalysisTemplate can embed a Job specification:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: payments-smoke-job
spec:
  metrics:
    - name: api-smoke
      provider:
        job:
          metadata:
            labels:
              test-type: rollout-smoke
          spec:
            backoffLimit: 1
            activeDeadlineSeconds: 180
            template:
              metadata:
                labels:
                  test-type: rollout-smoke
              spec:
                restartPolicy: Never
                serviceAccountName: rollout-smoke-test
                containers:
                  - name: smoke
                    image: registry.example.com/release-tests@sha256:<digest>
                    args:
                      - --base-url=http://payments-canary.payments.svc.cluster.local
                      - --expect-ready=true
```

The official provider contract is simple: a Job with a `Complete` condition succeeds, while a Job with a `Failed` condition fails. For this single-container test, the process exit status normally drives those conditions, subject to the Job's retry policy. Make the test program print useful diagnostics before exiting, and use an immutable image so rerunning an old AnalysisRun definition does not execute different code.

`activeDeadlineSeconds` bounds a hung test, while `backoffLimit` controls Kubernetes Job retries. Give the test ServiceAccount only the permissions it needs; an HTTP-only test commonly needs no Kubernetes API permissions at all. NetworkPolicies must allow DNS and the canary destination.

An image-pull failure can leave the Job metric running until `activeDeadlineSeconds` expires. The Job then becomes failed, so the metric fails and an inline rollout aborts. Treat test image availability as part of release-system health.

## Call a JSON Test Service with Web Analysis

The Web provider performs an HTTP request and exposes either the entire JSON body or a `jsonPath` selection as `result`:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: payments-smoke-web
spec:
  args:
    - name: api-token
      valueFrom:
        secretKeyRef:
          name: rollout-test-service
          key: token
  metrics:
    - name: external-smoke
      successCondition: result.ok && result.successPercent >= 0.99
      failureCondition: '!result.ok || result.successPercent < 0.95'
      provider:
        web:
          method: POST
          url: https://release-tests.example.com/v1/check
          timeoutSeconds: 20
          headers:
            - key: Authorization
              value: "Bearer {{args.api-token}}"
          jsonBody:
            target: http://payments-canary.payments.svc.cluster.local
            suite: critical-path
          jsonPath: '{$.data}'
```

A matching response is:

```json
{
  "data": {
    "ok": true,
    "successPercent": 1.0
  }
}
```

Because the target in this example is cluster-local, the test service must have network connectivity to the cluster. Otherwise, pass a canary endpoint that is reachable from the test service.

The documented Web provider supports `GET`, `POST`, and `PUT`. Use either `body` or `jsonBody`, not both; a body on `GET` is invalid. Keep TLS verification enabled and install private CA trust instead of setting `insecure: true` in production.

Secret arguments resolve in the AnalysisRun's namespace. Confirm the Secret exists there and restrict who can read it. The AnalysisRun retains the Secret reference; the controller resolves its value when executing the metric.

## Run Job and Web Gates in the Intended Order

Metrics in one AnalysisTemplate may execute independently rather than as a sequential test plan. If the cheap in-cluster check must pass before the external test runs, put them in separate analysis steps:

```yaml
steps:
  - setWeight: 10
  - pause:
      duration: 2m
  - analysis:
      templates:
        - templateName: payments-smoke-job
  - analysis:
      templates:
        - templateName: payments-smoke-web
  - setWeight: 50
```

If either inline AnalysisRun fails, progression stops and the Rollout aborts. An inconclusive result pauses for human action. Choose complete success/failure conditions unless a manual-review band is intentional.

## Debug a Failed Gate

Find the AnalysisRun linked in the Rollout tree:

```bash
kubectl argo rollouts get rollout payments
kubectl describe analysisrun <name> -n payments
```

For Job analysis:

```bash
kubectl get jobs,pods -n payments -l test-type=rollout-smoke
kubectl logs job/<job-name> -n payments
kubectl describe pod <job-pod> -n payments
```

For Web analysis, inspect the measurement message and test reachability, DNS, and TLS to the provider URL from the controller's network context. If the test service then calls the target supplied in `jsonBody`, test that connection from the test service's network context. Verify the JSON shape after `jsonPath`, and confirm that the result types match the expression.

Never promote solely because the test infrastructure is broken unless an authorized fallback check proves the release safe. An unavailable safety gate is different from a passing gate.

## Production Checklist

- Test the canary or preview endpoint, not an ambiguous shared Service.
- Bound Job runtime, web timeout, and retry behavior.
- Pin the Job test image by digest.
- Keep test credentials in a same-namespace Secret with least privilege.
- Preserve enough logs and AnalysisRun measurements for incident review.
- Separate sequential gates into separate rollout steps.
- Exercise success, application failure, test-infrastructure failure, and timeout paths before production.

Job and Web analysis turn existing smoke tests into controller-enforced release policy-as long as the target, outcome, and failure mode are all explicit.

## Official Documentation

- [Argo Rollouts: Job Metrics](https://argo-rollouts.readthedocs.io/en/stable/analysis/job/)
- [Argo Rollouts: Web Metrics](https://argo-rollouts.readthedocs.io/en/stable/analysis/web/)
- [Argo Rollouts: Analysis and Progressive Delivery](https://argo-rollouts.readthedocs.io/en/stable/features/analysis/)
- [Argo Rollouts: Canary Strategy](https://argo-rollouts.readthedocs.io/en/stable/features/canary/)
- [Kubernetes: Jobs](https://kubernetes.io/docs/concepts/workloads/controllers/job/)
