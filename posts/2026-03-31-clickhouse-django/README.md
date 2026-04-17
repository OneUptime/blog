# How to Use ClickHouse with Django

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Django, Python, Database, Analytics, ORM

Description: Integrate ClickHouse into a Django project using clickhouse-connect and django-clickhouse-backend, run analytical queries, and build reporting views alongside PostgreSQL.

---

Django's ORM is built for transactional databases, but many production applications need both: PostgreSQL for writes and user data, and ClickHouse for analytical queries over large event tables. This guide shows how to add ClickHouse to a Django project without replacing your existing database.

## Architecture Overview

The typical pattern is a dual-database setup:

- **PostgreSQL** (default Django database): users, orders, configuration, transactional data
- **ClickHouse** (analytics database): events, logs, metrics, aggregations

Django sends writes to PostgreSQL and analytical queries to ClickHouse directly through a client.

## Installation

```bash
pip install clickhouse-connect django django-clickhouse-backend
```

`django-clickhouse-backend` provides an optional Django database backend that lets you use Django's ORM with ClickHouse tables.

## Settings Configuration

```python
# settings.py

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": "myapp",
        "USER": "postgres",
        "PASSWORD": "secret",
        "HOST": "localhost",
        "PORT": "5432",
    },
    "clickhouse": {
        "ENGINE": "clickhouse_backend.backend",
        "NAME": "analytics",
        "HOST": "localhost",
        "PORT": 8123,
        "USER": "default",
        "PASSWORD": "",
        "OPTIONS": {
            "settings": {
                "max_execution_time": 60,
            }
        },
    },
}

DATABASE_ROUTERS = ["myapp.routers.ClickHouseRouter"]
```

## Database Router

Create a router so Django ORM models marked for ClickHouse are directed to the right database:

```python
# myapp/routers.py

class ClickHouseRouter:
    clickhouse_apps = {"analytics"}

    def db_for_read(self, model, **hints):
        if model._meta.app_label in self.clickhouse_apps:
            return "clickhouse"
        return None

    def db_for_write(self, model, **hints):
        if model._meta.app_label in self.clickhouse_apps:
            return "clickhouse"
        return None

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        if app_label in self.clickhouse_apps:
            return db == "clickhouse"
        return db == "default"
```

## ClickHouse ORM Model

```python
# analytics/models.py
import uuid
from django.db import models
from clickhouse_backend import models as chmodels

class Event(chmodels.ClickhouseModel):
    event_id  = chmodels.UUIDField(default=uuid.uuid4)
    user_id   = chmodels.UInt64Field()
    session   = models.CharField(max_length=64)
    event_type = models.CharField(max_length=64)
    page      = models.CharField(max_length=512)
    ts        = models.DateTimeField()

    class Meta:
        app_label = "analytics"
        engine = chmodels.MergeTree(
            order_by=("event_type", "user_id", "ts"),
            partition_by=chmodels.toYYYYMM("ts"),
        )

    def __str__(self):
        return f"{self.event_type} by user {self.user_id}"
```

## Migrations

Run migrations targeting the ClickHouse database:

```bash
python manage.py makemigrations analytics
python manage.py migrate --database=clickhouse
```

## Direct Client Usage

For complex analytical queries that are hard to express with the ORM, use `clickhouse-connect` directly:

```python
# analytics/client.py
import clickhouse_connect
from django.conf import settings

_client = None

def get_ch_client():
    global _client
    if _client is None:
        db = settings.DATABASES["clickhouse"]
        _client = clickhouse_connect.get_client(
            host=db["HOST"],
            port=db["PORT"],
            username=db["USER"],
            password=db["PASSWORD"],
            database=db["NAME"],
        )
    return _client
```

## Django Views with ClickHouse Queries

```python
# analytics/views.py
from django.http import JsonResponse
from django.views import View
from datetime import datetime, timedelta
from .client import get_ch_client

class EventSummaryView(View):
    def get(self, request):
        days = int(request.GET.get("days", 7))
        since = datetime.utcnow() - timedelta(days=days)

        ch = get_ch_client()
        result = ch.query(
            """
            SELECT
                event_type,
                count()       AS total,
                uniq(user_id) AS users
            FROM analytics.events
            WHERE ts >= {since:DateTime}
            GROUP BY event_type
            ORDER BY total DESC
            LIMIT 20
            """,
            parameters={"since": since},
        )

        data = [
            {"event_type": row[0], "total": row[1], "users": row[2]}
            for row in result.result_rows
        ]
        return JsonResponse({"results": data})


class TimeSeriesView(View):
    def get(self, request):
        event_type = request.GET.get("event_type", "page_view")
        since = datetime.utcnow() - timedelta(hours=24)

        ch = get_ch_client()
        result = ch.query(
            """
            SELECT
                toStartOfHour(ts) AS hour,
                count()           AS events
            FROM analytics.events
            WHERE event_type = {et:String}
              AND ts >= {since:DateTime}
            GROUP BY hour
            ORDER BY hour
            """,
            parameters={"et": event_type, "since": since},
        )

        data = [{"hour": str(row[0]), "events": row[1]} for row in result.result_rows]
        return JsonResponse({"timeseries": data})


class RetentionView(View):
    def get(self, request):
        ch = get_ch_client()
        result = ch.query(
            """
            SELECT
                cohort_week,
                week_number,
                count(DISTINCT user_id) AS retained_users
            FROM (
                SELECT
                    user_id,
                    toStartOfWeek(min(ts))   AS cohort_week,
                    dateDiff('week', toStartOfWeek(min(ts)), toStartOfWeek(ts)) AS week_number
                FROM analytics.events
                WHERE ts >= today() - 90
                GROUP BY user_id, toStartOfWeek(ts)
            )
            GROUP BY cohort_week, week_number
            ORDER BY cohort_week, week_number
            """
        )

        data = [
            {"cohort_week": str(row[0]), "week_number": row[1], "retained_users": row[2]}
            for row in result.result_rows
        ]
        return JsonResponse({"retention": data})
```

## URL Configuration

```python
# analytics/urls.py
from django.urls import path
from .views import EventSummaryView, TimeSeriesView, RetentionView

urlpatterns = [
    path("analytics/summary/", EventSummaryView.as_view()),
    path("analytics/timeseries/", TimeSeriesView.as_view()),
    path("analytics/retention/", RetentionView.as_view()),
]
```

## Inserting Events from Django Signals

A common pattern is to write events to ClickHouse when Django model changes occur:

```python
# myapp/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from datetime import datetime
from analytics.client import get_ch_client

User = get_user_model()

@receiver(post_save, sender=User)
def track_user_created(sender, instance, created, **kwargs):
    if created:
        ch = get_ch_client()
        ch.insert(
            "analytics.events",
            [[instance.id, "", "user_signup", "/", "{}", datetime.utcnow()]],
            column_names=["user_id", "session", "event_type", "page", "properties", "ts"],
        )
```

Register signals in your app config:

```python
# myapp/apps.py
from django.apps import AppConfig

class MyAppConfig(AppConfig):
    name = "myapp"

    def ready(self):
        import myapp.signals  # noqa
```

## Management Command for Backfill

```python
# analytics/management/commands/backfill_events.py
from django.core.management.base import BaseCommand
from analytics.client import get_ch_client
from myapp.models import Order

class Command(BaseCommand):
    help = "Backfill historical orders into ClickHouse"

    def handle(self, *args, **options):
        ch = get_ch_client()
        orders = Order.objects.select_related("user").iterator(chunk_size=5000)

        batch = []
        for order in orders:
            batch.append([
                order.user_id,
                "",
                "order_placed",
                "/checkout",
                "{}",
                order.created_at,
            ])
            if len(batch) >= 5000:
                ch.insert(
                    "analytics.events",
                    batch,
                    column_names=["user_id", "session", "event_type", "page", "properties", "ts"],
                )
                batch.clear()
                self.stdout.write(".", ending="")

        if batch:
            ch.insert("analytics.events", batch,
                      column_names=["user_id", "session", "event_type", "page", "properties", "ts"])

        self.stdout.write(self.style.SUCCESS("\nBackfill complete."))
```

Run the backfill:

```bash
python manage.py backfill_events
```

## Django REST Framework Integration

If you use DRF, create a serializer and viewset for the analytics data:

```python
# analytics/serializers.py
from rest_framework import serializers

class EventSummarySerializer(serializers.Serializer):
    event_type = serializers.CharField()
    total      = serializers.IntegerField()
    users      = serializers.IntegerField()

# analytics/api_views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from datetime import datetime, timedelta
from .client import get_ch_client
from .serializers import EventSummarySerializer

class EventSummaryAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        since = datetime.utcnow() - timedelta(days=7)
        ch = get_ch_client()
        result = ch.query(
            """
            SELECT event_type, count() AS total, uniq(user_id) AS users
            FROM analytics.events
            WHERE ts >= {since:DateTime}
            GROUP BY event_type ORDER BY total DESC
            """,
            parameters={"since": since},
        )
        data = [{"event_type": r[0], "total": r[1], "users": r[2]} for r in result.result_rows]
        serializer = EventSummarySerializer(data, many=True)
        return Response(serializer.data)
```

## Summary

Django and ClickHouse integrate cleanly through a dual-database pattern. Use PostgreSQL for transactional data and Django's ORM. Use ClickHouse with `clickhouse-connect` for all analytical queries. Keep Django signals for real-time event ingestion and management commands for historical backfills. This approach lets you keep all the Django tooling you rely on while gaining ClickHouse's analytical speed.
