# How to Write Locust User Classes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Locust, Load Testing, Performance Testing, Python, Stress Testing, API Testing

Description: A comprehensive guide to writing Locust user classes for effective load testing, covering user behaviors, task weights, wait times, events, and custom clients.

---

> **User classes are the heart of Locust.** They define how your virtual users behave, what endpoints they hit, and how they simulate real-world traffic patterns. Master user classes, and you master load testing.

## What Are Locust User Classes?

Locust is a modern, Python-based load testing framework that lets you define user behavior as code. At its core, a **User class** represents a single simulated user that will hammer your application during a load test.

Unlike other load testing tools that rely on GUIs or XML configurations, Locust uses pure Python. This gives you the full power of a programming language to define complex user behaviors, conditional logic, and realistic traffic patterns.

A basic user class looks like this:

```python
# locustfile.py - The simplest possible Locust user class
from locust import User, task, between

class MyUser(User):
    """
    A basic Locust user class.

    This class defines a virtual user that will execute tasks
    during your load test. Each instance represents one simulated user.
    """

    # Wait 1-3 seconds between tasks (simulates think time)
    wait_time = between(1, 3)

    @task
    def my_task(self):
        """
        A task that the user will execute.
        Tasks decorated with @task are picked randomly based on weight.
        """
        print("User is doing something!")
```

## HttpUser: Testing Web Applications

For HTTP-based applications (which is most load testing scenarios), Locust provides the `HttpUser` class. It comes with a built-in `client` attribute that wraps Python's `requests` library with automatic response time tracking.

```python
# locustfile.py - HttpUser for web application testing
from locust import HttpUser, task, between

class WebsiteUser(HttpUser):
    """
    An HTTP user that tests a web application.

    HttpUser provides a 'self.client' attribute that is an HTTP client
    with built-in statistics tracking. All requests made through this
    client are automatically recorded in Locust's statistics.
    """

    # Base URL for all requests (can also be set via command line)
    host = "https://api.example.com"

    # Simulate realistic user think time
    wait_time = between(1, 5)

    @task
    def get_homepage(self):
        """
        Fetch the homepage.

        self.client.get() makes a GET request and automatically:
        - Records response time
        - Tracks success/failure
        - Groups statistics by endpoint
        """
        response = self.client.get("/")

        # You can add custom validation
        if response.status_code != 200:
            response.failure(f"Got status code {response.status_code}")

    @task
    def get_api_data(self):
        """
        Fetch data from an API endpoint.

        The 'name' parameter groups requests in statistics,
        useful when URLs contain dynamic IDs.
        """
        # Without 'name', each unique URL would be tracked separately
        user_id = 123  # In reality, this might be dynamic
        response = self.client.get(
            f"/api/users/{user_id}",
            name="/api/users/[id]"  # Group all user requests together
        )

    @task
    def post_data(self):
        """
        Send a POST request with JSON data.

        The client supports all HTTP methods: get, post, put,
        delete, patch, head, options.
        """
        response = self.client.post(
            "/api/items",
            json={"name": "Test Item", "price": 29.99},
            headers={"Content-Type": "application/json"}
        )
```

## Tasks and Task Weights

Tasks are the actions your virtual users perform. Locust picks tasks randomly, but you can control the probability using **weights**.

```python
# locustfile.py - Task weights for realistic traffic distribution
from locust import HttpUser, task, between

class EcommerceUser(HttpUser):
    """
    Simulates an e-commerce user with realistic behavior patterns.

    Task weights reflect real-world usage: users browse more than
    they buy, and view products more than they add to cart.
    """

    wait_time = between(2, 5)

    @task(10)  # Weight of 10 - most common action
    def browse_products(self):
        """
        Browse the product catalog.

        With weight 10, this task is 10x more likely to be picked
        than a task with weight 1. This reflects real user behavior
        where browsing is the most common action.
        """
        self.client.get("/products")

    @task(5)  # Weight of 5 - fairly common
    def view_product_detail(self):
        """
        View a specific product.

        Users view individual products less often than they browse,
        so this has a lower weight.
        """
        # Simulate viewing a random product
        product_id = self._get_random_product_id()
        self.client.get(
            f"/products/{product_id}",
            name="/products/[id]"
        )

    @task(2)  # Weight of 2 - less common
    def add_to_cart(self):
        """
        Add an item to the shopping cart.

        Adding to cart happens less frequently than viewing products.
        """
        self.client.post(
            "/cart/add",
            json={"product_id": 123, "quantity": 1}
        )

    @task(1)  # Weight of 1 - rare action
    def checkout(self):
        """
        Complete a purchase.

        Checkout is the rarest action (many browse, few buy).
        With weight 1, this happens roughly 1/18th of the time
        (1 / (10+5+2+1) = 1/18).
        """
        self.client.post("/checkout", json={"payment_method": "card"})

    def _get_random_product_id(self):
        """Helper method to get a random product ID."""
        import random
        return random.randint(1, 1000)
```

You can also organize tasks using `TaskSet` for more complex behaviors:

```python
# locustfile.py - Using TaskSet for organized task grouping
from locust import HttpUser, TaskSet, task, between

class BrowsingTasks(TaskSet):
    """
    A set of browsing-related tasks.

    TaskSets help organize related tasks and can be nested
    for complex user journeys.
    """

    @task(3)
    def view_homepage(self):
        self.client.get("/")

    @task(2)
    def view_category(self):
        self.client.get("/category/electronics")

    @task(1)
    def stop_browsing(self):
        """
        Exit this TaskSet and return to parent.

        self.interrupt() stops the current TaskSet execution.
        Without this, the user would stay in BrowsingTasks forever.
        """
        self.interrupt()


class ShoppingUser(HttpUser):
    """User that alternates between browsing and other activities."""

    wait_time = between(1, 3)

    # Reference the TaskSet - it will be executed like a task
    tasks = [BrowsingTasks]
```

## Wait Times: Simulating Think Time

Real users do not fire requests as fast as possible. They read content, fill forms, and think. Locust provides several wait time functions to simulate this behavior.

```python
# locustfile.py - Different wait time strategies
from locust import HttpUser, task, between, constant, constant_pacing

class VariableWaitUser(HttpUser):
    """
    User with random wait time between tasks.

    between(min, max) waits a random time between min and max seconds.
    This is the most realistic option for simulating human behavior.
    """
    wait_time = between(1, 5)  # Wait 1-5 seconds between tasks

    @task
    def my_task(self):
        self.client.get("/")


class ConstantWaitUser(HttpUser):
    """
    User with fixed wait time between tasks.

    constant(seconds) always waits exactly that many seconds.
    Useful when you need predictable, steady request rates.
    """
    wait_time = constant(2)  # Always wait exactly 2 seconds

    @task
    def my_task(self):
        self.client.get("/")


class ConstantPacingUser(HttpUser):
    """
    User that ensures a constant time between task starts.

    constant_pacing(seconds) ensures tasks START every N seconds,
    regardless of how long the task takes. If a task takes longer
    than the pacing interval, the next task starts immediately.

    This is useful for achieving a specific request rate.
    """
    wait_time = constant_pacing(1)  # Start a new task every 1 second

    @task
    def my_task(self):
        self.client.get("/")


class CustomWaitUser(HttpUser):
    """
    User with custom wait time logic.

    You can define wait_time as a method for complex logic,
    like adaptive delays based on server response.
    """

    def wait_time(self):
        """
        Custom wait time that varies based on task count.

        Returns the number of seconds to wait. Can implement
        any logic you need.
        """
        import random

        # Example: gradually increase wait time as test progresses
        base_wait = 1
        if hasattr(self, 'task_count'):
            self.task_count += 1
        else:
            self.task_count = 1

        # Add slight randomness
        return base_wait + random.uniform(0, 0.5)

    @task
    def my_task(self):
        self.client.get("/")
```

## Events: Hooks for Custom Logic

Locust provides event hooks that let you execute code at specific points during the test lifecycle. This is powerful for setup, teardown, custom metrics, and more.

```python
# locustfile.py - Using Locust events for custom behavior
from locust import HttpUser, task, between, events
import time

# Global event handlers (run once for the entire test)

@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """
    Called when the test starts (before any users spawn).

    Use this for global setup like:
    - Creating test data
    - Warming up caches
    - Logging test parameters
    """
    print(f"Test starting! Target host: {environment.host}")
    print(f"User classes: {environment.user_classes}")


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """
    Called when the test stops.

    Use this for cleanup and final reporting.
    """
    print("Test completed!")
    stats = environment.stats
    print(f"Total requests: {stats.total.num_requests}")
    print(f"Total failures: {stats.total.num_failures}")


@events.request.add_listener
def on_request(request_type, name, response_time, response_length,
               response, context, exception, start_time, url, **kwargs):
    """
    Called after every request completes.

    Use this for custom metrics, logging, or validation.
    Be careful with performance - this runs for EVERY request.
    """
    if exception:
        print(f"Request failed: {name} - {exception}")
    elif response_time > 1000:  # Log slow requests (>1 second)
        print(f"Slow request: {name} took {response_time}ms")


class MonitoredUser(HttpUser):
    """
    User class with lifecycle hooks.

    Individual users have on_start and on_stop methods for
    per-user setup and teardown.
    """

    wait_time = between(1, 3)

    def on_start(self):
        """
        Called when a user starts (spawns).

        Use this for per-user setup like:
        - Logging in
        - Loading user-specific data
        - Initializing state
        """
        print(f"User starting!")

        # Example: Authenticate the user
        response = self.client.post(
            "/login",
            json={"username": "testuser", "password": "testpass"}
        )

        if response.status_code == 200:
            # Store the auth token for subsequent requests
            self.auth_token = response.json().get("token")
        else:
            print(f"Login failed: {response.status_code}")

    def on_stop(self):
        """
        Called when a user stops (despawns or test ends).

        Use this for cleanup like:
        - Logging out
        - Releasing resources
        - Saving state
        """
        print(f"User stopping!")

        # Example: Logout
        if hasattr(self, 'auth_token'):
            self.client.post(
                "/logout",
                headers={"Authorization": f"Bearer {self.auth_token}"}
            )

    @task
    def authenticated_request(self):
        """Make an authenticated API request."""
        headers = {}
        if hasattr(self, 'auth_token'):
            headers["Authorization"] = f"Bearer {self.auth_token}"

        self.client.get("/api/protected", headers=headers)
```

## Custom Clients: Testing Non-HTTP Protocols

Locust is not limited to HTTP. You can create custom clients to test any protocol - databases, message queues, gRPC, WebSockets, and more.

```python
# locustfile.py - Custom client for non-HTTP protocols
from locust import User, task, between, events
import time
import random

class DatabaseClient:
    """
    Custom client for database load testing.

    This example simulates database operations. In a real scenario,
    you would use an actual database driver (psycopg2, pymongo, etc.)
    """

    def __init__(self, host, request_event):
        """
        Initialize the custom client.

        Args:
            host: The target host/connection string
            request_event: Locust's request event for reporting metrics
        """
        self.host = host
        self._request_event = request_event

    def query(self, query_name, query_sql):
        """
        Execute a database query with metrics tracking.

        All custom clients should follow this pattern:
        1. Record start time
        2. Execute the operation
        3. Record success/failure with timing
        """
        start_time = time.time()
        exception = None
        response_length = 0

        try:
            # Simulate database query (replace with real DB call)
            time.sleep(random.uniform(0.01, 0.1))

            # Simulate random failures (5% failure rate)
            if random.random() < 0.05:
                raise Exception("Connection timeout")

            # Simulate result size
            response_length = random.randint(100, 10000)

        except Exception as e:
            exception = e

        # Calculate response time in milliseconds
        response_time = (time.time() - start_time) * 1000

        # Report to Locust's statistics system
        self._request_event.fire(
            request_type="DB",
            name=query_name,
            response_time=response_time,
            response_length=response_length,
            response=None,
            context={},
            exception=exception,
            start_time=start_time,
            url=self.host
        )

        if exception:
            raise exception

        return {"rows": response_length // 100}


class DatabaseUser(User):
    """
    User class for database load testing.

    This demonstrates how to use a custom client instead of HttpUser.
    The pattern works for any protocol: Redis, Kafka, gRPC, etc.
    """

    # Abstract is True means this class will not be instantiated directly
    abstract = True

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Initialize our custom client
        self.client = DatabaseClient(
            host=self.host,
            request_event=self.environment.events.request
        )


class PostgresUser(DatabaseUser):
    """Concrete user class for PostgreSQL testing."""

    host = "postgresql://localhost:5432/testdb"
    wait_time = between(0.1, 0.5)

    @task(5)
    def select_query(self):
        """Simulate a SELECT query."""
        self.client.query(
            "SELECT users",
            "SELECT * FROM users WHERE id = 123"
        )

    @task(3)
    def insert_query(self):
        """Simulate an INSERT query."""
        self.client.query(
            "INSERT user",
            "INSERT INTO users (name, email) VALUES ('test', 'test@example.com')"
        )

    @task(1)
    def complex_join(self):
        """Simulate a complex JOIN query."""
        self.client.query(
            "SELECT with JOIN",
            "SELECT * FROM orders o JOIN users u ON o.user_id = u.id"
        )
```

## Test Lifecycle: Controlling User Behavior

Understanding the test lifecycle helps you write more sophisticated load tests with proper sequencing and state management.

```python
# locustfile.py - Complete test lifecycle example
from locust import HttpUser, task, between, events, SequentialTaskSet
import logging

# Configure logging for visibility
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class UserJourney(SequentialTaskSet):
    """
    A sequential task set that executes tasks in order.

    Unlike regular TaskSets where tasks are picked randomly,
    SequentialTaskSet runs tasks in the order they are defined.
    This is perfect for user journeys with a specific flow.
    """

    @task
    def step_1_visit_homepage(self):
        """First step: Visit the homepage."""
        logger.info("Step 1: Visiting homepage")
        self.client.get("/", name="1. Homepage")

    @task
    def step_2_browse_products(self):
        """Second step: Browse products."""
        logger.info("Step 2: Browsing products")
        self.client.get("/products", name="2. Product List")

    @task
    def step_3_view_product(self):
        """Third step: View a specific product."""
        logger.info("Step 3: Viewing product details")
        self.client.get("/products/1", name="3. Product Detail")

    @task
    def step_4_add_to_cart(self):
        """Fourth step: Add to cart."""
        logger.info("Step 4: Adding to cart")
        self.client.post(
            "/cart/add",
            json={"product_id": 1, "quantity": 1},
            name="4. Add to Cart"
        )

    @task
    def step_5_checkout(self):
        """Fifth step: Checkout and complete the journey."""
        logger.info("Step 5: Checking out")
        self.client.post(
            "/checkout",
            json={"payment_method": "card"},
            name="5. Checkout"
        )

        # After checkout, restart the journey
        # interrupt() returns to parent; without it, the sequence repeats
        self.interrupt()


class EcommerceJourneyUser(HttpUser):
    """
    User that follows a complete e-commerce journey.

    This demonstrates the full lifecycle:
    1. Test starts (test_start event)
    2. Users spawn (on_start method)
    3. Users execute tasks (with wait_time between)
    4. Users stop (on_stop method)
    5. Test ends (test_stop event)
    """

    host = "https://api.example.com"
    wait_time = between(1, 3)

    # Use the sequential journey
    tasks = [UserJourney]

    def on_start(self):
        """
        Called once when each user spawns.

        Perfect for:
        - Authentication
        - Loading user profile
        - Setting up session state
        """
        logger.info(f"User spawned")

        # Create a new session/user for this virtual user
        response = self.client.post(
            "/api/sessions",
            json={"anonymous": True}
        )

        if response.ok:
            self.session_id = response.json().get("session_id")
            logger.info(f"Session created: {self.session_id}")

    def on_stop(self):
        """
        Called once when each user despawns.

        Perfect for:
        - Cleanup
        - Logging out
        - Recording final state
        """
        logger.info(f"User despawning")

        if hasattr(self, 'session_id'):
            self.client.delete(f"/api/sessions/{self.session_id}")


# Test-level events
@events.init.add_listener
def on_init(environment, **kwargs):
    """
    Called when Locust initializes (before web UI starts).

    Use for early setup like loading configuration.
    """
    logger.info("Locust initialized")


@events.spawning_complete.add_listener
def on_spawning_complete(user_count, **kwargs):
    """
    Called when all users have been spawned.

    Useful for knowing when ramp-up is complete.
    """
    logger.info(f"All {user_count} users spawned!")


@events.quitting.add_listener
def on_quitting(environment, **kwargs):
    """
    Called when Locust is about to quit.

    Last chance for cleanup or final reporting.
    """
    logger.info("Locust shutting down")
```

## Best Practices Summary

When writing Locust user classes, follow these guidelines for effective load testing:

**1. Model Real User Behavior**
- Use realistic wait times (real users think and read)
- Set task weights based on actual usage patterns
- Include the full user journey, not just API endpoints

**2. Keep Tests Maintainable**
- Organize related tasks into TaskSets
- Use meaningful names for tasks and request grouping
- Add comments explaining the business logic

**3. Handle State Properly**
- Use `on_start` for per-user setup (login, session creation)
- Use `on_stop` for cleanup (logout, resource release)
- Store user state as instance attributes (self.token, self.user_id)

**4. Group Dynamic URLs**
- Use the `name` parameter to group requests with dynamic IDs
- `/users/123` and `/users/456` should both report as `/users/[id]`
- This keeps your statistics meaningful and manageable

**5. Validate Responses**
- Check status codes and response content
- Use `response.failure()` to mark requests as failed
- Log unexpected responses for debugging

**6. Monitor and Iterate**
- Start with fewer users and scale up
- Watch for bottlenecks in your test setup, not just the target
- Use events for custom metrics and logging

**7. Test Your Tests**
- Run with a single user first to verify correctness
- Check that authentication and state management work
- Verify task weights produce expected distribution

---

*Need to monitor your application's performance in production? [OneUptime](https://oneuptime.com) provides comprehensive monitoring, alerting, and incident management. Combine your Locust load tests with OneUptime's real-time observability to ensure your application performs under pressure.*
