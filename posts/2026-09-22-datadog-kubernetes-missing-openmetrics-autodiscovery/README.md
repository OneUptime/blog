# How to Diagnose Missing OpenMetrics Checks in Datadog Kubernetes Autodiscovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Datadog, Prometheus, Kubernetes

Description: Trace missing Kubernetes OpenMetrics checks from pod annotations through resolved Datadog configuration, network access, and metric selection.

---

A missing OpenMetrics metric can originate at several different layers: no check was discovered, the discovered check cannot reach the endpoint, or the check collected a response but selected no useful families. Diagnose those stages separately instead of repeatedly changing metric selectors.

Start with one pod and the Agent responsible for it. A successful request from your laptop does not prove that the Agent can reach the same endpoint.

## Put the annotation on the workload's pods

For a Deployment, add Autodiscovery annotations under `spec.template.metadata.annotations`. An annotation on the Deployment's outer metadata does not automatically appear on its pods.

Here is the relevant fragment for a container named `checkout`:

```yaml
spec:
  template:
    metadata:
      annotations:
        ad.datadoghq.com/checkout.checks: |
          {
            "openmetrics": {
              "init_config": {},
              "instances": [
                {
                  "openmetrics_endpoint": "http://%%host%%:9108/metrics",
                  "namespace": "shop",
                  "metrics": [{"checkout_requests": "requests"}]
                }
              ]
            }
          }
    spec:
      containers:
        - name: checkout
          image: registry.example.com/checkout:3.8.1
          ports:
            - name: metrics
              containerPort: 9108
```

Merge this fragment into the existing workload manifest with its selector, labels, and other required fields. The annotation's `checkout` segment must match the container name, not the Deployment name or image name.

The [Datadog Kubernetes collection guide](https://docs.datadoghq.com/containers/kubernetes/prometheus/) documents this annotation structure. Autodiscovery annotation version 2 requires Agent 7.36 or later; older Agents need the version 1 annotation structure. Annotation v2 and OpenMetrics check V2 are separate version concepts.

## Inspect the running pod, not just the template

Confirm the rollout produced pods containing the annotation:

```bash
kubectl get pods -n shop -l app=checkout -o yaml
```

Check the literal JSON for trailing commas, incorrect quoting, or an accidental space in the URL. An annotation is a string containing JSON, so a valid Kubernetes YAML document can still contain invalid check JSON.

Use an explicit port while debugging multiport containers. This avoids ambiguity around which discovered port a template variable selects. `%%host%%` should resolve to a reachable pod address; an application bound only to loopback inside its own container cannot necessarily accept the Agent's request.

## Find the resolved check

On the node Agent handling the pod, inspect the configuration:

```bash
kubectl exec -n datadog "$AGENT_POD" -c agent -- agent configcheck
kubectl exec -n datadog "$AGENT_POD" -c agent -- agent status
```

Set `AGENT_POD` to the responsible Agent pod in your installation. If using Cluster Checks, inspect the Cluster Agent's dispatch and the actual runner instead. A healthy check elsewhere in the cluster does not validate this pod's configuration.

The [Autodiscovery troubleshooting guide](https://docs.datadoghq.com/agent/troubleshooting/autodiscovery/) explains how resolved configurations reveal template and scheduling issues. If no instance exists, focus on annotations, container identifiers, discovery exclusions, and Agent configuration before investigating metric names.

Plain `prometheus.io/scrape` annotations are a separate collection mechanism. They require Datadog's Prometheus scraping feature to be enabled and configured appropriately. Explicit `ad.datadoghq.com` integration annotations do not rely on guessing that this optional mechanism is enabled.

## Test endpoint access from the collection environment

For a discovered instance, inspect the resolved URL and the check error. Verify DNS, routing, NetworkPolicy, port binding, TLS trust, and authentication from the Agent or an approved diagnostic container sharing the relevant network context.

A 404 suggests the path is wrong; connection refusal suggests no listener at the selected address and port; a TLS error points to certificate or hostname configuration. Preserve certificate verification and fix the trust configuration rather than treating every access failure as discovery failure.

## Check selection only after successful scraping

The [generic OpenMetrics integration](https://docs.datadoghq.com/integrations/openmetrics/) requires an intentional metric list. A counter exposed as `checkout_requests_total` is selected as `checkout_requests` in latest mode and submitted here as `shop.requests.count`.

Check the selected families, exclusions, and returned metric count. A healthy HTTP endpoint can still produce no selected metrics. A counter also needs successive scrapes to establish and report increments, so allow normal collection to run before concluding that one diagnostic execution proves absence.

Finally, verify fresh points with the expected pod and service identity, then replace the canary pod. Successful rediscovery after replacement confirms that the annotation, address resolution, endpoint, and selection all work together through the workload lifecycle.
