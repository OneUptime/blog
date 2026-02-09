# How to Monitor Enrollment Surge Events (Registration Day) with OpenTelemetry Autoscaling Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Autoscaling, Enrollment, Kubernetes

Description: Monitor enrollment surge events and autoscaling behavior during registration day using OpenTelemetry metrics and alerts.

Registration day at a university is like Black Friday for education IT. Traffic can spike 50x or more within minutes of the enrollment window opening. If your systems cannot scale fast enough, students face timeouts and errors. This post covers how to use OpenTelemetry to monitor autoscaling behavior during enrollment surges so you can verify your infrastructure responds correctly to demand.

## The Autoscaling Challenge

During a normal day, a university SIS might handle 500 requests per minute. On registration day, that number can jump to 25,000+ requests per minute within the first 60 seconds. Your autoscaling rules need to detect this surge and spin up additional capacity before users start seeing errors.

The problem is that autoscaling has inherent lag. It takes time to detect the traffic increase, decide to scale, provision new instances, and route traffic to them. OpenTelemetry helps you measure each of these phases.

## Collecting Infrastructure Metrics

Start by collecting metrics from your container orchestrator and load balancer:

```python
from opentelemetry import metrics

meter = metrics.get_meter("enrollment.infrastructure")

# Track request rate per service
request_rate = meter.create_counter(
    "enrollment.requests_total",
    description="Total HTTP requests to enrollment services",
)

# Track response latency
response_latency = meter.create_histogram(
    "enrollment.response_latency_ms",
    description="HTTP response latency for enrollment endpoints",
    unit="ms",
)

# Track error rate
error_count = meter.create_counter(
    "enrollment.errors_total",
    description="Total errors in enrollment services",
)

# Track active pod/instance count
active_instances = meter.create_observable_gauge(
    "enrollment.active_instances",
    description="Number of active service instances",
)

# Track pending scaling operations
scaling_events = meter.create_counter(
    "enrollment.scaling_events_total",
    description="Number of autoscaling events triggered",
)
```

## Instrumenting the Request Pipeline

Add middleware that captures per-request metrics with enrollment-specific context:

```python
from opentelemetry import trace
import time

tracer = trace.get_tracer("enrollment.gateway")

def enrollment_middleware(request, next_handler):
    """Middleware to track enrollment request performance."""
    with tracer.start_as_current_span(
        "enrollment.handle_request",
        attributes={
            "enrollment.endpoint": request.path,
            "enrollment.method": request.method,
            "enrollment.student_type": classify_student(request),
            "enrollment.registration_window": get_registration_window(),
        }
    ) as span:
        start = time.time()

        request_rate.add(1, {
            "enrollment.endpoint": request.path,
            "enrollment.method": request.method,
        })

        try:
            response = next_handler(request)
            latency_ms = (time.time() - start) * 1000

            span.set_attribute("http.status_code", response.status_code)
            span.set_attribute("enrollment.latency_ms", latency_ms)

            response_latency.record(latency_ms, {
                "enrollment.endpoint": request.path,
            })

            if response.status_code >= 500:
                error_count.add(1, {
                    "enrollment.endpoint": request.path,
                    "enrollment.error_type": "server_error",
                })

            return response

        except Exception as e:
            error_count.add(1, {
                "enrollment.endpoint": request.path,
                "enrollment.error_type": type(e).__name__,
            })
            span.set_status(trace.StatusCode.ERROR, str(e))
            raise
```

## Monitoring Kubernetes HPA Behavior

If you are running on Kubernetes, instrument the Horizontal Pod Autoscaler (HPA) decisions:

```python
from kubernetes import client, watch
from opentelemetry import trace, metrics

tracer = trace.get_tracer("enrollment.autoscaler")
meter = metrics.get_meter("enrollment.autoscaler")

hpa_desired_replicas = meter.create_observable_gauge(
    "enrollment.hpa_desired_replicas",
    description="Number of replicas the HPA wants",
)

hpa_current_replicas = meter.create_observable_gauge(
    "enrollment.hpa_current_replicas",
    description="Current number of running replicas",
)

scale_up_latency = meter.create_histogram(
    "enrollment.scale_up_latency_seconds",
    description="Time from HPA decision to pods being ready",
    unit="s",
)

def monitor_hpa_events(namespace, hpa_name):
    """Watch HPA events and record scaling metrics."""
    v2 = client.AutoscalingV2Api()

    while True:
        hpa = v2.read_namespaced_horizontal_pod_autoscaler(
            hpa_name, namespace
        )

        current = hpa.status.current_replicas
        desired = hpa.status.desired_replicas

        if desired > current:
            # Scale-up in progress
            with tracer.start_as_current_span(
                "enrollment.scale_up",
                attributes={
                    "enrollment.current_replicas": current,
                    "enrollment.desired_replicas": desired,
                    "enrollment.scale_delta": desired - current,
                    "enrollment.hpa_name": hpa_name,
                }
            ) as span:
                # Wait for pods to become ready
                start = time.time()
                wait_for_ready_replicas(namespace, hpa_name, desired)
                scale_duration = time.time() - start

                span.set_attribute("enrollment.scale_up_duration_seconds", scale_duration)
                scale_up_latency.record(scale_duration, {
                    "enrollment.hpa_name": hpa_name,
                })

                scaling_events.add(1, {
                    "enrollment.direction": "up",
                    "enrollment.delta": str(desired - current),
                })

        time.sleep(10)
```

## Tracking Queue Backpressure

During surges, request queues build up. Monitor queue depth to detect when you need to scale faster:

```python
queue_depth = meter.create_observable_gauge(
    "enrollment.queue_depth",
    description="Number of enrollment requests waiting in the queue",
)

queue_wait_time = meter.create_histogram(
    "enrollment.queue_wait_ms",
    description="Time a request spends waiting in the queue",
    unit="ms",
)

def process_enrollment_queue():
    while True:
        # Record current queue depth
        current_depth = get_queue_length()

        # Dequeue and process
        message = queue.get()
        wait_time = time.time() - message.enqueued_at

        queue_wait_time.record(wait_time * 1000, {
            "enrollment.priority": message.priority,
        })

        with tracer.start_as_current_span(
            "enrollment.process_queued_request",
            attributes={
                "enrollment.queue_wait_ms": wait_time * 1000,
                "enrollment.queue_depth_at_dequeue": current_depth,
            }
        ):
            handle_enrollment(message)
```

## Pre-Surge Capacity Validation

Before registration opens, run a capacity check to verify your system is ready:

```python
def pre_registration_health_check():
    """Run before the registration window opens to verify readiness."""
    with tracer.start_as_current_span(
        "enrollment.pre_registration_check"
    ) as span:
        checks = {
            "db_connection_pool": check_db_pool_availability(),
            "cache_cluster": check_cache_health(),
            "api_instances": check_min_instance_count(),
            "queue_service": check_queue_health(),
        }

        all_passed = all(v["healthy"] for v in checks.values())
        span.set_attribute("enrollment.all_checks_passed", all_passed)

        for name, result in checks.items():
            span.set_attribute(f"enrollment.check.{name}", result["healthy"])

        return all_passed
```

## Conclusion

Monitoring enrollment surge events with OpenTelemetry autoscaling metrics gives your team confidence that infrastructure will keep up with demand. By tracking autoscaler behavior, queue backpressure, and per-request latency with enrollment-specific context, you can identify scaling bottlenecks and tune your autoscaling rules to handle the unique traffic patterns of registration day.
