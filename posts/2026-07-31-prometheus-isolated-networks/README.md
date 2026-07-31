# One Prometheus or One per Network? Monitoring Isolated Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Network Segmentation, Federation, Remote Write, Agent Mode, Monitoring Architecture

Description: Choose central scraping, per-network Prometheus, federation, or remote write based on routing direction, local autonomy, retention, and failure isolation.

---

The number of Prometheus servers should follow failure domains and trust boundaries, not an arbitrary “one” or “one per cluster” rule. A central Prometheus is simplest when every target is privately reachable over reliable links. An isolated environment usually benefits from a local scraper because service discovery, scrape health, and alerting continue without cross-network reachability.

A practical default is:

```text
scrape locally inside each isolated network
then export only the required global view
```

Whether the local component is a full Prometheus or Prometheus Agent depends on whether the environment needs local querying, recording rules, alerting, and retention.

## Compare the Main Patterns

| Pattern | Cross-boundary direction | Local query and alerting | Best fit |
| --- | --- | --- | --- |
| one central Prometheus scrapes all targets | central to targets | central only | reliable private routing and one trust domain |
| full Prometheus per network | none required for local monitoring | yes | autonomous or disconnected environments |
| hierarchical federation | global Prometheus pulls from local Prometheus | yes | global aggregates with local detail |
| full Prometheus plus remote write | local initiates outbound writes | yes | local operations plus centralized raw or selected samples |
| Prometheus Agent plus remote write | local initiates outbound writes | no | egress-only network that needs only a central data plane |

Federation and remote write solve different problems. Federation exposes selected current series from a source Prometheus's `/federate` endpoint for another Prometheus to scrape. Remote write forwards samples as they are ingested to a compatible receiver.

## Use One Central Prometheus When the Network Supports Pull

Central scraping preserves the standard Prometheus model:

- service discovery produces a target set;
- Prometheus initiates every scrape;
- `up` distinguishes scrape success and failure;
- one rule engine sees all series; and
- configuration and storage are centralized.

Choose it when:

- every target has stable private routing from Prometheus;
- firewall rules permit inbound scrape traffic to the target segments;
- link latency is comfortably below the scrape timeout;
- one central failure domain is acceptable;
- the target count and cardinality fit the server; and
- security policy permits the central system to hold credentials for every environment.

Do not expose exporters publicly to make this topology work. Prometheus's security guidance recommends keeping metrics endpoints off publicly accessible networks.

Central scraping across a fragile WAN makes a link failure look like hundreds of failed hosts. Label targets by site and network, monitor the path independently, and inhibit per-target symptoms when the shared path is known to be unavailable.

## Run a Full Prometheus per Network for Local Autonomy

A local Prometheus keeps:

- service discovery close to the systems it understands;
- scrape traffic within the segment;
- local dashboards and troubleshooting available;
- recording and alerting rules operational during WAN failure; and
- detailed retention independent from the central link.

This is usually the strongest choice for factories, edge sites, regulated zones, separate cloud accounts, and Kubernetes clusters that must operate through central outages.

It costs more operationally. Each server needs storage sizing, upgrades, rule management, backups where required, and availability monitoring. Standardize configuration generation and labels rather than treating every site as a handcrafted installation.

Do not deploy one Prometheus per host. Group targets by a failure domain with enough shared context to make useful alerts and queries.

## Use Hierarchical Federation for a Selected Global View

Prometheus federation lets a higher-level server scrape selected series from lower-level servers:

```yaml
scrape_configs:
  - job_name: federate-sites
    scrape_interval: 30s
    honor_labels: true
    metrics_path: /federate
    params:
      "match[]":
        - '{__name__=~"site:.*"}'
        - 'up{job="prometheus"}'
    static_configs:
      - targets:
          - prometheus-site-a.example:9090
          - prometheus-site-b.example:9090
```

Record site- or job-level aggregates locally, then federate those series. The global server receives values selected at each federation scrape; federation is not a historical block-transfer or complete replication mechanism.

Federation is a good fit when:

- detailed instance data should remain local;
- global alerts need only aggregates and a few health series;
- the central system can initiate connections to local Prometheus servers; and
- local Prometheus remains the drill-down source.

Protect `/federate` with TLS, authentication, and network policy. `honor_labels: true` preserves source labels and also removes one protection against a target impersonating other label sets, so only federate from trusted, controlled Prometheus servers.

## Use Remote Write for Centralized Samples

A local full Prometheus can forward samples while retaining local query and alerting:

```yaml
global:
  external_labels:
    environment: prod
    site: factory-a
    prometheus: infrastructure

remote_write:
  - name: central
    url: https://metrics.example.internal/api/v1/write
    tls_config:
      ca_file: /etc/prometheus/pki/central-ca.crt
      cert_file: /etc/prometheus/pki/site-client.crt
      key_file: /etc/prometheus/pki/site-client.key
    write_relabel_configs:
      - source_labels: [__name__]
        regex: 'node_.+|site:.+|up'
        action: keep
```

Remote write is attractive across egress-only boundaries because the local sender initiates the connection. The receiver must be a supported, capacity-planned remote-write endpoint.

Prometheus can enable its own remote-write receiver, but the official HTTP API documentation warns that it is not an efficient replacement for scrape ingestion and is intended only for specific low-volume use cases. Do not turn one unplanned central Prometheus into a large push receiver merely because the flag exists.

The sender retries retriable failures and uses its WAL and queue as a buffer, but buffering is bounded. Monitor queue backlog, failed and retried samples, shard capacity, and the oldest unsent data. Test an outage longer than the designed buffer. A full local Prometheus still has its local data when the remote copy has a gap; an Agent does not provide that local queryable retention.

## Choose Prometheus Agent When Forwarding Is the Only Local Job

Prometheus Agent keeps the normal scrape and service-discovery behavior but disables querying, alerting, rule evaluation, and the normal local TSDB. It uses a WAL optimized for remote write.

Use it when:

- the environment can initiate outbound HTTPS but accepts no inbound monitoring connection;
- all dashboards, rules, and retention belong centrally;
- temporary WAN buffering is sufficient; and
- local operators do not require queries during disconnection.

Do not choose Agent mode for an environment that must page locally through a central outage. Run a full local Prometheus and local Alertmanager path instead.

The Agent guide describes temporary buffering and currently calls out a two-hour buffer. Current Prometheus command-line help also exposes `--storage.agent.retention.min-time` and `--storage.agent.retention.max-time`, whose defaults and behavior are release-specific. Treat the exact binary's help as authoritative, choose a supported retention from an explicit maximum disconnection objective and available disk, and validate recovery. Do not assume an indefinitely disconnected site will replay everything later.

## Make Labels Globally Unique

Every local server should add stable external labels:

```yaml
global:
  external_labels:
    environment: prod
    region: eu-west
    site: factory-a
    cluster: workloads-1
    prometheus: infrastructure
```

External labels are applied when communicating with external systems when the series lacks that label. They do not automatically appear in ordinary local queries.

Ensure that two independent sources cannot send the same label set for one metric unless the receiver has an intentional high-availability deduplication design. For HA replicas, use a distinct replica label and configure the receiving/query layer's deduplication behavior. Simply deleting the replica label before a receiver that does not deduplicate can create duplicate or out-of-order samples.

## Place Rules at the Right Level

Local rules should cover failures that require action without the WAN:

- host and service availability;
- local capacity;
- network-segment health;
- scrape and discovery health; and
- remote-write pipeline health.

Global rules should cover:

- cross-site aggregate SLOs;
- central ingestion and query health;
- fleet-wide capacity;
- missing sites; and
- failures that need global coordination.

Avoid evaluating the same paging rule at both levels unless Alertmanager routing and deduplication are designed for it. A central rule that depends on remote-written data must distinguish “host down” from “site has stopped sending.”

## Secure Every Boundary

For cross-network traffic:

- use private links, VPNs, or approved gateways;
- use TLS with server verification and preferably client authentication;
- restrict source and destination identities;
- keep exporter endpoints inside their segment;
- use documented secret-file fields rather than embedding secrets in labels or URLs;
- protect Prometheus, federation, and remote-write endpoints from public access; and
- monitor certificate expiry and tunnel availability.

Remote write and federation carry infrastructure data that Prometheus's security model does not treat as secret by default. Your organization may classify hostnames, topology, and capacity as sensitive; design the transport and storage accordingly.

## A Decision Checklist

Choose one central scraper when all answers are yes:

- Is private pull connectivity reliable?
- Is one trust and failure domain acceptable?
- Can one service-discovery and credential plane span the environments?
- Will a central outage not remove required local visibility?
- Does the target set and cardinality fit each server in a single-server or intentional HA-pair deployment?

Choose local full Prometheus when any environment needs autonomous alerting, querying, or retention. Add federation for a selected aggregate view or remote write for centralized samples.

Choose Agent mode only when local scraping plus remote forwarding is sufficient and bounded disconnection loss is accepted.

Architecture should make link failure explicit. A segmented network is not merely a routing inconvenience; it is a monitoring failure domain.

## Official Documentation

- [Prometheus architecture overview](https://prometheus.io/docs/introduction/overview/)
- [Prometheus hierarchical federation](https://prometheus.io/docs/prometheus/latest/federation/)
- [Prometheus Agent mode](https://prometheus.io/docs/prometheus/latest/prometheus_agent/)
- [Prometheus command-line flags, including Agent WAL retention](https://prometheus.io/docs/prometheus/latest/command-line/prometheus/)
- [Prometheus remote-write configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_write)
- [Prometheus remote-write tuning](https://prometheus.io/docs/practices/remote_write/)
- [Prometheus remote-write receiver limitations](https://prometheus.io/docs/prometheus/latest/querying/api/#remote-write-receiver)
- [Prometheus external labels configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#configuration-file)
- [Prometheus security model](https://prometheus.io/docs/operating/security/)
- [Kubernetes NetworkPolicy](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
