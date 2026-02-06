# How to Trace Tenant Provisioning and Environment Setup Pipelines with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Tenant Provisioning, SaaS, Distributed Tracing

Description: Trace tenant provisioning and environment setup pipelines with OpenTelemetry to identify failures and slow steps in onboarding.

When a new customer signs up for your SaaS product, a lot happens behind the scenes: databases get created, DNS records are configured, secrets are provisioned, and initial data is seeded. This provisioning pipeline can involve dozens of services and take anywhere from seconds to minutes. When it fails or gets stuck, you need visibility into exactly which step broke.

## The Provisioning Pipeline

A typical tenant provisioning flow looks like this:

1. Create tenant record in the primary database
2. Provision a dedicated database or schema
3. Set up storage buckets
4. Configure DNS and SSL certificates
5. Seed initial data and templates
6. Send welcome email and create admin user

Each step has its own failure modes and dependencies. Let us trace the entire pipeline.

## Root Span for the Provisioning Flow

```python
# provisioning_service.py
from opentelemetry import trace
from opentelemetry.trace import StatusCode

tracer = trace.get_tracer("tenant.provisioning")

class TenantProvisioningService:
    async def provision_tenant(self, signup_data: dict) -> dict:
        """Full tenant provisioning pipeline with end-to-end tracing."""
        with tracer.start_as_current_span(
            "tenant.provision",
            attributes={
                "tenant.name": signup_data["org_name"],
                "tenant.plan": signup_data["plan"],
                "tenant.region": signup_data["region"],
            }
        ) as root_span:
            try:
                # Step 1: Create the tenant record
                tenant = await self._create_tenant_record(signup_data)
                root_span.set_attribute("tenant.id", tenant.id)

                # Step 2: Provision infrastructure
                await self._provision_infrastructure(tenant)

                # Step 3: Seed initial data
                await self._seed_data(tenant)

                # Step 4: Set up integrations
                await self._setup_integrations(tenant)

                # Step 5: Finalize
                await self._finalize_provisioning(tenant)

                root_span.set_attribute("tenant.provision.status", "success")
                return {"tenant_id": tenant.id, "status": "ready"}

            except Exception as e:
                root_span.set_status(StatusCode.ERROR, str(e))
                root_span.set_attribute("tenant.provision.status", "failed")
                root_span.record_exception(e)
                raise
```

## Tracing Infrastructure Provisioning Steps

Each infrastructure step gets its own child span:

```python
    async def _provision_infrastructure(self, tenant):
        """Provision all infrastructure components for the tenant."""
        with tracer.start_as_current_span(
            "tenant.provision.infrastructure",
            attributes={"tenant.id": tenant.id}
        ):
            # Database provisioning
            with tracer.start_as_current_span(
                "tenant.provision.database",
                attributes={
                    "db.system": "postgresql",
                    "db.operation": "create_schema",
                }
            ) as db_span:
                schema_name = await create_tenant_schema(tenant.id)
                db_span.set_attribute("db.schema", schema_name)
                await run_migrations(schema_name)
                db_span.set_attribute("db.migrations.applied", True)

            # Storage bucket provisioning
            with tracer.start_as_current_span(
                "tenant.provision.storage",
                attributes={"cloud.provider": "aws", "cloud.service": "s3"}
            ) as storage_span:
                bucket_name = f"tenant-{tenant.id}-assets"
                await create_s3_bucket(bucket_name, tenant.region)
                storage_span.set_attribute("storage.bucket", bucket_name)

            # DNS configuration
            with tracer.start_as_current_span(
                "tenant.provision.dns",
                attributes={"dns.provider": "cloudflare"}
            ) as dns_span:
                subdomain = f"{tenant.slug}.app.example.com"
                await configure_dns_record(subdomain, tenant.region)
                dns_span.set_attribute("dns.subdomain", subdomain)

                # SSL certificate can be slow
                await provision_ssl_certificate(subdomain)
                dns_span.set_attribute("dns.ssl.provisioned", True)
```

## Handling Async Provisioning Steps

Some provisioning steps are asynchronous. For example, DNS propagation or SSL certificate issuance can take minutes. Use span links to connect the initial request with the eventual completion:

```python
# async_provisioning.py
from opentelemetry import trace, context
from opentelemetry.trace import Link

tracer = trace.get_tracer("tenant.provisioning.async")

async def start_ssl_provisioning(tenant_id: str, domain: str):
    """Start async SSL provisioning and store context for later linking."""
    with tracer.start_as_current_span(
        "tenant.provision.ssl.request",
        attributes={
            "tenant.id": tenant_id,
            "ssl.domain": domain,
        }
    ) as span:
        # Store the span context so the callback can link to it
        span_context = span.get_span_context()
        request_id = await submit_ssl_request(domain)

        # Save span context with the request for later correlation
        await save_provisioning_context(request_id, {
            "trace_id": format(span_context.trace_id, '032x'),
            "span_id": format(span_context.span_id, '016x'),
            "tenant_id": tenant_id,
        })

        return request_id

async def handle_ssl_ready_callback(request_id: str, certificate_data: dict):
    """Handle the async callback when SSL is ready."""
    saved_context = await get_provisioning_context(request_id)

    # Create a link back to the original request span
    original_context = trace.SpanContext(
        trace_id=int(saved_context["trace_id"], 16),
        span_id=int(saved_context["span_id"], 16),
        is_remote=True,
    )

    with tracer.start_as_current_span(
        "tenant.provision.ssl.complete",
        links=[Link(original_context)],
        attributes={
            "tenant.id": saved_context["tenant_id"],
            "ssl.status": certificate_data["status"],
            "ssl.issuer": certificate_data.get("issuer", ""),
        }
    ):
        await activate_ssl_certificate(saved_context["tenant_id"], certificate_data)
```

## Provisioning Metrics

Track provisioning performance and success rates:

```python
# provisioning_metrics.py
from opentelemetry import metrics

meter = metrics.get_meter("tenant.provisioning")

provision_duration = meter.create_histogram(
    "tenant.provision.duration",
    description="Total time to provision a tenant",
    unit="seconds",
)

provision_step_duration = meter.create_histogram(
    "tenant.provision.step_duration",
    description="Duration of individual provisioning steps",
    unit="seconds",
)

provision_failures = meter.create_counter(
    "tenant.provision.failures",
    description="Number of failed provisioning attempts",
    unit="1",
)
```

## Retry and Rollback Tracing

When a provisioning step fails, you often need to retry or roll back previous steps. Trace these operations too:

```python
async def provision_with_retry(self, tenant, step_name, step_func, max_retries=3):
    """Execute a provisioning step with retries and tracing."""
    for attempt in range(max_retries):
        with tracer.start_as_current_span(
            f"tenant.provision.{step_name}",
            attributes={
                "tenant.id": tenant.id,
                "provision.attempt": attempt + 1,
                "provision.max_retries": max_retries,
            }
        ) as span:
            try:
                result = await step_func(tenant)
                span.set_attribute("provision.step.status", "success")
                return result
            except Exception as e:
                span.set_status(StatusCode.ERROR, str(e))
                span.record_exception(e)
                if attempt == max_retries - 1:
                    await self._rollback_tenant(tenant.id)
                    raise
```

## What You Gain

With full provisioning tracing, you can answer questions that used to require digging through logs across multiple services: "Why did this tenant's setup take 4 minutes instead of the usual 30 seconds?" or "Which provisioning step has the highest failure rate this week?" The traces give you a visual timeline of every step, making it straightforward to spot the bottleneck.
