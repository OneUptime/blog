# How to Use the Error Reporting API to Report Custom Errors from Application Code

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Error Reporting, API, Custom Errors, Application Monitoring

Description: Learn how to use the Google Cloud Error Reporting API to report custom errors directly from your application code in Python, Node.js, Java, and Go.

---

Google Cloud Error Reporting automatically captures errors from many GCP services. But what about errors in your own application logic that do not result in unhandled exceptions? Business logic violations, validation failures, degraded service conditions - these are errors that matter to your application but might not throw exceptions in the traditional sense.

The Error Reporting API lets you report these custom errors directly from your code. This gives you a single pane of glass for all errors, whether they are unhandled crashes or application-specific issues you want to track.

## When to Use Custom Error Reporting

You do not need the API for standard exceptions. If your application throws an unhandled exception on a GCP service like App Engine, Cloud Run, or GKE, Error Reporting catches it automatically through Cloud Logging.

Use the API when you need to:

- Report errors that your code catches and handles gracefully
- Track business logic violations as errors (like a payment processing failure)
- Report errors from non-standard environments where automatic capture is not available
- Add custom context to errors beyond what automatic capture provides
- Report errors from background jobs or queue processors where there is no HTTP context

## Setting Up the Error Reporting Client Library

First, install the client library for your language.

For Python:

```bash
# Install the Error Reporting client library for Python
pip install google-cloud-error_reporting
```

For Node.js:

```bash
# Install the Error Reporting client library for Node.js
npm install @google-cloud/error-reporting
```

Make sure you have authentication configured. The simplest approach is to use a service account with the Error Reporting Writer role (`roles/errorreporting.writer`).

## Reporting Errors in Python

Here is the basic setup and usage in Python:

```python
# Basic error reporting setup for Python applications
from google.cloud import error_reporting

# Initialize the client with your service name and version
client = error_reporting.Client(
    service='payment-service',
    version='2.1.0',
    project='my-gcp-project'
)

def process_payment(order):
    try:
        result = payment_gateway.charge(order.amount, order.card_token)
        if not result.success:
            # This is a business logic error - the payment was declined
            # Report it as a custom error so it shows up in Error Reporting
            client.report(
                f"Payment declined for order {order.id}: {result.decline_reason}"
            )
            return {"status": "declined", "reason": result.decline_reason}
        return {"status": "success", "transaction_id": result.transaction_id}
    except Exception as e:
        # For actual exceptions, report with the full stack trace
        client.report_exception()
        raise
```

When you want to include HTTP context:

```python
# Report a custom error with HTTP request context
from google.cloud import error_reporting

client = error_reporting.Client(
    service='api-gateway',
    version='3.0.1'
)

def handle_request(request):
    # Build the HTTP context from the request
    http_context = error_reporting.HTTPContext(
        method=request.method,
        url=request.url,
        user_agent=request.user_agent.string,
        remote_ip=request.remote_addr,
        response_status_code=400
    )

    # Validate the request body
    errors = validate_request(request.json)
    if errors:
        # Report validation errors as custom errors with HTTP context
        client.report(
            f"Request validation failed: {', '.join(errors)}",
            http_context=http_context
        )
        return {"errors": errors}, 400
```

## Reporting Errors in Node.js

The Node.js client works similarly:

```javascript
// Error reporting setup for Node.js applications
const { ErrorReporting } = require('@google-cloud/error-reporting');

// Initialize with service context
const errors = new ErrorReporting({
  projectId: 'my-gcp-project',
  serviceContext: {
    service: 'user-service',
    version: '1.5.2'
  }
});

// Report a custom error message
function processUserRegistration(userData) {
  const existingUser = await db.findUser(userData.email);

  if (existingUser) {
    // Report duplicate registration attempt as an error for monitoring
    errors.report(`Duplicate registration attempt for email: ${maskEmail(userData.email)}`);
    return { error: 'Email already registered' };
  }

  try {
    const user = await db.createUser(userData);
    return { user };
  } catch (err) {
    // Report the actual exception with full stack trace
    errors.report(err);
    throw err;
  }
}

// Report an Error object for proper stack trace capture
function reportWithStackTrace(message) {
  // Creating an Error object captures the current stack trace
  const error = new Error(message);
  errors.report(error);
}
```

## Reporting Errors in Go

Go does not have exceptions, so custom error reporting is especially useful:

```go
// Error reporting setup for Go applications
package main

import (
    "context"
    "fmt"
    "log"

    errorreporting "cloud.google.com/go/errorreporting"
)

var errorClient *errorreporting.Client

func initErrorReporting() {
    ctx := context.Background()
    var err error

    // Initialize the error reporting client with service context
    errorClient, err = errorreporting.NewClient(ctx, "my-gcp-project", errorreporting.Config{
        ServiceName:    "data-pipeline",
        ServiceVersion: "0.9.0",
        OnError: func(err error) {
            log.Printf("Could not report error: %v", err)
        },
    })
    if err != nil {
        log.Fatalf("Failed to create error reporting client: %v", err)
    }
}

func processDataBatch(batchID string, records []Record) error {
    var failedRecords int

    for _, record := range records {
        if err := validateRecord(record); err != nil {
            failedRecords++
            // Report each validation failure as a custom error
            errorClient.Report(errorreporting.Entry{
                Error: fmt.Errorf("record validation failed in batch %s: %w", batchID, err),
            })
        }
    }

    // Report if too many records failed - this is a business logic error
    if failedRecords > len(records)/2 {
        errorClient.Report(errorreporting.Entry{
            Error: fmt.Errorf("batch %s had %d/%d failed records - exceeds 50%% threshold",
                batchID, failedRecords, len(records)),
        })
    }

    return nil
}

func main() {
    initErrorReporting()
    defer errorClient.Close()
    // Application logic here
}
```

## Using the REST API Directly

If you are working in a language without a client library or need more control, you can call the Error Reporting REST API directly:

```bash
# Report a custom error using the REST API with curl
curl -X POST \
  "https://clouderrorreporting.googleapis.com/v1beta1/projects/my-gcp-project/events:report" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "serviceContext": {
      "service": "batch-processor",
      "version": "1.0.0"
    },
    "message": "Error: Data integrity check failed\n    at checkIntegrity (processor.js:42)\n    at processBatch (processor.js:15)\n    at main (index.js:8)",
    "context": {
      "reportLocation": {
        "filePath": "processor.js",
        "lineNumber": 42,
        "functionName": "checkIntegrity"
      }
    }
  }'
```

The `message` field should include a stack trace format for Error Reporting to properly group the error. Even if you are constructing a synthetic stack trace, include it so the grouping algorithm works correctly.

## Adding User Context

Tracking which users are affected by errors helps prioritize fixes:

```python
# Report errors with user context for impact tracking
from google.cloud import error_reporting

client = error_reporting.Client(service='web-app', version='4.0.0')

def report_error_with_user(error_message, user_id, request):
    http_context = error_reporting.HTTPContext(
        method=request.method,
        url=request.url,
        user_agent=request.user_agent.string,
        remote_ip=request.remote_addr
    )

    # Include the user ID in the error context
    # Note: use a hashed or anonymized user ID for privacy
    client.report(
        f"[User: {hash_user_id(user_id)}] {error_message}",
        http_context=http_context,
        user=str(hash_user_id(user_id))
    )
```

## Structuring Custom Error Messages

How you structure your error messages affects how Error Reporting groups them. Follow these guidelines:

1. Put the error type at the beginning of the message
2. Keep variable data (like IDs and timestamps) at the end or omit them
3. Use consistent prefixes for error categories

```python
# Good error messages - consistent prefix, variable data at end
client.report("PaymentDeclined: insufficient funds for order 12345")
client.report("PaymentDeclined: card expired for order 67890")
# These will be grouped together since the prefix matches

# Bad error messages - variable data makes each one unique
client.report("Order 12345 payment was declined because of insufficient funds")
client.report("Order 67890 payment was declined because the card is expired")
# These might be split into separate groups
```

## Error Reporting in Background Jobs

Background jobs like Pub/Sub subscribers or Cloud Tasks handlers do not have HTTP context, but you should still report errors:

```python
# Error reporting for Pub/Sub message handlers
from google.cloud import error_reporting, pubsub_v1

client = error_reporting.Client(service='message-processor', version='1.0.0')

def process_message(message):
    try:
        data = json.loads(message.data)
        result = transform_and_store(data)
        message.ack()
    except json.JSONDecodeError:
        # Report malformed messages
        client.report(f"MalformedMessage: invalid JSON in message {message.message_id}")
        message.ack()  # Ack to prevent infinite retry
    except Exception as e:
        # Report processing errors with full stack trace
        client.report_exception()
        message.nack()  # Nack to retry
```

## Best Practices

1. **Do not report expected conditions as errors.** A user entering wrong password is not an error - it is normal behavior. Reserve custom error reporting for genuinely unexpected or problematic situations.
2. **Include enough context to debug.** The error message should tell you what went wrong. Include relevant IDs and state, but sanitize sensitive data.
3. **Set service name and version consistently.** This is how Error Reporting groups errors by service. Inconsistent naming leads to fragmented error views.
4. **Batch where possible.** If you are processing records in bulk, do not report an error for every single failed record. Report a summary or report only when a threshold is exceeded.
5. **Use report_exception for actual exceptions.** The client library captures the full stack trace automatically when you use `report_exception()`. Use `report()` for custom messages.

## Wrapping Up

The Error Reporting API extends your visibility beyond unhandled exceptions into the full range of things that can go wrong in your application. By reporting custom errors for business logic failures, validation issues, and degraded conditions, you get a complete picture of application health in a single dashboard. Start with the high-impact error cases and expand coverage as your team gets comfortable with the workflow.
