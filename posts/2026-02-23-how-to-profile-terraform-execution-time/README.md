# How to Profile Terraform Execution Time

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Profiling, Performance, Debugging, DevOps

Description: Learn how to profile Terraform execution to identify slow operations, measure time spent in each phase, and pinpoint performance bottlenecks.

---

When your Terraform plan takes 10 minutes, you need to know where that time is going. Is it state refresh? Provider API calls? Graph evaluation? Without profiling, optimization is guesswork. With profiling, you can target the exact bottleneck.

Terraform does not have a built-in profiler like some programming languages do, but there are several techniques to get detailed timing information.

## Basic Timing

Start with simple timing to establish a baseline:

```bash
# Time the overall operation

time terraform plan

# Time with more detail (Linux)
/usr/bin/time -v terraform plan 2>&1 | grep -E "wall clock|Maximum resident"

# Time with more detail (macOS)
/usr/bin/time -l terraform plan 2>&1 | grep -E "real|maximum resident"
```

This gives you wall clock time and peak memory usage. Repeat several times to account for variance.

## Phase-by-Phase Timing

Break the Terraform workflow into phases and time each one:

```bash
#!/bin/bash
# profile-terraform.sh
# Time each phase of a Terraform run

now_ms() {
  perl -MTime::HiRes=time -e 'printf "%.0f\n", time() * 1000'
}

echo "=== Profiling Terraform Execution ==="
echo ""

# Phase 1: Init
echo "Phase 1: Init"
start=$(now_ms)
terraform init -input=false > /dev/null 2>&1
end=$(now_ms)
init_ms=$((end - start))
echo "  Init: ${init_ms}ms"

# Phase 2: Plan without refresh (measures graph evaluation + config processing)
echo "Phase 2: Plan (no refresh)"
start=$(now_ms)
terraform plan -refresh=false -input=false > /dev/null 2>&1
end=$(now_ms)
plan_norefresh_ms=$((end - start))
echo "  Plan (no refresh): ${plan_norefresh_ms}ms"

# Phase 3: Plan with refresh (measures state refresh + everything else)
echo "Phase 3: Plan (with refresh)"
start=$(now_ms)
terraform plan -input=false > /dev/null 2>&1
end=$(now_ms)
plan_refresh_ms=$((end - start))
echo "  Plan (with refresh): ${plan_refresh_ms}ms"

# Derived metrics
refresh_ms=$((plan_refresh_ms - plan_norefresh_ms))
echo ""
echo "=== Breakdown ==="
echo "  Init:           ${init_ms}ms"
echo "  Config/Graph:   ${plan_norefresh_ms}ms"
echo "  State Refresh:  ${refresh_ms}ms"
echo "  Total Plan:     ${plan_refresh_ms}ms"
echo ""
if [ "$plan_refresh_ms" -gt 0 ]; then
  echo "  Refresh is $(( refresh_ms * 100 / plan_refresh_ms ))% of total plan time"
fi
```

This tells you if your bottleneck is in initialization, configuration processing, or state refresh. In most large projects, state refresh dominates.

## Using TF_LOG for Detailed Tracing

Terraform's logging provides the most detailed timing information:

```bash
# Enable trace logging
export TF_LOG=TRACE
export TF_LOG_PATH="terraform-trace.log"

# Run the operation
terraform plan

# Analyze the log
```

The trace log includes timestamps for every operation. Here is how to extract useful timing data:

```bash
# Find the start and end of the refresh phase
grep -n "Refreshing state" terraform-trace.log | head -1
grep -n "Refreshing state" terraform-trace.log | tail -1

# Find slow API calls (gaps > 5 seconds between lines)
awk '
  /^[0-9]{4}/ {
    # Parse Terraform log timestamp in the first field, for example:
    # 2026-05-22T10:33:09.123Z
    current = (substr($1, 12, 2) * 3600) + (substr($1, 15, 2) * 60) + substr($1, 18, 2)
    if (prev != "" && current - prev > 5) {
      print prev_line
      print $0
      print "---"
    }
    prev = current
    prev_line = $0
  }
' terraform-trace.log | head -100

# Count API calls by provider
grep -c "HTTP Request" terraform-trace.log
grep "HTTP Request" terraform-trace.log | grep -Eo 'https://[^/ ]+' | sort | uniq -c | sort -rn
```

## Provider-Level Profiling

You can log only provider activity, which is cleaner than full trace logging:

```bash
export TF_LOG_PROVIDER=TRACE

terraform plan 2>provider-trace.log

# Analyze provider-specific timings
grep -Ei "making.*request|received.*response|HTTP Request" provider-trace.log | head -50
```

## Profiling with Go's pprof

Since Terraform is written in Go, you can use Go's built-in profiling tools. This requires building Terraform from source with profiling enabled:

```bash
# This is advanced and usually not necessary
# But for deep debugging, it reveals CPU and memory hotspots

# Clone and build Terraform with profiling
git clone https://github.com/hashicorp/terraform.git
cd terraform

# Instrument a local development build with net/http/pprof or runtime/pprof
# Then build and run your instrumented binary
```

For most users, log-based profiling is sufficient.

## Creating a Profiling Script

Here is a comprehensive profiling script:

```bash
#!/bin/bash
# terraform-profile.sh
# Comprehensive Terraform performance profiling

now_ms() {
  perl -MTime::HiRes=time -e 'printf "%.0f\n", time() * 1000'
}

REPORT_FILE="terraform-profile-$(date +%Y%m%d-%H%M%S).txt"

echo "Terraform Performance Profile" > "$REPORT_FILE"
echo "Date: $(date)" >> "$REPORT_FILE"
echo "Directory: $(pwd)" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# System info
echo "=== System Info ===" >> "$REPORT_FILE"
terraform version >> "$REPORT_FILE" 2>&1
echo "CPU cores: $(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null)" >> "$REPORT_FILE"
echo "Available memory: $(free -h 2>/dev/null | grep Mem | awk '{print $7}' || sysctl -n hw.memsize 2>/dev/null | awk '{print $0/1024/1024/1024 " GB"}')" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Resource count
echo "=== Resource Count ===" >> "$REPORT_FILE"
resource_count=$(terraform state list 2>/dev/null | wc -l | tr -d ' ')
echo "Total resources: $resource_count" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Resource types breakdown
echo "=== Resource Types ===" >> "$REPORT_FILE"
terraform state list 2>/dev/null | sed 's/\[.*$//' | awk -F. '{ for (i = 1; i <= NF; i++) if ($i == "data") { print "data." $(i + 1); next } print $(NF-1) }' | sort | uniq -c | sort -rn | head -20 >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# State file size
echo "=== State Size ===" >> "$REPORT_FILE"
state_size=$(terraform state pull 2>/dev/null | wc -c)
echo "State file size: $((state_size / 1024)) KB" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Timing tests
echo "=== Timing ===" >> "$REPORT_FILE"

# Init time
start=$(now_ms)
terraform init -input=false > /dev/null 2>&1
end=$(now_ms)
echo "Init: $((end - start))ms" >> "$REPORT_FILE"

# Plan without refresh
start=$(now_ms)
terraform plan -refresh=false -input=false > /dev/null 2>&1
end=$(now_ms)
plan_norefresh=$((end - start))
echo "Plan (no refresh): ${plan_norefresh}ms" >> "$REPORT_FILE"

# Plan with refresh
start=$(now_ms)
terraform plan -input=false > /dev/null 2>&1
end=$(now_ms)
plan_refresh=$((end - start))
echo "Plan (with refresh): ${plan_refresh}ms" >> "$REPORT_FILE"

# Derived
refresh_time=$((plan_refresh - plan_norefresh))
echo "State refresh: ${refresh_time}ms" >> "$REPORT_FILE"
if [ "$resource_count" -gt 0 ]; then
  echo "Time per resource (refresh): $((refresh_time / resource_count))ms" >> "$REPORT_FILE"
fi

echo "" >> "$REPORT_FILE"
echo "=== Recommendations ===" >> "$REPORT_FILE"

if [ "$resource_count" -gt 300 ]; then
  echo "- Consider whether splitting state would reduce refresh and plan time for $resource_count resources" >> "$REPORT_FILE"
fi

if [ "$refresh_time" -gt 60000 ]; then
  echo "- State refresh takes over 60s: Consider using -refresh=false for development" >> "$REPORT_FILE"
fi

if [ "$((state_size / 1024 / 1024))" -gt 10 ]; then
  echo "- State file is over 10 MB: Consider splitting or removing unused resources" >> "$REPORT_FILE"
fi

echo ""
echo "Profile saved to $REPORT_FILE"
cat "$REPORT_FILE"
```

## Tracking Performance Over Time

Create a simple tracking system to detect performance regressions:

```bash
#!/bin/bash
# track-performance.sh
# Run periodically (daily or weekly) to track trends

METRICS_FILE="terraform-metrics.csv"

now_ms() {
  perl -MTime::HiRes=time -e 'printf "%.0f\n", time() * 1000'
}

# Create header if file does not exist
if [ ! -f "$METRICS_FILE" ]; then
  echo "date,resources,state_kb,init_ms,plan_norefresh_ms,plan_refresh_ms" > "$METRICS_FILE"
fi

# Collect metrics
resources=$(terraform state list 2>/dev/null | wc -l | tr -d ' ')
state_kb=$(( $(terraform state pull 2>/dev/null | wc -c) / 1024 ))

start=$(now_ms)
terraform init -input=false > /dev/null 2>&1
init_ms=$(( $(now_ms) - start ))

start=$(now_ms)
terraform plan -refresh=false -input=false > /dev/null 2>&1
plan_norefresh_ms=$(( $(now_ms) - start ))

start=$(now_ms)
terraform plan -input=false > /dev/null 2>&1
plan_refresh_ms=$(( $(now_ms) - start ))

# Append to CSV
echo "$(date +%Y-%m-%d),$resources,$state_kb,$init_ms,$plan_norefresh_ms,$plan_refresh_ms" >> "$METRICS_FILE"

echo "Metrics recorded. Current stats:"
echo "  Resources: $resources"
echo "  State size: ${state_kb} KB"
echo "  Plan time: ${plan_refresh_ms}ms"
```

## Interpreting Results

Here is how to interpret common profiling patterns:

**High refresh time, low config time**: Your bottleneck is cloud provider API calls. Solutions: split state, use `-refresh=false`, increase parallelism.

**High config time, low refresh time**: Your bottleneck is HCL evaluation. Solutions: simplify locals, reduce data sources, flatten module nesting.

**High init time**: Your bottleneck is provider downloads. Solutions: use plugin cache, pre-download providers, reduce provider count.

**Consistent slowdown across all phases**: Your state file, backend, or execution environment may be slow. Solution: check backend latency and consider splitting into smaller projects.

## Summary

Profiling Terraform execution turns optimization from guesswork into data-driven improvement. Start with basic timing to identify which phase is slow, then use TF_LOG for detailed analysis. Create a profiling script you can run regularly to track trends. The data will tell you exactly where to focus your optimization effort for maximum impact.

For monitoring the performance of your infrastructure and CI/CD pipelines, [OneUptime](https://oneuptime.com) provides detailed performance tracking and alerting that helps you stay ahead of issues.
