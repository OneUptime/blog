# How to Monitor OAuth2 Token Lifecycle Events (Issuance, Refresh, Revocation) with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OAuth2, Token Lifecycle, Security Monitoring

Description: Monitor OAuth2 token lifecycle events including issuance, refresh, and revocation with OpenTelemetry for security and operational visibility.

OAuth2 tokens are the keys to your kingdom. Every time a token is issued, refreshed, or revoked, that is a security-relevant event worth tracking. OpenTelemetry lets you build a complete picture of token lifecycle events, which is essential for detecting token theft, identifying misconfigured clients, and ensuring your token rotation policies are working.

## Token Lifecycle Metrics

```python
# token_metrics.py
from opentelemetry import metrics, trace

meter = metrics.get_meter("oauth2.tokens")
tracer = trace.get_tracer("oauth2.tokens")

# Token issuance
token_issued = meter.create_counter(
    "oauth2.token.issued",
    description="Number of tokens issued",
    unit="1",
)

# Token refresh
token_refreshed = meter.create_counter(
    "oauth2.token.refreshed",
    description="Number of token refresh operations",
    unit="1",
)

# Token revocation
token_revoked = meter.create_counter(
    "oauth2.token.revoked",
    description="Number of tokens revoked",
    unit="1",
)

# Token validation
token_validated = meter.create_counter(
    "oauth2.token.validated",
    description="Number of token validation checks",
    unit="1",
)

# Token age at refresh
token_age_at_refresh = meter.create_histogram(
    "oauth2.token.age_at_refresh",
    description="Age of token when it was refreshed",
    unit="seconds",
)

# Active tokens per client
active_tokens = meter.create_up_down_counter(
    "oauth2.token.active",
    description="Number of currently active tokens",
    unit="1",
)
```

## Token Issuance Tracing

```python
# token_service.py
import jwt
import time
import secrets

class OAuth2TokenService:
    def issue_token(self, client_id: str, user_id: str, scopes: list,
                    grant_type: str) -> dict:
        """Issue a new access token and optional refresh token."""
        with tracer.start_as_current_span(
            "oauth2.token.issue",
            attributes={
                "oauth2.client_id": client_id,
                "oauth2.user_id": user_id,
                "oauth2.grant_type": grant_type,
                "oauth2.scopes": ",".join(scopes),
            }
        ) as span:
            # Generate access token
            access_token_id = secrets.token_urlsafe(16)
            access_token = jwt.encode({
                "sub": user_id,
                "client_id": client_id,
                "scopes": scopes,
                "jti": access_token_id,
                "iat": int(time.time()),
                "exp": int(time.time()) + 3600,  # 1 hour
            }, self.signing_key, algorithm="RS256")

            # Generate refresh token
            refresh_token_id = secrets.token_urlsafe(32)

            # Store token metadata for lifecycle tracking
            store_token_metadata(access_token_id, {
                "client_id": client_id,
                "user_id": user_id,
                "issued_at": time.time(),
                "expires_at": time.time() + 3600,
                "scopes": scopes,
                "grant_type": grant_type,
            })

            # Record metrics
            token_issued.add(1, {
                "oauth2.client_id": client_id,
                "oauth2.grant_type": grant_type,
            })

            active_tokens.add(1, {
                "oauth2.client_id": client_id,
            })

            # Never log the actual token values
            span.set_attribute("oauth2.access_token_id", access_token_id)
            span.set_attribute("oauth2.token_ttl_seconds", 3600)

            return {
                "access_token": access_token,
                "refresh_token": refresh_token_id,
                "expires_in": 3600,
                "token_type": "Bearer",
            }
```

## Token Refresh Tracing

Refresh operations are particularly important to monitor because token theft often manifests as unexpected refresh attempts:

```python
    def refresh_token(self, refresh_token: str, client_id: str) -> dict:
        """Refresh an access token using a refresh token."""
        with tracer.start_as_current_span(
            "oauth2.token.refresh",
            attributes={
                "oauth2.client_id": client_id,
            }
        ) as span:
            # Look up the refresh token
            token_data = get_refresh_token_data(refresh_token)

            if not token_data:
                span.set_status(StatusCode.ERROR, "Invalid refresh token")
                span.set_attribute("oauth2.refresh.error", "invalid_token")
                token_validated.add(1, {
                    "oauth2.client_id": client_id,
                    "oauth2.validation.result": "invalid",
                })
                raise InvalidTokenError("Refresh token not found or expired")

            # Check for token reuse (potential theft indicator)
            if token_data.get("used"):
                span.add_event("refresh_token_reuse_detected", {
                    "oauth2.client_id": client_id,
                    "oauth2.user_id": token_data["user_id"],
                    "oauth2.original_issued_at": str(token_data["issued_at"]),
                })
                # Revoke all tokens for this user as a safety measure
                await self._revoke_all_user_tokens(token_data["user_id"])
                raise SecurityError("Refresh token reuse detected")

            # Calculate token age
            age = time.time() - token_data["issued_at"]
            token_age_at_refresh.record(age, {
                "oauth2.client_id": client_id,
            })
            span.set_attribute("oauth2.token_age_seconds", age)

            # Mark the old refresh token as used
            mark_refresh_token_used(refresh_token)

            # Issue new tokens
            new_tokens = self.issue_token(
                client_id=client_id,
                user_id=token_data["user_id"],
                scopes=token_data["scopes"],
                grant_type="refresh_token",
            )

            token_refreshed.add(1, {
                "oauth2.client_id": client_id,
            })

            # Decrement active count for old token
            active_tokens.add(-1, {"oauth2.client_id": client_id})

            return new_tokens
```

## Token Revocation

```python
    def revoke_token(self, token_id: str, reason: str, revoked_by: str):
        """Revoke a token explicitly."""
        with tracer.start_as_current_span(
            "oauth2.token.revoke",
            attributes={
                "oauth2.token_id": token_id,
                "oauth2.revocation.reason": reason,
                "oauth2.revocation.by": revoked_by,
            }
        ) as span:
            token_data = get_token_metadata(token_id)

            if token_data:
                invalidate_token(token_id)

                token_revoked.add(1, {
                    "oauth2.client_id": token_data["client_id"],
                    "oauth2.revocation.reason": reason,
                })

                active_tokens.add(-1, {
                    "oauth2.client_id": token_data["client_id"],
                })

                # Calculate how long the token lived
                lifetime = time.time() - token_data["issued_at"]
                span.set_attribute("oauth2.token_lifetime_seconds", lifetime)

    async def _revoke_all_user_tokens(self, user_id: str):
        """Emergency revocation of all tokens for a user."""
        with tracer.start_as_current_span(
            "oauth2.token.revoke_all",
            attributes={
                "oauth2.user_id": user_id,
                "oauth2.revocation.reason": "security_incident",
            }
        ) as span:
            count = await invalidate_all_tokens_for_user(user_id)
            span.set_attribute("oauth2.tokens_revoked", count)
            token_revoked.add(count, {
                "oauth2.revocation.reason": "security_incident",
            })
```

## Token Validation Middleware

```python
# token_validation_middleware.py
async def validate_token_middleware(request: Request, call_next):
    """Validate tokens on every request and record metrics."""
    auth_header = request.headers.get("Authorization", "")

    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        with tracer.start_as_current_span("oauth2.token.validate") as span:
            try:
                claims = jwt.decode(token, public_key, algorithms=["RS256"])
                span.set_attribute("oauth2.client_id", claims.get("client_id"))
                span.set_attribute("oauth2.token_age",
                                 time.time() - claims.get("iat", 0))

                token_validated.add(1, {
                    "oauth2.client_id": claims.get("client_id", "unknown"),
                    "oauth2.validation.result": "valid",
                })

                request.state.token_claims = claims
            except jwt.ExpiredSignatureError:
                token_validated.add(1, {
                    "oauth2.validation.result": "expired",
                })
                return JSONResponse(status_code=401, content={"error": "Token expired"})

    return await call_next(request)
```

## What to Alert On

The highest-priority alert is refresh token reuse, as it almost always indicates token theft. Beyond that, watch for clients issuing tokens at an unusually high rate (potential client credential compromise), tokens being refreshed much earlier or later than typical (abnormal client behavior), and spikes in revocations (potential security incident response in progress). These metrics give your security team real-time visibility into the health of your authentication infrastructure.
