# How to Test Kubernetes Horizontal Pod Autoscaler Behavior Under Simulated Load

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Testing, Autoscaling

Description: Learn how to systematically test Kubernetes Horizontal Pod Autoscaler configurations using simulated load patterns to verify scaling behavior, response times, and resource efficiency before production deployment.

---

The Horizontal Pod Autoscaler is critical infrastructure for Kubernetes applications that need to handle variable load. However, HPA configurations are often deployed to production without thorough testing, leading to unexpected behavior during traffic spikes. Pods might scale too slowly, too aggressively, or not at all, causing performance issues or wasted resources.

Testing HPA behavior requires more than just applying a configuration and hoping it works. You need to simulate realistic load patterns, measure scaling response times, verify that metrics are collected correctly, and ensure the system stabilizes after scaling events. In this guide, you'll learn how to comprehensively test HPA configurations before they reach production.

## Understanding HPA Testing Requirements

Effective HPA testing validates several aspects of autoscaling behavior. You need to verify that the metrics server correctly reports resource utilization, HPA scales up when load increases, HPA scales down when load decreases, scaling doesn't oscillate or thrash, and the system maintains acceptable performance during scaling events.

You also need to test different load patterns including gradual increases that test normal scaling, sudden spikes that test rapid response, sustained high load that tests stability at maximum scale, and gradual decreases that test scale-down behavior.

Testing should cover both CPU-based and custom metrics-based scaling, as well as multiple metric scenarios where HPA uses the highest scaling recommendation.

## Setting Up a Test Application

Create a simple application that allows you to control resource usage for testing:

```go
// main.go
package main

import (
    "fmt"
    "log"
    "net/http"
    "os"
    "runtime"
    "strconv"
    "sync"
    "time"
)

var (
    cpuLoad    float64
    loadMutex  sync.RWMutex
    stopChan   chan bool
)

func main() {
    // Initialize
    cpuLoad = 0
    stopChan = make(chan bool)

    // Start CPU load generator
    go generateCPULoad()

    // HTTP handlers
    http.HandleFunc("/load", handleLoad)
    http.HandleFunc("/health", handleHealth)
    http.HandleFunc("/metrics", handleMetrics)

    // Start server
    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }

    log.Printf("Starting server on port %s", port)
    log.Fatal(http.ListenAndServe(":"+port, nil))
}

func handleLoad(w http.ResponseWriter, r *http.Request) {
    if r.Method == "POST" {
        loadStr := r.URL.Query().Get("cpu")
        if loadStr == "" {
            http.Error(w, "cpu parameter required", http.StatusBadRequest)
            return
        }

        load, err := strconv.ParseFloat(loadStr, 64)
        if err != nil || load < 0 || load > 100 {
            http.Error(w, "cpu must be between 0 and 100", http.StatusBadRequest)
            return
        }

        loadMutex.Lock()
        cpuLoad = load
        loadMutex.Unlock()

        fmt.Fprintf(w, "CPU load set to %.1f%%\n", load)
        return
    }

    loadMutex.RLock()
    current := cpuLoad
    loadMutex.RUnlock()

    fmt.Fprintf(w, "Current CPU load: %.1f%%\n", current)
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(http.StatusOK)
    fmt.Fprintln(w, "OK")
}

func handleMetrics(w http.ResponseWriter, r *http.Request) {
    // Simple metrics endpoint
    loadMutex.RLock()
    current := cpuLoad
    loadMutex.RUnlock()

    var m runtime.MemStats
    runtime.ReadMemStats(&m)

    fmt.Fprintf(w, "# HELP cpu_load_target Target CPU load percentage\n")
    fmt.Fprintf(w, "# TYPE cpu_load_target gauge\n")
    fmt.Fprintf(w, "cpu_load_target %.2f\n", current)
}

func generateCPULoad() {
    numCPU := runtime.NumCPU()
    runtime.GOMAXPROCS(numCPU)

    for i := 0; i < numCPU; i++ {
        go func() {
            for {
                select {
                case <-stopChan:
                    return
                default:
                    loadMutex.RLock()
                    target := cpuLoad
                    loadMutex.RUnlock()

                    if target > 0 {
                        // Burn CPU for a percentage of time
                        workTime := time.Duration(target*10) * time.Millisecond
                        sleepTime := time.Duration((100-target)*10) * time.Millisecond

                        start := time.Now()
                        for time.Since(start) < workTime {
                            // CPU intensive work
                            _ = 0
                        }
                        time.Sleep(sleepTime)
                    } else {
                        time.Sleep(100 * time.Millisecond)
                    }
                }
            }
        }()
    }
}
```

Deploy the test application with HPA configuration:

```yaml
# test-app-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hpa-test-app
  namespace: hpa-testing
spec:
  replicas: 2
  selector:
    matchLabels:
      app: hpa-test-app
  template:
    metadata:
      labels:
        app: hpa-test-app
    spec:
      containers:
      - name: app
        image: hpa-test-app:latest
        ports:
        - containerPort: 8080
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 3
---
apiVersion: v1
kind: Service
metadata:
  name: hpa-test-app
  namespace: hpa-testing
spec:
  selector:
    app: hpa-test-app
  ports:
  - port: 80
    targetPort: 8080
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: hpa-test-app
  namespace: hpa-testing
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: hpa-test-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 50
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
      - type: Pods
        value: 4
        periodSeconds: 15
      selectPolicy: Max
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 15
```

## Creating HPA Test Scenarios

Build a test framework to systematically test HPA behavior:

```python
#!/usr/bin/env python3
# hpa_test_runner.py

import subprocess
import requests
import time
import json
from datetime import datetime
from typing import Dict, List

class HPATestRunner:
    """Test HPA behavior under different load patterns."""

    def __init__(self, app_url: str, namespace: str, deployment: str):
        self.app_url = app_url.rstrip('/')
        self.namespace = namespace
        self.deployment = deployment
        self.results = []

    def get_pod_count(self) -> int:
        """Get current number of pods."""
        cmd = [
            'kubectl', 'get', 'deployment', self.deployment,
            '-n', self.namespace,
            '-o', 'jsonpath={.status.replicas}'
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        return int(result.stdout.strip() or '0')

    def get_hpa_status(self) -> Dict:
        """Get HPA current status."""
        cmd = [
            'kubectl', 'get', 'hpa', self.deployment,
            '-n', self.namespace,
            '-o', 'json'
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        return json.loads(result.stdout)

    def set_cpu_load(self, percentage: float):
        """Set CPU load for all pods."""
        pods = self.get_pod_ips()
        for pod_ip in pods:
            try:
                requests.post(
                    f"http://{pod_ip}:8080/load?cpu={percentage}",
                    timeout=5
                )
            except Exception as e:
                print(f"Warning: Failed to set load for {pod_ip}: {e}")

    def get_pod_ips(self) -> List[str]:
        """Get IPs of all pods."""
        cmd = [
            'kubectl', 'get', 'pods',
            '-n', self.namespace,
            '-l', f'app={self.deployment}',
            '-o', 'jsonpath={.items[*].status.podIP}'
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        return result.stdout.strip().split()

    def wait_for_stable(self, timeout: int = 300) -> bool:
        """Wait for HPA to stabilize."""
        start = time.time()
        last_count = self.get_pod_count()
        stable_time = 0

        while time.time() - start < timeout:
            time.sleep(10)
            current_count = self.get_pod_count()

            if current_count == last_count:
                stable_time += 10
                if stable_time >= 60:  # Stable for 1 minute
                    return True
            else:
                stable_time = 0
                last_count = current_count

        return False

    def test_scale_up_gradual(self) -> Dict:
        """Test gradual scale up behavior."""
        print("\n=== Testing Gradual Scale Up ===")

        test_result = {
            'test': 'gradual_scale_up',
            'start_time': datetime.now().isoformat(),
            'events': []
        }

        # Start with low load
        initial_pods = self.get_pod_count()
        test_result['initial_pods'] = initial_pods

        # Gradually increase load
        for cpu in [20, 40, 60, 80]:
            print(f"Setting CPU load to {cpu}%")
            self.set_cpu_load(cpu)

            event = {
                'timestamp': datetime.now().isoformat(),
                'cpu_load': cpu,
                'pod_count': self.get_pod_count()
            }

            # Wait and observe
            time.sleep(60)

            event['pod_count_after'] = self.get_pod_count()
            event['hpa_status'] = self.get_hpa_status()
            test_result['events'].append(event)

            print(f"Pods: {event['pod_count']} -> {event['pod_count_after']}")

        # Wait for stabilization
        print("Waiting for stabilization...")
        self.wait_for_stable()

        test_result['final_pods'] = self.get_pod_count()
        test_result['end_time'] = datetime.now().isoformat()

        return test_result

    def test_scale_up_spike(self) -> Dict:
        """Test sudden spike behavior."""
        print("\n=== Testing Sudden Spike ===")

        test_result = {
            'test': 'sudden_spike',
            'start_time': datetime.now().isoformat(),
            'events': []
        }

        initial_pods = self.get_pod_count()
        test_result['initial_pods'] = initial_pods

        # Sudden spike to 90% CPU
        print("Triggering sudden spike to 90% CPU")
        self.set_cpu_load(90)

        # Monitor scaling response
        for i in range(20):  # Monitor for 5 minutes
            event = {
                'timestamp': datetime.now().isoformat(),
                'elapsed_seconds': i * 15,
                'pod_count': self.get_pod_count(),
                'hpa_status': self.get_hpa_status()
            }
            test_result['events'].append(event)

            print(f"T+{i*15}s: {event['pod_count']} pods")
            time.sleep(15)

        test_result['final_pods'] = self.get_pod_count()
        test_result['end_time'] = datetime.now().isoformat()

        return test_result

    def test_scale_down(self) -> Dict:
        """Test scale down behavior."""
        print("\n=== Testing Scale Down ===")

        test_result = {
            'test': 'scale_down',
            'start_time': datetime.now().isoformat(),
            'events': []
        }

        # Ensure we're at high load first
        print("Setting high load...")
        self.set_cpu_load(80)
        time.sleep(120)

        initial_pods = self.get_pod_count()
        test_result['initial_pods'] = initial_pods

        # Drop load
        print("Dropping load to 10%")
        self.set_cpu_load(10)

        # Monitor scale down
        for i in range(30):  # Monitor for 7.5 minutes
            event = {
                'timestamp': datetime.now().isoformat(),
                'elapsed_seconds': i * 15,
                'pod_count': self.get_pod_count()
            }
            test_result['events'].append(event)

            print(f"T+{i*15}s: {event['pod_count']} pods")
            time.sleep(15)

        test_result['final_pods'] = self.get_pod_count()
        test_result['end_time'] = datetime.now().isoformat()

        return test_result

    def test_oscillation_prevention(self) -> Dict:
        """Test that HPA doesn't oscillate."""
        print("\n=== Testing Oscillation Prevention ===")

        test_result = {
            'test': 'oscillation_prevention',
            'start_time': datetime.now().isoformat(),
            'events': []
        }

        # Fluctuating load pattern
        load_pattern = [50, 55, 45, 52, 48, 54, 46, 51, 49, 53]

        for i, load in enumerate(load_pattern):
            print(f"Cycle {i+1}: Setting load to {load}%")
            self.set_cpu_load(load)

            event = {
                'timestamp': datetime.now().isoformat(),
                'cycle': i + 1,
                'cpu_load': load,
                'pod_count_before': self.get_pod_count()
            }

            time.sleep(30)

            event['pod_count_after'] = self.get_pod_count()
            test_result['events'].append(event)

            # Check for oscillation
            if i > 0:
                prev_count = test_result['events'][i-1]['pod_count_after']
                curr_count = event['pod_count_after']
                if prev_count != curr_count:
                    print(f"  Warning: Pod count changed {prev_count} -> {curr_count}")

        test_result['end_time'] = datetime.now().isoformat()

        return test_result

    def run_all_tests(self):
        """Run all HPA tests."""
        print("Starting HPA Test Suite")
        print("=" * 50)

        # Reset state
        print("Resetting to baseline...")
        self.set_cpu_load(0)
        time.sleep(60)

        # Run tests
        self.results.append(self.test_scale_up_gradual())
        self.results.append(self.test_scale_up_spike())
        self.results.append(self.test_scale_down())
        self.results.append(self.test_oscillation_prevention())

        # Save results
        with open('hpa_test_results.json', 'w') as f:
            json.dump(self.results, f, indent=2)

        print("\n" + "=" * 50)
        print("All tests completed. Results saved to hpa_test_results.json")

if __name__ == '__main__':
    runner = HPATestRunner(
        app_url='http://hpa-test-app.hpa-testing.svc.cluster.local',
        namespace='hpa-testing',
        deployment='hpa-test-app'
    )

    runner.run_all_tests()
```

## Analyzing HPA Test Results

Create a script to analyze test results and generate reports:

```python
#!/usr/bin/env python3
# analyze_hpa_results.py

import json
from datetime import datetime
from typing import Dict, List

def analyze_scale_up_response(events: List[Dict]) -> Dict:
    """Analyze how quickly HPA responded to load increase."""
    if not events:
        return {}

    initial_pods = events[0]['pod_count']
    final_pods = events[-1]['pod_count_after']

    # Find time to first scale
    time_to_first_scale = None
    for i, event in enumerate(events):
        if event.get('pod_count_after', event['pod_count']) > initial_pods:
            time_to_first_scale = i * 60  # Assuming 60s intervals
            break

    # Calculate scale rate
    total_time = len(events) * 60
    pods_added = final_pods - initial_pods
    scale_rate = pods_added / (total_time / 60) if total_time > 0 else 0

    return {
        'initial_pods': initial_pods,
        'final_pods': final_pods,
        'pods_added': pods_added,
        'time_to_first_scale_seconds': time_to_first_scale,
        'scale_rate_pods_per_minute': round(scale_rate, 2),
        'assessment': 'Good' if time_to_first_scale and time_to_first_scale < 120 else 'Slow'
    }

def analyze_oscillation(events: List[Dict]) -> Dict:
    """Check for oscillating behavior."""
    pod_counts = [e.get('pod_count_after', e.get('pod_count')) for e in events]

    # Count direction changes
    changes = 0
    for i in range(1, len(pod_counts)):
        if i > 1:
            prev_delta = pod_counts[i-1] - pod_counts[i-2]
            curr_delta = pod_counts[i] - pod_counts[i-1]
            if (prev_delta > 0 and curr_delta < 0) or (prev_delta < 0 and curr_delta > 0):
                changes += 1

    oscillating = changes > len(pod_counts) / 3

    return {
        'direction_changes': changes,
        'oscillating': oscillating,
        'assessment': 'Unstable' if oscillating else 'Stable'
    }

def generate_report(results_file: str):
    """Generate comprehensive test report."""
    with open(results_file, 'r') as f:
        results = json.load(f)

    print("\n" + "=" * 70)
    print("HPA TEST REPORT")
    print("=" * 70)

    for result in results:
        print(f"\n### {result['test'].replace('_', ' ').title()} ###")
        print(f"Start: {result['start_time']}")
        print(f"End: {result['end_time']}")
        print(f"Initial Pods: {result.get('initial_pods', 'N/A')}")
        print(f"Final Pods: {result.get('final_pods', 'N/A')}")

        if result['test'] in ['gradual_scale_up', 'sudden_spike']:
            analysis = analyze_scale_up_response(result['events'])
            print(f"\nScale Up Analysis:")
            print(f"  Time to first scale: {analysis.get('time_to_first_scale_seconds')}s")
            print(f"  Pods added: {analysis.get('pods_added')}")
            print(f"  Scale rate: {analysis.get('scale_rate_pods_per_minute')} pods/min")
            print(f"  Assessment: {analysis.get('assessment')}")

        if result['test'] == 'oscillation_prevention':
            analysis = analyze_oscillation(result['events'])
            print(f"\nOscillation Analysis:")
            print(f"  Direction changes: {analysis['direction_changes']}")
            print(f"  Oscillating: {analysis['oscillating']}")
            print(f"  Assessment: {analysis['assessment']}")

    print("\n" + "=" * 70)

if __name__ == '__main__':
    generate_report('hpa_test_results.json')
```

## Automating HPA Testing in CI/CD

Integrate HPA testing into your CI pipeline:

```yaml
# .github/workflows/hpa-test.yaml
name: HPA Testing

on:
  pull_request:
    paths:
    - 'k8s/hpa.yaml'
    - 'k8s/deployment.yaml'

jobs:
  test-hpa:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout code
      uses: actions/checkout@v3

    - name: Set up kubectl
      uses: azure/setup-kubectl@v3

    - name: Create test cluster
      run: |
        kind create cluster --name hpa-test
        kubectl cluster-info

    - name: Install metrics server
      run: |
        kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
        kubectl patch deployment metrics-server -n kube-system \
          --type='json' \
          -p='[{"op": "add", "path": "/spec/template/spec/containers/0/args/-", "value": "--kubelet-insecure-tls"}]'

    - name: Deploy test application
      run: |
        kubectl create namespace hpa-testing
        kubectl apply -f k8s/ -n hpa-testing
        kubectl wait --for=condition=available --timeout=300s \
          deployment/hpa-test-app -n hpa-testing

    - name: Run HPA tests
      run: |
        python3 hpa_test_runner.py

    - name: Analyze results
      run: |
        python3 analyze_hpa_results.py

    - name: Upload test results
      uses: actions/upload-artifact@v3
      with:
        name: hpa-test-results
        path: hpa_test_results.json
```

Systematic HPA testing ensures your autoscaling configuration behaves correctly under various load conditions before reaching production. By simulating realistic traffic patterns, measuring scaling response times, and verifying stability, you can confidently deploy HPA configurations that maintain application performance while optimizing resource utilization.
