# How to Monitor SaaS Onboarding Flow Completion Rates and Bottlenecks with OpenTelemetry Funnel Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Onboarding, Funnel Metrics, SaaS

Description: Track SaaS onboarding flow completion rates and identify bottlenecks using OpenTelemetry funnel metrics and custom instrumentation.

Your onboarding flow is the first real experience a user has with your product. If they drop off at step 3 of 5, you need to know why. Was it a slow API call? A confusing UI step? A backend error they never saw? OpenTelemetry lets you instrument your onboarding funnel so you can measure completion rates and trace individual user journeys through the flow.

## Defining the Onboarding Funnel

Most SaaS onboarding flows follow a series of steps. For this example, let us assume a five-step funnel:

1. Account creation
2. Email verification
3. Organization setup
4. First integration connected
5. First dashboard created

Each step is a measurable event. The goal is to track how many users reach each step and how long each step takes.

## Instrumenting Funnel Steps with Custom Metrics

```python
# onboarding_metrics.py
from opentelemetry import metrics, trace
from time import time

meter = metrics.get_meter("onboarding.funnel")
tracer = trace.get_tracer("onboarding.flow")

# Counter for each funnel step
funnel_step_counter = meter.create_counter(
    "onboarding.funnel.step_completed",
    description="Count of users completing each onboarding step",
    unit="1",
)

# Histogram to track time spent on each step
step_duration = meter.create_histogram(
    "onboarding.funnel.step_duration",
    description="Time users spend on each onboarding step",
    unit="seconds",
)

# Track dropoff explicitly
dropoff_counter = meter.create_counter(
    "onboarding.funnel.dropoff",
    description="Users who abandoned onboarding at each step",
    unit="1",
)

FUNNEL_STEPS = [
    "account_creation",
    "email_verification",
    "org_setup",
    "first_integration",
    "first_dashboard",
]

def record_step_completion(user_id: str, step_name: str, duration_seconds: float):
    """Record that a user completed an onboarding step."""
    step_index = FUNNEL_STEPS.index(step_name)

    funnel_step_counter.add(1, {
        "onboarding.step": step_name,
        "onboarding.step_index": step_index,
    })

    step_duration.record(duration_seconds, {
        "onboarding.step": step_name,
    })
```

## Tracing the Full Onboarding Journey

While metrics give you aggregate numbers, traces let you follow a single user through the entire flow:

```python
# onboarding_service.py
from opentelemetry import trace
from opentelemetry.trace import StatusCode

tracer = trace.get_tracer("onboarding.service")

class OnboardingService:
    def start_onboarding(self, user_id: str):
        """Begin a new onboarding flow, creating a root span for the journey."""
        with tracer.start_as_current_span(
            "onboarding.full_flow",
            attributes={
                "user.id": user_id,
                "onboarding.started_at": str(datetime.utcnow()),
            }
        ) as span:
            # Store the trace context so we can link later steps
            trace_id = span.get_span_context().trace_id
            save_onboarding_trace_id(user_id, trace_id)
            return trace_id

    def complete_step(self, user_id: str, step_name: str, metadata: dict = None):
        """Mark an onboarding step as complete with timing data."""
        with tracer.start_as_current_span(
            f"onboarding.step.{step_name}",
            attributes={
                "user.id": user_id,
                "onboarding.step": step_name,
            }
        ) as span:
            if metadata:
                for key, value in metadata.items():
                    span.set_attribute(f"onboarding.{key}", str(value))

            # Check for common bottlenecks
            if step_name == "email_verification":
                self._check_email_delivery(user_id, span)

            span.set_attribute("onboarding.step.status", "completed")

    def _check_email_delivery(self, user_id: str, span):
        """Check if email delivery was delayed, which causes dropoffs."""
        with tracer.start_as_current_span("onboarding.email.delivery_check") as child:
            delivery_time = get_email_delivery_time(user_id)
            child.set_attribute("email.delivery_seconds", delivery_time)
            if delivery_time > 60:
                child.set_attribute("onboarding.bottleneck", "slow_email_delivery")
                child.add_event("Email delivery exceeded 60 second threshold")
```

## Detecting Dropoffs with a Background Job

Users who start onboarding but never finish need to be counted as dropoffs. A periodic job can detect stale onboarding sessions:

```python
# onboarding_dropoff_detector.py
from datetime import datetime, timedelta
from onboarding_metrics import dropoff_counter, FUNNEL_STEPS

def detect_onboarding_dropoffs():
    """Find users who have stalled in onboarding and record dropoffs."""
    with tracer.start_as_current_span("onboarding.dropoff_detection") as span:
        cutoff = datetime.utcnow() - timedelta(hours=24)
        stalled_users = get_stalled_onboarding_sessions(cutoff)

        span.set_attribute("onboarding.stalled_count", len(stalled_users))

        for session in stalled_users:
            last_step = session["last_completed_step"]
            next_step_index = FUNNEL_STEPS.index(last_step) + 1

            if next_step_index < len(FUNNEL_STEPS):
                dropped_at = FUNNEL_STEPS[next_step_index]
                dropoff_counter.add(1, {
                    "onboarding.dropoff_step": dropped_at,
                    "onboarding.last_completed": last_step,
                    "user.signup_source": session.get("signup_source", "unknown"),
                })

            # Mark session as dropped off so we do not count it again
            mark_session_dropped(session["user_id"])
```

## Building the Funnel Dashboard

With these metrics flowing into your observability platform, you can build a funnel visualization. The key queries are:

- **Completion rate per step**: `sum(onboarding.funnel.step_completed)` grouped by `onboarding.step`
- **Drop-off rate**: `sum(onboarding.funnel.dropoff)` grouped by `onboarding.dropoff_step`
- **Step duration P95**: `histogram_quantile(0.95, onboarding.funnel.step_duration)` grouped by `onboarding.step`

The most actionable insight is usually the step with the highest dropoff combined with the longest duration. If users spend 5 minutes on "first integration" and 40% drop off there, that step needs UX work or better documentation.

## API Endpoint Instrumentation

Do not forget to instrument the API endpoints that power each onboarding step:

```python
# onboarding_api.py
from fastapi import APIRouter, Request
from onboarding_metrics import record_step_completion
import time

router = APIRouter()

@router.post("/onboarding/org-setup")
async def setup_organization(request: Request):
    start = time.time()
    user_id = request.state.user_id

    with tracer.start_as_current_span(
        "api.onboarding.org_setup",
        attributes={"user.id": user_id}
    ):
        org = await create_organization(request)
        duration = time.time() - start
        record_step_completion(user_id, "org_setup", duration)
        return {"org_id": org.id, "status": "created"}
```

## Wrapping Up

Treating onboarding as a measured funnel rather than a "hope they figure it out" experience makes a real difference in conversion. The combination of funnel metrics for aggregate trends and distributed traces for debugging individual user issues gives you both the big picture and the detail needed to improve each step systematically.
