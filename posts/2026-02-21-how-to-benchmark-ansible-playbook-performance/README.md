# How to Benchmark Ansible Playbook Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Benchmarking, Performance, DevOps

Description: Build a systematic approach to benchmarking Ansible playbook performance with repeatable tests, metrics collection, and comparison tools.

---

Performance optimization without measurement is just guessing. Before you tune Ansible settings, change strategies, or enable caching, you need a baseline. And after making changes, you need a reliable way to compare results. This post covers how to build a systematic benchmarking process for Ansible playbooks, from simple timing to comprehensive performance profiles.

## Setting Up a Benchmark Framework

A good benchmark needs to be:
- Repeatable: same conditions every time
- Measurable: captures specific metrics
- Comparable: easy to compare before/after results

Start with a benchmark wrapper script:

```bash
#!/bin/bash
# benchmark.sh - Ansible playbook benchmarking tool

PLAYBOOK="${1:?Usage: $0 <playbook> [label]}"
LABEL="${2:-default}"
RESULTS_DIR="/var/log/ansible/benchmarks"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
RESULT_FILE="$RESULTS_DIR/${LABEL}-${TIMESTAMP}.json"

mkdir -p "$RESULTS_DIR"

# Capture system state before run
CPUS=$(nproc)
MEM_TOTAL=$(free -m | awk '/Mem:/ {print $2}')
MEM_FREE=$(free -m | awk '/Mem:/ {print $4}')
LOAD=$(cat /proc/loadavg | awk '{print $1}')

# Run the playbook with profiling
START_EPOCH=$(date +%s)
OUTPUT=$(ANSIBLE_CALLBACKS_ENABLED=profile_tasks,timer \
    ansible-playbook "$PLAYBOOK" 2>&1)
EXIT_CODE=$?
END_EPOCH=$(date +%s)
DURATION=$((END_EPOCH - START_EPOCH))

# Extract profiling data
TIMER_LINE=$(echo "$OUTPUT" | grep "Playbook run took")
TOP_TASKS=$(echo "$OUTPUT" | grep -E "^.+---+\s+[0-9]+\.[0-9]+s$" | head -10)

# Count results
OK_COUNT=$(echo "$OUTPUT" | grep -c "ok:")
CHANGED_COUNT=$(echo "$OUTPUT" | grep -c "changed:")
FAILED_COUNT=$(echo "$OUTPUT" | grep -c "failed:")

# Save structured results
cat > "$RESULT_FILE" << EOF
{
    "timestamp": "$TIMESTAMP",
    "playbook": "$PLAYBOOK",
    "label": "$LABEL",
    "duration_seconds": $DURATION,
    "exit_code": $EXIT_CODE,
    "system": {
        "cpus": $CPUS,
        "memory_total_mb": $MEM_TOTAL,
        "memory_free_mb": $MEM_FREE,
        "load_average": $LOAD
    },
    "results": {
        "ok": $OK_COUNT,
        "changed": $CHANGED_COUNT,
        "failed": $FAILED_COUNT
    },
    "timer": "$(echo "$TIMER_LINE" | tr -d '\n')"
}
EOF

echo "Benchmark completed: ${DURATION}s (exit code: $EXIT_CODE)"
echo "Results saved to: $RESULT_FILE"
```

## Creating a Standard Benchmark Playbook

Create a playbook specifically designed for benchmarking:

```yaml
---
# benchmark-playbook.yml - Standard benchmark with diverse task types
- hosts: all
  gather_facts: true
  tasks:
    # Category: Fact gathering (measured by profile_tasks)
    # This is the implicit Gathering Facts task

    # Category: Simple commands
    - name: "BENCH: Simple command execution"
      command: hostname
      changed_when: false

    - name: "BENCH: Command with output"
      command: uname -a
      register: uname_result
      changed_when: false

    # Category: File operations
    - name: "BENCH: Create test directory"
      file:
        path: /tmp/ansible-benchmark
        state: directory
        mode: '0755'

    - name: "BENCH: Write small file"
      copy:
        content: "benchmark test content"
        dest: /tmp/ansible-benchmark/small.txt
        mode: '0644'

    - name: "BENCH: Write medium file"
      copy:
        content: "{{ 'x' * 10000 }}"
        dest: /tmp/ansible-benchmark/medium.txt
        mode: '0644'

    # Category: Template rendering
    - name: "BENCH: Render simple template"
      template:
        src: benchmark-simple.j2
        dest: /tmp/ansible-benchmark/rendered.conf

    # Category: Package query (read-only)
    - name: "BENCH: Query package status"
      command: dpkg -l nginx
      register: pkg_check
      changed_when: false
      failed_when: false

    # Category: Service query (read-only)
    - name: "BENCH: Query service status"
      command: systemctl is-active sshd
      register: svc_check
      changed_when: false
      failed_when: false

    # Category: Stat operations
    - name: "BENCH: Stat multiple files"
      stat:
        path: "{{ item }}"
      loop:
        - /etc/hostname
        - /etc/passwd
        - /etc/ssh/sshd_config
      register: stat_results

    # Category: Cleanup
    - name: "BENCH: Cleanup test files"
      file:
        path: /tmp/ansible-benchmark
        state: absent
```

The benchmark template:

```jinja2
{# benchmark-simple.j2 #}
# Benchmark configuration
# Generated for {{ ansible_hostname }}
# OS: {{ ansible_distribution }} {{ ansible_distribution_version }}
# CPUs: {{ ansible_processor_vcpus }}
# Memory: {{ ansible_memtotal_mb }} MB

[system]
hostname = {{ ansible_fqdn }}
ip_address = {{ ansible_default_ipv4.address }}
```

## Running A/B Benchmarks

Compare two configurations by running the benchmark with each:

```bash
#!/bin/bash
# ab-benchmark.sh - Compare two Ansible configurations

PLAYBOOK="benchmark-playbook.yml"
RUNS=3  # Number of runs per configuration

echo "=== Configuration A: Default settings ==="
for i in $(seq 1 $RUNS); do
    echo "Run $i/$RUNS"
    ANSIBLE_CONFIG=ansible-config-a.cfg ./benchmark.sh "$PLAYBOOK" "config-a-run-$i"
done

echo ""
echo "=== Configuration B: Optimized settings ==="
for i in $(seq 1 $RUNS); do
    echo "Run $i/$RUNS"
    ANSIBLE_CONFIG=ansible-config-b.cfg ./benchmark.sh "$PLAYBOOK" "config-b-run-$i"
done

echo ""
echo "=== Results ==="
echo "Config A:"
for f in /var/log/ansible/benchmarks/config-a-*.json; do
    python3 -c "import json; d=json.load(open('$f')); print(f\"  {d['duration_seconds']}s\")"
done

echo "Config B:"
for f in /var/log/ansible/benchmarks/config-b-*.json; do
    python3 -c "import json; d=json.load(open('$f')); print(f\"  {d['duration_seconds']}s\")"
done
```

Create the two configuration files:

```ini
# ansible-config-a.cfg - Default settings (baseline)
[defaults]
forks = 5
gathering = implicit

[ssh_connection]
pipelining = False
```

```ini
# ansible-config-b.cfg - Optimized settings
[defaults]
forks = 50
gathering = smart
fact_caching = jsonfile
fact_caching_connection = /tmp/ansible_fact_cache
fact_caching_timeout = 86400

[ssh_connection]
pipelining = True
ssh_args = -o ControlMaster=auto -o ControlPersist=300s -o ControlPath=/tmp/ansible-cp-%C
```

## Benchmarking Specific Settings

Test the impact of individual settings by changing one at a time:

```bash
#!/bin/bash
# benchmark-individual-settings.sh - Test each optimization independently

PLAYBOOK="benchmark-playbook.yml"
BASE_CONFIG="ansible-base.cfg"

# Test 1: Forks
echo "=== Fork count impact ==="
for forks in 5 10 25 50 100; do
    ANSIBLE_FORKS=$forks ANSIBLE_CONFIG=$BASE_CONFIG \
        time ansible-playbook "$PLAYBOOK" 2>/dev/null
done

# Test 2: Pipelining
echo "=== Pipelining impact ==="
for pipe in False True; do
    ANSIBLE_PIPELINING=$pipe ANSIBLE_CONFIG=$BASE_CONFIG \
        time ansible-playbook "$PLAYBOOK" 2>/dev/null
done

# Test 3: Gathering
echo "=== Fact gathering impact ==="
for gather in implicit smart explicit; do
    ANSIBLE_GATHERING=$gather ANSIBLE_CONFIG=$BASE_CONFIG \
        time ansible-playbook "$PLAYBOOK" 2>/dev/null
done

# Test 4: Strategy
echo "=== Strategy impact ==="
for strategy in linear free host_pinned; do
    ANSIBLE_STRATEGY=$strategy ANSIBLE_CONFIG=$BASE_CONFIG \
        time ansible-playbook "$PLAYBOOK" 2>/dev/null
done
```

## Collecting Metrics with Callback Plugins

Build a custom callback plugin that collects detailed metrics:

```python
# callback_plugins/benchmark_collector.py
import json
import time
import os
from ansible.plugins.callback import CallbackBase


class CallbackModule(CallbackBase):
    CALLBACK_VERSION = 2.0
    CALLBACK_TYPE = 'aggregate'
    CALLBACK_NAME = 'benchmark_collector'

    def __init__(self):
        super(CallbackModule, self).__init__()
        self.start_time = None
        self.task_timings = []
        self.current_task_start = None
        self.current_task_name = None

    def v2_playbook_on_start(self, playbook):
        self.start_time = time.time()

    def v2_playbook_on_task_start(self, task, is_conditional):
        self.current_task_start = time.time()
        self.current_task_name = task.get_name()

    def v2_runner_on_ok(self, result):
        if self.current_task_start:
            elapsed = time.time() - self.current_task_start
            self.task_timings.append({
                'task': self.current_task_name,
                'host': result._host.get_name(),
                'elapsed': round(elapsed, 3),
                'status': 'ok',
                'changed': result._result.get('changed', False)
            })

    def v2_runner_on_failed(self, result, ignore_errors=False):
        if self.current_task_start:
            elapsed = time.time() - self.current_task_start
            self.task_timings.append({
                'task': self.current_task_name,
                'host': result._host.get_name(),
                'elapsed': round(elapsed, 3),
                'status': 'failed'
            })

    def v2_playbook_on_stats(self, stats):
        total_time = time.time() - self.start_time
        output_file = os.environ.get(
            'BENCHMARK_OUTPUT',
            '/tmp/ansible-benchmark-metrics.json'
        )

        metrics = {
            'total_seconds': round(total_time, 3),
            'task_count': len(set(t['task'] for t in self.task_timings)),
            'host_count': len(set(t['host'] for t in self.task_timings)),
            'task_timings': self.task_timings,
            'slowest_tasks': sorted(
                self.task_timings,
                key=lambda x: x['elapsed'],
                reverse=True
            )[:10]
        }

        with open(output_file, 'w') as f:
            json.dump(metrics, f, indent=2)

        self._display.display("Benchmark metrics saved to: %s" % output_file)
```

Use it:

```bash
# Collect detailed benchmark metrics
ANSIBLE_CALLBACKS_ENABLED=benchmark_collector \
BENCHMARK_OUTPUT=/tmp/benchmark-run-1.json \
ansible-playbook benchmark-playbook.yml
```

## Analyzing Results

Create a comparison tool:

```bash
#!/bin/bash
# compare-benchmarks.sh - Compare two benchmark result files

FILE_A="${1:?Usage: $0 <result-a.json> <result-b.json>}"
FILE_B="${2:?Usage: $0 <result-a.json> <result-b.json>}"

python3 << 'PYTHON'
import json
import sys

with open(sys.argv[1]) as f:
    a = json.load(f)
with open(sys.argv[2]) as f:
    b = json.load(f)

print("=== Benchmark Comparison ===")
print(f"{'Metric':<30} {'A':>10} {'B':>10} {'Diff':>10} {'%':>8}")
print("-" * 70)

time_a = a['total_seconds']
time_b = b['total_seconds']
diff = time_b - time_a
pct = ((time_b - time_a) / time_a) * 100

print(f"{'Total time (seconds)':<30} {time_a:>10.1f} {time_b:>10.1f} {diff:>+10.1f} {pct:>+7.1f}%")

print(f"\n{'Top 5 Slowest Tasks (A)':}")
for t in a.get('slowest_tasks', [])[:5]:
    print(f"  {t['task']:<50} {t['elapsed']:.3f}s")

print(f"\n{'Top 5 Slowest Tasks (B)':}")
for t in b.get('slowest_tasks', [])[:5]:
    print(f"  {t['task']:<50} {t['elapsed']:.3f}s")
PYTHON
```

Run it:

```bash
./compare-benchmarks.sh /tmp/benchmark-baseline.json /tmp/benchmark-optimized.json
```

## Continuous Benchmarking in CI/CD

Integrate benchmarking into your CI/CD pipeline:

```yaml
# .github/workflows/ansible-benchmark.yml
name: Ansible Performance Benchmark
on:
  push:
    paths:
      - '**.yml'
      - 'ansible.cfg'
      - 'roles/**'

jobs:
  benchmark:
    runs-on: self-hosted
    steps:
      - uses: actions/checkout@v4

      - name: Run benchmark
        run: |
          ANSIBLE_CALLBACKS_ENABLED=profile_tasks,timer \
          ansible-playbook benchmark-playbook.yml \
          2>&1 | tee benchmark-output.txt

      - name: Extract timing
        run: |
          DURATION=$(grep "Playbook run took" benchmark-output.txt | \
            grep -oP '\d+ minutes, \d+ seconds')
          echo "Duration: $DURATION"

      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: benchmark-results
          path: benchmark-output.txt
```

## Statistical Significance

Single benchmark runs are unreliable. Always run multiple iterations and look at averages:

```bash
#!/bin/bash
# statistical-benchmark.sh - Run multiple iterations for reliable results

PLAYBOOK="$1"
ITERATIONS=5
TIMES=()

for i in $(seq 1 $ITERATIONS); do
    echo "Iteration $i/$ITERATIONS..."

    # Clear caches between runs for fair comparison
    rm -rf /tmp/ansible_fact_cache/* 2>/dev/null

    START=$(date +%s)
    ansible-playbook "$PLAYBOOK" > /dev/null 2>&1
    END=$(date +%s)
    DURATION=$((END - START))

    TIMES+=($DURATION)
    echo "  Duration: ${DURATION}s"
done

# Calculate statistics
python3 << PYTHON
import statistics
times = [${TIMES[@]}]
print(f"\n=== Results over {len(times)} runs ===")
print(f"Min:    {min(times)}s")
print(f"Max:    {max(times)}s")
print(f"Mean:   {statistics.mean(times):.1f}s")
print(f"Median: {statistics.median(times):.1f}s")
if len(times) > 1:
    print(f"Stdev:  {statistics.stdev(times):.1f}s")
PYTHON
```

Running at least 3-5 iterations and using the median (not the mean) gives you reliable results that account for variance in network latency, disk I/O, and background system load.

Benchmarking is not glamorous work, but it is the foundation of effective performance optimization. Without proper benchmarks, you cannot tell whether your changes actually helped or if you just got lucky with network conditions on that particular run. Build a repeatable benchmarking process, track results over time, and let the data guide your optimization decisions.
