# How to Instrument OpenAPI/Swagger Validated Requests with OpenTelemetry for Schema Violation Tracking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OpenAPI, Swagger, Schema Validation

Description: Track OpenAPI schema violations in API requests and responses using OpenTelemetry span events and metrics for contract compliance.

An OpenAPI specification defines the contract between your API and its consumers. But specifications drift from reality. Clients send fields that do not exist in the schema. Responses include extra properties. Required fields go missing. Without monitoring, these violations go unnoticed until something breaks.

OpenTelemetry lets you track schema violations as span events and metrics, giving you visibility into API contract compliance.

## Setting Up OpenAPI Validation with Tracing

Use `express-openapi-validator` combined with OpenTelemetry instrumentation:

```bash
npm install express-openapi-validator @opentelemetry/api
```

```typescript
// schema-validation-middleware.ts
import * as OpenApiValidator from 'express-openapi-validator';
import { trace, metrics, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('openapi-validation');
const meter = metrics.getMeter('openapi-validation');

// Metrics for schema violations
const validationErrors = meter.createCounter('api.schema.violations', {
  description: 'Count of OpenAPI schema violations by type and path',
});

const validationDuration = meter.createHistogram('api.schema.validation_duration_ms', {
  description: 'Time spent on schema validation',
  unit: 'ms',
});

const validRequests = meter.createCounter('api.schema.valid_requests', {
  description: 'Count of requests that passed schema validation',
});

// Configure the validator
export function setupValidation(app: any, specPath: string) {
  app.use(
    OpenApiValidator.middleware({
      apiSpec: specPath,
      validateRequests: true,
      validateResponses: true,
      // Do not reject invalid requests - just record violations
      validateRequests: {
        allowUnknownQueryParameters: true, // We will track these separately
      },
    })
  );
}
```

## Custom Validation Middleware with Tracing

For more control, build a validation middleware that records violations without rejecting requests:

```typescript
// traced-validation.ts
import Ajv from 'ajv';
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('openapi-validation');

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

interface ValidationError {
  path: string;
  message: string;
  type: string;        // "missing_required", "wrong_type", "unknown_property", etc.
  schemaPath: string;
}

export function schemaValidationMiddleware(openApiSpec: any) {
  const ajv = new Ajv({ allErrors: true, strict: false });

  return (req: any, res: any, next: any) => {
    return tracer.startActiveSpan('openapi.validate.request', (validationSpan) => {
      const startTime = Date.now();
      const route = req.route?.path || req.path;
      const method = req.method.toLowerCase();

      // Find the schema for this route and method
      const pathSpec = findPathSpec(openApiSpec, route, method);
      if (!pathSpec) {
        validationSpan.setAttribute('openapi.schema_found', false);
        validationSpan.end();
        next();
        return;
      }

      validationSpan.setAttribute('openapi.schema_found', true);
      validationSpan.setAttribute('http.route', route);
      validationSpan.setAttribute('http.method', method);

      const errors: ValidationError[] = [];

      // Validate request body
      if (pathSpec.requestBody && req.body) {
        const bodySchema = pathSpec.requestBody.content?.['application/json']?.schema;
        if (bodySchema) {
          const validate = ajv.compile(bodySchema);
          const valid = validate(req.body);
          if (!valid && validate.errors) {
            for (const err of validate.errors) {
              errors.push({
                path: `body${err.instancePath}`,
                message: err.message || 'Validation failed',
                type: classifyError(err),
                schemaPath: err.schemaPath,
              });
            }
          }
        }
      }

      // Validate query parameters
      if (pathSpec.parameters) {
        const queryParams = pathSpec.parameters.filter((p: any) => p.in === 'query');
        for (const param of queryParams) {
          if (param.required && !(param.name in (req.query || {}))) {
            errors.push({
              path: `query.${param.name}`,
              message: `Required query parameter '${param.name}' is missing`,
              type: 'missing_required',
              schemaPath: '',
            });
          }
        }

        // Check for unknown query parameters
        const knownParams = new Set(queryParams.map((p: any) => p.name));
        for (const key of Object.keys(req.query || {})) {
          if (!knownParams.has(key)) {
            errors.push({
              path: `query.${key}`,
              message: `Unknown query parameter '${key}'`,
              type: 'unknown_property',
              schemaPath: '',
            });
          }
        }
      }

      // Record results
      const duration = Date.now() - startTime;
      validationDuration.record(duration, { 'http.route': route });

      if (errors.length === 0) {
        validationSpan.setAttribute('openapi.validation.passed', true);
        validRequests.add(1, { 'http.route': route, 'http.method': method });
      } else {
        validationSpan.setAttribute('openapi.validation.passed', false);
        validationSpan.setAttribute('openapi.validation.error_count', errors.length);

        // Record each violation as a span event
        for (const error of errors) {
          validationSpan.addEvent('openapi.schema_violation', {
            'violation.path': error.path,
            'violation.message': error.message,
            'violation.type': error.type,
            'violation.schema_path': error.schemaPath,
          });

          validationErrors.add(1, {
            'http.route': route,
            'http.method': method,
            'violation.type': error.type,
          });
        }

        validationSpan.setStatus({
          code: SpanStatusCode.ERROR,
          message: `${errors.length} schema violation(s)`,
        });
      }

      validationSpan.end();

      // Attach validation results to the request for downstream use
      req.schemaValidation = { errors, valid: errors.length === 0 };

      next();
    });
  };
}

function classifyError(error: any): string {
  switch (error.keyword) {
    case 'required': return 'missing_required';
    case 'type': return 'wrong_type';
    case 'additionalProperties': return 'unknown_property';
    case 'enum': return 'invalid_enum_value';
    case 'format': return 'invalid_format';
    case 'pattern': return 'pattern_mismatch';
    case 'minimum':
    case 'maximum': return 'out_of_range';
    default: return 'other';
  }
}
```

## Response Validation

Validate outgoing responses too, because your own code can violate the spec:

```typescript
// response-validation.ts
export function responseValidationMiddleware(openApiSpec: any) {
  return (req: any, res: any, next: any) => {
    const originalJson = res.json.bind(res);

    res.json = (body: any) => {
      const span = trace.getActiveSpan();
      const route = req.route?.path || req.path;
      const method = req.method.toLowerCase();
      const statusCode = res.statusCode;

      // Find the response schema for this status code
      const responseSchema = findResponseSchema(openApiSpec, route, method, statusCode);

      if (responseSchema && body) {
        const ajv = new Ajv({ allErrors: true });
        const validate = ajv.compile(responseSchema);
        const valid = validate(body);

        if (!valid && validate.errors) {
          span?.addEvent('openapi.response_schema_violation', {
            'violation.count': validate.errors.length,
            'violation.details': JSON.stringify(validate.errors.slice(0, 5)),
            'http.route': route,
            'http.status_code': statusCode,
          });

          validationErrors.add(validate.errors.length, {
            'http.route': route,
            'http.method': method,
            'violation.type': 'response_violation',
            'http.status_code': statusCode.toString(),
          });
        }
      }

      return originalJson(body);
    };

    next();
  };
}
```

## Dashboard Queries

Track schema compliance over time:

```promql
# Overall schema compliance rate
sum(rate(api_schema_valid_requests_total[1h]))
/
(sum(rate(api_schema_valid_requests_total[1h])) + sum(rate(api_schema_violations_total[1h])))

# Most violated endpoints
topk(10, sum(rate(api_schema_violations_total[24h])) by (http_route))

# Violation types breakdown
sum(rate(api_schema_violations_total[1h])) by (violation_type)

# Response violations (your code is wrong, not the client)
sum(rate(api_schema_violations_total{violation_type="response_violation"}[1h])) by (http_route)
```

## Using Violations to Improve Your API

Schema violation data has several practical uses:

1. **Unknown properties in requests** often indicate that consumers want features you have not added to the spec yet. Track which undocumented fields consumers send most frequently.

2. **Response violations** mean your implementation drifted from the spec. Fix either the code or the spec, but make them match.

3. **Missing required fields** from specific consumers suggest they are using outdated documentation or an old SDK version.

4. **Type mismatches** (sending a string where the spec says number) often indicate frontend bugs that could be caught earlier with better client-side validation.

Schema validation with OpenTelemetry tracking turns your OpenAPI spec from a static document into a live contract monitor. You can see exactly where and how the contract is being broken, and use that information to keep your API and its consumers in sync.
