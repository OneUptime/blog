# How to Use Apigee JavaScript Policies for Custom Request and Response Transformation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apigee, GCP, JavaScript Policies, API Transformation, API Management

Description: Learn how to use Apigee JavaScript policies to implement custom request and response transformations that go beyond what declarative policies can handle.

---

Apigee's declarative policies handle most common API gateway tasks - adding headers, extracting variables, setting up caching. But sometimes you need logic that is too complex for XML configuration. Maybe you need to restructure a JSON response, calculate values based on multiple fields, or implement custom validation logic. That is where JavaScript policies come in. They let you run JavaScript code within the proxy flow, giving you full programmatic control over request and response processing.

## When to Use JavaScript Policies

Use JavaScript policies when you need:
- Complex JSON transformation (reshaping payloads, merging data)
- Custom validation logic beyond simple pattern matching
- Mathematical calculations or data aggregation
- Conditional logic that is too complex for Apigee conditions
- String manipulation or formatting
- Custom error response construction

Avoid JavaScript policies for things that declarative policies handle well (like adding headers or extracting simple values). Declarative policies are faster and easier to maintain.

## Creating a JavaScript Policy

A JavaScript policy has two parts: the policy XML file and the JavaScript source file.

### The Policy Definition

```xml
<!-- apiproxy/policies/TransformResponse.xml -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Javascript name="TransformResponse" timeLimit="200">
    <DisplayName>Transform Response</DisplayName>
    <!-- Reference to the JS file in the resources directory -->
    <ResourceURL>jsc://transform-response.js</ResourceURL>
</Javascript>
```

The `timeLimit` is in milliseconds and sets the maximum execution time. If your script exceeds this, it is terminated and the request fails. Keep this as low as reasonable - 200ms is a good default.

### The JavaScript Source File

JavaScript files live in the `apiproxy/resources/jsc/` directory:

```javascript
// apiproxy/resources/jsc/transform-response.js

// Read the response body
var responseBody = context.getVariable("response.content");

// Parse the JSON response
var data = JSON.parse(responseBody);

// Transform the response structure
var transformed = {
    status: "success",
    data: data,
    metadata: {
        timestamp: new Date().toISOString(),
        version: "2.0"
    }
};

// Write the transformed response back
context.setVariable("response.content", JSON.stringify(transformed));

// Update the content type if needed
context.setVariable("response.header.content-type", "application/json");
```

## Transforming Request Payloads

Modify incoming requests before they reach your backend.

This script normalizes different input formats into a consistent structure:

```javascript
// apiproxy/resources/jsc/normalize-request.js

// Read the incoming request body
var requestBody = context.getVariable("request.content");

if (requestBody) {
    var input = JSON.parse(requestBody);

    // Normalize different date formats to ISO 8601
    if (input.date) {
        var date = new Date(input.date);
        if (!isNaN(date.getTime())) {
            input.date = date.toISOString();
        }
    }

    // Normalize phone numbers - strip everything except digits and leading +
    if (input.phone) {
        input.phone = input.phone.replace(/[^\d+]/g, "");
        // Add country code if missing
        if (!input.phone.startsWith("+")) {
            input.phone = "+1" + input.phone;
        }
    }

    // Normalize email to lowercase
    if (input.email) {
        input.email = input.email.toLowerCase().trim();
    }

    // Ensure required fields have defaults
    input.source = input.source || "api";
    input.version = input.version || "1.0";

    // Write the normalized request back
    context.setVariable("request.content", JSON.stringify(input));
}
```

The policy definition:

```xml
<!-- apiproxy/policies/NormalizeRequest.xml -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Javascript name="NormalizeRequest" timeLimit="200">
    <DisplayName>Normalize Request</DisplayName>
    <ResourceURL>jsc://normalize-request.js</ResourceURL>
</Javascript>
```

## Reshaping API Responses

One of the most common use cases is transforming a backend response into a different structure for your API consumers.

This script converts a legacy backend response into a modern API format:

```javascript
// apiproxy/resources/jsc/reshape-response.js

var responseBody = context.getVariable("response.content");
var statusCode = context.getVariable("response.status.code");

try {
    var backendData = JSON.parse(responseBody);

    // The backend returns a flat structure:
    // { user_id: 1, user_name: "Alice", user_email: "alice@example.com",
    //   order_count: 5, last_order_date: "2026-01-15" }

    // Transform into a nested, modern API structure
    var apiResponse = {
        id: String(backendData.user_id),
        type: "user",
        attributes: {
            name: backendData.user_name,
            email: backendData.user_email
        },
        relationships: {
            orders: {
                count: backendData.order_count || 0,
                lastOrderDate: backendData.last_order_date || null
            }
        },
        links: {
            self: "/api/v2/users/" + backendData.user_id,
            orders: "/api/v2/users/" + backendData.user_id + "/orders"
        }
    };

    // Wrap in standard envelope
    var envelope = {
        data: apiResponse,
        meta: {
            requestId: context.getVariable("messageid"),
            timestamp: new Date().toISOString()
        }
    };

    context.setVariable("response.content", JSON.stringify(envelope));
    context.setVariable("response.header.content-type", "application/json");

} catch (e) {
    // If transformation fails, log the error and return a generic error response
    print("Transform error: " + e.message);

    var errorResponse = {
        error: {
            code: "TRANSFORM_ERROR",
            message: "Failed to process backend response"
        }
    };

    context.setVariable("response.content", JSON.stringify(errorResponse));
    context.setVariable("response.status.code", 502);
}
```

## Custom Request Validation

Implement validation logic that goes beyond what the standard policies offer.

This script validates a complex order request:

```javascript
// apiproxy/resources/jsc/validate-order.js

var requestBody = context.getVariable("request.content");
var errors = [];

try {
    var order = JSON.parse(requestBody);

    // Validate required fields
    if (!order.customerId) {
        errors.push("customerId is required");
    }

    if (!order.items || !Array.isArray(order.items) || order.items.length === 0) {
        errors.push("At least one item is required");
    }

    // Validate each line item
    if (order.items) {
        order.items.forEach(function(item, index) {
            if (!item.productId) {
                errors.push("items[" + index + "].productId is required");
            }
            if (!item.quantity || item.quantity < 1) {
                errors.push("items[" + index + "].quantity must be at least 1");
            }
            if (item.quantity > 100) {
                errors.push("items[" + index + "].quantity cannot exceed 100");
            }
            if (!item.unitPrice || item.unitPrice <= 0) {
                errors.push("items[" + index + "].unitPrice must be positive");
            }
        });
    }

    // Validate shipping address if provided
    if (order.shippingAddress) {
        var addr = order.shippingAddress;
        var requiredFields = ["street", "city", "state", "zipCode", "country"];
        requiredFields.forEach(function(field) {
            if (!addr[field]) {
                errors.push("shippingAddress." + field + " is required");
            }
        });

        // Validate zip code format for US addresses
        if (addr.country === "US" && addr.zipCode) {
            var zipRegex = /^\d{5}(-\d{4})?$/;
            if (!zipRegex.test(addr.zipCode)) {
                errors.push("Invalid US zip code format");
            }
        }
    }

    // Calculate order total and add it to the request
    if (order.items && errors.length === 0) {
        var total = 0;
        order.items.forEach(function(item) {
            total += item.quantity * item.unitPrice;
        });
        order.calculatedTotal = Math.round(total * 100) / 100;

        // Write updated request with calculated total
        context.setVariable("request.content", JSON.stringify(order));
    }

} catch (e) {
    errors.push("Invalid JSON in request body: " + e.message);
}

// Store validation results in flow variables
if (errors.length > 0) {
    context.setVariable("validation.failed", true);
    context.setVariable("validation.errors", JSON.stringify(errors));
} else {
    context.setVariable("validation.failed", false);
}
```

Pair this with a RaiseFault policy that returns errors if validation fails:

```xml
<!-- apiproxy/policies/ValidationFault.xml -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<RaiseFault name="ValidationFault">
    <DisplayName>Validation Error Response</DisplayName>
    <FaultResponse>
        <Set>
            <StatusCode>400</StatusCode>
            <Payload contentType="application/json">
{
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Request validation failed",
        "details": {validation.errors}
    }
}
            </Payload>
        </Set>
    </FaultResponse>
</RaiseFault>
```

Wire them together in the proxy flow:

```xml
<Flow name="CreateOrder">
    <Condition>(proxy.pathsuffix MatchesPath "/orders") and (request.verb = "POST")</Condition>
    <Request>
        <!-- Run validation first -->
        <Step>
            <Name>ValidateOrder</Name>
        </Step>
        <!-- Return errors if validation failed -->
        <Step>
            <Name>ValidationFault</Name>
            <Condition>validation.failed = true</Condition>
        </Step>
    </Request>
</Flow>
```

## Aggregating Multiple Backend Responses

JavaScript policies can work with data from multiple ServiceCallout responses to build a composite response.

```javascript
// apiproxy/resources/jsc/aggregate-responses.js

// Read responses from multiple service callouts
var userResponse = context.getVariable("userCallout.response.content");
var ordersResponse = context.getVariable("ordersCallout.response.content");
var prefsResponse = context.getVariable("prefsCallout.response.content");

try {
    var user = JSON.parse(userResponse);
    var orders = JSON.parse(ordersResponse);
    var prefs = JSON.parse(prefsResponse);

    // Aggregate into a single response
    var aggregated = {
        user: {
            id: user.id,
            name: user.name,
            email: user.email
        },
        recentOrders: orders.slice(0, 5).map(function(order) {
            return {
                id: order.id,
                date: order.date,
                total: order.total
            };
        }),
        preferences: {
            language: prefs.language || "en",
            timezone: prefs.timezone || "UTC",
            notifications: prefs.notifications || false
        },
        summary: {
            totalOrders: orders.length,
            totalSpent: orders.reduce(function(sum, order) {
                return sum + (order.total || 0);
            }, 0)
        }
    };

    context.setVariable("response.content", JSON.stringify(aggregated));
    context.setVariable("response.status.code", 200);
    context.setVariable("response.header.content-type", "application/json");

} catch (e) {
    print("Aggregation error: " + e.message);
    context.setVariable("aggregation.error", e.message);
}
```

## Working with the Apigee Context Object

The `context` object is your interface to the Apigee runtime. Here are the most commonly used methods:

```javascript
// apiproxy/resources/jsc/context-examples.js

// Read flow variables
var apiKey = context.getVariable("request.header.x-api-key");
var clientId = context.getVariable("client_id");
var verb = context.getVariable("request.verb");
var path = context.getVariable("proxy.pathsuffix");

// Set flow variables (available to subsequent policies)
context.setVariable("custom.calculated_value", "some result");
context.setVariable("target.url", "https://alternate-backend.example.com");

// Read request and response content
var requestContent = context.getVariable("request.content");
var responseContent = context.getVariable("response.content");

// Set response content
context.setVariable("response.content", "new body");
context.setVariable("response.status.code", 200);

// Access proxy metadata
var proxyName = context.getVariable("apiproxy.name");
var proxyRevision = context.getVariable("apiproxy.revision");
var environment = context.getVariable("environment.name");

// Logging (visible in Trace tool)
print("Debug: processing request for " + path);
```

## Performance Considerations

JavaScript policies add latency. Keep these best practices in mind:

1. **Minimize JSON parsing.** Parse once and pass the result through flow variables if multiple policies need the data.

2. **Keep scripts focused.** One script per task, not one mega-script that does everything.

3. **Set appropriate time limits.** If your script should finish in 50ms, set `timeLimit="100"` to catch runaway scripts early.

4. **Avoid loops over large datasets.** If you need to process thousands of items, consider doing that in your backend service instead.

5. **Use print() sparingly in production.** Logging adds overhead. Use it for debugging but remove verbose logging before going to production.

## Summary

Apigee JavaScript policies give you programmatic control over request and response processing when declarative policies fall short. Use them for complex JSON transformations, custom validation, response aggregation, and data calculations. Keep your scripts focused and performant - read and write through the context object, handle errors gracefully, and use the Trace tool to debug. The combination of declarative policies for standard operations and JavaScript policies for custom logic gives you a powerful, maintainable API proxy layer.
