# How to Monitor JWT Token Validation Failures and Expired Session Events with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, JWT, Authentication, Security

Description: Instrument your JWT validation layer with OpenTelemetry to track token failures, expired sessions, and authentication anomalies.

JWT tokens are the backbone of authentication in most modern APIs. When a token validation fails or a session expires, you need to know about it quickly. A spike in validation failures could mean someone is trying to use stolen tokens, your signing keys rotated incorrectly, or there is a clock skew issue between services.

This post walks through instrumenting your JWT validation middleware with OpenTelemetry so you get metrics, traces, and alerts for every authentication event.

## Setting Up Metrics and Tracing

First, define the metrics instruments and tracer you will use throughout the middleware:

```javascript
const { trace, metrics, SpanStatusCode } = require('@opentelemetry/api');

const tracer = trace.getTracer('auth-middleware');
const meter = metrics.getMeter('auth-middleware');

// Counter for different JWT validation outcomes
const jwtValidationCounter = meter.createCounter('auth.jwt.validations', {
  description: 'Total JWT validation attempts by result',
});

// Histogram for token age at time of use
const tokenAgeHistogram = meter.createHistogram('auth.jwt.token_age_seconds', {
  description: 'Age of the JWT token when it was used',
  unit: 'seconds',
});

// Counter specifically for expired tokens
const expiredTokenCounter = meter.createCounter('auth.jwt.expired', {
  description: 'Number of expired JWT tokens received',
});

// Gauge for tracking active sessions (approximation)
const activeSessionsGauge = meter.createUpDownCounter('auth.sessions.active', {
  description: 'Approximate number of active sessions',
});
```

## Instrumenting the JWT Validation Middleware

Here is a complete Express middleware that wraps JWT verification with OpenTelemetry instrumentation:

```javascript
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

function jwtAuthMiddleware(req, res, next) {
  return tracer.startActiveSpan('jwt.validation', (span) => {
    const authHeader = req.headers.authorization;

    // No token provided
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      span.setAttribute('auth.result', 'missing_token');
      span.setStatus({ code: SpanStatusCode.ERROR, message: 'No token provided' });

      jwtValidationCounter.add(1, { result: 'missing_token' });

      span.end();
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.substring(7);

    try {
      // Decode without verifying first to get metadata
      const decoded = jwt.decode(token, { complete: true });

      if (decoded) {
        span.setAttribute('auth.jwt.algorithm', decoded.header.alg);
        span.setAttribute('auth.jwt.issuer', decoded.payload.iss || 'unknown');

        // Calculate token age
        if (decoded.payload.iat) {
          const tokenAge = Math.floor(Date.now() / 1000) - decoded.payload.iat;
          span.setAttribute('auth.jwt.token_age_seconds', tokenAge);
          tokenAgeHistogram.record(tokenAge, {
            issuer: decoded.payload.iss || 'unknown',
          });
        }

        // Check how close the token is to expiration
        if (decoded.payload.exp) {
          const timeToExpiry = decoded.payload.exp - Math.floor(Date.now() / 1000);
          span.setAttribute('auth.jwt.time_to_expiry_seconds', timeToExpiry);
        }
      }

      // Now verify the token properly
      const verified = jwt.verify(token, JWT_SECRET, {
        algorithms: ['HS256', 'RS256'],
        clockTolerance: 30, // 30 seconds tolerance for clock skew
      });

      // Successful validation
      span.setAttribute('auth.result', 'success');
      span.setAttribute('auth.user_id', verified.sub || verified.userId);
      span.setAttribute('auth.jwt.scopes', (verified.scopes || []).join(','));

      jwtValidationCounter.add(1, {
        result: 'success',
        issuer: verified.iss || 'unknown',
      });

      req.user = verified;
      span.end();
      next();

    } catch (err) {
      handleJwtError(err, span, req, res);
    }
  });
}

function handleJwtError(err, span, req, res) {
  let result;
  let statusCode = 401;

  if (err.name === 'TokenExpiredError') {
    result = 'expired';
    const expiredAt = err.expiredAt;
    const expiredAgo = Math.floor((Date.now() - expiredAt.getTime()) / 1000);

    span.setAttribute('auth.jwt.expired_ago_seconds', expiredAgo);
    span.addEvent('token.expired', {
      'expired_at': expiredAt.toISOString(),
      'expired_ago_seconds': expiredAgo,
      'client_ip': req.ip,
    });

    expiredTokenCounter.add(1);
    activeSessionsGauge.add(-1);

  } else if (err.name === 'JsonWebTokenError') {
    result = 'invalid';
    span.addEvent('token.invalid', {
      'error_message': err.message,
      'client_ip': req.ip,
      'user_agent': req.headers['user-agent'],
    });

  } else if (err.name === 'NotBeforeError') {
    result = 'not_yet_valid';
    span.addEvent('token.not_before', {
      'not_before': err.date.toISOString(),
    });
  } else {
    result = 'unknown_error';
  }

  span.setAttribute('auth.result', result);
  span.setAttribute('auth.error', err.message);
  span.setStatus({ code: SpanStatusCode.ERROR, message: `JWT ${result}: ${err.message}` });

  jwtValidationCounter.add(1, { result });

  span.end();
  return res.status(statusCode).json({ error: 'Authentication failed' });
}
```

## Tracking Session Lifecycle

Beyond individual token validation, you might want to track session events. Here is how to instrument login and logout:

```javascript
async function loginHandler(req, res) {
  return tracer.startActiveSpan('auth.login', async (span) => {
    const { username, password } = req.body;
    span.setAttribute('auth.username', username);

    const user = await authenticateUser(username, password);

    if (!user) {
      span.setAttribute('auth.login.result', 'failed');
      span.setStatus({ code: SpanStatusCode.ERROR });

      jwtValidationCounter.add(1, { result: 'login_failed' });
      span.end();
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate the JWT
    const token = jwt.sign(
      { sub: user.id, scopes: user.scopes, iss: 'my-app' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    span.setAttribute('auth.login.result', 'success');
    span.setAttribute('auth.user_id', user.id);
    activeSessionsGauge.add(1);

    span.end();
    return res.json({ token });
  });
}
```

## Alert Rules

Set up alerts for the patterns that matter most:

```yaml
groups:
  - name: jwt-auth-alerts
    rules:
      # Alert when expired token rate spikes
      - alert: HighExpiredTokenRate
        expr: rate(auth_jwt_expired_total[5m]) > 10
        for: 3m
        labels:
          severity: warning
        annotations:
          summary: "High rate of expired JWT tokens"

      # Alert when invalid tokens spike (possible attack)
      - alert: InvalidTokenSpike
        expr: rate(auth_jwt_validations_total{result="invalid"}[5m]) > 20
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Spike in invalid JWT tokens - possible token forgery attempt"

      # Alert when overall auth failure rate is high
      - alert: HighAuthFailureRate
        expr: |
          sum(rate(auth_jwt_validations_total{result!="success"}[5m]))
          /
          sum(rate(auth_jwt_validations_total[5m]))
          > 0.15
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "More than 15% of authentication attempts are failing"
```

## Summary

JWT validation failures are one of the most important security signals your application produces. By instrumenting your authentication middleware with OpenTelemetry, you get detailed visibility into token lifecycle events: why tokens fail, how old they are when used, and whether failure patterns suggest an active attack. The combination of span attributes, events, and custom metrics gives you everything you need to build meaningful alerts and dashboards around authentication health.
