# How to Configure Prometheus Relabeling to Extract IPv4 Addresses from Targets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Relabeling, IPv4, Metric, Configuration, Labels, Monitoring

Description: Learn how to use Prometheus relabeling rules to extract IPv4 addresses from target labels and create useful per-IP metrics for your monitoring setup.

---

Prometheus relabeling (`relabel_configs`) allows you to transform labels on targets before scraping. This is useful for extracting IP addresses from target addresses, adding custom labels, and filtering targets.

## Understanding Relabeling

Relabeling happens before scraping. The `__address__` label contains the target's `host:port`. Relabeling rules can extract the IP, add custom labels, or drop targets entirely.

## Extract IPv4 from Target Address

```yaml
# /etc/prometheus/prometheus.yml

scrape_configs:
  - job_name: 'node_exporter'
    static_configs:
      - targets:
          - '10.0.0.10:9100'
          - '10.0.0.11:9100'
    relabel_configs:
      # Extract the IPv4 address from __address__ (strips the port)
      - source_labels: [__address__]
        regex: '([^:]+):\d+'        # Capture group 1: everything before the colon
        target_label: ipv4_address  # Store IP in a new label
        replacement: '$1'
```

Result: time series scraped from `10.0.0.10:9100` get `ipv4_address="10.0.0.10"`, and time series scraped from `10.0.0.11:9100` get `ipv4_address="10.0.0.11"`.

## Relabeling with Consul Service Discovery

When using Consul and the relevant address is published in `__meta_consul_service_address`, copy it into labels and use it for scraping:

```yaml
scrape_configs:
  - job_name: 'consul_nodes'
    consul_sd_configs:
      - server: '10.0.0.100:8500'
    relabel_configs:
      # Copy the Consul node name into a regular label
      - source_labels: [__meta_consul_node]
        target_label: node

      # Copy the service address into a regular label
      - source_labels: [__meta_consul_service_address]
        target_label: ipv4_address

      # Compose the scrape address from the service address and port
      - source_labels: [__meta_consul_service_address, __meta_consul_service_port]
        separator: ':'
        target_label: __address__
```

## Filter Targets by IPv4 Subnet

Keep only targets in the `10.0.0.0/24` range:

```yaml
relabel_configs:
  # Drop targets NOT in the 10.0.0.0/24 subnet
  - source_labels: [__address__]
    regex: '10\.0\.0\.\d+:\d+'  # Match IPv4 in the target subnet
    action: keep                  # Keep matching targets; drop everything else
```

## Add a Datacenter Label Based on IPv4 Range

```yaml
relabel_configs:
  # Tag targets in 10.0.0.0/24 as datacenter-a
  - source_labels: [__address__]
    regex: '10\.0\.0\.\d+:\d+'
    target_label: datacenter
    replacement: datacenter-a

  # Tag targets in 10.1.0.0/24 as datacenter-b
  - source_labels: [__address__]
    regex: '10\.1\.0\.\d+:\d+'
    target_label: datacenter
    replacement: datacenter-b
```

## Replace Port in Target Address

```yaml
relabel_configs:
  # Override the port in the scrape address to 9100
  - source_labels: [__address__]
    regex: '([^:]+)(?::\d+)?'      # Capture IP, ignore any existing port
    target_label: __address__
    replacement: '$1:9100'
```

## Using Relabeling to Add Instance Label

```yaml
relabel_configs:
  # Set instance label to just the IP (without port)
  - source_labels: [__address__]
    regex: '([^:]+):\d+'
    target_label: instance
    replacement: '$1'
```

## Key Takeaways

- Use `regex` capture groups with `replacement: '$1'` to extract the IPv4 from `__address__`.
- `action: keep` filters targets; `action: drop` removes matching targets from scraping.
- `__address__` is the writable label for the scrape address - modify it in relabeling to change what gets scraped.
- Relabeling runs before scraping; `metric_relabel_configs` runs on already-scraped metrics.
