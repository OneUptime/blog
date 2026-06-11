# Validation Summary: How to Build Over-Provisioned Detection

## Status
validated

## Post Type
Tutorial / Guide — a how-to with extensive TypeScript implementations, YAML config snippets, Prometheus queries, and Mermaid architecture diagrams for building over-provisioning detection in cloud environments.

## Technologies Covered
- TypeScript (class-based detection framework, analyzers for CPU/memory/storage/network)
- YAML (threshold configuration, Prometheus alert rules)
- Prometheus / PromQL (CPU, memory, storage utilization queries)
- node_exporter metrics (`node_cpu_seconds_total`, `node_memory_MemTotal_bytes`, `node_memory_MemAvailable_bytes`, `node_filesystem_size_bytes`, `node_filesystem_avail_bytes`)
- kube-state-metrics (`kube_pod_container_resource_requests`)
- cAdvisor (`container_cpu_usage_seconds_total`)
- AWS EBS volume types (gp2, gp3, io2) and pricing/spec assumptions
- AWS NAT gateway / NAT instance, load balancer concepts
- Mermaid diagrams (flowchart syntax)

## Sources Consulted
- AWS EBS General Purpose SSD documentation — https://docs.aws.amazon.com/ebs/latest/userguide/general-purpose.html
- AWS EBS Provisioned IOPS SSD (io2) documentation — https://docs.aws.amazon.com/ebs/latest/userguide/provisioned-iops.html
- AWS EBS pricing — https://aws.amazon.com/ebs/pricing/
- AWS gp3 performance increase announcement (2025) — https://aws.amazon.com/about-aws/whats-new/2025/09/amazon-ebs-size-provisioned-performance-gp3-volumes/
- Robust Perception, "Understanding Machine CPU usage" — https://www.robustperception.io/understanding-machine-cpu-usage/
- Kubernetes system metrics documentation — https://kubernetes.io/docs/concepts/cluster-administration/system-metrics/
- kube-state-metrics and cAdvisor metric reference docs

## Issues Found
No technical issues found. Specifically verified:
- PromQL CPU utilization query `100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)` matches the standard node_exporter idiom.
- Memory used % formula `(MemTotal - MemAvailable) / MemTotal * 100` is the standard Linux/node_exporter convention.
- Kubernetes metric names (`kube_pod_container_resource_requests`, `container_cpu_usage_seconds_total`) are correct.
- EBS gp3 baseline of 3,000 IOPS and 125 MB/s is correct.
- gp3 being ~20% cheaper than gp2 ($0.08 vs $0.10/GiB-month) is correct.
- io2 Block Express maximums (256,000 IOPS / 4,000 MB/s) are correct.
- TypeScript code is syntactically reasonable; percentile, standard deviation, and linear-regression growth-rate helpers compute as described.

## Review Notes
- The io2→gp3 switching threshold in `analyzeVolumeType` uses peak IOPS < 16,000 and peak throughput < 500 MB/s. These are conservative thresholds — gp3 was upgraded in September 2025 to support up to 80,000 IOPS and 2,000 MB/s, so the recommendation engine could be more aggressive in identifying io2→gp3 candidates. The current values remain technically safe (any volume below these thresholds is well within gp3 capacity) and the post doesn't claim these are gp3's maximums, so no fix was applied.
- Several types referenced in the TypeScript snippets (e.g., `ThresholdConfig`, `CPUAnalysisResult`/`MemoryAnalysisResult` imports in `right-sizing-engine.ts`, the `PrometheusClient` module) are not defined inline. This is typical for illustrative blog snippets and is consistent throughout the post.
- The `ReturnType<typeof this.analyzeIOPS>` pattern used in `analyzeVolumeType` works in modern TypeScript (4.x+) but is unusual style; readers porting to older toolchains may need to extract explicit interface types.
- The working-set memory calculation (`used - cached - buffers`) is a traditional approximation. Modern node_exporter exposes `MemAvailable_bytes`, which the kernel computes more accurately. The post uses `MemAvailable` in the Prometheus alert rule, so both approaches are represented and both are defensible.
- Memory `calculateGrowthRate` returns `(slope * n) / series[0]`, which divides by the first sample. If the first sample is 0, the result is `Infinity`. Acceptable for illustrative code but worth guarding in production.
