# How to Build an OpenTelemetry Training Curriculum with Hands-On Labs Using the OTel Demo

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Training, OTel Demo, Hands-On Labs

Description: Build a structured OpenTelemetry training curriculum with hands-on labs using the official OTel Demo application to teach your team observability skills.

Reading documentation teaches concepts. Hands-on practice builds skills. The OpenTelemetry Demo application gives you a fully instrumented microservices environment that your team can use as a learning sandbox. Here is how to build a training curriculum around it.

## The OTel Demo Application

The OpenTelemetry Demo is an open-source e-commerce application with over a dozen microservices written in different languages (Go, Python, Java, .NET, Node.js, Rust, and more). Each service is instrumented with OpenTelemetry, and the application comes with Jaeger, Grafana, and Prometheus pre-configured.

Set it up with a single command:

```bash
# Clone the demo repository
git clone https://github.com/open-telemetry/opentelemetry-demo.git
cd opentelemetry-demo

# Start the full application stack
docker compose up -d

# Verify everything is running
docker compose ps

# Access points:
# Web store:      http://localhost:8080
# Jaeger UI:      http://localhost:16686
# Grafana:        http://localhost:3000
# Feature flags:  http://localhost:8081
```

The demo includes a load generator that simulates user traffic, so traces and metrics start flowing immediately.

## Curriculum Structure

Organize the training into four modules, each building on the previous one:

### Module 1: Understanding Traces (2 hours)

**Objective**: Participants can read and interpret trace waterfalls.

**Lab 1.1: Explore a Trace**

```markdown
Instructions:
1. Open Jaeger at http://localhost:16686
2. Select the "frontend" service
3. Find a trace for the "HTTP GET /api/products" operation
4. Answer these questions:
   - How many services are involved in this trace?
   - What is the total duration of the trace?
   - Which span took the longest?
   - What database queries were executed?
```

**Lab 1.2: Follow a User Journey**

```markdown
Instructions:
1. Open the web store at http://localhost:8080
2. Browse products, add one to your cart, and start checkout
3. Open Jaeger and find the trace for your checkout
4. Trace the request through each service:
   - frontend -> checkout service -> payment service
   - frontend -> checkout service -> shipping service
   - frontend -> checkout service -> email service
5. Identify which service calls are parallel vs sequential
```

**Lab 1.3: Find an Error**

The demo includes feature flags that can inject errors:

```bash
# Enable the product catalog failure feature flag
# Access the feature flag UI at http://localhost:8081
# Enable "productCatalogFailure"

# Now browse the store and observe the error in traces
```

```markdown
Instructions:
1. Enable the productCatalogFailure feature flag
2. Browse the store and trigger the error
3. In Jaeger, search for traces with errors (tags: error=true)
4. Find the root cause span and read the exception message
5. Disable the feature flag when done
```

### Module 2: Working with Metrics (2 hours)

**Objective**: Participants can query and visualize OpenTelemetry metrics.

**Lab 2.1: Explore Service Metrics**

```markdown
Instructions:
1. Open Grafana at http://localhost:3000
2. Navigate to the "Demo Dashboard"
3. Identify these metrics for the checkout service:
   - Request rate (requests per second)
   - Error rate (percentage of 5xx responses)
   - Latency (P50, P95, P99)
4. Write a PromQL query that shows the request rate:
```

```promql
# Query to write:
sum(rate(http_server_request_duration_seconds_count{service_name="checkoutservice"}[5m]))
```

**Lab 2.2: Create a Custom Dashboard**

```markdown
Instructions:
1. Create a new dashboard in Grafana
2. Add panels for:
   - Request rate by service (bar chart)
   - P95 latency comparison across services (table)
   - Error rate over time for the frontend service (time series)
3. Save the dashboard with the name "Training - [Your Name]"
```

### Module 3: Adding Custom Instrumentation (3 hours)

**Objective**: Participants can add custom spans and attributes to a service.

**Lab 3.1: Add a Custom Span**

Pick a service in the demo and add a custom span. The Python recommendation service is a good choice because it is straightforward:

```python
# File: src/recommendationservice/recommendation_server.py
# Task: Add a custom span around the recommendation filtering logic

from opentelemetry import trace

tracer = trace.get_tracer("recommendation-service")

def get_recommendations(product_ids, num_recommendations):
    # Add a span to measure the filtering step
    with tracer.start_as_current_span("recommendation.filter") as span:
        span.set_attribute("input.product_count", len(product_ids))
        span.set_attribute("requested.count", num_recommendations)

        # Existing filtering logic
        filtered = filter_products(product_ids)

        span.set_attribute("output.product_count", len(filtered))
        return filtered[:num_recommendations]
```

```markdown
Instructions:
1. Add the custom span shown above to the recommendation service
2. Rebuild the service: docker compose build recommendationservice
3. Restart: docker compose up -d recommendationservice
4. Generate some traffic by browsing products
5. Find your new span in Jaeger - verify the attributes appear
```

**Lab 3.2: Add a Custom Metric**

```markdown
Instructions:
1. Add a histogram metric that measures recommendation latency
2. Add a counter metric that tracks how many recommendations were served
3. Verify the metrics appear in Prometheus
4. Create a Grafana panel showing your new metrics
```

### Module 4: Debugging with Telemetry (2 hours)

**Objective**: Participants can use traces and metrics to diagnose production issues.

**Lab 4.1: Debug a Performance Regression**

```bash
# Enable the slow checkout feature flag
# This simulates a performance regression in the payment service
```

```markdown
Instructions:
1. Enable the "paymentServiceSlowResponse" feature flag
2. Monitor the checkout service latency dashboard
3. When you notice the latency increase:
   - Find a slow trace in Jaeger
   - Identify which span is causing the slowdown
   - Determine the root cause service
4. Write up your findings as if this were a real incident:
   - What metric alerted you?
   - How did you identify the root cause?
   - What would you do to fix it?
```

## Running the Training

**Group size**: 4-8 participants per session. Smaller groups allow for more hands-on help.

**Prerequisites**: Participants should have Docker installed and be comfortable with command-line tools.

**Facilitation tips**:
- Walk through Lab 1.1 together as a group, then let participants work independently
- Have participants share their screens when they find something interesting
- Keep a shared document where participants post their discoveries

**Assessment**: After completing all modules, give participants a "mystery scenario" using the demo's feature flags. Enable a failure mode without telling them what it is. They should use traces and metrics to identify the problem and propose a fix.

## Maintaining the Curriculum

Update the labs when the OTel Demo releases new versions. The demo is actively maintained and new services and features are added regularly. Review your curriculum quarterly to ensure the labs still work and the learning objectives are still relevant.

Store the lab instructions in your internal documentation alongside your instrumentation standards. When new developers complete the onboarding checklist, point them to this curriculum as the next step in their observability journey.
