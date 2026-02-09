# How to use OpenTelemetry baggage for cross-cutting concerns

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Baggage, Distributed Tracing, Context Propagation, Observability

Description: Learn how to use OpenTelemetry baggage to propagate cross-cutting context data like user IDs, feature flags, and tenant information across service boundaries in distributed systems.

---

OpenTelemetry baggage provides a mechanism to propagate arbitrary key-value pairs across service boundaries alongside trace context. Unlike span attributes which stay within a single service, baggage travels with requests through your entire distributed system, making it perfect for cross-cutting concerns.

## Understanding Baggage

Baggage consists of name-value pairs that propagate through distributed systems. Services can read baggage to make decisions or add it as span attributes. Common use cases include user identification, tenant routing, feature flags, and A/B testing configuration.

Baggage differs from trace context in important ways. While trace context contains only trace and span IDs for linking spans, baggage can contain any data. However, baggage adds overhead to requests, so use it judiciously.

## Setting and Reading Baggage

Set and read baggage values using the OpenTelemetry baggage API. Values propagate automatically when using instrumented HTTP clients and servers.

```python
# baggage_basics.py
from opentelemetry import baggage, trace
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from flask import Flask, request
import requests

app = Flask(__name__)
FlaskInstrumentor().instrument_app(app)
RequestsInstrumentor().instrument()

@app.route('/api/create-order')
def create_order():
    """Set baggage at entry point"""
    # Extract user information from request
    user_id = request.headers.get('X-User-ID', 'anonymous')
    tenant_id = request.headers.get('X-Tenant-ID', 'default')
    session_id = request.headers.get('X-Session-ID', 'unknown')

    # Set baggage values
    ctx = baggage.set_baggage("user.id", user_id)
    ctx = baggage.set_baggage("tenant.id", tenant_id, context=ctx)
    ctx = baggage.set_baggage("session.id", session_id, context=ctx)

    # Add feature flag state
    ctx = baggage.set_baggage("feature.new_checkout", "true", context=ctx)

    # Attach context
    from opentelemetry import context as ctx_api
    token = ctx_api.attach(ctx)

    try:
        # Make downstream call - baggage propagates automatically
        response = requests.post(
            'http://inventory-service:8080/api/reserve',
            json={'items': ['item1', 'item2']}
        )

        return {'status': 'success', 'data': response.json()}
    finally:
        ctx_api.detach(token)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)
```

The baggage values automatically propagate to downstream services via HTTP headers.

```python
# inventory_service.py
from flask import Flask
from opentelemetry import baggage, trace
from opentelemetry.instrumentation.flask import FlaskInstrumentor

app = Flask(__name__)
FlaskInstrumentor().instrument_app(app)

@app.route('/api/reserve', methods=['POST'])
def reserve_items():
    """Read baggage in downstream service"""
    # Baggage automatically extracted from incoming request

    # Read baggage values
    user_id = baggage.get_baggage("user.id")
    tenant_id = baggage.get_baggage("tenant.id")
    feature_enabled = baggage.get_baggage("feature.new_checkout")

    # Get current span and add baggage as attributes
    span = trace.get_current_span()
    span.set_attribute("user.id", user_id)
    span.set_attribute("tenant.id", tenant_id)

    # Use baggage for business logic
    if tenant_id == "premium":
        # Apply premium tenant logic
        priority = "high"
    else:
        priority = "normal"

    span.set_attribute("reservation.priority", priority)

    # Process reservation with tenant context
    result = process_reservation(user_id, tenant_id, priority)

    return {'status': 'reserved', 'priority': priority}

def process_reservation(user_id, tenant_id, priority):
    return True

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

## Multi-Tenant Context Propagation

Use baggage to propagate tenant information for multi-tenant applications.

```python
# multi_tenant_baggage.py
from opentelemetry import baggage, trace
from flask import Flask, request, g
import requests

app = Flask(__name__)

@app.before_request
def extract_tenant_context():
    """Extract tenant from baggage or headers"""
    # Try to get tenant from baggage first
    tenant_id = baggage.get_baggage("tenant.id")

    # Fallback to header
    if not tenant_id:
        tenant_id = request.headers.get('X-Tenant-ID', 'default')

        # Set baggage for downstream propagation
        ctx = baggage.set_baggage("tenant.id", tenant_id)
        from opentelemetry import context as ctx_api
        ctx_api.attach(ctx)

    # Get tenant configuration
    tenant_config = get_tenant_config(tenant_id)

    # Store in request context
    g.tenant_id = tenant_id
    g.tenant_config = tenant_config

    # Add to current span
    span = trace.get_current_span()
    span.set_attribute("tenant.id", tenant_id)
    span.set_attribute("tenant.tier", tenant_config['tier'])

def get_tenant_config(tenant_id):
    """Get tenant-specific configuration"""
    tenant_configs = {
        'default': {'tier': 'basic', 'rate_limit': 100},
        'premium': {'tier': 'premium', 'rate_limit': 1000},
    }
    return tenant_configs.get(tenant_id, tenant_configs['default'])

@app.route('/api/data')
def get_data():
    """Use tenant context from baggage"""
    # Apply tenant-specific rate limiting
    if g.tenant_config['rate_limit'] < 100:
        return {'error': 'Rate limit exceeded'}, 429

    # Make downstream call - tenant context propagates automatically
    response = requests.get('http://data-service:8080/api/tenant-data')

    return response.json()
```

## Feature Flag Propagation

Propagate feature flag state through your system using baggage.

```python
# feature_flags_baggage.py
from opentelemetry import baggage, trace
from flask import Flask, request
import requests

app = Flask(__name__)

class FeatureFlagService:
    """Manage feature flags"""

    @staticmethod
    def evaluate_flags(user_id, tenant_id):
        """Evaluate feature flags for user and tenant"""
        flags = {
            'new_ui': True,
            'beta_features': tenant_id == 'premium',
            'advanced_analytics': user_id in ['user123', 'user456'],
        }
        return flags

@app.route('/api/dashboard')
def dashboard():
    """Entry point that evaluates and propagates feature flags"""
    user_id = request.headers.get('X-User-ID', 'anonymous')
    tenant_id = request.headers.get('X-Tenant-ID', 'default')

    # Evaluate feature flags
    flags = FeatureFlagService.evaluate_flags(user_id, tenant_id)

    # Set flags in baggage for downstream propagation
    ctx = baggage.set_baggage("user.id", user_id)
    ctx = baggage.set_baggage("tenant.id", tenant_id, context=ctx)

    # Add each flag to baggage
    for flag_name, flag_value in flags.items():
        ctx = baggage.set_baggage(
            f"feature.{flag_name}",
            str(flag_value).lower(),
            context=ctx
        )

    # Attach context
    from opentelemetry import context as ctx_api
    token = ctx_api.attach(ctx)

    try:
        # Fetch dashboard data - flags propagate to all services
        analytics_data = requests.get('http://analytics-service:8080/api/data')
        user_data = requests.get('http://user-service:8080/api/profile')

        return {
            'analytics': analytics_data.json(),
            'user': user_data.json(),
            'features': flags
        }
    finally:
        ctx_api.detach(token)

# Downstream service reading feature flags
from flask import Flask as DownstreamFlask

downstream_app = DownstreamFlask(__name__)

@downstream_app.route('/api/data')
def get_analytics_data():
    """Use feature flags from baggage"""
    # Read feature flags from baggage
    advanced_analytics = baggage.get_baggage("feature.advanced_analytics") == "true"
    beta_features = baggage.get_baggage("feature.beta_features") == "true"

    # Add flags to span attributes
    span = trace.get_current_span()
    span.set_attribute("feature.advanced_analytics", advanced_analytics)
    span.set_attribute("feature.beta_features", beta_features)

    # Return different data based on flags
    if advanced_analytics:
        return {'data': 'detailed_analytics', 'type': 'advanced'}
    else:
        return {'data': 'basic_analytics', 'type': 'standard'}
```

## A/B Testing Context

Use baggage to propagate A/B test assignments across services.

```python
# ab_testing_baggage.py
from opentelemetry import baggage, trace
from flask import Flask, request
import hashlib
import requests

app = Flask(__name__)

class ABTestService:
    """Manage A/B test assignments"""

    @staticmethod
    def assign_variant(user_id, experiment_name):
        """Consistently assign user to A/B test variant"""
        # Hash user ID for consistent assignment
        hash_value = int(hashlib.md5(f"{user_id}{experiment_name}".encode()).hexdigest(), 16)

        # Assign to variant A or B
        return 'A' if hash_value % 2 == 0 else 'B'

@app.route('/api/product/<product_id>')
def get_product(product_id):
    """Endpoint with A/B testing"""
    user_id = request.headers.get('X-User-ID', 'anonymous')

    # Assign A/B test variants
    pricing_variant = ABTestService.assign_variant(user_id, 'pricing_experiment')
    layout_variant = ABTestService.assign_variant(user_id, 'layout_experiment')

    # Propagate A/B test assignments via baggage
    ctx = baggage.set_baggage("user.id", user_id)
    ctx = baggage.set_baggage("ab_test.pricing", pricing_variant, context=ctx)
    ctx = baggage.set_baggage("ab_test.layout", layout_variant, context=ctx)

    # Attach context
    from opentelemetry import context as ctx_api
    token = ctx_api.attach(ctx)

    # Add to span for analysis
    span = trace.get_current_span()
    span.set_attribute("ab_test.pricing_variant", pricing_variant)
    span.set_attribute("ab_test.layout_variant", layout_variant)

    try:
        # Fetch product details - variants propagate
        product = requests.get(f'http://catalog-service:8080/api/products/{product_id}')
        pricing = requests.get(f'http://pricing-service:8080/api/price/{product_id}')

        return {
            'product': product.json(),
            'pricing': pricing.json(),
            'experiment_variants': {
                'pricing': pricing_variant,
                'layout': layout_variant
            }
        }
    finally:
        ctx_api.detach(token)

# Pricing service using A/B test variant
pricing_app = Flask(__name__)

@pricing_app.route('/api/price/<product_id>')
def get_price(product_id):
    """Return price based on A/B test variant"""
    # Read A/B test variant from baggage
    pricing_variant = baggage.get_baggage("ab_test.pricing")
    user_id = baggage.get_baggage("user.id")

    # Add to span
    span = trace.get_current_span()
    span.set_attribute("pricing.variant", pricing_variant)
    span.set_attribute("user.id", user_id)

    # Return different pricing based on variant
    base_price = 99.99

    if pricing_variant == 'A':
        # Control group - regular price
        final_price = base_price
        span.set_attribute("pricing.strategy", "regular")
    else:
        # Test group - discounted price
        final_price = base_price * 0.9
        span.set_attribute("pricing.strategy", "discounted")

    return {
        'price': final_price,
        'variant': pricing_variant,
        'currency': 'USD'
    }
```

## Baggage Best Practices

Follow these best practices when using baggage to avoid common pitfalls.

```python
# baggage_best_practices.py
from opentelemetry import baggage, trace
import json

def set_baggage_safely(key, value, max_length=4096):
    """Set baggage with size limits"""
    # Convert value to string
    str_value = str(value)

    # Check size
    if len(str_value) > max_length:
        # Truncate or skip
        print(f"Warning: Baggage value for '{key}' exceeds {max_length} bytes")
        str_value = str_value[:max_length]

    # Set baggage
    ctx = baggage.set_baggage(key, str_value)
    return ctx

def get_all_baggage():
    """Get all baggage entries"""
    # Get all baggage as dictionary
    all_baggage = {}

    # Note: OpenTelemetry Python doesn't have get_all method
    # You need to track keys you set
    known_keys = ['user.id', 'tenant.id', 'session.id']

    for key in known_keys:
        value = baggage.get_baggage(key)
        if value:
            all_baggage[key] = value

    return all_baggage

def add_baggage_to_span():
    """Add all baggage to current span as attributes"""
    span = trace.get_current_span()

    # Add known baggage keys as span attributes
    known_keys = ['user.id', 'tenant.id', 'session.id', 'feature.new_checkout']

    for key in known_keys:
        value = baggage.get_baggage(key)
        if value:
            span.set_attribute(f"baggage.{key}", value)
```

## Baggage Size Considerations

Baggage adds overhead to every request, so keep it small and focused.

```python
# baggage_size_management.py
from opentelemetry import baggage

def set_critical_baggage_only():
    """Only propagate essential data"""
    # Good: Small, essential values
    ctx = baggage.set_baggage("user.id", "user123")
    ctx = baggage.set_baggage("tenant.id", "tenant456", context=ctx)

    # Bad: Large or unnecessary values
    # Don't do this:
    # ctx = baggage.set_baggage("entire.user.object", json.dumps(large_user_object))

    return ctx

def use_references_not_data():
    """Use IDs instead of full objects"""
    # Good: Just the session ID
    ctx = baggage.set_baggage("session.id", "session-abc123")

    # Bad: Entire session data
    # ctx = baggage.set_baggage("session.data", json.dumps({...large_object...}))

    return ctx
```

OpenTelemetry baggage enables powerful cross-cutting context propagation across distributed systems. Use it for user identification, tenant routing, feature flags, and A/B testing to make decisions consistently across all services while maintaining observability through span attributes.
