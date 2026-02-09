# How to Implement Soak Tests for Kubernetes Applications Using Locust Distributed Workers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Testing, Performance

Description: Learn how to implement comprehensive soak testing for Kubernetes applications using Locust distributed workers to identify memory leaks, resource degradation, and long-term stability issues.

---

Soak testing, also known as endurance testing, runs your application under sustained load for extended periods to identify issues that only appear over time. Memory leaks, connection pool exhaustion, disk space issues, and gradual performance degradation are problems that standard load tests might miss but soak tests will reveal. For Kubernetes applications, distributed soak testing is essential to simulate realistic production scenarios.

Locust is a powerful load testing framework that supports distributed testing with multiple worker nodes. In this guide, you'll learn how to set up Locust for soak testing Kubernetes applications, deploy distributed workers across your cluster, monitor long-running tests, and analyze results to identify stability issues.

## Understanding Soak Testing Requirements

Soak tests differ from traditional load tests in duration and goals. While load tests typically run for minutes to hours and focus on throughput and response times, soak tests run for days or weeks and focus on stability, resource consumption patterns, and degradation over time.

For Kubernetes applications, soak tests should verify that pods maintain stable memory usage without leaks, connection pools don't become exhausted, disk space remains adequate, CPU usage stays consistent, and performance doesn't degrade over time. You also need to ensure the cluster's autoscaling behaves correctly under sustained load.

Distributed testing is crucial for soak tests because a single client cannot generate enough realistic traffic, and running tests from multiple geographic locations simulates real-world conditions better.

## Setting Up Locust for Distributed Testing

First, create a Locust test file that defines user behavior for your application:

```python
# locustfile.py
from locust import HttpUser, task, between
import random
import json

class APIUser(HttpUser):
    """Simulates user behavior against the API."""

    # Wait 1-3 seconds between requests to simulate real usage
    wait_time = between(1, 3)

    def on_start(self):
        """Called when a user starts - performs login."""
        response = self.client.post("/api/login", json={
            "username": f"user_{random.randint(1, 10000)}",
            "password": "test123"
        })
        if response.status_code == 200:
            self.token = response.json()["token"]
        else:
            self.token = None

    @task(3)
    def get_data(self):
        """Fetch data - most common operation (weight: 3)."""
        if not self.token:
            return

        headers = {"Authorization": f"Bearer {self.token}"}
        self.client.get(
            f"/api/data/{random.randint(1, 1000)}",
            headers=headers,
            name="/api/data/[id]"
        )

    @task(2)
    def list_items(self):
        """List items with pagination (weight: 2)."""
        if not self.token:
            return

        headers = {"Authorization": f"Bearer {self.token}"}
        page = random.randint(1, 100)
        self.client.get(
            f"/api/items?page={page}&limit=20",
            headers=headers,
            name="/api/items"
        )

    @task(1)
    def create_item(self):
        """Create new item - less frequent operation (weight: 1)."""
        if not self.token:
            return

        headers = {"Authorization": f"Bearer {self.token}"}
        data = {
            "title": f"Item {random.randint(1, 100000)}",
            "description": "Test item for soak testing",
            "value": random.randint(1, 1000)
        }
        self.client.post(
            "/api/items",
            headers=headers,
            json=data,
            name="/api/items"
        )

    @task(1)
    def update_item(self):
        """Update existing item."""
        if not self.token:
            return

        headers = {"Authorization": f"Bearer {self.token}"}
        item_id = random.randint(1, 1000)
        data = {"value": random.randint(1, 1000)}
        self.client.patch(
            f"/api/items/{item_id}",
            headers=headers,
            json=data,
            name="/api/items/[id]"
        )

    def on_stop(self):
        """Called when a user stops - cleanup if needed."""
        if self.token:
            headers = {"Authorization": f"Bearer {self.token}"}
            self.client.post("/api/logout", headers=headers)
```

## Deploying Locust Master and Workers in Kubernetes

Create Kubernetes manifests to deploy Locust in distributed mode with one master and multiple workers:

```yaml
# locust-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: locust-config
  namespace: load-testing
data:
  locustfile.py: |
    # Include the locustfile.py content here
    # (Content from above)
---
# locust-master.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: locust-master
  namespace: load-testing
spec:
  replicas: 1
  selector:
    matchLabels:
      app: locust-master
  template:
    metadata:
      labels:
        app: locust-master
    spec:
      containers:
      - name: locust
        image: locustio/locust:2.15.1
        ports:
        - containerPort: 8089
          name: web-ui
        - containerPort: 5557
          name: master-bind
        - containerPort: 5558
          name: master-bind-2
        env:
        - name: LOCUST_MODE
          value: "master"
        - name: LOCUST_EXPECT_WORKERS
          value: "5"  # Expected number of workers
        volumeMounts:
        - name: locust-config
          mountPath: /home/locust
        command:
        - sh
        - -c
        - |
          locust -f /home/locust/locustfile.py \
            --master \
            --host=http://my-app-service.default.svc.cluster.local:8080
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 1000m
            memory: 1Gi
      volumes:
      - name: locust-config
        configMap:
          name: locust-config
---
# locust-master-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: locust-master
  namespace: load-testing
spec:
  type: LoadBalancer
  selector:
    app: locust-master
  ports:
  - name: web-ui
    port: 8089
    targetPort: 8089
  - name: master-bind
    port: 5557
    targetPort: 5557
  - name: master-bind-2
    port: 5558
    targetPort: 5558
---
# locust-workers.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: locust-worker
  namespace: load-testing
spec:
  replicas: 5
  selector:
    matchLabels:
      app: locust-worker
  template:
    metadata:
      labels:
        app: locust-worker
    spec:
      containers:
      - name: locust
        image: locustio/locust:2.15.1
        env:
        - name: LOCUST_MODE
          value: "worker"
        - name: LOCUST_MASTER_NODE_HOST
          value: "locust-master"
        - name: LOCUST_MASTER_NODE_PORT
          value: "5557"
        volumeMounts:
        - name: locust-config
          mountPath: /home/locust
        command:
        - sh
        - -c
        - |
          locust -f /home/locust/locustfile.py \
            --worker \
            --master-host=$(LOCUST_MASTER_NODE_HOST)
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 1000m
            memory: 1Gi
      volumes:
      - name: locust-config
        configMap:
          name: locust-config
```

Deploy the Locust infrastructure:

```bash
# Create namespace
kubectl create namespace load-testing

# Deploy ConfigMap with locustfile
kubectl apply -f locust-configmap.yaml

# Deploy master and workers
kubectl apply -f locust-master.yaml
kubectl apply -f locust-workers.yaml

# Check deployment status
kubectl get pods -n load-testing

# Get master service URL
kubectl get service locust-master -n load-testing
```

## Configuring Soak Test Parameters

Create a script to start soak tests with appropriate parameters:

```python
# start_soak_test.py
import requests
import time
import json
from datetime import datetime, timedelta

class LocustController:
    """Control Locust tests programmatically."""

    def __init__(self, master_url):
        self.master_url = master_url.rstrip('/')
        self.base_url = f"{self.master_url}"

    def start_test(self, user_count, spawn_rate, run_time=None):
        """Start a load test."""
        endpoint = f"{self.base_url}/swarm"

        data = {
            "user_count": user_count,
            "spawn_rate": spawn_rate
        }

        if run_time:
            data["run_time"] = run_time

        response = requests.post(endpoint, data=data)

        if response.status_code == 200:
            print(f"Test started: {user_count} users at {spawn_rate} users/sec")
            if run_time:
                print(f"Will run for: {run_time}")
            return True
        else:
            print(f"Failed to start test: {response.text}")
            return False

    def stop_test(self):
        """Stop the current test."""
        endpoint = f"{self.base_url}/stop"
        response = requests.get(endpoint)
        return response.status_code == 200

    def get_stats(self):
        """Get current test statistics."""
        endpoint = f"{self.base_url}/stats/requests"
        response = requests.get(endpoint)

        if response.status_code == 200:
            return response.json()
        return None

    def monitor_test(self, interval=60):
        """Monitor test progress and print stats."""
        while True:
            stats = self.get_stats()
            if not stats:
                print("No stats available")
                time.sleep(interval)
                continue

            # Print summary
            print(f"\n=== Stats at {datetime.now()} ===")
            print(f"State: {stats.get('state', 'unknown')}")
            print(f"Users: {stats.get('user_count', 0)}")

            # Print request stats
            for stat in stats.get('stats', []):
                if stat['name'] != 'Aggregated':
                    print(f"\n{stat['name']}:")
                    print(f"  Requests: {stat['num_requests']}")
                    print(f"  Failures: {stat['num_failures']}")
                    print(f"  Avg response: {stat['avg_response_time']:.2f}ms")
                    print(f"  RPS: {stat['current_rps']:.2f}")

            time.sleep(interval)

# Configure and start soak test
if __name__ == "__main__":
    # Get Locust master URL from environment or argument
    MASTER_URL = "http://locust-master-url:8089"

    controller = LocustController(MASTER_URL)

    # Start soak test
    # Run with 100 concurrent users, spawning 5 users per second
    # For 7 days (168 hours)
    run_time = "168h"  # Can use "7d", "168h", "10080m"

    if controller.start_test(
        user_count=100,
        spawn_rate=5,
        run_time=run_time
    ):
        print("Soak test started successfully")
        print("Monitoring test progress...")

        try:
            controller.monitor_test(interval=300)  # Check every 5 minutes
        except KeyboardInterrupt:
            print("\nStopping test...")
            controller.stop_test()
```

## Monitoring Soak Test Progress

Set up comprehensive monitoring to track application behavior during soak tests:

```yaml
# prometheus-servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: app-soak-test-monitoring
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: my-app
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics
---
# grafana-dashboard-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: soak-test-dashboard
  namespace: monitoring
data:
  dashboard.json: |
    {
      "dashboard": {
        "title": "Soak Test Monitoring",
        "panels": [
          {
            "title": "Memory Usage Over Time",
            "targets": [
              {
                "expr": "container_memory_usage_bytes{pod=~\"my-app-.*\"}"
              }
            ]
          },
          {
            "title": "CPU Usage Over Time",
            "targets": [
              {
                "expr": "rate(container_cpu_usage_seconds_total{pod=~\"my-app-.*\"}[5m])"
              }
            ]
          },
          {
            "title": "Request Rate",
            "targets": [
              {
                "expr": "rate(http_requests_total[5m])"
              }
            ]
          },
          {
            "title": "Response Time p95",
            "targets": [
              {
                "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
              }
            ]
          }
        ]
      }
    }
```

## Analyzing Soak Test Results

Create a script to analyze results and detect issues:

```python
# analyze_soak_test.py
import requests
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

class SoakTestAnalyzer:
    """Analyze soak test results for stability issues."""

    def __init__(self, prometheus_url):
        self.prometheus_url = prometheus_url

    def query_prometheus(self, query, start, end, step='1m'):
        """Query Prometheus for metrics."""
        params = {
            'query': query,
            'start': start.timestamp(),
            'end': end.timestamp(),
            'step': step
        }

        response = requests.get(
            f"{self.prometheus_url}/api/v1/query_range",
            params=params
        )

        if response.status_code == 200:
            result = response.json()
            return result['data']['result']
        return None

    def detect_memory_leak(self, pod_selector, duration_hours=24):
        """Detect potential memory leaks."""
        end = datetime.now()
        start = end - timedelta(hours=duration_hours)

        query = f'container_memory_usage_bytes{{pod=~"{pod_selector}"}}'
        results = self.query_prometheus(query, start, end)

        if not results:
            return None

        # Analyze memory trend
        for result in results:
            values = [(float(v[1]) for v in result['values'])]
            memory_data = pd.Series(values)

            # Calculate linear regression
            x = np.arange(len(memory_data))
            slope, intercept = np.polyfit(x, memory_data, 1)

            # If slope is positive and significant, possible leak
            if slope > 0:
                growth_rate = (slope * len(memory_data)) / memory_data.iloc[0]
                if growth_rate > 0.1:  # 10% growth over period
                    return {
                        'pod': result['metric']['pod'],
                        'leak_detected': True,
                        'growth_rate': f"{growth_rate*100:.2f}%",
                        'initial_memory': f"{memory_data.iloc[0]/1024/1024:.2f}Mi",
                        'final_memory': f"{memory_data.iloc[-1]/1024/1024:.2f}Mi"
                    }

        return {'leak_detected': False}

    def check_performance_degradation(self, duration_hours=24):
        """Check if response times are degrading."""
        end = datetime.now()
        start = end - timedelta(hours=duration_hours)

        query = 'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))'
        results = self.query_prometheus(query, start, end)

        if not results:
            return None

        values = [float(v[1]) for v in results[0]['values']]
        response_times = pd.Series(values)

        # Compare first and last quartiles
        first_quartile = response_times[:len(response_times)//4].mean()
        last_quartile = response_times[-len(response_times)//4:].mean()

        degradation = (last_quartile - first_quartile) / first_quartile

        return {
            'degraded': degradation > 0.2,  # 20% degradation threshold
            'degradation_pct': f"{degradation*100:.2f}%",
            'initial_p95': f"{first_quartile*1000:.2f}ms",
            'final_p95': f"{last_quartile*1000:.2f}ms"
        }

# Run analysis
if __name__ == "__main__":
    analyzer = SoakTestAnalyzer("http://prometheus:9090")

    # Check for memory leaks
    memory_result = analyzer.detect_memory_leak("my-app-.*", duration_hours=48)
    print("Memory Leak Analysis:")
    print(json.dumps(memory_result, indent=2))

    # Check for performance degradation
    perf_result = analyzer.check_performance_degradation(duration_hours=48)
    print("\nPerformance Degradation Analysis:")
    print(json.dumps(perf_result, indent=2))
```

## Automating Soak Test Execution

Create a CronJob to run regular soak tests:

```yaml
# soak-test-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: weekly-soak-test
  namespace: load-testing
spec:
  schedule: "0 0 * * 0"  # Every Sunday at midnight
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: soak-test-runner
            image: python:3.11-slim
            command:
            - sh
            - -c
            - |
              pip install requests pandas numpy
              python /scripts/start_soak_test.py
              sleep 604800  # Run for 7 days
              python /scripts/analyze_soak_test.py
            volumeMounts:
            - name: scripts
              mountPath: /scripts
            env:
            - name: LOCUST_MASTER_URL
              value: "http://locust-master:8089"
            - name: PROMETHEUS_URL
              value: "http://prometheus:9090"
          volumes:
          - name: scripts
            configMap:
              name: soak-test-scripts
          restartPolicy: OnFailure
```

Soak testing with Locust distributed workers provides comprehensive validation of your Kubernetes application's long-term stability and resource behavior. By running sustained load tests, monitoring resource usage over time, and analyzing results for memory leaks and performance degradation, you can identify and fix issues that would otherwise only appear in production under real-world conditions.
