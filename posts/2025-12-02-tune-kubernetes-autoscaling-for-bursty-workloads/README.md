# How to Define and Tune Kubernetes Autoscaling for Bursty Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Autoscaling, HPA, VPA, Karpenter, SRE, OneUptime

Description: A hands-on playbook for combining HPA, VPA, and Karpenter (or Cluster Autoscaler) to keep bursty workloads responsive without melting your cloud bill.

---

## Understand the Burst Profile

- **Spike Size**: peak-to-median request ratio (e.g., 8x during game launches).
- **Spike Duration**: seconds vs. minutes dictates cooldown timers.
- **Lead Indicators**: queue depth, Kafka lag, or scheduled campaigns.

Collect this data before touching YAML. Without it, you are tuning blind.

**Example**: A ticketing platform normally serves 300 RPS, but every time a pop star drops tour dates it jumps to 3,000 RPS for 12 minutes. Marketing also sends a push notification five minutes before the sale. That tells you to (a) pre-scale pods five minutes early, (b) keep nodes warm for ~15 minutes, and (c) watch queue depth as the earliest indicator of pain.

---

## Horizontal Pod Autoscaler (HPA)

1. **Right Metrics**
   - Prefer custom metrics (requests per second, queue depth) over CPU for network-bound services.
   - Use OpenTelemetry metrics → Prometheus Adapter → HPA.
2. **Tuning Knobs**
   - `minReplicas`: cover baseline + n for zero-pod cold starts.
   - `maxReplicas`: align with pod disruption budgets and node quotas.
   - `targetAverageValue`: set from load testing, not guesses.
   - `behavior.scaleUp` / `scaleDown`: set stabilization windows (e.g., 0s up, 5m down).
3. **Burst Tricks**
   - Pre-scale before known events via OneUptime runbooks.
   - Use multiple metrics (OR policy) so CPU or queue depth can trigger scale independently.

**Config Example**

The following HPA configuration demonstrates how to handle bursty traffic for a checkout API. It uses dual metrics (queue depth and CPU) to ensure rapid scale-up during traffic spikes while preventing premature scale-down that could leave you under-provisioned for the next surge.

```yaml
apiVersion: autoscaling/v2          # Use v2 API for advanced scaling behaviors
kind: HorizontalPodAutoscaler
metadata:
   name: checkout-api               # Target the checkout-api deployment
spec:
   minReplicas: 6                   # Keep 6 pods warm to handle baseline traffic and avoid cold starts
   maxReplicas: 120                 # Cap at 120 pods to prevent runaway scaling and control costs
   behavior:
      scaleUp:
         stabilizationWindowSeconds: 0    # Scale up immediately without waiting - critical for bursts
         policies:
            - type: Percent
               value: 200                 # Allow doubling pods per minute during spikes
               periodSeconds: 60          # Evaluate scaling every 60 seconds
      scaleDown:
         stabilizationWindowSeconds: 300  # Wait 5 minutes before scaling down to avoid thrashing
   metrics:
      - type: Pods
         pods:
            metric:
               name: queue_depth          # Custom metric from your message queue or job system
            target:
               type: AverageValue
               averageValue: "30"         # Target 30 items per pod - tune based on load testing
      - type: Resource
         resource:
            name: cpu
            target:
               type: AverageUtilization
               averageUtilization: 60     # CPU acts as safety valve if queue metric fails
```

This profile lets queue depth double replicas instantly while CPU acts as a safety valve if the queue metric malfunctions.

---

## Vertical Pod Autoscaler (VPA)

- Run VPA in `Off` mode first to collect recommendations.
- Use VPA for cron/batch workloads where pods live long enough to benefit.
- For spiky web services, use VPA to set accurate requests/limits so HPA signals match actual usage.
- Schedule VPA updates during low traffic; avoid fights between HPA scaling and VPA resizing by pinning min/max requests.

**Scenario**: A nightly ETL job consumes 2 GiB RAM on average but occasionally peaks to 5 GiB when a partner uploads malformed CSVs. VPA (in `Auto` mode) can bump memory requests so the pod stops OOM-killing mid-run, while HPA stays focused on the API fleet that needs rapid horizontal scaling.

This VPA configuration automatically adjusts CPU and memory requests for an ETL workload. By setting min and max bounds, you ensure the autoscaler can respond to memory spikes from malformed data while preventing over-provisioning that wastes cluster resources.

```yaml
apiVersion: autoscaling.k8s.io/v1    # VPA API version for production use
kind: VerticalPodAutoscaler
metadata:
   name: pricing-etl                  # Matches the target deployment name for clarity
spec:
   targetRef:
      apiVersion: apps/v1             # Reference to the Deployment API
      kind: Deployment
      name: pricing-etl               # The deployment VPA will manage
   updatePolicy:
      updateMode: "Auto"              # Automatically restart pods with new resource values
   resourcePolicy:
      containerPolicies:
         - containerName: "etl"       # Target the specific container in the pod
            minAllowed:
               cpu: "500m"            # Floor: never go below 0.5 CPU cores
               memory: "2Gi"          # Floor: 2GB minimum prevents under-provisioning
            maxAllowed:
               cpu: "4"               # Ceiling: cap at 4 CPU cores to control costs
               memory: "8Gi"          # Ceiling: 8GB max handles worst-case CSV processing
```

Pinning `minAllowed`/`maxAllowed` keeps VPA from shrinking so far that the next burst under-provisions the job.

---

## Karpenter or Cluster Autoscaler

1. **Provisioner Strategy**
   - Separate bursty workloads into their own provisioner with higher `consolidationPolicy` thresholds so nodes drain quickly post-spike.
   - Use `requirements` to pin GPU/ARM/spot pools as needed.
2. **Warm Pools**
   - Keep a small pool of standby nodes for sub-minute bursts.
   - For AWS, mix On-Demand base with Spot overflow.
3. **Capacity Buffers**
   - Target 60-70% node utilization so the autoscaler has headroom to place surge pods without waiting for new nodes every time.

**Provisioner Sketch (Karpenter)**

This Karpenter provisioner is optimized for bursty workloads that need rapid node scaling. It constrains instance types to compute-optimized families, enables automatic consolidation to reduce costs after spikes, and sets a short TTL so idle nodes are terminated quickly rather than sitting around charging you money.

```yaml
apiVersion: karpenter.k8s.aws/v1alpha5    # Karpenter's custom API for node provisioning
kind: Provisioner
metadata:
   name: bursty-workloads                  # Dedicated provisioner for spike-prone services
spec:
   consolidation:
      enabled: true                        # Automatically bin-pack and remove underutilized nodes
   providerRef:
      name: burst-ec2                      # Reference to AWS-specific node template
   requirements:
      - key: karpenter.k8s.aws/instance-family
         operator: In
         values: [m6i, c7i]                # Balanced and compute-optimized instances for flexibility
      - key: kubernetes.io/arch
         operator: In
         values: [amd64]                   # Stick to x86_64 for consistent container images
   limits:
      resources:
         cpu: "500"                        # Hard cap: max 500 vCPUs to prevent runaway costs
   ttlSecondsAfterEmpty: 120               # Terminate empty nodes after 2 minutes to save money
```

Provisioners dedicated to bursty services can scale out aggressively yet fold extra nodes within two minutes once demand drops.

---

## Putting It Together

| Layer | Purpose | Tooling |
|-------|---------|---------|
| App | Emit demand signals (RPS, lag) | OpenTelemetry metrics, OneUptime dashboards |
| Pod | Scale replicas within seconds | HPA with custom metrics | 
| Pod Resources | Keep requests realistic | VPA recommendations or cron job |
| Node | Add/remove compute within minutes | Karpenter / Cluster Autoscaler |

Automation flow:
1. HPA sees queue depth spike → requests more pods.
2. Scheduler needs space → Karpenter provisions burst nodes.
3. VPA periodically refines requests so future spikes scale smoothly.

---

## Observability & Testing

- Run load tests that mimic burst shape; log the timeline of HPA decisions.
- Track autoscaling SLIs: time-to-scale, percent of throttled pods, unschedulable pods.
- Use OneUptime to correlate incidents with scaling events (deploy markers + autoscaler logs).
- Alert on HPA hitting `maxReplicas` or nodes stuck in provisioning states.

**Testing Drill**: Reproduce a marketing promotion by replaying 5 minutes of traffic at 10x speed in a staging cluster. Capture HPA events, pod pending durations, and Karpenter node launch times in OneUptime. If time-to-first-new-pod exceeds 45 seconds, adjust warm pools or reduce container image size so pulls finish faster.

---

## Common Pitfalls

- **Cold Start Hell**: minReplicas=0 for APIs. Keep at least N pods warm.
- **Metric Lag**: scraping every 60s makes HPA useless for 10s spikes. Drop scrape interval to 15s.
- **Noisy Metrics**: smooth spiky signals with exponential moving averages before feeding HPA.
- **Pod Affinity Constraints**: if pods require specific nodes, autoscaler may stall; validate scheduling constraints during chaos tests.

---

## Implementation Checklist

1. Capture burst metrics from analytics, message queues, and traffic history.
2. Define custom metrics and expose via OpenTelemetry → Prometheus Adapter.
3. Configure HPA with tuned behaviors and multi-metric triggers.
4. Enable VPA recommendations; apply to batch jobs first, then refine API requests.
5. Configure Karpenter/Cluster Autoscaler provisioners with warm pools and budgets.
6. Create OneUptime dashboards for scaling SLIs and alert on saturation signals.
7. Re-test before big marketing or product launches; pre-scale as needed.

**End-to-End Example**

For a streaming service releasing a new episode at 9 p.m.:
1. OneUptime runbook kicks off at 8:55 p.m., bumping `minReplicas` from 12 → 40 and instructing Karpenter to stand up two extra nodes.
2. At 9:00 p.m., queue depth crosses 30 and HPA scales from 40 → 80 pods in under 45 seconds.
3. Karpenter provisions four more nodes; warm pool covers the first half of the spike, so no pod waits more than 10 seconds.
4. VPA recommendations from last week already raised memory requests, preventing throttling.
5. At 9:20 p.m., traffic settles. Scale-down behavior keeps pods steady for five minutes before reducing replicas and terminating spare nodes.

---

## Final Thoughts

Bursty workloads punish default autoscaling settings. Use data-driven metrics, combine HPA + VPA + intelligent provisioning, and treat scaling events as first-class signals in your observability platform. When each layer reacts within its ideal timescale, spikes become business wins instead of pager storms.
