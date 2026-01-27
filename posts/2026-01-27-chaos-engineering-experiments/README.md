# How to Design Chaos Experiments for Resilience Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Chaos Engineering, Resilience, SRE, Testing, Reliability, Fault Injection, Distributed Systems

Description: Learn how to design chaos engineering experiments to test system resilience, including hypothesis formation, blast radius control, and analysis.

---

> "The best way to have a resilient system is to constantly test it. Chaos engineering is about finding weaknesses before they find you."

---

## What is Chaos Engineering?

Chaos engineering is the practice of intentionally injecting failures into a system to test its resilience. The goal is not to break things for fun - it is to discover weaknesses before they cause real outages.

Netflix pioneered this approach with Chaos Monkey, which randomly terminates instances in production. The principle is simple: if your system cannot handle a server dying, you need to know that now, not during peak traffic.

Key principles:
- Start with a hypothesis about system behavior
- Introduce realistic failures
- Measure the impact
- Limit the blast radius
- Learn and improve

---

## The Steady State Hypothesis

Every chaos experiment starts with defining what "normal" looks like. This is your steady state hypothesis.

**Identify your steady state metrics:**
- Request success rate (e.g., 99.9% of requests return 2xx)
- Response latency (e.g., P95 latency under 200ms)
- Error rate (e.g., less than 0.1% 5xx errors)
- Throughput (e.g., system handles 10,000 requests per second)

**Example hypothesis:**

```yaml
# Steady state hypothesis
name: "Payment service resilience"
hypothesis: "When the payment database replica fails, the system continues processing payments with less than 5% degradation in success rate"

steady_state:
  metrics:
    - name: payment_success_rate
      threshold: ">= 95%"
    - name: p95_latency_ms
      threshold: "<= 500"
    - name: error_rate
      threshold: "<= 5%"
```

Write your hypothesis before the experiment. If you cannot define success criteria, you are not ready to run the experiment.

---

## Designing Experiments

A well-designed chaos experiment follows this structure:

### 1. Define the Scope

```yaml
experiment:
  name: "Database failover test"
  target: "payment-service"
  environment: "staging"  # Start here, not production

  # What are we testing?
  question: "Can the payment service handle database failover?"

  # Expected behavior
  expected_outcome: "Automatic failover to replica within 30 seconds"
```

### 2. Choose the Failure Type

Match the failure to real-world scenarios:

```yaml
failure_types:
  infrastructure:
    - instance_termination
    - availability_zone_failure
    - network_partition

  application:
    - process_crash
    - memory_exhaustion
    - thread_pool_saturation

  dependency:
    - database_unavailable
    - cache_miss_storm
    - third_party_api_timeout
```

### 3. Set Duration and Intensity

```yaml
experiment_parameters:
  # Start small
  duration: "5m"
  intensity: "low"  # 10% of traffic affected

  # Escalation path (only after success at lower levels)
  escalation:
    - duration: "15m", intensity: "medium"  # 30% affected
    - duration: "30m", intensity: "high"    # 50% affected
```

---

## Blast Radius Control

Blast radius is the scope of impact from your experiment. Control it carefully.

### Techniques for Limiting Blast Radius

**1. Target specific instances:**

```bash
# Bad: Kill random instances across all services
chaos-tool terminate --random

# Good: Target specific instance in non-critical path
chaos-tool terminate --instance-id i-abc123 --service payment-service-canary
```

**2. Use feature flags:**

```python
# Route only test traffic through chaos
def process_request(request):
    if feature_flag.is_enabled("chaos_experiment") and is_test_traffic(request):
        apply_chaos_injection(request)
    return normal_processing(request)
```

**3. Implement automatic abort conditions:**

```yaml
abort_conditions:
  # Stop immediately if these thresholds are breached
  - metric: error_rate
    threshold: "> 10%"
    action: "abort_and_rollback"

  - metric: p99_latency_ms
    threshold: "> 2000"
    action: "abort_and_rollback"

  - metric: customer_complaints
    threshold: "> 0"
    action: "abort_and_rollback"
```

**4. Time-box experiments:**

```bash
# Set hard timeout - experiment stops regardless of state
timeout 300 chaos-experiment run --config experiment.yaml

# Or use built-in safeguards
chaos-experiment run \
  --max-duration 5m \
  --auto-rollback true \
  --notify-on-abort team-slack-channel
```

---

## Common Failure Injections

### Network Failures

```bash
# Add latency to network calls
tc qdisc add dev eth0 root netem delay 200ms 50ms

# Simulate packet loss (10%)
tc qdisc add dev eth0 root netem loss 10%

# Simulate network partition
iptables -A INPUT -s 10.0.1.0/24 -j DROP

# DNS failure
echo "127.0.0.1 api.payment-provider.com" >> /etc/hosts
```

**Using chaos tools:**

```yaml
# Litmus Chaos experiment
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: network-chaos
spec:
  engineState: "active"
  chaosServiceAccount: litmus-admin
  experiments:
    - name: pod-network-latency
      spec:
        components:
          env:
            - name: NETWORK_INTERFACE
              value: "eth0"
            - name: NETWORK_LATENCY
              value: "200"  # milliseconds
            - name: TOTAL_CHAOS_DURATION
              value: "300"  # seconds
```

### CPU and Memory Stress

```bash
# CPU stress - consume 80% of available CPU
stress-ng --cpu 4 --cpu-load 80 --timeout 300s

# Memory stress - consume 2GB of memory
stress-ng --vm 1 --vm-bytes 2G --timeout 300s

# Combined stress
stress-ng --cpu 2 --cpu-load 50 --vm 1 --vm-bytes 1G --timeout 300s
```

**Kubernetes example:**

```yaml
# Using Chaos Mesh
apiVersion: chaos-mesh.org/v1alpha1
kind: StressChaos
metadata:
  name: cpu-stress
spec:
  mode: one
  selector:
    namespaces:
      - production
    labelSelectors:
      app: payment-service
  stressors:
    cpu:
      workers: 2
      load: 80
  duration: "5m"
```

### Disk Failures

```bash
# Fill disk to 95% capacity
fallocate -l 50G /tmp/fill_disk.dat

# Simulate slow disk I/O
echo "8:0 rbps=1048576 wbps=1048576" > /sys/fs/cgroup/blkio/blkio.throttle.read_bps_device

# Simulate disk errors (read-only filesystem)
mount -o remount,ro /data
```

### Process Failures

```bash
# Kill specific process
pkill -9 -f "payment-service"

# Kill and prevent restart (temporarily)
pkill -9 -f "payment-service" && \
  mv /usr/bin/payment-service /usr/bin/payment-service.bak

# Simulate OOM kill
echo 1 > /proc/$(pgrep payment-service)/oom_adj && \
  stress-ng --vm 1 --vm-bytes 90%
```

**Container-level:**

```yaml
# Chaos Mesh pod kill
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: pod-kill
spec:
  action: pod-kill
  mode: one
  selector:
    namespaces:
      - production
    labelSelectors:
      app: payment-service
  scheduler:
    cron: "@every 10m"  # Kill one pod every 10 minutes
```

---

## Running Experiments Safely

### Pre-Experiment Checklist

```markdown
## Before Running Chaos Experiment

### Team Readiness
- [ ] On-call engineer is aware and available
- [ ] Rollback procedure documented and tested
- [ ] Communication channel established (Slack, etc.)

### System Readiness
- [ ] Monitoring dashboards open
- [ ] Alerting configured for experiment metrics
- [ ] Auto-abort conditions configured
- [ ] Backup systems verified

### Scope Verification
- [ ] Blast radius confirmed (staging or limited production)
- [ ] Duration and intensity documented
- [ ] Customer impact assessment completed

### Approvals
- [ ] Team lead approval
- [ ] Change management ticket created
- [ ] Stakeholders notified
```

### Safe Execution Pattern

```python
class ChaosExperiment:
    def __init__(self, config):
        self.config = config
        self.abort_conditions = config.abort_conditions
        self.steady_state = None

    def run(self):
        # Step 1: Capture steady state
        self.steady_state = self.capture_steady_state()
        print(f"Steady state captured: {self.steady_state}")

        # Step 2: Start monitoring
        monitor = self.start_continuous_monitoring()

        try:
            # Step 3: Inject failure
            print(f"Injecting failure: {self.config.failure_type}")
            self.inject_failure()

            # Step 4: Observe while checking abort conditions
            while not self.experiment_complete():
                current_state = self.get_current_state()

                if self.should_abort(current_state):
                    print("Abort condition triggered!")
                    break

                time.sleep(self.config.poll_interval)

        finally:
            # Step 5: Always clean up
            print("Cleaning up experiment...")
            self.remove_failure_injection()

            # Step 6: Verify recovery
            self.verify_steady_state_recovery()

        # Step 7: Generate report
        return self.generate_report()

    def should_abort(self, current_state):
        for condition in self.abort_conditions:
            if condition.evaluate(current_state):
                return True
        return False
```

---

## Observing and Measuring Impact

### Key Metrics to Track

```yaml
experiment_metrics:
  # Business metrics
  business:
    - orders_per_minute
    - payment_success_rate
    - cart_abandonment_rate

  # System metrics
  system:
    - request_latency_p50
    - request_latency_p95
    - request_latency_p99
    - error_rate
    - throughput_rps

  # Infrastructure metrics
  infrastructure:
    - cpu_utilization
    - memory_utilization
    - network_io
    - disk_io

  # Recovery metrics
  recovery:
    - time_to_detect_failure
    - time_to_mitigate
    - time_to_full_recovery
```

### Dashboard Setup

```python
# Grafana dashboard query examples

# Track error rate during experiment
error_rate = """
sum(rate(http_requests_total{status=~"5.."}[1m]))
/
sum(rate(http_requests_total[1m]))
* 100
"""

# Track latency percentiles
latency_p99 = """
histogram_quantile(0.99,
  sum(rate(http_request_duration_seconds_bucket[1m])) by (le)
)
"""

# Track recovery time
recovery_metric = """
max(
  timestamp(http_requests_total{status="200"} > 0)
  -
  timestamp(chaos_experiment_start == 1)
)
"""
```

### Alerting During Experiments

```yaml
# Prometheus alert rules for chaos experiments
groups:
  - name: chaos_experiment_alerts
    rules:
      - alert: ChaosExperimentImpactTooHigh
        expr: |
          (
            sum(rate(http_requests_total{status=~"5.."}[1m]))
            /
            sum(rate(http_requests_total[1m]))
          ) > 0.10
          and
          chaos_experiment_running == 1
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Chaos experiment causing excessive errors"
          action: "Abort experiment immediately"
```

---

## Analyzing Results

### Post-Experiment Analysis Template

```markdown
## Chaos Experiment Report

### Experiment Details
- Name: Database Failover Test
- Date: 2026-01-27
- Duration: 15 minutes
- Environment: Staging

### Hypothesis
"When the primary database fails, the system fails over to the replica
within 30 seconds with less than 5% error rate during transition."

### Results

| Metric | Expected | Actual | Status |
|--------|----------|--------|--------|
| Failover time | < 30s | 45s | FAILED |
| Error rate during failover | < 5% | 12% | FAILED |
| Recovery time | < 60s | 90s | FAILED |
| Data loss | 0 | 0 | PASSED |

### Root Cause Analysis
1. Connection pool did not detect dead connections quickly enough
2. Health check interval was too long (30s instead of recommended 5s)
3. No circuit breaker on database calls

### Action Items
- [ ] Reduce health check interval to 5s
- [ ] Implement connection pool validation
- [ ] Add circuit breaker with 10s timeout
- [ ] Re-run experiment after fixes

### Lessons Learned
- Our failover time assumptions were optimistic
- Need better connection pool configuration
- Circuit breakers are not optional for database calls
```

### Metrics Comparison

```python
def analyze_experiment_results(before, during, after):
    """Compare metrics across experiment phases."""

    analysis = {
        "impact": {
            "error_rate_increase": during.error_rate - before.error_rate,
            "latency_increase_p95": during.p95_latency - before.p95_latency,
            "throughput_decrease": before.throughput - during.throughput,
        },
        "recovery": {
            "time_to_detect": during.detection_time - during.failure_time,
            "time_to_mitigate": during.mitigation_time - during.detection_time,
            "time_to_recover": after.recovery_time - during.failure_time,
        },
        "hypothesis_validated": (
            during.error_rate < 0.05 and
            during.p95_latency < 500 and
            after.recovery_time - during.failure_time < 60
        )
    }

    return analysis
```

---

## Automating Chaos

### Continuous Chaos Pipeline

```yaml
# GitLab CI chaos pipeline
stages:
  - test
  - chaos
  - analyze

chaos_experiment:
  stage: chaos
  rules:
    - if: $CI_PIPELINE_SOURCE == "schedule"  # Run on schedule only
  script:
    - chaos-toolkit run experiment.json
  artifacts:
    paths:
      - chaos-report.json
    expire_in: 30 days

analyze_results:
  stage: analyze
  script:
    - python analyze_chaos.py chaos-report.json
    - |
      if [ "$(jq '.hypothesis_validated' chaos-report.json)" == "false" ]; then
        echo "Experiment failed - creating ticket"
        create-jira-ticket --summary "Chaos experiment failed" --file chaos-report.json
      fi
```

### Scheduled Chaos

```yaml
# Kubernetes CronJob for regular chaos
apiVersion: batch/v1
kind: CronJob
metadata:
  name: weekly-chaos
spec:
  schedule: "0 10 * * 2"  # Tuesday 10am
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: chaos-runner
              image: chaos-toolkit:latest
              args:
                - run
                - /experiments/database-failover.json
              env:
                - name: SLACK_WEBHOOK
                  valueFrom:
                    secretKeyRef:
                      name: chaos-secrets
                      key: slack-webhook
          restartPolicy: Never
```

### Game Days

```markdown
## Game Day Planning Template

### Schedule
- Date: First Tuesday of each month
- Duration: 4 hours (10am - 2pm)
- Participants: SRE team, service owners, incident commanders

### Pre-Game Day (1 week before)
- [ ] Select 3-5 experiments to run
- [ ] Notify all stakeholders
- [ ] Verify rollback procedures
- [ ] Prepare monitoring dashboards
- [ ] Brief participants on scenarios

### Game Day Agenda
1. 10:00 - Kickoff and safety briefing
2. 10:30 - Experiment 1 (infrastructure failure)
3. 11:15 - Debrief and document findings
4. 11:45 - Experiment 2 (dependency failure)
5. 12:30 - Lunch break
6. 13:00 - Experiment 3 (cascading failure)
7. 13:45 - Final debrief and action items

### Post-Game Day
- [ ] Document all findings
- [ ] Create tickets for improvements
- [ ] Share learnings with broader team
- [ ] Update runbooks based on discoveries
```

---

## Building a Chaos Culture

### Start Small

```markdown
## Chaos Engineering Maturity Model

### Level 1: Foundational
- Run chaos experiments in development/staging
- Manual execution with careful supervision
- Document findings and share with team

### Level 2: Structured
- Regular scheduled experiments (weekly/monthly)
- Automated abort conditions
- Integration with incident management

### Level 3: Advanced
- Chaos experiments in production (limited blast radius)
- Automated pipelines for common experiments
- Game days with cross-functional teams

### Level 4: Embedded
- Continuous chaos as part of CI/CD
- Self-service chaos for development teams
- Chaos experiments inform architecture decisions
```

### Getting Buy-In

```markdown
## Pitching Chaos Engineering to Leadership

### The Problem
- Outages cost $X per minute in lost revenue
- Last year we had Y hours of downtime
- We discovered Z critical bugs in production

### The Solution
- Proactive failure testing finds issues before customers do
- Controlled experiments are safer than uncontrolled outages
- Each experiment makes the system more resilient

### The Ask
- Start with staging environment (zero customer risk)
- 4 hours per month for game days
- Engineering time to fix discovered issues

### Success Metrics
- Reduced MTTR (mean time to recovery)
- Fewer production incidents
- Faster detection of failures
- Improved runbook accuracy
```

---

## Best Practices Summary

1. **Always start with a hypothesis** - Know what you expect before you inject failure.

2. **Control the blast radius** - Start in staging, then canary, then limited production.

3. **Automate abort conditions** - Never rely on humans to stop a runaway experiment.

4. **Measure everything** - If you cannot measure the impact, you cannot learn from it.

5. **Document and share** - Findings are worthless if they stay in one person's head.

6. **Fix what you find** - Running experiments without fixing issues is just breaking things.

7. **Build gradually** - Chaos engineering maturity takes time. Do not rush to production chaos.

8. **Make it routine** - Sporadic experiments teach less than regular practice.

9. **Include everyone** - Chaos is not just for SREs. Developers should run experiments too.

10. **Celebrate learning** - Finding a weakness is a success, not a failure.

---

## Conclusion

Chaos engineering is not about causing chaos. It is about building confidence through controlled experiments. When you know how your system fails, you can design it to fail gracefully.

Start small: pick one critical service, form a hypothesis, and run a simple experiment in staging. Document what you learn and fix what you find. Over time, build up to regular game days and eventually continuous chaos in production.

The goal is not a system that never fails. The goal is a system that fails gracefully and recovers quickly. Chaos engineering is how you get there.

---

If you need a platform to monitor your chaos experiments and track the impact on your SLOs, check out [OneUptime](https://oneuptime.com). It provides unified observability for logs, metrics, traces, and incident management - everything you need to measure the impact of your chaos experiments.
