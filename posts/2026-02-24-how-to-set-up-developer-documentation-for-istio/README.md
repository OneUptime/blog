# How to Set Up Developer Documentation for Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Documentation, Developer Experience, Platform Engineering

Description: How to create practical developer documentation for Istio that helps application teams understand and use the service mesh effectively in their daily work.

---

Istio documentation on istio.io is comprehensive, but it is written for mesh operators. Your application developers need documentation that explains how Istio affects their specific workflow, in their specific environment, with your specific conventions. Writing good internal Istio documentation is one of the highest-leverage things a platform team can do.

## What Developers Actually Need to Know

Most developers do not need to understand Envoy internals or control plane architecture. They need to know:

- How to deploy their service with the mesh (spoiler: it is mostly automatic)
- How to do canary deployments with their CI/CD pipeline
- How to troubleshoot when requests fail
- How to check if their service is healthy
- What happens when Istio components have issues
- How to request access between services

Structure your documentation around these tasks, not around Istio concepts.

## Documentation Structure

Organize your docs into four sections:

```text
docs/
  getting-started/
    deploying-your-first-service.md
    verifying-sidecar-injection.md
    accessing-observability.md
  how-to/
    canary-deployments.md
    traffic-splitting.md
    service-authorization.md
    external-ingress.md
    debugging-connectivity.md
    setting-timeouts-retries.md
  reference/
    platform-crds.md
    default-policies.md
    namespace-setup.md
    faq.md
  troubleshooting/
    connection-refused.md
    503-errors.md
    slow-requests.md
    sidecar-not-injecting.md
```

## Writing the Getting Started Guide

The getting started guide should take a developer from zero to a working service in under 15 minutes:

```markdown
# Deploying Your First Service to the Mesh

## Prerequisites
- kubectl access to the cluster
- Your namespace has the `istio-injection=enabled` label

## Step 1: Verify Your Namespace

Run this command to check if Istio injection is enabled:

\```bash
kubectl get namespace your-namespace --show-labels | grep istio
\```

You should see `istio-injection=enabled`. If not, ask the platform
team to enable it.

## Step 2: Deploy Your Service

Deploy your application as usual:

\```bash
kubectl apply -f deployment.yaml -n your-namespace
\```

Istio automatically injects a sidecar proxy into every pod. Verify
by checking that each pod has 2 containers:

\```bash
kubectl get pods -n your-namespace
\```

You should see `2/2` in the READY column.

## Step 3: Verify Mesh Connectivity

Test that your service can reach other services through the mesh:

\```bash
kubectl exec deploy/your-service -n your-namespace -- curl -s http://other-service:8080/health
\```

## Step 4: Check Your Metrics

Your service automatically gets:
- Request rate, error rate, and latency (RED metrics)
- Distributed traces (10% sampling by default)
- Access logs for error responses

View your metrics at: https://grafana.internal.company.com
View your traces at: https://jaeger.internal.company.com
```

## Writing How-To Guides

Each how-to guide should solve a specific problem. Keep them focused and include copy-pasteable commands:

```markdown
# How to Do a Canary Deployment

## When to Use This

Use canary deployments when you want to test a new version with
a small percentage of traffic before rolling it out completely.

## Steps

### 1. Deploy the new version alongside the current one

\```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service-v2
  namespace: your-namespace
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-service
      version: v2
  template:
    metadata:
      labels:
        app: my-service
        version: v2
    spec:
      containers:
      - name: my-service
        image: myregistry/my-service:v2.0
\```

### 2. Create a TrafficRoute to split traffic

\```yaml
apiVersion: platform.company.com/v1
kind: TrafficRoute
metadata:
  name: my-service-canary
  namespace: your-namespace
spec:
  service: my-service
  routes:
  - version: v1
    weight: 90
  - version: v2
    weight: 10
\```

### 3. Monitor the canary

Watch error rates in Grafana:
- Dashboard: Team Service Dashboard
- Filter: service=my-service, version=v2

### 4. Increase traffic or rollback

To increase canary traffic, update the weight:

\```bash
kubectl patch trafficroute my-service-canary -n your-namespace \
  --type merge -p '{"spec":{"routes":[{"version":"v1","weight":50},{"version":"v2","weight":50}]}}'
\```

To rollback, set v1 weight to 100:

\```bash
kubectl patch trafficroute my-service-canary -n your-namespace \
  --type merge -p '{"spec":{"routes":[{"version":"v1","weight":100}]}}'
\```
```

## Writing Troubleshooting Guides

Troubleshooting guides are the most-read documentation. Make them actionable:

```markdown
# Troubleshooting: My Service Returns 503 Errors

## Quick Check

First, identify where the 503 is coming from:

\```bash
kubectl logs deploy/your-service -c istio-proxy --tail=50 | grep 503
\```

Look at the `response_flags` field in the log:
- `UF` = Upstream connection failure (service is down)
- `UO` = Upstream overflow (circuit breaker tripped)
- `NR` = No route configured
- `UC` = Upstream connection termination

## Common Causes

### Circuit Breaker Tripped (UO flag)

Your service hit the connection limit. Check current connections:

\```bash
kubectl exec deploy/your-service -c istio-proxy -- \
  curl -s localhost:15000/stats | grep upstream_cx_active
\```

If connections are near the limit (default: 100), either:
- Increase the limit in your DestinationRule
- Fix the downstream service that is creating too many connections
- Reduce response time to free up connections faster

### Service Not Found (NR flag)

The destination service is not registered in the mesh:

\```bash
istioctl proxy-config cluster deploy/your-service | grep target-service
\```

If the target service is not listed, check:
- Is the target namespace in your Sidecar egress scope?
- Is the target service deployed and running?
- Are the service ports named correctly?

### Upstream Connection Failure (UF flag)

The target service is rejecting connections:

\```bash
kubectl get pods -l app=target-service
\```

Check if the target pods are running and passing health checks.
```

## Documenting Platform-Specific Conventions

Document the things that are unique to your environment:

```markdown
# Platform Conventions

## Namespace Naming
All team namespaces follow the pattern: `team-{team-name}`
Example: `team-checkout`, `team-payments`

## Service Port Naming
Port names must follow Istio conventions:
- `http-api` for HTTP services
- `grpc-api` for gRPC services
- `tcp-db` for TCP services

Bad: `port: 8080` (no name)
Good: `name: http-api, port: 8080`

## Default Policies
Every namespace gets these policies automatically:
- Strict mTLS (all traffic is encrypted)
- Default-deny authorization (must explicitly allow callers)
- Circuit breaking (100 max connections, 50 pending requests)
- Access logging for 4xx and 5xx responses

## Requesting Cross-Namespace Access
To allow another team's service to call yours:

1. Create a ServiceAccess resource:
\```yaml
apiVersion: platform.company.com/v1
kind: ServiceAccess
metadata:
  name: allow-frontend
  namespace: team-checkout
spec:
  allowFrom:
  - service: web-app
    namespace: team-frontend
\```

2. The calling team does NOT need to do anything. The
   access is granted by the receiving service.
```

## Generating API Reference from CRDs

If you have custom CRDs, generate reference documentation automatically:

```bash
# Using crd-ref-docs
crd-ref-docs \
  --source-path=./api/v1/ \
  --config=./docs-config.yaml \
  --renderer=markdown \
  --output-path=./docs/reference/

# Or using gen-crd-api-reference-docs
gen-crd-api-reference-docs \
  -api-dir=./api/v1 \
  -config=./example-config.json \
  -out-file=./docs/reference/api.md
```

## Keeping Documentation Updated

Stale documentation is worse than no documentation. Implement these practices:

1. Docs live alongside code in the same repository
2. CI checks that examples actually work:

```yaml
# .github/workflows/docs-test.yaml
name: Test Documentation Examples
on: [pull_request]
jobs:
  test-examples:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Extract YAML from docs
      run: |
        grep -r '```yaml' docs/ -A 100 | grep -B1 '```$' > examples.yaml
    - name: Validate YAML
      run: |
        python3 -c "import yaml; yaml.safe_load_all(open('examples.yaml'))"
    - name: Validate Istio resources
      run: |
        istioctl analyze --use-kube=false examples.yaml
```

3. Review docs in every PR that changes Istio configurations
4. Run quarterly audits to remove outdated information

## Making Documentation Discoverable

Put documentation where developers already are:

- Link from error messages to the relevant troubleshooting guide
- Add documentation links in the CLI wizard output
- Include links in Slack bot responses
- Add references in Grafana dashboard annotations

```python
# Example: error message with doc link
if response.status_code == 503:
    print(f"Service returned 503. Troubleshooting guide: "
          f"https://docs.internal.company.com/istio/troubleshooting/503-errors")
```

## Summary

Good Istio developer documentation is task-oriented, not concept-oriented. Organize it around what developers need to do: deploy a service, do a canary release, debug connection errors. Include copy-pasteable commands and YAML snippets that work in your specific environment. Document your platform conventions and default policies so developers know what to expect. Keep docs in the same repository as the platform code, test examples in CI, and make the documentation discoverable by linking to it from error messages, CLI tools, and dashboards.
