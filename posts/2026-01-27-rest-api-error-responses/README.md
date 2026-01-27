# How to Design Error Responses in REST APIs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: REST API, Error Handling, API Design, HTTP Status Codes, Best Practices

Description: Learn how to design consistent, informative error responses in REST APIs including status codes, error formats, and client-friendly messages.

---

> A well-designed error response tells the client exactly what went wrong, why it happened, and how to fix it - all without exposing internal implementation details.

Error handling is one of the most overlooked aspects of API design. While developers spend significant time crafting successful responses, error responses often get minimal attention. This guide walks through practical patterns for designing error responses that help API consumers debug issues quickly while keeping your system secure.

---

## Why Consistent Error Responses Matter

Inconsistent error handling creates friction for API consumers:

- Clients cannot reliably parse error details
- Debugging becomes guesswork
- Integration time increases significantly
- Support tickets multiply

A consistent error format allows clients to:

1. Programmatically handle errors based on type
2. Display meaningful messages to end users
3. Log structured data for debugging
4. Implement retry logic appropriately

---

## HTTP Status Codes: The Foundation

HTTP status codes provide the first layer of error information. Use them correctly.

### Client Errors (4xx)

| Code | Name | When to Use |
|------|------|-------------|
| 400 | Bad Request | Malformed syntax, invalid JSON, missing required fields |
| 401 | Unauthorized | Missing or invalid authentication credentials |
| 403 | Forbidden | Valid credentials but insufficient permissions |
| 404 | Not Found | Resource does not exist |
| 405 | Method Not Allowed | HTTP method not supported for this endpoint |
| 409 | Conflict | Request conflicts with current state (duplicate, version mismatch) |
| 422 | Unprocessable Entity | Valid syntax but semantic errors (validation failures) |
| 429 | Too Many Requests | Rate limit exceeded |

### Server Errors (5xx)

| Code | Name | When to Use |
|------|------|-------------|
| 500 | Internal Server Error | Unexpected server failure |
| 502 | Bad Gateway | Upstream service returned invalid response |
| 503 | Service Unavailable | Server temporarily overloaded or in maintenance |
| 504 | Gateway Timeout | Upstream service timed out |

### Common Mistakes

```
// Wrong: Using 200 for errors
HTTP/1.1 200 OK
{ "success": false, "error": "User not found" }

// Correct: Use appropriate status code
HTTP/1.1 404 Not Found
{ "type": "not_found", "message": "User not found" }
```

---

## Standard Error Response Structure (RFC 7807)

RFC 7807 defines a standard format called "Problem Details for HTTP APIs." Adopting this format improves interoperability.

### Basic Structure

```json
{
  "type": "https://api.example.com/errors/insufficient-funds",
  "title": "Insufficient Funds",
  "status": 422,
  "detail": "Your account balance of $30.00 is insufficient for the $50.00 transaction.",
  "instance": "/transactions/abc123"
}
```

### Field Definitions

| Field | Required | Description |
|-------|----------|-------------|
| type | Yes | URI identifying the error type (use for programmatic handling) |
| title | Yes | Human-readable summary (same for all instances of this type) |
| status | Yes | HTTP status code |
| detail | No | Human-readable explanation specific to this occurrence |
| instance | No | URI reference identifying this specific occurrence |

### Extended Example with Custom Fields

```json
{
  "type": "https://api.example.com/errors/validation-failed",
  "title": "Validation Failed",
  "status": 422,
  "detail": "The request contains 3 validation errors.",
  "instance": "/orders/create/attempt/789",
  "errors": [
    {
      "field": "email",
      "code": "invalid_format",
      "message": "Email address is not valid"
    },
    {
      "field": "quantity",
      "code": "out_of_range",
      "message": "Quantity must be between 1 and 100"
    },
    {
      "field": "shipping_date",
      "code": "invalid_date",
      "message": "Shipping date cannot be in the past"
    }
  ],
  "trace_id": "abc123xyz"
}
```

---

## Error Codes vs Status Codes

HTTP status codes are coarse-grained. Error codes provide fine-grained categorization.

### Design Principles

1. Use consistent naming (e.g., `snake_case` or `SCREAMING_SNAKE_CASE`)
2. Group by domain (e.g., `auth.token_expired`, `payment.card_declined`)
3. Document every error code
4. Keep codes stable across API versions

### Example Error Code Taxonomy

```
auth.invalid_credentials
auth.token_expired
auth.token_revoked
auth.mfa_required

user.not_found
user.email_taken
user.suspended

payment.card_declined
payment.insufficient_funds
payment.currency_mismatch

rate_limit.exceeded
rate_limit.burst_exceeded
```

### Implementation Example (Node.js/Express)

```javascript
// errors.js - Define your error types
class APIError extends Error {
  constructor(type, title, status, detail, extras = {}) {
    super(detail);
    this.type = type;
    this.title = title;
    this.status = status;
    this.detail = detail;
    this.extras = extras;
  }

  // Convert to RFC 7807 response format
  toResponse(instance) {
    return {
      type: `https://api.example.com/errors/${this.type}`,
      title: this.title,
      status: this.status,
      detail: this.detail,
      instance,
      ...this.extras
    };
  }
}

// Pre-defined error types for consistency
const Errors = {
  NotFound: (resource, id) =>
    new APIError(
      'not_found',
      'Resource Not Found',
      404,
      `${resource} with id '${id}' was not found`
    ),

  ValidationFailed: (errors) =>
    new APIError(
      'validation_failed',
      'Validation Failed',
      422,
      `The request contains ${errors.length} validation error(s)`,
      { errors }
    ),

  RateLimitExceeded: (retryAfter) =>
    new APIError(
      'rate_limit_exceeded',
      'Rate Limit Exceeded',
      429,
      'You have exceeded the rate limit for this endpoint',
      { retry_after: retryAfter }
    ),

  Unauthorized: () =>
    new APIError(
      'unauthorized',
      'Authentication Required',
      401,
      'Valid authentication credentials are required'
    )
};

module.exports = { APIError, Errors };
```

### Error Handler Middleware

```javascript
// errorHandler.js
const errorHandler = (err, req, res, next) => {
  // Handle known API errors
  if (err instanceof APIError) {
    return res
      .status(err.status)
      .set('Content-Type', 'application/problem+json')
      .json(err.toResponse(req.originalUrl));
  }

  // Log unexpected errors (but do not expose details)
  console.error('Unexpected error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    trace_id: req.traceId
  });

  // Return generic error to client
  return res
    .status(500)
    .set('Content-Type', 'application/problem+json')
    .json({
      type: 'https://api.example.com/errors/internal_error',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An unexpected error occurred. Please try again later.',
      instance: req.originalUrl,
      trace_id: req.traceId
    });
};

module.exports = errorHandler;
```

---

## Validation Error Responses

Validation errors deserve special attention since they are the most common error type.

### Best Practices

1. Return all validation errors at once (not one at a time)
2. Include the field name, error code, and human-readable message
3. Use consistent field paths for nested objects
4. Provide the rejected value when safe to do so

### Example: Comprehensive Validation Response

```json
{
  "type": "https://api.example.com/errors/validation_failed",
  "title": "Validation Failed",
  "status": 422,
  "detail": "The request body contains invalid data",
  "errors": [
    {
      "field": "email",
      "code": "invalid_format",
      "message": "Must be a valid email address",
      "rejected_value": "not-an-email"
    },
    {
      "field": "age",
      "code": "out_of_range",
      "message": "Must be between 18 and 120",
      "rejected_value": 15
    },
    {
      "field": "address.postal_code",
      "code": "invalid_format",
      "message": "Must be a valid postal code for the selected country"
    }
  ]
}
```

### Python/FastAPI Implementation

```python
# validation_errors.py
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Any

app = FastAPI()

# Custom exception for business validation
class ValidationError(Exception):
    def __init__(self, errors: List[dict]):
        self.errors = errors

# Transform Pydantic validation errors to RFC 7807 format
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError
):
    errors = []
    for error in exc.errors():
        # Convert field path from list to dot notation
        field = ".".join(str(loc) for loc in error["loc"] if loc != "body")
        errors.append({
            "field": field,
            "code": error["type"],
            "message": error["msg"]
        })

    return JSONResponse(
        status_code=422,
        content={
            "type": "https://api.example.com/errors/validation_failed",
            "title": "Validation Failed",
            "status": 422,
            "detail": f"The request contains {len(errors)} validation error(s)",
            "instance": str(request.url.path),
            "errors": errors
        },
        media_type="application/problem+json"
    )

# Example model with validation
class CreateUserRequest(BaseModel):
    email: EmailStr
    age: int = Field(ge=18, le=120)
    username: str = Field(min_length=3, max_length=30)

@app.post("/users")
async def create_user(user: CreateUserRequest):
    # Business logic here
    return {"id": "user_123", "email": user.email}
```

---

## Localization and Internationalization

Supporting multiple languages requires separating error codes from display messages.

### Strategy

1. Always include a stable error code
2. Provide a default English message
3. Let clients look up localized messages using the error code
4. Optionally support Accept-Language header for server-side localization

### Example Response with Localization Support

```json
{
  "type": "https://api.example.com/errors/insufficient_funds",
  "title": "Insufficient Funds",
  "status": 422,
  "code": "payment.insufficient_funds",
  "detail": "Your account balance is too low for this transaction",
  "params": {
    "balance": "30.00",
    "required": "50.00",
    "currency": "USD"
  }
}
```

### Client-Side Localization (TypeScript)

```typescript
// i18n/errors.ts
const errorMessages: Record<string, Record<string, string>> = {
  en: {
    'payment.insufficient_funds':
      'Your balance of {balance} {currency} is insufficient. Required: {required} {currency}',
    'auth.token_expired':
      'Your session has expired. Please sign in again.',
    'user.email_taken':
      'This email address is already registered.'
  },
  es: {
    'payment.insufficient_funds':
      'Su saldo de {balance} {currency} es insuficiente. Requerido: {required} {currency}',
    'auth.token_expired':
      'Su sesion ha expirado. Por favor inicie sesion nuevamente.',
    'user.email_taken':
      'Esta direccion de correo ya esta registrada.'
  }
};

// Interpolate parameters into message template
function formatMessage(template: string, params: Record<string, string>): string {
  return template.replace(/{(\w+)}/g, (_, key) => params[key] || `{${key}}`);
}

// Get localized error message
function getErrorMessage(
  code: string,
  params: Record<string, string> = {},
  locale: string = 'en'
): string {
  const messages = errorMessages[locale] || errorMessages['en'];
  const template = messages[code] || code;
  return formatMessage(template, params);
}

// Usage
const error = {
  code: 'payment.insufficient_funds',
  params: { balance: '30.00', required: '50.00', currency: 'USD' }
};

console.log(getErrorMessage(error.code, error.params, 'en'));
// Output: Your balance of 30.00 USD is insufficient. Required: 50.00 USD

console.log(getErrorMessage(error.code, error.params, 'es'));
// Output: Su saldo de 30.00 USD es insuficiente. Requerido: 50.00 USD
```

---

## Logging vs Exposing Errors

What you log internally should differ from what you expose to clients.

### Internal Logging (Full Details)

```javascript
// Log everything useful for debugging
logger.error('Payment processing failed', {
  // Request context
  trace_id: req.traceId,
  user_id: req.userId,
  path: req.path,
  method: req.method,

  // Error details
  error_type: error.name,
  error_message: error.message,
  stack_trace: error.stack,

  // Business context
  payment_provider: 'stripe',
  payment_intent_id: 'pi_abc123',
  amount: 5000,
  currency: 'usd',

  // Timing
  duration_ms: 234,
  timestamp: new Date().toISOString()
});
```

### External Response (Sanitized)

```json
{
  "type": "https://api.example.com/errors/payment_failed",
  "title": "Payment Failed",
  "status": 422,
  "detail": "We could not process your payment. Please try a different payment method.",
  "trace_id": "abc123xyz"
}
```

### Key Principle

The `trace_id` bridges internal logs and external responses. Clients can provide this ID when contacting support, allowing you to find the full error details without exposing them directly.

---

## Security Considerations

Error responses can leak sensitive information. Follow these guidelines:

### Never Expose

- Stack traces
- Database query details
- Internal file paths
- Server software versions
- Internal service names
- Configuration values

### Bad vs Good Examples

```
// BAD: Leaks database structure
{
  "error": "SQLSTATE[23000]: Integrity constraint violation:
            1062 Duplicate entry 'john@example.com' for key
            'users.email_unique'"
}

// GOOD: Generic message
{
  "type": "https://api.example.com/errors/email_taken",
  "title": "Email Already Registered",
  "status": 409,
  "detail": "An account with this email address already exists"
}
```

```
// BAD: Leaks authentication logic
{
  "error": "User 'admin' found but password hash
            $2b$10$xyz... does not match"
}

// GOOD: Reveal nothing about which part failed
{
  "type": "https://api.example.com/errors/invalid_credentials",
  "title": "Invalid Credentials",
  "status": 401,
  "detail": "The email or password you entered is incorrect"
}
```

### Enumeration Prevention

For endpoints like login or password reset, use identical responses whether the user exists or not:

```javascript
// Password reset - same response regardless of email existence
app.post('/auth/reset-password', async (req, res) => {
  const { email } = req.body;

  // Check if user exists (but do not reveal this to client)
  const user = await db.users.findByEmail(email);

  if (user) {
    // Send actual reset email
    await sendPasswordResetEmail(user);
  }

  // Always return the same response
  res.json({
    message: 'If an account with that email exists, ' +
             'we have sent password reset instructions.'
  });
});
```

---

## Error Documentation

Document every error your API can return.

### Documentation Template

```markdown
## Error: payment.card_declined

**HTTP Status:** 422 Unprocessable Entity

**Description:** The payment card was declined by the issuing bank.

**Possible Causes:**
- Insufficient funds
- Card expired
- Card reported lost/stolen
- Fraud prevention triggered

**Example Response:**
{
  "type": "https://api.example.com/errors/card_declined",
  "title": "Card Declined",
  "status": 422,
  "detail": "Your card was declined. Please try a different payment method.",
  "code": "payment.card_declined",
  "decline_code": "insufficient_funds"
}

**Resolution:**
- Try a different card
- Contact your bank
- Use an alternative payment method

**Related Errors:**
- payment.card_expired
- payment.invalid_card_number
```

### OpenAPI/Swagger Definition

```yaml
components:
  schemas:
    ProblemDetail:
      type: object
      required:
        - type
        - title
        - status
      properties:
        type:
          type: string
          format: uri
          description: URI identifying the error type
          example: "https://api.example.com/errors/not_found"
        title:
          type: string
          description: Human-readable error summary
          example: "Resource Not Found"
        status:
          type: integer
          description: HTTP status code
          example: 404
        detail:
          type: string
          description: Human-readable explanation
          example: "User with id 'abc123' was not found"
        instance:
          type: string
          format: uri
          description: URI reference for this occurrence
        trace_id:
          type: string
          description: Correlation ID for support inquiries
          example: "abc123xyz"

    ValidationError:
      allOf:
        - $ref: '#/components/schemas/ProblemDetail'
        - type: object
          properties:
            errors:
              type: array
              items:
                type: object
                properties:
                  field:
                    type: string
                  code:
                    type: string
                  message:
                    type: string

  responses:
    NotFound:
      description: Resource not found
      content:
        application/problem+json:
          schema:
            $ref: '#/components/schemas/ProblemDetail'

    ValidationFailed:
      description: Request validation failed
      content:
        application/problem+json:
          schema:
            $ref: '#/components/schemas/ValidationError'
```

---

## Examples from Popular APIs

### Stripe

```json
{
  "error": {
    "type": "card_error",
    "code": "card_declined",
    "decline_code": "insufficient_funds",
    "message": "Your card has insufficient funds.",
    "param": "source"
  }
}
```

### GitHub

```json
{
  "message": "Validation Failed",
  "errors": [
    {
      "resource": "Issue",
      "field": "title",
      "code": "missing_field"
    }
  ],
  "documentation_url": "https://docs.github.com/rest/..."
}
```

### Twilio

```json
{
  "code": 20404,
  "message": "The requested resource was not found",
  "more_info": "https://www.twilio.com/docs/errors/20404",
  "status": 404
}
```

### Key Takeaways from Industry Leaders

1. Include documentation links
2. Use stable, numeric or string error codes
3. Provide enough context to fix the issue
4. Keep the format consistent across all endpoints

---

## Best Practices Summary

| Practice | Why It Matters |
|----------|----------------|
| Use correct HTTP status codes | Clients can handle errors programmatically |
| Adopt RFC 7807 format | Industry standard, good tooling support |
| Include stable error codes | Enables client-side logic and localization |
| Return all validation errors at once | Better user experience |
| Add trace IDs | Bridges client reports to server logs |
| Sanitize all responses | Security and privacy protection |
| Document every error | Reduces integration friction |
| Include retry hints for 429/503 | Helps clients implement backoff |
| Test error paths | Errors deserve the same QA as success paths |

---

## Conclusion

Good error responses are a feature, not an afterthought. They reduce support burden, speed up integration, and improve the developer experience for everyone consuming your API.

Start with RFC 7807 as your foundation, add domain-specific error codes, implement proper validation error handling, and document everything. Your API consumers will thank you.

---

*Need to monitor your API error rates and response times? [OneUptime](https://oneuptime.com) provides full-stack observability to help you catch issues before your users do.*
