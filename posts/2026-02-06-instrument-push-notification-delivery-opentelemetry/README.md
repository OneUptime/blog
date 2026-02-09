# How to Instrument Push Notification Delivery System (APNS, FCM, Web Push) with OpenTelemetry Delivery Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Push Notifications, APNS, FCM

Description: Instrument push notification delivery across APNS, FCM, and Web Push providers with OpenTelemetry to track delivery rates and latency.

Push notifications are the primary way social media platforms re-engage users. But the delivery path is complex: your backend generates the notification, routes it to the correct provider (Apple Push Notification Service, Firebase Cloud Messaging, or Web Push), and the provider delivers it to the device. Each step can fail silently. OpenTelemetry instrumentation gives you visibility into delivery rates, provider latency, and failure modes across all channels.

## Setting Up the Tracer

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

tracer = trace.get_tracer("push.notifications")
meter = metrics.get_meter("push.notifications")
```

## Tracing Notification Generation and Routing

When an event triggers a notification (new comment, new follower, etc.), the system needs to figure out which devices to target and which provider to use for each.

```python
def send_push_notification(user_id: str, event_type: str, payload: dict):
    with tracer.start_as_current_span("push.send") as span:
        span.set_attribute("user.id", user_id)
        span.set_attribute("notification.event_type", event_type)

        # Check user notification preferences
        with tracer.start_as_current_span("push.check_preferences") as pref_span:
            prefs = get_notification_preferences(user_id)
            pref_span.set_attribute("prefs.enabled", prefs.push_enabled)
            pref_span.set_attribute("prefs.quiet_hours", prefs.in_quiet_hours)

            if not prefs.push_enabled or prefs.in_quiet_hours:
                pref_span.set_attribute("push.suppressed", True)
                span.set_attribute("push.suppressed_reason",
                    "disabled" if not prefs.push_enabled else "quiet_hours")
                return

        # Look up the user's registered devices
        with tracer.start_as_current_span("push.lookup_devices") as device_span:
            devices = get_user_devices(user_id)
            device_span.set_attribute("devices.count", len(devices))
            device_span.set_attribute("devices.ios", sum(1 for d in devices if d.platform == "ios"))
            device_span.set_attribute("devices.android",
                sum(1 for d in devices if d.platform == "android"))
            device_span.set_attribute("devices.web",
                sum(1 for d in devices if d.platform == "web"))

        # Build the notification payload for each platform
        with tracer.start_as_current_span("push.build_payloads"):
            payloads = build_platform_payloads(event_type, payload, devices)

        # Send to each device via the appropriate provider
        results = []
        for device in devices:
            result = send_to_device(device, payloads[device.platform])
            results.append(result)

        delivered = sum(1 for r in results if r.success)
        span.set_attribute("push.devices_targeted", len(devices))
        span.set_attribute("push.delivered", delivered)
        span.set_attribute("push.failed", len(devices) - delivered)
```

## Tracing Provider-Specific Delivery

Each push provider has different APIs, rate limits, and error handling. You should trace them separately.

```python
def send_to_device(device, payload):
    with tracer.start_as_current_span("push.deliver") as span:
        span.set_attribute("device.id", device.device_id)
        span.set_attribute("device.platform", device.platform)
        span.set_attribute("device.token_age_days", device.token_age_days)

        if device.platform == "ios":
            return send_via_apns(device, payload, span)
        elif device.platform == "android":
            return send_via_fcm(device, payload, span)
        elif device.platform == "web":
            return send_via_web_push(device, payload, span)

def send_via_apns(device, payload, parent_span):
    with tracer.start_as_current_span("push.apns.send") as span:
        span.set_attribute("apns.topic", payload.topic)
        span.set_attribute("apns.priority", payload.priority)
        span.set_attribute("apns.push_type", payload.push_type)

        try:
            response = apns_client.send(
                device_token=device.token,
                payload=payload.to_apns_dict(),
                topic=payload.topic
            )
            span.set_attribute("apns.status_code", response.status_code)
            span.set_attribute("apns.success", response.status_code == 200)

            if response.status_code == 410:
                # Token is no longer valid
                span.add_event("token_expired", {"device_id": device.device_id})
                invalidate_device_token(device.device_id)

            return DeliveryResult(success=response.status_code == 200, provider="apns")

        except Exception as e:
            span.set_attribute("error", True)
            span.add_event("apns_error", {"error": str(e)})
            return DeliveryResult(success=False, provider="apns", error=str(e))

def send_via_fcm(device, payload, parent_span):
    with tracer.start_as_current_span("push.fcm.send") as span:
        span.set_attribute("fcm.project_id", FCM_PROJECT_ID)

        try:
            response = fcm_client.send(
                token=device.token,
                notification=payload.to_fcm_notification(),
                data=payload.to_fcm_data()
            )
            span.set_attribute("fcm.message_id", response.message_id)
            span.set_attribute("fcm.success", True)
            return DeliveryResult(success=True, provider="fcm")

        except fcm_errors.UnregisteredError:
            span.add_event("token_unregistered", {"device_id": device.device_id})
            invalidate_device_token(device.device_id)
            return DeliveryResult(success=False, provider="fcm", error="unregistered")

        except Exception as e:
            span.set_attribute("error", True)
            span.add_event("fcm_error", {"error": str(e)})
            return DeliveryResult(success=False, provider="fcm", error=str(e))

def send_via_web_push(device, payload, parent_span):
    with tracer.start_as_current_span("push.webpush.send") as span:
        span.set_attribute("webpush.endpoint", device.push_endpoint[:50])

        try:
            response = webpush_client.send(
                subscription_info=device.subscription_info,
                data=payload.to_json(),
                vapid_claims=VAPID_CLAIMS
            )
            span.set_attribute("webpush.status_code", response.status_code)
            span.set_attribute("webpush.success", response.status_code == 201)
            return DeliveryResult(
                success=response.status_code == 201,
                provider="webpush"
            )
        except Exception as e:
            span.set_attribute("error", True)
            return DeliveryResult(success=False, provider="webpush", error=str(e))
```

## Delivery Metrics

```python
notifications_sent = meter.create_counter(
    "push.notifications.sent",
    description="Total push notifications sent by provider and status"
)

delivery_latency = meter.create_histogram(
    "push.delivery.latency_ms",
    description="Time to deliver notification to provider",
    unit="ms"
)

token_invalidations = meter.create_counter(
    "push.tokens.invalidated",
    description="Device tokens invalidated due to expiry or unregistration"
)

notifications_suppressed = meter.create_counter(
    "push.notifications.suppressed",
    description="Notifications suppressed due to user preferences"
)
```

## What You Learn

Push notification delivery is often a black box. You send a notification and hope it arrives. With OpenTelemetry tracing, you know exactly what happened: which provider handled the delivery, how long it took, whether the device token was still valid, and whether user preferences suppressed the notification. Over time, the metrics show you which provider has the best delivery rates, how many stale tokens are in your database, and whether quiet hours settings are being applied correctly. That is the difference between hoping notifications work and knowing they do.
