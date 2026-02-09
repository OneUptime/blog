# How to Trace SaaS Free-Trial to Paid Conversion Workflows with OpenTelemetry Business Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Business Metrics, SaaS Conversion, Free Trial

Description: Trace the free-trial to paid conversion workflow with OpenTelemetry business metrics to understand what drives upgrades and where users drop off.

Understanding why some trial users convert to paid customers and others do not is one of the most impactful things you can measure. OpenTelemetry business metrics let you track the conversion funnel alongside your operational data, giving you a unified view of user behavior and system performance throughout the trial experience.

## Defining Trial Lifecycle Events

The trial lifecycle has distinct stages that need tracking:

```python
# trial_metrics.py
from opentelemetry import metrics, trace
from datetime import datetime, timedelta

meter = metrics.get_meter("business.trial")
tracer = trace.get_tracer("business.trial")

# Trial lifecycle counters
trial_started = meter.create_counter(
    "trial.started",
    description="Number of trials started",
    unit="1",
)

trial_converted = meter.create_counter(
    "trial.converted",
    description="Number of trials converted to paid",
    unit="1",
)

trial_expired = meter.create_counter(
    "trial.expired",
    description="Number of trials that expired without conversion",
    unit="1",
)

trial_extended = meter.create_counter(
    "trial.extended",
    description="Number of trial extensions granted",
    unit="1",
)

# Track how far into the trial users are when they convert
days_to_convert = meter.create_histogram(
    "trial.days_to_convert",
    description="Number of days from trial start to conversion",
    unit="days",
)

# Track feature engagement during trial
trial_feature_usage = meter.create_counter(
    "trial.feature.usage",
    description="Feature usage events during trial period",
    unit="1",
)
```

## Tracking Trial Start

```python
# trial_service.py
class TrialService:
    def start_trial(self, user_id: str, plan: str, source: str):
        """Start a new trial with full tracking."""
        with tracer.start_as_current_span(
            "trial.start",
            attributes={
                "user.id": user_id,
                "trial.plan": plan,
                "trial.source": source,
                "trial.duration_days": 14,
            }
        ) as span:
            trial = create_trial_record(
                user_id=user_id,
                plan=plan,
                starts_at=datetime.utcnow(),
                expires_at=datetime.utcnow() + timedelta(days=14),
            )

            trial_started.add(1, {
                "trial.plan": plan,
                "trial.source": source,
            })

            span.set_attribute("trial.id", trial.id)
            span.set_attribute("trial.expires_at", str(trial.expires_at))

            return trial
```

## Tracking Feature Engagement During Trial

This is where the real insight lives. Users who engage deeply with core features are more likely to convert:

```python
    def track_trial_engagement(self, user_id: str, feature_name: str):
        """Track feature usage during the trial period."""
        trial = get_active_trial(user_id)
        if not trial:
            return

        days_into_trial = (datetime.utcnow() - trial.starts_at).days

        with tracer.start_as_current_span(
            "trial.feature_engagement",
            attributes={
                "user.id": user_id,
                "trial.id": trial.id,
                "feature.name": feature_name,
                "trial.day": days_into_trial,
            }
        ):
            trial_feature_usage.add(1, {
                "trial.plan": trial.plan,
                "feature.name": feature_name,
                "trial.week": "week_1" if days_into_trial < 7 else "week_2",
            })

            # Check if user has hit key activation milestones
            usage_count = get_feature_usage_count(user_id, feature_name)
            check_activation_milestone(user_id, feature_name, usage_count)

def check_activation_milestone(user_id: str, feature: str, count: int):
    """Check if a trial user has reached key activation points."""
    milestones = {
        "dashboard_create": 1,
        "alert_configured": 1,
        "team_member_invited": 2,
        "integration_connected": 1,
        "report_generated": 3,
    }

    if feature in milestones and count == milestones[feature]:
        with tracer.start_as_current_span(
            "trial.activation_milestone",
            attributes={
                "user.id": user_id,
                "trial.milestone": feature,
            }
        ):
            mark_milestone_reached(user_id, feature)
```

## Conversion Event Tracking

When a trial user decides to upgrade, trace the entire conversion flow:

```python
    async def convert_trial(self, user_id: str, selected_plan: str, payment_method: dict):
        """Handle trial to paid conversion."""
        trial = get_active_trial(user_id)

        with tracer.start_as_current_span(
            "trial.convert",
            attributes={
                "user.id": user_id,
                "trial.id": trial.id,
                "trial.original_plan": trial.plan,
                "conversion.selected_plan": selected_plan,
            }
        ) as span:
            days_in_trial = (datetime.utcnow() - trial.starts_at).days
            span.set_attribute("trial.days_used", days_in_trial)

            # Capture engagement data at conversion time
            engagement = get_trial_engagement_summary(user_id)
            span.set_attribute("trial.features_used", engagement["feature_count"])
            span.set_attribute("trial.sessions", engagement["session_count"])
            span.set_attribute("trial.team_members", engagement["team_size"])

            # Process the upgrade
            with tracer.start_as_current_span("trial.payment_setup"):
                subscription = await create_subscription(
                    user_id, selected_plan, payment_method
                )

            # Record the conversion
            trial_converted.add(1, {
                "trial.plan": trial.plan,
                "conversion.plan": selected_plan,
                "trial.source": trial.source,
            })

            days_to_convert.record(days_in_trial, {
                "conversion.plan": selected_plan,
            })

            # Mark trial as converted
            await mark_trial_converted(trial.id, subscription.id)

            return subscription
```

## Expiration and Churn Tracking

```python
    async def handle_trial_expiration(self, trial_id: str):
        """Process an expired trial and capture why they did not convert."""
        trial = get_trial(trial_id)

        with tracer.start_as_current_span(
            "trial.expire",
            attributes={
                "trial.id": trial_id,
                "user.id": trial.user_id,
                "trial.plan": trial.plan,
            }
        ) as span:
            engagement = get_trial_engagement_summary(trial.user_id)
            span.set_attribute("trial.features_used", engagement["feature_count"])
            span.set_attribute("trial.last_active_day",
                             engagement.get("last_active_day", 0))

            trial_expired.add(1, {
                "trial.plan": trial.plan,
                "trial.source": trial.source,
                "trial.engagement_level": categorize_engagement(engagement),
            })

def categorize_engagement(engagement: dict) -> str:
    """Categorize trial engagement level for metric grouping."""
    if engagement["session_count"] == 0:
        return "no_engagement"
    elif engagement["feature_count"] < 3:
        return "low"
    elif engagement["feature_count"] < 7:
        return "medium"
    else:
        return "high"
```

## Building the Conversion Dashboard

With these metrics, you can build a dashboard that shows:

- **Conversion rate by source**: Which acquisition channels produce the best trial-to-paid conversion?
- **Time to convert distribution**: Do most conversions happen in week 1 or week 2?
- **Feature correlation**: Which features are most strongly associated with conversion?
- **Engagement-to-conversion funnel**: What percentage of "high engagement" trials convert vs "low engagement"?

This data directly informs product decisions. If users who configure at least one alert during their trial convert at 3x the rate of those who do not, you know to make alert setup a prominent part of the trial experience. OpenTelemetry makes this possible without bolting on a separate analytics platform.
