# How to Create CloudWatch Synthetics Canaries with Python

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudWatch, Synthetics, Canaries, Python, Monitoring, Testing

Description: Create CloudWatch Synthetics canaries using Python to monitor your APIs and websites with automated health checks and alerting

---

CloudWatch Synthetics supports Python as a canary runtime alongside Node.js. If your team is more comfortable with Python, or if your existing monitoring scripts are in Python, you can write canaries using the Python Selenium runtime for browser-based checks and the Python runtime for API checks.

Python canaries are particularly popular for API monitoring because Python's requests-like patterns feel natural for HTTP testing. The Synthetics Python library provides wrappers that integrate with CloudWatch metrics and artifact storage.

This guide covers creating Python canaries for API monitoring, browser testing, and custom checks.

## Python Canary Runtimes

CloudWatch Synthetics offers two Python runtimes:

- **syn-python-selenium**: For browser-based canaries using Selenium WebDriver
- **syn-python**: For API and HTTP canaries without a browser

The API runtime is lighter and faster. Use it for endpoint monitoring. The Selenium runtime is for canaries that need to interact with web pages.

## Step 1: Create an API Canary with Python

```python
# api_canary.py
from aws_synthetics.selenium import synthetics_webdriver as syn_webdriver
from aws_synthetics.common import synthetics_logger as logger
from aws_synthetics.common import synthetics_configuration as syn_config
import json
import time
import urllib.request
import urllib.error
import ssl

def verify_api_health():
    """Check that critical API endpoints are responding correctly."""

    endpoints = [
        {
            'name': 'Health Check',
            'url': 'https://api.example.com/health',
            'method': 'GET',
            'expected_status': 200,
        },
        {
            'name': 'Orders API',
            'url': 'https://api.example.com/v1/orders?limit=1',
            'method': 'GET',
            'expected_status': 200,
            'validate_body': True,
        },
        {
            'name': 'Users API',
            'url': 'https://api.example.com/v1/users/me',
            'method': 'GET',
            'expected_status': 200,
            'headers': {'Authorization': 'Bearer test-token'},
        },
    ]

    for endpoint in endpoints:
        check_endpoint(endpoint)


def check_endpoint(endpoint):
    """Verify a single API endpoint."""
    name = endpoint['name']
    url = endpoint['url']
    method = endpoint['method']
    expected_status = endpoint['expected_status']
    headers = endpoint.get('headers', {})

    logger.info(f"Checking endpoint: {name} ({method} {url})")
    start_time = time.time()

    try:
        # Build the request
        req = urllib.request.Request(url, method=method)
        for key, value in headers.items():
            req.add_header(key, value)
        req.add_header('User-Agent', 'CloudWatch-Synthetics-Canary')

        # Make the request
        context = ssl.create_default_context()
        response = urllib.request.urlopen(req, timeout=10, context=context)

        duration_ms = (time.time() - start_time) * 1000
        status_code = response.getcode()
        body = response.read().decode('utf-8')

        logger.info(f"{name}: Status={status_code}, Duration={duration_ms:.0f}ms")

        # Validate status code
        if status_code != expected_status:
            raise Exception(
                f"{name} returned status {status_code}, expected {expected_status}"
            )

        # Validate response body if configured
        if endpoint.get('validate_body'):
            validate_response_body(name, body)

        # Check response time
        if duration_ms > 5000:
            logger.warn(f"{name} took {duration_ms:.0f}ms - slower than 5s threshold")

    except urllib.error.HTTPError as e:
        duration_ms = (time.time() - start_time) * 1000
        raise Exception(f"{name} returned HTTP error: {e.code} {e.reason}")
    except urllib.error.URLError as e:
        raise Exception(f"{name} connection failed: {str(e.reason)}")


def validate_response_body(name, body):
    """Validate the structure of an API response."""
    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        raise Exception(f"{name} returned invalid JSON")

    # Add specific validation based on the endpoint
    if 'error' in data:
        raise Exception(f"{name} returned an error: {data['error']}")

    logger.info(f"{name} response body validation passed")


def handler(event, context):
    """Main canary handler."""
    verify_api_health()
    return "Canary completed successfully"
```

## Step 2: Deploy the Python Canary

```bash
# Package the canary script
mkdir -p python
cp api_canary.py python/api_canary.py
zip -r canary-code.zip python/

# Upload to S3
aws s3 cp canary-code.zip s3://my-canary-artifacts-123456/api-canary/canary-code.zip

# Create the canary with Python runtime
aws synthetics create-canary \
  --name api-health-check \
  --artifact-s3-location "s3://my-canary-artifacts-123456/api-canary/" \
  --execution-role-arn arn:aws:iam::123456789012:role/canary-execution-role \
  --schedule '{"Expression": "rate(5 minutes)"}' \
  --runtime-version syn-python-selenium-3.0 \
  --code '{
    "S3Bucket": "my-canary-artifacts-123456",
    "S3Key": "api-canary/canary-code.zip",
    "Handler": "api_canary.handler"
  }' \
  --run-config '{"TimeoutInSeconds": 60, "MemoryInMBs": 960}'

# Start the canary
aws synthetics start-canary --name api-health-check
```

## Step 3: Create a Browser Canary with Selenium

For testing web pages and user flows, use the Selenium runtime.

```python
# browser_canary.py
from aws_synthetics.selenium import synthetics_webdriver as syn_webdriver
from aws_synthetics.common import synthetics_logger as logger
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time


def test_login_flow():
    """Test the complete login flow and verify dashboard access."""

    # Get the Synthetics browser instance
    browser = syn_webdriver.Chrome()

    try:
        # Step 1: Navigate to the application
        logger.info("Navigating to application")
        browser.get('https://app.example.com')

        # Take a screenshot of the landing page
        browser.save_screenshot('landing_page.png')

        # Verify the page loaded
        assert 'Example App' in browser.title, f"Unexpected title: {browser.title}"
        logger.info(f"Page title: {browser.title}")

        # Step 2: Click the login button
        logger.info("Clicking login button")
        login_button = WebDriverWait(browser, 10).until(
            EC.element_to_be_clickable((By.ID, 'login-btn'))
        )
        login_button.click()

        # Step 3: Fill in login credentials
        logger.info("Entering credentials")
        username_field = WebDriverWait(browser, 10).until(
            EC.presence_of_element_located((By.ID, 'username'))
        )
        username_field.send_keys('canary-test@example.com')

        password_field = browser.find_element(By.ID, 'password')
        password_field.send_keys('test-password-from-env')

        browser.save_screenshot('credentials_entered.png')

        # Step 4: Submit the form
        logger.info("Submitting login form")
        submit_button = browser.find_element(By.ID, 'submit-login')
        submit_button.click()

        # Step 5: Wait for dashboard to load
        logger.info("Waiting for dashboard")
        WebDriverWait(browser, 15).until(
            EC.presence_of_element_located((By.CLASS_NAME, 'dashboard-container'))
        )

        browser.save_screenshot('dashboard_loaded.png')

        # Verify we are on the dashboard
        current_url = browser.current_url
        assert '/dashboard' in current_url, f"Expected dashboard URL, got: {current_url}"

        # Step 6: Verify key dashboard elements
        logger.info("Verifying dashboard elements")
        elements_to_check = [
            ('nav-menu', 'Navigation menu'),
            ('metrics-panel', 'Metrics panel'),
            ('recent-activity', 'Recent activity feed'),
        ]

        for element_id, element_name in elements_to_check:
            try:
                element = browser.find_element(By.ID, element_id)
                assert element.is_displayed(), f"{element_name} is not visible"
                logger.info(f"Verified: {element_name} is present and visible")
            except Exception as e:
                logger.error(f"Missing element: {element_name}")
                browser.save_screenshot(f'missing_{element_id}.png')
                raise Exception(f"Dashboard element missing: {element_name}")

        browser.save_screenshot('verification_complete.png')
        logger.info("Login flow completed successfully")

    finally:
        browser.quit()


def handler(event, context):
    """Main canary handler."""
    test_login_flow()
    return "Browser canary completed successfully"
```

## Step 4: Create a Multi-Step API Workflow Canary

Test a complete API workflow that involves multiple dependent requests.

```python
# workflow_canary.py
from aws_synthetics.common import synthetics_logger as logger
import json
import urllib.request
import urllib.error
import ssl
import time

BASE_URL = 'https://api.example.com/v1'
API_KEY = 'test-api-key'


def make_request(method, path, body=None, expected_status=200):
    """Make an authenticated API request."""
    url = f"{BASE_URL}{path}"
    data = json.dumps(body).encode('utf-8') if body else None

    req = urllib.request.Request(url, data=data, method=method)
    req.add_header('Authorization', f'Bearer {API_KEY}')
    req.add_header('Content-Type', 'application/json')

    context = ssl.create_default_context()

    start = time.time()
    response = urllib.request.urlopen(req, timeout=15, context=context)
    duration = (time.time() - start) * 1000

    response_body = response.read().decode('utf-8')
    status = response.getcode()

    logger.info(f"{method} {path}: {status} in {duration:.0f}ms")

    if status != expected_status:
        raise Exception(f"Expected {expected_status}, got {status}")

    return json.loads(response_body) if response_body else {}


def test_order_workflow():
    """Test the complete order lifecycle: create, get, update, delete."""

    # Step 1: Create a new order
    logger.info("Step 1: Creating order")
    order = make_request('POST', '/orders', body={
        'customerId': 'test-customer-001',
        'items': [
            {'sku': 'WIDGET-A', 'quantity': 2, 'price': 29.99},
            {'sku': 'WIDGET-B', 'quantity': 1, 'price': 49.99},
        ],
    })

    order_id = order.get('id')
    if not order_id:
        raise Exception("Order creation did not return an order ID")
    logger.info(f"Created order: {order_id}")

    try:
        # Step 2: Retrieve the order
        logger.info("Step 2: Retrieving order")
        retrieved = make_request('GET', f'/orders/{order_id}')

        if retrieved['id'] != order_id:
            raise Exception("Retrieved order ID does not match")
        if retrieved['status'] != 'pending':
            raise Exception(f"Expected status 'pending', got '{retrieved['status']}'")

        logger.info(f"Order status: {retrieved['status']}")

        # Step 3: Update the order
        logger.info("Step 3: Updating order")
        updated = make_request('PATCH', f'/orders/{order_id}', body={
            'status': 'confirmed',
        })

        if updated['status'] != 'confirmed':
            raise Exception(f"Expected status 'confirmed', got '{updated['status']}'")

        logger.info("Order updated to confirmed")

        # Step 4: List orders to verify it appears
        logger.info("Step 4: Listing orders")
        orders_list = make_request('GET', '/orders?customerId=test-customer-001&limit=10')

        order_ids = [o['id'] for o in orders_list.get('orders', [])]
        if order_id not in order_ids:
            raise Exception(f"Order {order_id} not found in orders list")

        logger.info(f"Order found in list of {len(order_ids)} orders")

    finally:
        # Step 5: Clean up the test order
        logger.info("Step 5: Cleaning up test order")
        try:
            make_request('DELETE', f'/orders/{order_id}')
            logger.info("Test order deleted")
        except Exception as e:
            logger.warn(f"Failed to clean up test order: {str(e)}")

    logger.info("Order workflow canary completed successfully")


def handler(event, context):
    """Main canary handler."""
    test_order_workflow()
    return "Workflow canary completed"
```

## Step 5: Set Up Alerting

Create CloudWatch alarms for your canaries.

```bash
# Alarm when the API canary fails
aws cloudwatch put-metric-alarm \
  --alarm-name api-canary-failure \
  --namespace CloudWatchSynthetics \
  --metric-name SuccessPercent \
  --dimensions Name=CanaryName,Value=api-health-check \
  --statistic Average \
  --period 300 \
  --threshold 100 \
  --comparison-operator LessThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:ops-alerts

# Alarm on canary duration (detect slowdowns)
aws cloudwatch put-metric-alarm \
  --alarm-name api-canary-slow \
  --namespace CloudWatchSynthetics \
  --metric-name Duration \
  --dimensions Name=CanaryName,Value=api-health-check \
  --statistic Average \
  --period 300 \
  --threshold 10000 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:ops-alerts
```

## Step 6: Manage Canary Lifecycle

```bash
# List all canaries
aws synthetics describe-canaries

# Get recent runs for a canary
aws synthetics get-canary-runs --name api-health-check --max-results 10

# Stop a canary
aws synthetics stop-canary --name api-health-check

# Update a canary's schedule
aws synthetics update-canary \
  --name api-health-check \
  --schedule '{"Expression": "rate(1 minute)"}'

# Delete a canary
aws synthetics delete-canary --name api-health-check
```

## Best Practices for Python Canaries

**Use environment variables for configuration**: Keep URLs, API keys, and thresholds configurable. This lets you reuse the same canary across environments.

**Clean up test data**: If your canary creates resources (orders, users, etc.), always clean them up in a finally block. Accumulated test data can cause issues.

**Log generously**: Canary logs appear in CloudWatch Logs. When a canary fails at 3am, good logs make the difference between a 5-minute fix and a 30-minute investigation.

**Validate response content, not just status codes**: A 200 response with an empty body or unexpected structure is still a failure. Validate the actual content.

**Keep canaries independent**: Each canary should be able to run independently without depending on the output of another canary.

For more on monitoring with Synthetics, see our guide on [monitoring website availability with CloudWatch Synthetics](https://oneuptime.com/blog/post/monitor-website-availability-with-cloudwatch-synthetics/view).

## Wrapping Up

Python canaries in CloudWatch Synthetics let you write monitoring checks in a language your team already knows. The API canary pattern is perfect for testing endpoint health, while the Selenium browser canary handles complex user flows. Combine them with CloudWatch alarms for instant notifications when something breaks. The investment in writing good canaries pays off quickly - catching an outage 5 minutes early instead of waiting for user reports can save significant impact.
