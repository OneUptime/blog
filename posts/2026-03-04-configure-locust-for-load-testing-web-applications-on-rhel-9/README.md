# How to Configure Locust for Load Testing Web Applications on RHEL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, Locust, Load Testing, Performance, Python, Linux

Description: Learn how to install and configure Locust on RHEL for load testing web applications, including test script creation, distributed mode, custom shapes, and results analysis.

---

Locust is a Python-based load testing tool that lets you define user behavior in plain Python code. Unlike tools that use XML or YAML for test definitions, Locust gives you the full power of Python to create realistic user scenarios. It scales horizontally across multiple machines and provides a real-time web UI for monitoring test execution. This guide covers setting up Locust on RHEL.

## Why Locust

Locust stands out from other load testing tools because:

- Test scenarios are written in Python, not XML or proprietary formats
- Distributed mode scales across many machines
- The web UI shows results in real time
- Event-driven architecture handles thousands of concurrent users per process
- Easy to extend with custom clients for non-HTTP protocols

## Prerequisites

- RHEL with Python 3.9 or newer
- pip installed
- A web application to test

## Installing Locust

```bash
# Install Locust
pip3 install --user locust
```

Verify the installation:

```bash
# Check the version
locust --version
```

## Writing Your First Locustfile

Create a test file that simulates user behavior:

```python
# locustfile.py
from locust import HttpUser, task, between

class WebsiteUser(HttpUser):
    wait_time = between(1, 5)

    @task(3)
    def view_homepage(self):
        self.client.get("/")

    @task(2)
    def view_about(self):
        self.client.get("/about")

    @task(1)
    def view_contact(self):
        self.client.get("/contact")

    def on_start(self):
        """Called when a simulated user starts."""
        pass
```

The numbers in `@task(3)` set the relative weight. In this case, the homepage is visited three times as often as the contact page.

## Running Locust

### With the Web UI

```bash
# Start Locust with the web UI
locust -f locustfile.py --host http://your-app.example.com
```

Open `http://localhost:8089` in your browser. Enter the number of users and spawn rate, then start the test.

### Headless Mode

```bash
# Run without the web UI
locust -f locustfile.py \
  --host http://your-app.example.com \
  --users 100 \
  --spawn-rate 10 \
  --run-time 5m \
  --headless
```

## Advanced User Behavior

### Sequential Tasks

```python
from locust import HttpUser, task, between, SequentialTaskSet

class UserBehavior(SequentialTaskSet):
    @task
    def login(self):
        self.client.post("/login", json={
            "username": "testuser",
            "password": "password123"
        })

    @task
    def browse_products(self):
        self.client.get("/products")

    @task
    def view_product(self):
        self.client.get("/products/1")

    @task
    def add_to_cart(self):
        self.client.post("/cart", json={
            "product_id": 1,
            "quantity": 1
        })

    @task
    def checkout(self):
        self.client.post("/checkout")

    @task
    def logout(self):
        self.client.post("/logout")

class EcommerceUser(HttpUser):
    wait_time = between(2, 5)
    tasks = [UserBehavior]
```

### Handling Authentication

```python
from locust import HttpUser, task, between

class AuthenticatedUser(HttpUser):
    wait_time = between(1, 3)
    token = None

    def on_start(self):
        response = self.client.post("/api/auth/login", json={
            "email": "test@example.com",
            "password": "password123"
        })
        self.token = response.json()["token"]

    @task
    def get_profile(self):
        self.client.get("/api/profile", headers={
            "Authorization": f"Bearer {self.token}"
        })

    @task
    def list_items(self):
        self.client.get("/api/items", headers={
            "Authorization": f"Bearer {self.token}"
        })
```

### Response Validation

```python
@task
def check_api(self):
    with self.client.get("/api/health", catch_response=True) as response:
        if response.status_code != 200:
            response.failure(f"Got status code {response.status_code}")
        elif response.elapsed.total_seconds() > 2:
            response.failure(f"Response too slow: {response.elapsed.total_seconds()}s")
        elif "healthy" not in response.json().get("status", ""):
            response.failure("API not healthy")
        else:
            response.success()
```

## Distributed Load Testing

For generating more load, run Locust in distributed mode across multiple machines.

On the master:

```bash
# Start the master
locust -f locustfile.py --master --host http://your-app.example.com
```

On each worker:

```bash
# Start a worker
locust -f locustfile.py --worker --master-host master-ip
```

You can run multiple workers on the same machine:

```bash
# Start 4 workers on the same machine
for i in $(seq 1 4); do
  locust -f locustfile.py --worker --master-host master-ip &
done
```

## Custom Load Shapes

Define how the load changes over time:

```python
from locust import HttpUser, task, between, LoadTestShape

class WebsiteUser(HttpUser):
    wait_time = between(1, 5)

    @task
    def index(self):
        self.client.get("/")

class StepLoadShape(LoadTestShape):
    """Step load: increase users every minute."""
    step_time = 60
    step_load = 10
    spawn_rate = 10
    time_limit = 600

    def tick(self):
        run_time = self.get_run_time()
        if run_time > self.time_limit:
            return None
        current_step = run_time // self.step_time + 1
        return (current_step * self.step_load, self.spawn_rate)
```

## Saving Results

```bash
# Save results to CSV
locust -f locustfile.py \
  --host http://your-app.example.com \
  --users 50 \
  --spawn-rate 5 \
  --run-time 2m \
  --headless \
  --csv results/loadtest
```

This generates three CSV files:

- `results/loadtest_stats.csv` - aggregate statistics
- `results/loadtest_stats_history.csv` - time-series data
- `results/loadtest_failures.csv` - failure details

## Generating HTML Reports

```bash
# Save an HTML report
locust -f locustfile.py \
  --host http://your-app.example.com \
  --users 50 \
  --spawn-rate 5 \
  --run-time 2m \
  --headless \
  --html results/report.html
```

## Creating a Systemd Service

For long-running distributed tests:

```bash
# Create a systemd service for the Locust master
sudo tee /etc/systemd/system/locust-master.service > /dev/null << 'EOF'
[Unit]
Description=Locust Master
After=network.target

[Service]
Type=simple
User=locust
ExecStart=/usr/local/bin/locust -f /opt/loadtests/locustfile.py --master --host http://target.example.com
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF
```

## Environment-Based Configuration

```python
import os
from locust import HttpUser, task, between

class ConfigurableUser(HttpUser):
    wait_time = between(
        int(os.getenv("WAIT_MIN", "1")),
        int(os.getenv("WAIT_MAX", "5"))
    )

    @task
    def index(self):
        self.client.get("/")
```

```bash
# Run with custom wait times
WAIT_MIN=0 WAIT_MAX=1 locust -f locustfile.py --host http://your-app.example.com
```

## Conclusion

Locust on RHEL provides a flexible, Python-based load testing tool that scales from single-machine tests to distributed multi-node setups. By writing test scenarios in Python, you get full control over user behavior, authentication, and response validation. The real-time web UI and CSV/HTML reporting make it easy to identify performance bottlenecks and track improvements over time.
