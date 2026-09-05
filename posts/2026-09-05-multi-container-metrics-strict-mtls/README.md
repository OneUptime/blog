# Secure Multi-Container Metrics Scraping Under Strict mTLS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Istio, Prometheus, Metrics Scraping, Metrics Aggregation, mTLS, Sidecar Containers, Observability, Troubleshooting

Description: Preserve metrics from several containers under strict Istio mTLS by aggregating locally and exposing one deliberate, authenticated scrape path.

---

The standard `prometheus.io/port` and `prometheus.io/path` annotations describe one application endpoint. Before Istio 1.31, that made multi-container Pods awkward: Istio's agent could merge only one application endpoint with agent and Envoy metrics at `:15020/stats/prometheus`.

Istio 1.31 added a native multi-target contract. The `prometheus.istio.io/scrape-targets` annotation accepts an ordered, comma-separated `port:path` list. Pilot-agent scrapes those loopback targets concurrently and folds them into the existing merged endpoint. Istio 1.31 also added an opt-in mTLS listener for that merged endpoint, so a current deployment does not need a custom aggregation container merely to collect several ports.

The current fan-in is:

```text
container A :9101/metrics --\
container B :9102/metrics ----> pilot-agent :15020/stats/prometheus
container C :9103/metrics --/       + Envoy and agent metrics
                                             |
                                             v
                                Envoy mTLS listener :15092
                                             |
                                      Prometheus with cert
```

The exact ports are examples. Keep a custom aggregator as a deliberate compatibility or normalization layer when the mesh is older than 1.31, metric families collide, or partial-success semantics are unacceptable.

## Prove Which Metrics Disappeared

Start from Prometheus target errors and compare them with every container's local endpoint. Inventory the Pod:

```bash
kubectl -n payments get pod payments-api-67f4b8bd7d-4r6pt -o json |
  jq '{containers: [.spec.containers[] |
          {name, ports}],
       annotations:
         (.metadata.annotations | with_entries(
           select(.key | test("prometheus|proxy\\.istio\\.io"))))}'
```

Inside the Pod network namespace, query each endpoint with strict deadlines and no credentials:

```bash
kubectl -n payments exec payments-api-67f4b8bd7d-4r6pt \
  -c APPLICATION_CONTAINER_WITH_CURL -- \
  sh -c 'for port in 9101 9102 9103; do
    curl -fsS --connect-timeout 1 --max-time 3 "http://127.0.0.1:${port}/metrics" |
      head -n 5
  done'
```

Replace the container placeholder with a vetted existing container that has the client, or use an approved ephemeral container. Do not print the full endpoint if metrics labels can contain tenant or customer data. A local success proves the exporter listens; it does not prove Prometheus can authenticate to the Pod.

Check the actual merged endpoint rather than Envoy's admin endpoint. In one terminal, forward the agent status port:

```bash
kubectl -n payments port-forward \
  pod/payments-api-67f4b8bd7d-4r6pt 15020:15020

# In another terminal:
curl -fsS --max-time 5 \
  http://127.0.0.1:15020/stats/prometheus |
  grep -E '^(app_|worker_|istio_)' | head
```

`pilot-agent request GET stats/prometheus` queries Envoy's admin endpoint, not pilot-agent's merged listener on `15020`, so it cannot prove which application targets were merged. If only one application's unique metric appears, inspect the injection input and the proxy's `ISTIO_PROMETHEUS_ANNOTATIONS` value.

## Use Istio 1.31 Multi-Target Fan-In

Declare every application metrics target on the **Pod template**:

```yaml
spec:
  template:
    metadata:
      annotations:
        prometheus.io/scrape: "true"
        prometheus.istio.io/scrape-targets: "9101:/metrics,9102:/metrics,9103:/metrics"
```

Each target is `port:path`; whitespace is trimmed, an empty path defaults to `/metrics`, and declaration order controls output order. The agent connects to `localhost` on each port, so each exporter must be reachable in the shared Pod network namespace. A listener on `0.0.0.0` is reachable; a loopback listener is also shared by all containers in the Pod. Loopback prevents direct access from other Pods but is not a security boundary between containers in the same Pod.

With Prometheus merge enabled, injection consumes the source annotations, stores the parsed targets in `ISTIO_PROMETHEUS_ANNOTATIONS` on `istio-proxy`, and rewrites the ordinary scrape annotations to port `15020` and path `/stats/prometheus`. Verify the resulting contract:

```bash
kubectl -n payments get pod payments-api-67f4b8bd7d-4r6pt -o json |
  jq -r '.spec.containers[] |
    select(.name == "istio-proxy") |
    .env[] |
    select(.name == "ISTIO_PROMETHEUS_ANNOTATIONS") |
    .value | fromjson'
```

The multi-target implementation has specific semantics:

- targets are fetched concurrently but written in declared order;
- each target response is limited to 10 MiB;
- one target failure does not fail the merged HTTP response;
- failures increment `istio_agent_scrape_failures_total{type="application"}` without identifying the target; and
- metric-family collisions are not renamed or deduplicated and can make Prometheus reject the exposition.

Do not rely on Pod admission to validate this annotation. In Istio 1.31, a syntactically malformed target list, such as an entry with an empty port, is logged by the injector and leaves the multi-target list unset; injection can continue, using a valid legacy `prometheus.io/port` target if one was also supplied. If `prometheus.io/scrape: "true"` remains but no legacy port is set, the agent defaults to port `80` and path `/metrics` (unless a legacy path was supplied); it does not necessarily omit application scraping. Successfully parsed targets with nonnumeric, out-of-range, agent-conflicting, or Istio-reserved ports do reject injection. Inspect `ISTIO_PROMETHEUS_ANNOTATIONS` on the admitted Pod and test every heartbeat metric. A failed exporter at runtime otherwise yields a partial `200` response, so add a purpose-built aggregator when completeness must be atomic.

This behavior is new in 1.31. Check both control-plane and proxy versions, and create a canary Pod through the matching revision before relying on it:

```bash
istioctl version
kubectl -n payments get pod payments-api-67f4b8bd7d-4r6pt \
  -o jsonpath='{.spec.containers[?(@.name=="istio-proxy")].image}{"\n"}'
```

## Know the Remaining Merge Limitations

Metrics merging is enabled by default in common Istio installations. It remains unsuitable in some cases:

- the merged endpoint is plaintext by default;
- application metric names can collide with Istio metric names;
- annotation-based scraping may not fit custom Prometheus discovery; and
- native multi-target failure accounting is aggregate rather than per source.

The annotation `prometheus.istio.io/merge-metrics: "false"` disables merge per workload, but disabling it does not solve strict mTLS. It merely makes Prometheus responsible for reaching each port securely and for discovering each target.

Before designing fan-in, choose whether metrics from all containers share one ownership and retention contract. A third-party sidecar may expose sensitive or high-cardinality metrics that should not be merged into the application's scrape.

## Use a Custom Aggregator Only When Its Semantics Are Needed

For Istio older than 1.31, or when metrics need parsing, renaming, per-source status, authentication, or all-or-nothing behavior, add a maintained aggregation process to the Pod. It should:

1. scrape fixed loopback endpoints concurrently;
2. use a short per-source timeout below Prometheus's scrape timeout;
3. expose one `/metrics` listener on a unique Pod port;
4. report its own source-up and source-duration metrics;
5. bound response size and concurrent scrapes; and
6. handle name/type collisions deterministically.

A pre-1.31 Deployment fragment might declare the aggregator as Istio's single application target:

```yaml
spec:
  template:
    metadata:
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9091"
        prometheus.io/path: /metrics
    spec:
      containers:
      - name: metrics-aggregator
        image: registry.example.com/metrics-fan-in@sha256:REPLACE_WITH_APPROVED_DIGEST
        args:
        - --source=http://127.0.0.1:9101/metrics
        - --source=http://127.0.0.1:9102/metrics
        - --source=http://127.0.0.1:9103/metrics
        - --listen=127.0.0.1:9091
        ports:
        - name: http-metrics
          containerPort: 9091
```

This is schematic: select an approved aggregator and its real flags. Do not deploy a placeholder image. Confirm the agent can fetch `127.0.0.1:9091`; application frameworks can impose host checks even though containers share loopback.

Do not concatenate Prometheus text blindly. Two sources can define the same metric with different `TYPE` or `HELP`, or emit identical series labels. Prefer a collector library that parses metric families, rejects inconsistent types, prefixes only when necessary, and exports a collision counter. Preserve counters as counters and histograms as complete bucket/sum/count families.

## Expose the Merged Endpoint Through Native mTLS

Starting with Istio 1.31, enable the native secure merged-metrics listener. If merged metrics are the only requirement, there is no need to open the separate Envoy-only secure port:

```yaml
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          proxyMetadata:
            ENVOY_SECURE_MERGED_METRICS_PORT: "15092"
            METRICS_LOCALHOST_ACCESS_ONLY: "true"
```

`ENVOY_SECURE_METRICS_PORT` conventionally uses `15091` for Envoy-only metrics; `ENVOY_SECURE_MERGED_METRICS_PORT` conventionally uses `15092` for Envoy, agent, and application metrics. Both default to `0` (disabled). `METRICS_LOCALHOST_ACCESS_ONLY` binds Envoy's plaintext `15090` listener to loopback and makes the agent's `/stats/prometheus` handler on `15020` reject non-local requests with HTTP `403`; it does not close the entire `15020` listener. Enable it only after the secure scrape job is ready.

For injected sidecars, the 1.31 injector automatically adds `prometheus.istio.io/secure-port` with the configured merged port. Do not add a conflicting manual value. Gateways are configured differently and may need an explicit discovery annotation; follow the sidecar or gateway section of the release-matched secure-metrics guide.

Prometheus scrapes `https://PodIP:15092/stats/prometheus`. The static Envoy listener requires a client certificate trusted by the mesh CA and proxies locally to `15020`. Treat port numbers as an installation choice and avoid conflicts with application listeners. These are bootstrap listeners, so metadata changes require new Pods and are not dynamically applied to existing proxies.

If the deployed Istio is older than 1.31, follow the official legacy secure-metrics procedure for that exact version. Do not paste a current bootstrap setting into an older injector or retain a legacy EnvoyFilter after upgrading without review.

## Provision Prometheus Credentials Safely

The official Istio sample injects a sidecar into Prometheus and uses `OUTPUT_CERTS` to write rotating workload credentials to a shared volume. Prometheus reads the certificate chain, private key, and root certificate for its HTTPS scrape jobs. The Prometheus sidecar is used for certificate provisioning, and inbound capture can be disabled for that Pod according to the documented sample.

Treat that shared volume as a high-value credential boundary:

- only the Prometheus process and Istio agent should mount it;
- keep it memory-backed where supported;
- run both containers with least privilege;
- prevent metrics configuration users from reading arbitrary files;
- rotate automatically; and
- never copy the key into a ConfigMap, image, or ticket.

An alternative is integrating cert-manager to provision a certificate trusted by Istio, as described in the official secure metrics documentation. Choose one issuer and rotation owner.

Istio workload certificates commonly use SPIFFE URI SANs rather than Pod-IP DNS identities. Prometheus's `insecure_skip_verify: true` disables normal server-certificate chain **and** hostname verification; it does not merely skip an IP-name mismatch. The destination still authenticates Prometheus's client certificate and the channel is encrypted, but Prometheus does not authenticate the server normally. Compensate with narrow discovery and NetworkPolicy, or provision a certificate with a DNS identity that Prometheus can verify and configure `server_name` where the platform supports that design.

## Keep Strict mTLS and Metrics Policy Consistent

Inspect effective authentication and authorization at the workload:

```bash
kubectl -n payments get peerauthentication,authorizationpolicy -o yaml
istioctl x describe pod payments-api-67f4b8bd7d-4r6pt.payments
```

Do not add a broad `portLevelMtls: DISABLE` for every application exporter. That makes those captured workload ports plaintext-compatible and grows the attack surface with every container. Native fan-in lets exporters stay loopback-only and gives Prometheus one authenticated external target.

Use NetworkPolicy to allow the secure metrics port only from Prometheus Pods or their namespace. Confirm the CNI's handling of Pod-to-Pod traffic and dual stack. NetworkPolicy narrows reachability; the mTLS listener authenticates the scraper.

If AuthorizationPolicy is intended to protect the secure listener, validate the installed Istio version's policy attachment and listener behavior with a negative test. Do not assume a static bootstrap listener is governed identically to a normal application inbound listener without evidence.

## Verify Every Layer

After creating a canary Pod, verify the Envoy-owned listeners:

```bash
istioctl proxy-config listeners pod/payments-api-CANARY.payments |
  grep -E '15090|15091|15092'
```

For the sample configuration, expected Envoy evidence is the local plaintext stats listener on `15090` and a TLS-marked secure merged-metrics listener on `15092`. Port `15091` appears only if the separate Envoy-only secure listener is enabled. The merged plaintext listener on `15020` belongs to pilot-agent, not Envoy, so `proxy-config listeners` cannot prove it; verify it with the earlier `15020` port-forward and curl test. Also confirm injection added the discovery annotation:

```bash
kubectl -n payments get pod payments-api-CANARY -o json |
  jq '.metadata.annotations |
      with_entries(select(.key | test("prometheus")))'
```

Then test from the Prometheus Pod using its configured credentials and the same URL used by service discovery. Do not print key contents or enable shell tracing around credential paths.

In Prometheus, check target status and query:

- one unique heartbeat metric from every application target;
- `istio_requests_total` or another expected mesh metric;
- series count and scrape payload size; and
- `istio_agent_scrape_failures_total{type="application"}` and Prometheus parse errors.

Stop one exporter in a non-production test. Native multi-target merge should continue to expose the other targets and increment the aggregate failure counter. If a custom aggregator deliberately fails the whole scrape instead, document that contract in alerting.

Run negative tests: plaintext to `15092` should fail, a client without a trusted certificate should fail, and direct access to loopback-only source ports from another Pod should fail. Confirm the older direct scrape jobs are removed so Prometheus does not collect duplicates.

## Operate Fan-In Without Hiding Failures

Alert on each source independently. A successful aggregate HTTP response can hide one missing exporter; native pilot-agent failure accounting is not labeled by target. Keep every exporter fast enough for the outer scrape deadline and watch the merged payload size.

Watch cardinality. Adding a synthetic `container` label to every series may distinguish sources, but changing labels changes series identity and dashboards. Prefer unique metric namespaces from each component and add labels only through a reviewed migration.

Track Istio upgrades that affect metric merge, native secure ports, annotations, and certificate provisioning. Render injected Pods and test the canary before fleet rollout.

## Conclusion

On Istio 1.31, multi-container metric loss has a native remedy: declare every `port:path` in `prometheus.istio.io/scrape-targets`, verify the injected target list, and expose `15020` through the mTLS listener on `15092`. Account for partial-success and metric-collision behavior, restrict plaintext metrics to localhost, and keep a custom aggregator only when an older release or a stricter merge contract requires it.

## Official Documentation

- [Istio: Prometheus Integration](https://istio.io/latest/docs/ops/integrations/prometheus/)
- [Istio 1.31 Change Notes: Multi-Target Scraping and Secure Metrics Ports](https://istio.io/latest/news/releases/1.31.x/announcing-1.31/change-notes/)
- [Istio Design: Multi-Port Metrics Merging](https://github.com/istio/istio/blob/release-1.31/architecture/networking/multi-port-metrics-merging.md)
- [Istio: Securing Prometheus Scraping](https://istio.io/latest/docs/tasks/observability/metrics/secure-metrics/)
- [Istio: Resource Annotations](https://istio.io/latest/docs/reference/config/annotations/)
- [Istio: PeerAuthentication](https://istio.io/latest/docs/reference/config/security/peer_authentication/)
- [Istio: Application Requirements and Ports](https://istio.io/latest/docs/ops/deployment/application-requirements/)
- [Kubernetes: Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [Prometheus: Configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/)
- [Prometheus: Exposition Formats](https://prometheus.io/docs/instrumenting/exposition_formats/)
