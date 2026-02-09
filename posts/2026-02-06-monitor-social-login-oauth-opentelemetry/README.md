# How to Monitor Social Login and OAuth Provider Integration Latency with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Social Login, OAuth, Authentication

Description: Monitor social login and OAuth provider integration latency with OpenTelemetry to ensure fast authentication and identify provider outages.

Social login lets users sign in with their Google, Facebook, Apple, or other provider accounts. Behind the scenes, this involves an OAuth flow with multiple HTTP redirects, token exchanges, and profile data fetches. When any of these steps slow down or fail, users cannot log in and your signup funnel drops. OpenTelemetry tracing across the OAuth flow gives you per-provider latency data and helps you spot outages before they become major incidents.

## Setting Up Tracing

```python
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

provider = TracerProvider()
provider.add_span_processor(BatchSpanProcessor(
    OTLPSpanExporter(endpoint="http://otel-collector:4317")
))
trace.set_tracer_provider(provider)

tracer = trace.get_tracer("auth.social_login")
meter = metrics.get_meter("auth.social_login")
```

## Tracing the Complete OAuth Flow

The OAuth authorization code flow has several distinct steps: building the authorization URL, handling the callback with the authorization code, exchanging the code for tokens, and fetching the user profile.

```python
def initiate_social_login(provider_name: str, redirect_uri: str):
    with tracer.start_as_current_span("auth.social_login.initiate") as span:
        span.set_attribute("auth.provider", provider_name)
        span.set_attribute("auth.redirect_uri", redirect_uri)

        # Build the authorization URL for the chosen provider
        with tracer.start_as_current_span("auth.build_auth_url") as url_span:
            auth_config = get_oauth_config(provider_name)
            url_span.set_attribute("oauth.auth_endpoint", auth_config.auth_url)
            url_span.set_attribute("oauth.scopes", str(auth_config.scopes))

            state = generate_csrf_state()
            auth_url = build_authorization_url(auth_config, redirect_uri, state)
            url_span.set_attribute("oauth.state_generated", True)

        span.set_attribute("auth.auth_url_generated", True)
        return {"auth_url": auth_url, "state": state}
```

## Tracing the OAuth Callback

The callback is where most of the latency lives. You exchange the authorization code for tokens, then use those tokens to fetch the user profile.

```python
def handle_oauth_callback(provider_name: str, code: str, state: str):
    with tracer.start_as_current_span("auth.social_login.callback") as span:
        span.set_attribute("auth.provider", provider_name)

        # Validate the CSRF state
        with tracer.start_as_current_span("auth.validate_state") as state_span:
            state_valid = validate_csrf_state(state)
            state_span.set_attribute("auth.state_valid", state_valid)

            if not state_valid:
                state_span.add_event("csrf_validation_failed")
                raise AuthenticationError("Invalid state parameter")

        # Exchange the authorization code for access and refresh tokens
        with tracer.start_as_current_span("auth.token_exchange") as token_span:
            auth_config = get_oauth_config(provider_name)
            token_span.set_attribute("oauth.token_endpoint", auth_config.token_url)

            token_response = exchange_code_for_tokens(
                auth_config, code
            )
            token_span.set_attribute("oauth.token_received", token_response.success)
            token_span.set_attribute("oauth.has_refresh_token",
                                     token_response.refresh_token is not None)
            token_span.set_attribute("oauth.token_type", token_response.token_type)
            token_span.set_attribute("http.status_code", token_response.status_code)

            if not token_response.success:
                token_span.set_attribute("error", True)
                token_span.add_event("token_exchange_failed", {
                    "status_code": token_response.status_code,
                    "error": token_response.error_description
                })
                raise AuthenticationError(token_response.error_description)

        # Fetch the user profile from the provider
        with tracer.start_as_current_span("auth.fetch_user_profile") as profile_span:
            profile_span.set_attribute("oauth.userinfo_endpoint", auth_config.userinfo_url)

            profile = fetch_provider_profile(
                auth_config, token_response.access_token
            )
            profile_span.set_attribute("profile.provider_id", profile.provider_id)
            profile_span.set_attribute("profile.email_provided", profile.email is not None)
            profile_span.set_attribute("profile.name_provided", profile.name is not None)
            profile_span.set_attribute("http.status_code", profile.status_code)

        # Find or create the user in our system
        with tracer.start_as_current_span("auth.find_or_create_user") as user_span:
            user = find_or_create_user(provider_name, profile)
            user_span.set_attribute("user.id", user.user_id)
            user_span.set_attribute("user.is_new", user.just_created)
            user_span.set_attribute("user.linked_providers",
                                     len(user.linked_providers))

        # Generate our own session token
        with tracer.start_as_current_span("auth.generate_session") as session_span:
            session = create_session(user.user_id)
            session_span.set_attribute("session.id", session.session_id)
            session_span.set_attribute("session.ttl_hours", session.ttl_hours)

        span.set_attribute("auth.success", True)
        span.set_attribute("auth.user_is_new", user.just_created)
        return AuthResult(user=user, session=session)
```

## Tracing Token Refresh

Access tokens expire. When a user's token expires and they need to re-authenticate in the background, you trace the refresh flow.

```python
def refresh_provider_token(user_id: str, provider_name: str):
    with tracer.start_as_current_span("auth.token_refresh") as span:
        span.set_attribute("user.id", user_id)
        span.set_attribute("auth.provider", provider_name)

        # Load the stored refresh token
        with tracer.start_as_current_span("auth.load_refresh_token") as load_span:
            stored_token = load_refresh_token(user_id, provider_name)
            load_span.set_attribute("token.exists", stored_token is not None)
            load_span.set_attribute("token.age_hours", stored_token.age_hours if stored_token else 0)

            if not stored_token:
                span.set_attribute("refresh.success", False)
                return None

        # Call the provider's token endpoint with the refresh token
        with tracer.start_as_current_span("auth.refresh_exchange") as refresh_span:
            auth_config = get_oauth_config(provider_name)
            new_tokens = refresh_access_token(auth_config, stored_token.token)
            refresh_span.set_attribute("refresh.success", new_tokens.success)
            refresh_span.set_attribute("http.status_code", new_tokens.status_code)

            if not new_tokens.success:
                refresh_span.add_event("refresh_failed", {
                    "error": new_tokens.error_description
                })

        # Store the new tokens
        if new_tokens.success:
            with tracer.start_as_current_span("auth.store_new_tokens"):
                store_tokens(user_id, provider_name, new_tokens)

        span.set_attribute("refresh.success", new_tokens.success)
        return new_tokens if new_tokens.success else None
```

## Authentication Metrics

```python
login_latency = meter.create_histogram(
    "auth.social_login.latency_ms",
    description="Total social login flow latency by provider",
    unit="ms"
)

token_exchange_latency = meter.create_histogram(
    "auth.token_exchange.latency_ms",
    description="OAuth token exchange latency by provider",
    unit="ms"
)

login_attempts = meter.create_counter(
    "auth.social_login.attempts",
    description="Social login attempts by provider and result"
)

new_user_signups = meter.create_counter(
    "auth.social_login.new_users",
    description="New users created via social login"
)

token_refresh_failures = meter.create_counter(
    "auth.token_refresh.failures",
    description="Failed token refresh attempts by provider"
)
```

## What You Gain

By tracing each step of the OAuth flow, you can compare provider performance side by side. If Google's token endpoint responds in 80ms but Facebook's takes 400ms, you know where to focus optimization (or where to set longer timeouts). When a provider has an outage, your traces immediately show a spike in failures at the token exchange step for that specific provider, and you can quickly confirm the issue is upstream rather than in your code. This kind of provider-specific visibility is something that aggregate error rates alone cannot give you.
