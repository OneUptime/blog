# How to Trace SaaS Marketplace App Installation and OAuth Authorization Flows with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OAuth, SaaS Marketplace, App Installation

Description: Trace SaaS marketplace app installation and OAuth authorization flows with OpenTelemetry for debugging integration onboarding issues.

If your SaaS has a marketplace or app directory, the installation flow is where third-party developers and customers form their first impression. OAuth authorization, permission grants, webhook setup, and initial data sync all happen in a sequence that spans your frontend, backend, the marketplace app, and external OAuth providers. Tracing this end-to-end is essential for debugging installation failures.

## The App Installation Flow

A typical marketplace installation involves these steps:

1. User clicks "Install" on the marketplace listing
2. OAuth authorization redirect to your platform
3. User grants permissions
4. Authorization code exchange for tokens
5. App webhook endpoints are registered
6. Initial data sync is triggered

## Tracing the OAuth Authorization Flow

```python
# oauth_flow.py
from opentelemetry import trace
from opentelemetry.trace import StatusCode
import secrets
import urllib.parse

tracer = trace.get_tracer("marketplace.oauth")

class OAuthFlowHandler:
    def initiate_authorization(self, app_id: str, tenant_id: str, user_id: str):
        """Start the OAuth authorization flow with tracing."""
        with tracer.start_as_current_span(
            "oauth.authorize.initiate",
            attributes={
                "oauth.app_id": app_id,
                "tenant.id": tenant_id,
                "user.id": user_id,
            }
        ) as span:
            # Generate state parameter to prevent CSRF
            state = secrets.token_urlsafe(32)

            # Store state with trace context for later correlation
            save_oauth_state(state, {
                "app_id": app_id,
                "tenant_id": tenant_id,
                "user_id": user_id,
                "trace_id": format(span.get_span_context().trace_id, '032x'),
            })

            app_config = get_app_config(app_id)
            auth_url = self._build_auth_url(app_config, state)

            span.set_attribute("oauth.redirect_url", auth_url)
            span.set_attribute("oauth.scopes", ",".join(app_config["scopes"]))

            return {"redirect_url": auth_url}

    def _build_auth_url(self, app_config: dict, state: str) -> str:
        params = {
            "client_id": app_config["client_id"],
            "redirect_uri": app_config["redirect_uri"],
            "scope": " ".join(app_config["scopes"]),
            "state": state,
            "response_type": "code",
        }
        return f"{app_config['auth_endpoint']}?{urllib.parse.urlencode(params)}"
```

## Handling the OAuth Callback

```python
    async def handle_callback(self, code: str, state: str):
        """Handle OAuth callback with token exchange and app setup."""
        # Retrieve the saved state to get context
        saved_state = get_oauth_state(state)
        if not saved_state:
            raise ValueError("Invalid OAuth state parameter")

        with tracer.start_as_current_span(
            "oauth.callback.process",
            attributes={
                "oauth.app_id": saved_state["app_id"],
                "tenant.id": saved_state["tenant_id"],
            }
        ) as span:
            # Step 1: Exchange code for tokens
            tokens = await self._exchange_code(
                saved_state["app_id"], code, span
            )

            # Step 2: Register the app installation
            installation = await self._register_installation(
                saved_state, tokens, span
            )

            # Step 3: Set up webhooks for the app
            await self._setup_app_webhooks(installation, span)

            # Step 4: Trigger initial data sync
            await self._trigger_initial_sync(installation, span)

            return installation

    async def _exchange_code(self, app_id: str, code: str, parent_span):
        """Exchange authorization code for access and refresh tokens."""
        with tracer.start_as_current_span(
            "oauth.token.exchange",
            attributes={"oauth.app_id": app_id}
        ) as span:
            app_config = get_app_config(app_id)

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    app_config["token_endpoint"],
                    data={
                        "grant_type": "authorization_code",
                        "code": code,
                        "client_id": app_config["client_id"],
                        "client_secret": app_config["client_secret"],
                        "redirect_uri": app_config["redirect_uri"],
                    }
                )

            span.set_attribute("http.status_code", response.status_code)

            if response.status_code != 200:
                span.set_status(StatusCode.ERROR, "Token exchange failed")
                raise OAuthError(f"Token exchange failed: {response.status_code}")

            token_data = response.json()
            span.set_attribute("oauth.token.expires_in", token_data.get("expires_in", 0))
            span.set_attribute("oauth.token.scope", token_data.get("scope", ""))

            # Never log the actual token values
            return token_data
```

## App Installation Registration

```python
    async def _register_installation(self, state_data: dict, tokens: dict, parent_span):
        """Register the app installation in the database."""
        with tracer.start_as_current_span(
            "marketplace.installation.register",
            attributes={
                "oauth.app_id": state_data["app_id"],
                "tenant.id": state_data["tenant_id"],
            }
        ) as span:
            installation = await create_installation(
                app_id=state_data["app_id"],
                tenant_id=state_data["tenant_id"],
                installed_by=state_data["user_id"],
                access_token_encrypted=encrypt(tokens["access_token"]),
                refresh_token_encrypted=encrypt(tokens.get("refresh_token", "")),
                token_expires_at=calculate_expiry(tokens.get("expires_in", 3600)),
            )

            span.set_attribute("marketplace.installation.id", installation.id)
            span.set_attribute("marketplace.installation.status", "active")

            return installation

    async def _setup_app_webhooks(self, installation, parent_span):
        """Register webhook endpoints for the installed app."""
        with tracer.start_as_current_span(
            "marketplace.webhooks.setup",
            attributes={
                "marketplace.installation.id": installation.id,
                "oauth.app_id": installation.app_id,
            }
        ) as span:
            app_config = get_app_config(installation.app_id)
            registered = []

            for event_type in app_config["subscribed_events"]:
                endpoint = register_webhook_endpoint(
                    installation_id=installation.id,
                    event_type=event_type,
                    url=app_config["webhook_url"],
                )
                registered.append(event_type)

            span.set_attribute("marketplace.webhooks.count", len(registered))
            span.set_attribute("marketplace.webhooks.events", ",".join(registered))
```

## Installation Metrics

```python
# marketplace_metrics.py
from opentelemetry import metrics

meter = metrics.get_meter("marketplace")

install_counter = meter.create_counter(
    "marketplace.installations",
    description="Number of app installations",
    unit="1",
)

install_duration = meter.create_histogram(
    "marketplace.installation.duration",
    description="Time to complete app installation flow",
    unit="ms",
)

oauth_failures = meter.create_counter(
    "marketplace.oauth.failures",
    description="OAuth flow failures by error type",
    unit="1",
)
```

## Debugging Installation Failures

The most common installation failures are OAuth misconfiguration (wrong redirect URIs, expired secrets), permission denied errors, and timeout during initial data sync. With traces covering the full flow, you can see exactly where the process broke down. This is especially valuable when debugging issues reported by third-party developers building on your marketplace, since you can share the trace timeline without exposing sensitive token data.
