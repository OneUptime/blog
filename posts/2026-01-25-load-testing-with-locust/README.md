# How to Implement Load Testing with Locust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Locust, Load Testing, Performance Testing, Python, Stress Testing, DevOps

Description: A practical guide to implementing load testing with Locust, covering test scenarios, distributed testing, custom load shapes, and integration with monitoring systems.

---

Locust is an open-source load testing tool written in Python. Unlike tools that use complex configuration files, Locust lets you write test scenarios as Python code. This means you can use loops, conditionals, and any Python library in your tests. If you can write Python, you can write Locust tests.

## Installing Locust

Install Locust using pip:

```bash
# Install Locust
pip install locust

# Verify installation
locust --version
```

For better performance on Linux, install with gevent's C extensions:

```bash
# Install with performance optimizations
pip install locust[gevent]
```

## Your First Locust Test

Create a file called `locustfile.py`:

```python
# locustfile.py - Basic load test example
from locust import HttpUser, task, between

class WebsiteUser(HttpUser):
    """Simulates a user browsing the website."""

    # Wait 1-3 seconds between tasks
    wait_time = between(1, 3)

    @task
    def view_homepage(self):
        """Load the homepage."""
        self.client.get("/")

    @task(3)  # Weight of 3 means this runs 3x more often
    def view_products(self):
        """Browse products page."""
        self.client.get("/products")

    @task(2)
    def view_product_detail(self):
        """View a specific product."""
        # Use random product ID
        product_id = 1
        self.client.get(f"/products/{product_id}")
```

Run the test:

```bash
# Start Locust with web UI
locust -f locustfile.py --host=http://localhost:3000

# Open http://localhost:8089 in your browser
```

## Headless Mode for CI/CD

Run tests without the web interface:

```bash
# Run with 100 users, spawn rate 10/sec, for 5 minutes
locust -f locustfile.py \
  --host=http://localhost:3000 \
  --users=100 \
  --spawn-rate=10 \
  --run-time=5m \
  --headless \
  --csv=results
```

This generates CSV files with test results.

## Testing API Endpoints

Test a REST API with authentication:

```python
# api_load_test.py
from locust import HttpUser, task, between
import json

class APIUser(HttpUser):
    """Simulates API client interactions."""

    wait_time = between(0.5, 2)

    def on_start(self):
        """Run once when a user starts. Good for login."""
        response = self.client.post("/api/auth/login", json={
            "email": "test@example.com",
            "password": "testpassword"
        })

        if response.status_code == 200:
            # Store token for subsequent requests
            self.token = response.json()["accessToken"]
            self.client.headers["Authorization"] = f"Bearer {self.token}"
        else:
            # Mark user as failed to login
            self.token = None

    @task(5)
    def list_users(self):
        """GET request to list users."""
        with self.client.get("/api/users", catch_response=True) as response:
            if response.status_code == 200:
                data = response.json()
                if "users" in data:
                    response.success()
                else:
                    response.failure("Response missing users key")
            else:
                response.failure(f"Got status {response.status_code}")

    @task(3)
    def create_user(self):
        """POST request to create a user."""
        import time
        user_data = {
            "name": f"Test User {time.time()}",
            "email": f"test{time.time()}@example.com"
        }

        response = self.client.post("/api/users", json=user_data)

        if response.status_code == 201:
            # Store created user ID for potential cleanup
            user_id = response.json().get("id")
            if user_id:
                self.created_users = getattr(self, 'created_users', [])
                self.created_users.append(user_id)

    @task(2)
    def get_user_detail(self):
        """GET request for specific user."""
        # Use a known user ID or one we created
        user_id = 1
        self.client.get(f"/api/users/{user_id}")

    @task(1)
    def update_user(self):
        """PUT request to update a user."""
        user_id = 1
        self.client.put(f"/api/users/{user_id}", json={
            "name": "Updated Name"
        })

    def on_stop(self):
        """Clean up when user stops."""
        # Delete users we created during the test
        for user_id in getattr(self, 'created_users', []):
            self.client.delete(f"/api/users/{user_id}")
```

## Sequential Task Sets

When you need tasks to run in a specific order:

```python
# sequential_test.py
from locust import HttpUser, SequentialTaskSet, task, between

class CheckoutFlow(SequentialTaskSet):
    """Tasks run in order: browse, add to cart, checkout."""

    @task
    def browse_products(self):
        """Step 1: Browse products."""
        response = self.client.get("/api/products")
        if response.status_code == 200:
            products = response.json()
            if products:
                # Store product for next step
                self.product_id = products[0]["id"]

    @task
    def add_to_cart(self):
        """Step 2: Add product to cart."""
        if hasattr(self, 'product_id'):
            self.client.post("/api/cart", json={
                "productId": self.product_id,
                "quantity": 1
            })

    @task
    def view_cart(self):
        """Step 3: View cart."""
        self.client.get("/api/cart")

    @task
    def checkout(self):
        """Step 4: Complete checkout."""
        self.client.post("/api/checkout", json={
            "paymentMethod": "credit_card"
        })
        # After checkout, stop this task set
        self.interrupt()


class EcommerceUser(HttpUser):
    wait_time = between(1, 3)
    tasks = [CheckoutFlow]
```

## Custom Load Shapes

Control exactly how load increases and decreases:

```python
# custom_shape.py
from locust import HttpUser, task, between, LoadTestShape

class StagesShape(LoadTestShape):
    """
    Custom load shape with distinct stages:
    - Ramp up to 100 users over 2 minutes
    - Hold at 100 users for 5 minutes
    - Spike to 200 users
    - Hold spike for 1 minute
    - Return to 100 users
    - Ramp down
    """

    stages = [
        {"duration": 120, "users": 100, "spawn_rate": 1},
        {"duration": 420, "users": 100, "spawn_rate": 1},
        {"duration": 450, "users": 200, "spawn_rate": 10},
        {"duration": 510, "users": 200, "spawn_rate": 10},
        {"duration": 540, "users": 100, "spawn_rate": 10},
        {"duration": 660, "users": 0, "spawn_rate": 5},
    ]

    def tick(self):
        """Called every second to determine user count."""
        run_time = self.get_run_time()

        for stage in self.stages:
            if run_time < stage["duration"]:
                return (stage["users"], stage["spawn_rate"])

        return None  # Stop the test


class WebUser(HttpUser):
    wait_time = between(1, 3)

    @task
    def homepage(self):
        self.client.get("/")
```

## Distributed Load Testing

Run Locust across multiple machines for higher load:

On the master node:

```bash
# Start master
locust -f locustfile.py --master --host=http://api.example.com
```

On worker nodes:

```bash
# Start workers (run on each worker machine)
locust -f locustfile.py --worker --master-host=192.168.1.100
```

Using Docker Compose for distributed testing:

```yaml
# docker-compose.yml
version: '3'
services:
  master:
    image: locustio/locust
    ports:
      - "8089:8089"
    volumes:
      - ./:/mnt/locust
    command: -f /mnt/locust/locustfile.py --master -H http://api:3000

  worker:
    image: locustio/locust
    volumes:
      - ./:/mnt/locust
    command: -f /mnt/locust/locustfile.py --worker --master-host master
    deploy:
      replicas: 4
```

## Custom Metrics and Events

Track custom metrics during tests:

```python
# custom_metrics.py
from locust import HttpUser, task, between, events
import time

# Register custom metric
request_count = 0

@events.request.add_listener
def on_request(request_type, name, response_time, response_length, exception, **kwargs):
    """Called for every request."""
    global request_count
    request_count += 1

@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Called when test stops."""
    print(f"Total requests made: {request_count}")


class MetricsUser(HttpUser):
    wait_time = between(1, 2)

    @task
    def tracked_request(self):
        start = time.time()

        response = self.client.get("/api/data")

        # Track custom timing
        processing_time = time.time() - start

        # Fire custom event for external tracking
        events.request.fire(
            request_type="CUSTOM",
            name="data_processing",
            response_time=processing_time * 1000,
            response_length=len(response.content),
            exception=None,
            context={}
        )
```

## CI/CD Integration

GitHub Actions workflow:

```yaml
# .github/workflows/load-test.yml
name: Load Test

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM

jobs:
  load-test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install Locust
        run: pip install locust

      - name: Run Load Test
        run: |
          locust -f tests/locustfile.py \
            --host=${{ secrets.API_URL }} \
            --users=50 \
            --spawn-rate=5 \
            --run-time=3m \
            --headless \
            --csv=results \
            --html=report.html

      - name: Upload Results
        uses: actions/upload-artifact@v4
        with:
          name: locust-results
          path: |
            results*.csv
            report.html

      - name: Check Thresholds
        run: |
          # Parse results and check against thresholds
          python scripts/check_thresholds.py results_stats.csv
```

Threshold checking script:

```python
# scripts/check_thresholds.py
import csv
import sys

def check_thresholds(csv_file):
    with open(csv_file, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['Name'] == 'Aggregated':
                avg_response = float(row['Average Response Time'])
                failure_rate = float(row['Failure Count']) / float(row['Request Count']) * 100

                print(f"Average Response Time: {avg_response}ms")
                print(f"Failure Rate: {failure_rate}%")

                if avg_response > 500:
                    print("FAIL: Average response time exceeds 500ms")
                    sys.exit(1)

                if failure_rate > 1:
                    print("FAIL: Failure rate exceeds 1%")
                    sys.exit(1)

                print("PASS: All thresholds met")
                sys.exit(0)

if __name__ == "__main__":
    check_thresholds(sys.argv[1])
```

## Best Practices

1. Start with realistic user behavior patterns
2. Use appropriate wait times between requests
3. Test against production-like environments
4. Monitor your system during tests
5. Gradually increase load to find breaking points
6. Clean up test data after runs
7. Run tests regularly, not just before releases
8. Document your test scenarios

---

Locust turns load testing into a coding exercise rather than a configuration puzzle. Write your scenarios in Python, scale horizontally with workers, and integrate into your CI/CD pipeline. The combination of simplicity and power makes Locust an excellent choice for teams that want full control over their load tests.
