# How to Build Prometheus Target Discovery

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Prometheus, Service Discovery, Monitoring, DevOps

Description: A practical guide to configuring Prometheus target discovery from static configs to dynamic service discovery with relabeling, refresh intervals, and production patterns.

---

Prometheus pulls metrics from targets. The question is: how does it know which targets exist? In static environments, you list them manually. In dynamic environments like Kubernetes or cloud platforms, you need service discovery that finds targets automatically as they come and go.

This guide walks through every discovery mechanism, from the simplest static configs to fully dynamic setups with custom relabeling.

## Discovery Mechanisms Overview

```mermaid
flowchart TD
    subgraph Static
        SC[static_configs] --> T1[Hardcoded targets]
    end

    subgraph File-Based
        FSD[file_sd_configs] --> JSON[JSON/YAML files]
        JSON --> T2[Targets from files]
        EXT[External tool] -.->|writes| JSON
    end

    subgraph Dynamic
        K8S[kubernetes_sd_configs] --> API1[K8s API]
        CONSUL[consul_sd_configs] --> API2[Consul API]
        EC2[ec2_sd_configs] --> API3[AWS API]
        DNS[dns_sd_configs] --> API4[DNS Server]
    end

    T1 --> P[Prometheus]
    T2 --> P
    API1 --> P
    API2 --> P
    API3 --> P
    API4 --> P
```

| Method | Use Case | Refresh | Complexity |
|--------|----------|---------|------------|
| static_configs | Dev/test, fixed infrastructure | Manual reload | Low |
| file_sd_configs | Custom tooling, config management | File watch | Low |
| kubernetes_sd | Kubernetes workloads | Real-time | Medium |
| consul_sd | Consul service mesh | Real-time | Medium |
| ec2_sd | AWS EC2 instances | Interval-based | Medium |
| dns_sd | DNS SRV records | Interval-based | Low |

---

## Static Configuration

The simplest approach. List your targets directly in the Prometheus config.

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'web-servers'
    static_configs:
      - targets:
          - 'web1.example.com:9100'
          - 'web2.example.com:9100'
          - 'web3.example.com:9100'
        labels:
          env: production
          team: platform

  - job_name: 'database-servers'
    static_configs:
      - targets:
          - 'db-primary.example.com:9187'
          - 'db-replica.example.com:9187'
        labels:
          env: production
          role: database
```

**When to use static_configs:**
- Development and testing environments
- Small, stable infrastructure (under 20 targets)
- When you control deployments through config management anyway

**Drawbacks:**
- Requires config reload when targets change
- Does not scale to dynamic environments
- Easy to drift from actual infrastructure

---

## File-Based Service Discovery

File-based discovery sits between static and fully dynamic. Prometheus watches JSON or YAML files for target definitions. External tools can update these files, and Prometheus picks up changes without restart.

### Basic file_sd Setup

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'app-servers'
    file_sd_configs:
      - files:
          - '/etc/prometheus/targets/app-servers.json'
          - '/etc/prometheus/targets/*.yml'
        refresh_interval: 30s
```

### Target File Format (JSON)

```json
[
  {
    "targets": ["app1.example.com:8080", "app2.example.com:8080"],
    "labels": {
      "env": "production",
      "service": "api",
      "version": "2.1.0"
    }
  },
  {
    "targets": ["app3.example.com:8080"],
    "labels": {
      "env": "staging",
      "service": "api",
      "version": "2.2.0-rc1"
    }
  }
]
```

### Target File Format (YAML)

```yaml
# /etc/prometheus/targets/cache-servers.yml
- targets:
    - 'redis1.example.com:9121'
    - 'redis2.example.com:9121'
  labels:
    service: cache
    env: production

- targets:
    - 'memcached1.example.com:9150'
  labels:
    service: cache
    cache_type: memcached
```

### Generating Target Files

You can generate target files from any source. Here is a simple script that pulls from a CMDB:

```bash
#!/bin/bash
# generate-targets.sh

curl -s "https://cmdb.example.com/api/servers?role=app" | \
  jq '[.servers | group_by(.datacenter)[] | {
    targets: [.[].hostname + ":9100"],
    labels: {
      datacenter: .[0].datacenter,
      env: .[0].environment
    }
  }]' > /etc/prometheus/targets/app-servers.json
```

Run this via cron or a systemd timer:

```ini
# /etc/systemd/system/prometheus-targets.timer
[Unit]
Description=Update Prometheus targets from CMDB

[Timer]
OnCalendar=*:0/5
Persistent=true

[Install]
WantedBy=timers.target
```

### file_sd with Ansible

```yaml
# ansible playbook task
- name: Generate Prometheus targets
  template:
    src: prometheus-targets.json.j2
    dest: /etc/prometheus/targets/{{ item.name }}.json
  loop: "{{ prometheus_jobs }}"
  notify: reload prometheus
```

```jinja2
{# prometheus-targets.json.j2 #}
[
  {
    "targets": [
{% for host in groups[item.group] %}
      "{{ hostvars[host].ansible_host }}:{{ item.port }}"{% if not loop.last %},{% endif %}

{% endfor %}
    ],
    "labels": {
      "job": "{{ item.name }}",
      "env": "{{ env }}"
    }
  }
]
```

---

## Kubernetes Service Discovery

Kubernetes SD queries the Kubernetes API to find pods, services, endpoints, nodes, and ingresses. This is the most common setup for cloud-native deployments.

```mermaid
flowchart LR
    subgraph Kubernetes Cluster
        API[K8s API Server]
        P1[Pod 1]
        P2[Pod 2]
        P3[Pod 3]
        S[Service]
        E[Endpoints]
    end

    Prom[Prometheus] -->|watch| API
    API -->|notify| Prom
    Prom -->|scrape| P1
    Prom -->|scrape| P2
    Prom -->|scrape| P3
```

### Pod Discovery

```yaml
scrape_configs:
  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
            - production
            - staging
    relabel_configs:
      # Only scrape pods with prometheus.io/scrape annotation
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true

      # Use custom port if specified
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        target_label: __address__
        regex: (.+)
        replacement: ${1}

      # Use custom path if specified
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)

      # Add pod labels as metric labels
      - action: labelmap
        regex: __meta_kubernetes_pod_label_(.+)

      # Add namespace label
      - source_labels: [__meta_kubernetes_namespace]
        action: replace
        target_label: namespace

      # Add pod name label
      - source_labels: [__meta_kubernetes_pod_name]
        action: replace
        target_label: pod
```

### Service Discovery

```yaml
scrape_configs:
  - job_name: 'kubernetes-services'
    kubernetes_sd_configs:
      - role: service
    relabel_configs:
      - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_scrape]
        action: keep
        regex: true

      - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_scheme]
        action: replace
        target_label: __scheme__
        regex: (https?)

      - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)

      - source_labels: [__address__, __meta_kubernetes_service_annotation_prometheus_io_port]
        action: replace
        target_label: __address__
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2

      - source_labels: [__meta_kubernetes_namespace]
        action: replace
        target_label: namespace

      - source_labels: [__meta_kubernetes_service_name]
        action: replace
        target_label: service
```

### Endpoints Discovery (Recommended for Services)

```yaml
scrape_configs:
  - job_name: 'kubernetes-endpoints'
    kubernetes_sd_configs:
      - role: endpoints
    relabel_configs:
      - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_scrape]
        action: keep
        regex: true

      - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_scheme]
        action: replace
        target_label: __scheme__
        regex: (https?)

      - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)

      - source_labels: [__address__, __meta_kubernetes_service_annotation_prometheus_io_port]
        action: replace
        target_label: __address__
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2

      - source_labels: [__meta_kubernetes_namespace]
        action: replace
        target_label: namespace

      - source_labels: [__meta_kubernetes_service_name]
        action: replace
        target_label: service

      - source_labels: [__meta_kubernetes_pod_name]
        action: replace
        target_label: pod
```

### Node Discovery

```yaml
scrape_configs:
  - job_name: 'kubernetes-nodes'
    kubernetes_sd_configs:
      - role: node
    relabel_configs:
      - action: labelmap
        regex: __meta_kubernetes_node_label_(.+)

      - source_labels: [__meta_kubernetes_node_name]
        action: replace
        target_label: node

  - job_name: 'kubernetes-nodes-cadvisor'
    kubernetes_sd_configs:
      - role: node
    scheme: https
    tls_config:
      ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
    bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
    relabel_configs:
      - action: labelmap
        regex: __meta_kubernetes_node_label_(.+)

      - target_label: __address__
        replacement: kubernetes.default.svc:443

      - source_labels: [__meta_kubernetes_node_name]
        regex: (.+)
        target_label: __metrics_path__
        replacement: /api/v1/nodes/${1}/proxy/metrics/cadvisor
```

---

## Consul Service Discovery

Consul SD discovers services registered in Consul. This works well for non-Kubernetes environments or hybrid setups.

```yaml
scrape_configs:
  - job_name: 'consul-services'
    consul_sd_configs:
      - server: 'consul.example.com:8500'
        datacenter: dc1
        services:
          - api
          - web
          - worker
        tags:
          - prometheus
        refresh_interval: 30s

    relabel_configs:
      # Use Consul service name as job label
      - source_labels: [__meta_consul_service]
        action: replace
        target_label: job

      # Add datacenter label
      - source_labels: [__meta_consul_dc]
        action: replace
        target_label: datacenter

      # Add Consul tags as labels
      - source_labels: [__meta_consul_tags]
        action: replace
        target_label: tags

      # Extract environment from Consul metadata
      - source_labels: [__meta_consul_service_metadata_env]
        action: replace
        target_label: env
```

### Consul with Token Authentication

```yaml
scrape_configs:
  - job_name: 'consul-secure'
    consul_sd_configs:
      - server: 'consul.example.com:8501'
        scheme: https
        token: 'your-consul-token'
        tls_config:
          ca_file: /etc/prometheus/consul-ca.pem
        refresh_interval: 15s
```

---

## EC2 Service Discovery

Discover EC2 instances by tags, filters, or security groups.

```yaml
scrape_configs:
  - job_name: 'ec2-instances'
    ec2_sd_configs:
      - region: us-east-1
        access_key: 'AKIAIOSFODNN7EXAMPLE'
        secret_key: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
        port: 9100
        refresh_interval: 60s
        filters:
          - name: tag:Environment
            values:
              - production
          - name: instance-state-name
            values:
              - running

    relabel_configs:
      # Use instance ID as instance label
      - source_labels: [__meta_ec2_instance_id]
        action: replace
        target_label: instance_id

      # Add availability zone
      - source_labels: [__meta_ec2_availability_zone]
        action: replace
        target_label: availability_zone

      # Add instance type
      - source_labels: [__meta_ec2_instance_type]
        action: replace
        target_label: instance_type

      # Map EC2 tags to labels
      - source_labels: [__meta_ec2_tag_Name]
        action: replace
        target_label: instance_name

      - source_labels: [__meta_ec2_tag_Service]
        action: replace
        target_label: service

      # Use private IP for scraping
      - source_labels: [__meta_ec2_private_ip]
        action: replace
        target_label: __address__
        replacement: ${1}:9100
```

### EC2 with IAM Role (Recommended)

```yaml
scrape_configs:
  - job_name: 'ec2-instances'
    ec2_sd_configs:
      - region: us-east-1
        # No credentials needed when using IAM role
        port: 9100
        refresh_interval: 60s
```

Required IAM policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeInstances"
      ],
      "Resource": "*"
    }
  ]
}
```

---

## DNS Service Discovery

DNS SD uses SRV or A records to discover targets. Useful when you already have DNS-based service discovery.

```yaml
scrape_configs:
  - job_name: 'dns-srv'
    dns_sd_configs:
      - names:
          - '_prometheus._tcp.api.example.com'
          - '_prometheus._tcp.web.example.com'
        type: SRV
        refresh_interval: 30s

  - job_name: 'dns-a'
    dns_sd_configs:
      - names:
          - 'api.example.com'
          - 'web.example.com'
        type: A
        port: 9100
        refresh_interval: 30s
```

---

## Relabeling Deep Dive

Relabeling is where you transform discovered targets before scraping. It controls what gets scraped, how targets are addressed, and what labels appear on metrics.

```mermaid
flowchart LR
    SD[Service Discovery] --> Meta[__meta_* labels]
    Meta --> Relabel[relabel_configs]
    Relabel --> Target[Final Target]
    Target --> Scrape[Scrape]
    Scrape --> MetricRelabel[metric_relabel_configs]
    MetricRelabel --> Store[Storage]
```

### Relabel Actions

| Action | Purpose |
|--------|---------|
| keep | Keep targets matching regex |
| drop | Drop targets matching regex |
| replace | Set target_label from source_labels |
| labelmap | Copy labels matching regex |
| labeldrop | Drop labels matching regex |
| labelkeep | Keep only labels matching regex |
| hashmod | Set label to hash modulo |

### Common Relabeling Patterns

**Filter by annotation:**

```yaml
relabel_configs:
  - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
    action: keep
    regex: true
```

**Override scrape port:**

```yaml
relabel_configs:
  - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_port]
    action: replace
    target_label: __address__
    regex: ([^:]+)(?::\d+)?
    replacement: ${1}:9090
```

**Add static label:**

```yaml
relabel_configs:
  - target_label: cluster
    replacement: production-us-east
```

**Copy metadata to label:**

```yaml
relabel_configs:
  - source_labels: [__meta_kubernetes_namespace, __meta_kubernetes_pod_name]
    separator: /
    target_label: instance
```

**Drop high-cardinality label:**

```yaml
metric_relabel_configs:
  - regex: 'kubernetes_pod_uid'
    action: labeldrop
```

**Hash-based sharding for HA:**

```yaml
relabel_configs:
  - source_labels: [__address__]
    modulus: 2
    target_label: __tmp_hash
    action: hashmod
  - source_labels: [__tmp_hash]
    regex: 0  # This instance handles shard 0
    action: keep
```

---

## Target Labels

Special labels control scraping behavior:

| Label | Purpose | Default |
|-------|---------|---------|
| `__address__` | Target host:port | From discovery |
| `__scheme__` | http or https | http |
| `__metrics_path__` | Metrics endpoint path | /metrics |
| `__scrape_interval__` | Override scrape interval | job default |
| `__scrape_timeout__` | Override scrape timeout | job default |
| `__param_<name>` | URL query parameters | none |

**Override scheme for TLS:**

```yaml
relabel_configs:
  - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_scheme]
    action: replace
    target_label: __scheme__
    regex: (https?)
```

**Override metrics path:**

```yaml
relabel_configs:
  - source_labels: [__meta_consul_service_metadata_metrics_path]
    action: replace
    target_label: __metrics_path__
    regex: (.+)
```

**Add query parameter:**

```yaml
relabel_configs:
  - target_label: __param_format
    replacement: prometheus
```

---

## Discovery Refresh Intervals

Each discovery mechanism has a refresh interval that controls how often Prometheus checks for changes.

```yaml
scrape_configs:
  - job_name: 'ec2'
    ec2_sd_configs:
      - region: us-east-1
        refresh_interval: 60s  # Check EC2 API every 60s

  - job_name: 'consul'
    consul_sd_configs:
      - server: 'consul:8500'
        refresh_interval: 15s  # Check Consul every 15s

  - job_name: 'file'
    file_sd_configs:
      - files: ['/etc/prometheus/targets/*.json']
        refresh_interval: 30s  # Reload files every 30s

  - job_name: 'kubernetes'
    kubernetes_sd_configs:
      - role: pod
        # No refresh_interval - uses watch API for real-time updates
```

### Tuning Guidelines

| Discovery Type | Recommended Interval | Notes |
|----------------|---------------------|-------|
| kubernetes_sd | N/A | Uses watch API, real-time |
| consul_sd | 15-30s | Balance freshness vs load |
| ec2_sd | 60-300s | API rate limits apply |
| file_sd | 10-60s | Depends on update frequency |
| dns_sd | 30-60s | Match DNS TTL |

---

## Production Patterns

### Multi-Cluster Kubernetes

```yaml
scrape_configs:
  - job_name: 'cluster-east-pods'
    kubernetes_sd_configs:
      - role: pod
        api_server: 'https://k8s-east.example.com'
        tls_config:
          ca_file: /etc/prometheus/k8s-east-ca.pem
        bearer_token_file: /etc/prometheus/k8s-east-token
    relabel_configs:
      - target_label: cluster
        replacement: east

  - job_name: 'cluster-west-pods'
    kubernetes_sd_configs:
      - role: pod
        api_server: 'https://k8s-west.example.com'
        tls_config:
          ca_file: /etc/prometheus/k8s-west-ca.pem
        bearer_token_file: /etc/prometheus/k8s-west-token
    relabel_configs:
      - target_label: cluster
        replacement: west
```

### Combining Discovery Methods

```yaml
scrape_configs:
  - job_name: 'all-app-servers'
    # K8s discovery for containerized workloads
    kubernetes_sd_configs:
      - role: pod
        namespaces:
          names: [production]

    # EC2 discovery for legacy VMs
    ec2_sd_configs:
      - region: us-east-1
        filters:
          - name: tag:Service
            values: [app]

    # Static for special cases
    static_configs:
      - targets: ['legacy-app.example.com:9100']
        labels:
          source: static

    relabel_configs:
      # Normalize labels across discovery methods
      - source_labels: [__meta_kubernetes_pod_label_app]
        action: replace
        target_label: service

      - source_labels: [__meta_ec2_tag_Service]
        action: replace
        target_label: service
```

### Blackbox Probing with Discovery

```yaml
scrape_configs:
  - job_name: 'blackbox-http'
    metrics_path: /probe
    params:
      module: [http_2xx]
    kubernetes_sd_configs:
      - role: ingress
    relabel_configs:
      - source_labels: [__meta_kubernetes_ingress_scheme, __address__]
        separator: ://
        target_label: __param_target

      - source_labels: [__meta_kubernetes_ingress_name]
        target_label: ingress

      - target_label: __address__
        replacement: blackbox-exporter:9115
```

---

## Debugging Discovery

### Check Discovered Targets

```bash
# Via Prometheus API
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, instance: .labels.instance, health: .health}'

# Via web UI
# http://localhost:9090/targets
```

### Check Service Discovery

```bash
# Via Prometheus API
curl -s http://localhost:9090/api/v1/targets/metadata | jq .

# List discovered labels before relabeling
curl -s 'http://localhost:9090/api/v1/targets?state=active' | jq '.data.activeTargets[0].discoveredLabels'
```

### Validate Relabel Config

```bash
# Use promtool
promtool check config prometheus.yml

# Test relabeling
promtool test rules test.yml
```

---

## Summary

Target discovery is the foundation of a scalable Prometheus deployment. Start simple with static configs for small setups. Move to file_sd when you need external tooling to manage targets. Use native service discovery (Kubernetes, Consul, EC2) when your infrastructure provides it.

Key points:
- Relabeling transforms discovered metadata into useful labels
- Refresh intervals balance freshness against API load
- Combine multiple discovery methods when needed
- Debug with the /targets endpoint and promtool

Get discovery right, and Prometheus scales with your infrastructure. Get it wrong, and you will spend your time manually updating configs instead of analyzing metrics.

---

**Related Reading:**

- [The Three Pillars of Observability: Logs, Metrics, Traces](https://oneuptime.com/blog/post/2025-08-20-three-pillars-of-observability-logs-metrics-traces/view)
- [How to Reduce Noise in OpenTelemetry](https://oneuptime.com/blog/post/2025-08-25-how-to-reduce-noise-in-opentelemetry/view)
- [SRE Tools Comparison](https://oneuptime.com/blog/post/2025-11-28-sre-tools-comparison/view)
