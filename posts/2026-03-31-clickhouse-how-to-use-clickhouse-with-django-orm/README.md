# How to Use ClickHouse with Django ORM

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Django, ORM, Python, Web Framework, Analytics

Description: Connect ClickHouse to Django using django-clickhouse-backend to define models, run migrations, and query analytical data through the Django ORM.

---

Django's ORM is normally paired with transactional databases, but with the `django-clickhouse-backend` package you can define ClickHouse-backed models, run queries, and integrate analytics into your Django application.

## Installing Dependencies

```bash
pip install django django-clickhouse-backend
```

## Configuring the ClickHouse Database

In `settings.py`, add a ClickHouse database entry:

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    },
    'clickhouse': {
        'ENGINE': 'clickhouse_backend.backend',
        'NAME': 'default',
        'HOST': 'localhost',
        'PORT': 9000,
        'USER': 'default',
        'PASSWORD': '',
    }
}
```

## Defining a ClickHouse Model

```python
from clickhouse_backend import models

class PageView(models.ClickhouseModel):
    page = models.StringField(default='')
    user_id = models.StringField(default='')
    created_at = models.DateTime64Field()
    duration_ms = models.UInt32Field(default=0)

    class Meta:
        engine = models.MergeTree(
            order_by=('created_at', 'page'),
        )
```

Fields must be imported from `clickhouse_backend.models`, not `django.db.models`, because they map to ClickHouse-native data types. Storage-level ordering is a parameter of the `MergeTree` engine itself rather than a separate Meta attribute.

## Running Migrations

```bash
python manage.py migrate --database=clickhouse
```

## Inserting Records

```python
from myapp.models import PageView
from django.utils import timezone

PageView.objects.using('clickhouse').bulk_create([
    PageView(
        page='/home',
        user_id='user_123',
        created_at=timezone.now(),
        duration_ms=350
    ),
    PageView(
        page='/about',
        user_id='user_456',
        created_at=timezone.now(),
        duration_ms=120
    ),
])
```

## Querying with the ORM

```python
from myapp.models import PageView
from django.db.models import Count, Avg

# Top pages by views
top_pages = (
    PageView.objects
    .using('clickhouse')
    .values('page')
    .annotate(views=Count('id'), avg_duration=Avg('duration_ms'))
    .order_by('-views')[:10]
)

for row in top_pages:
    print(row['page'], row['views'], row['avg_duration'])
```

## Raw SQL Queries

For ClickHouse-specific SQL that the ORM cannot express:

```python
from django.db import connections

with connections['clickhouse'].cursor() as cursor:
    cursor.execute("""
        SELECT
            toDate(created_at) AS day,
            uniq(user_id) AS unique_users
        FROM myapp_pageview
        GROUP BY day
        ORDER BY day DESC
        LIMIT 30
    """)
    rows = cursor.fetchall()
```

## Database Router

Add a router to direct model queries to the correct database:

```python
class ClickHouseRouter:
    def db_for_read(self, model, **hints):
        if model._meta.app_label == 'analytics':
            return 'clickhouse'
        return None

    def db_for_write(self, model, **hints):
        if model._meta.app_label == 'analytics':
            return 'clickhouse'
        return None
```

## Summary

`django-clickhouse-backend` brings Django's familiar ORM interface to ClickHouse. You define models, run migrations, and use `QuerySet` methods for most analytical queries. For ClickHouse-specific aggregations, fall back to raw SQL via the cursor. This approach lets Django applications gain fast analytics without a separate query layer.
