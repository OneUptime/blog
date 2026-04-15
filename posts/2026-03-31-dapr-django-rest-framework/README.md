# How to Use Dapr with Django REST Framework

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Django, Python, REST API, Microservice

Description: Integrate Dapr with Django REST Framework to add state management, pub/sub, and service invocation to Python-based microservices.

---

Django REST Framework (DRF) is the go-to framework for Python REST APIs. Combining it with Dapr adds cloud-native capabilities like distributed state, pub/sub messaging, and service invocation without replacing your existing DRF architecture. This guide shows how to add Dapr to a DRF project.

## Setting Up Django with Dapr

Install Django REST Framework and the Dapr Python SDK:

```bash
pip install djangorestframework dapr
```

Add DRF to your `settings.py`:

```python
import os

INSTALLED_APPS = [
    'django.contrib.contenttypes',
    'django.contrib.auth',
    'rest_framework',
    'orders',
]

REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': ['rest_framework.renderers.JSONRenderer'],
    'DEFAULT_PARSER_CLASSES': ['rest_framework.parsers.JSONParser'],
}

DAPR_HTTP_PORT = os.environ.get('DAPR_HTTP_PORT', '3500')
DAPR_STATE_STORE = 'statestore'
DAPR_PUBSUB = 'pubsub'
```

## Creating a Dapr Client Helper

```python
# orders/dapr_client.py
from dapr.clients import DaprClient
from django.conf import settings
import json

def get_state(key: str):
    with DaprClient() as client:
        result = client.get_state(
            store_name=settings.DAPR_STATE_STORE,
            key=key
        )
        if result.data:
            return json.loads(result.data.decode('utf-8'))
        return None

def save_state(key: str, value: dict):
    with DaprClient() as client:
        client.save_state(
            store_name=settings.DAPR_STATE_STORE,
            key=key,
            value=json.dumps(value)
        )

def publish_event(topic: str, data: dict):
    with DaprClient() as client:
        client.publish_event(
            pubsub_name=settings.DAPR_PUBSUB,
            topic_name=topic,
            data=json.dumps(data),
            data_content_type='application/json'
        )

def invoke_service(app_id: str, method: str, http_verb: str, data: dict = None):
    with DaprClient() as client:
        result = client.invoke_method(
            app_id=app_id,
            method_name=method,
            data=json.dumps(data or {}).encode('utf-8'),
            http_verb=http_verb,
            content_type='application/json'
        )
        return json.loads(result.data)
```

## Building DRF Views with Dapr

Create views that use Dapr for state and pub/sub:

```python
# orders/views.py
import uuid
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .dapr_client import get_state, save_state, publish_event, invoke_service

class OrderListView(APIView):
    def get(self, request):
        orders = get_state('all-orders') or []
        return Response(orders)

    def post(self, request):
        order = request.data.copy()
        order['id'] = str(uuid.uuid4())
        order['status'] = 'pending'

        # Validate with inventory service via Dapr
        inventory = invoke_service(
            'inventory-service',
            f"inventory/{order['product_id']}",
            'GET'
        )
        if inventory.get('quantity', 0) < order.get('quantity', 1):
            return Response(
                {'error': 'Insufficient inventory'},
                status=status.HTTP_409_CONFLICT
            )

        # Save order to state store
        all_orders = get_state('all-orders') or []
        all_orders.append(order)
        save_state('all-orders', all_orders)
        save_state(f"order-{order['id']}", order)

        # Publish order created event
        publish_event('order-created', order)

        return Response(order, status=status.HTTP_201_CREATED)

class OrderDetailView(APIView):
    def get(self, request, order_id):
        order = get_state(f'order-{order_id}')
        if not order:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(order)
```

## Handling Dapr Pub/Sub Subscriptions

Dapr calls your endpoint with subscribed events. Create a subscription endpoint:

```python
# orders/views.py (continued)
from rest_framework.decorators import api_view
import json

@api_view(['GET'])
def dapr_subscribe(request):
    # Tell Dapr what topics to subscribe to
    return Response([{
        'pubsubname': 'pubsub',
        'topic': 'payment-completed',
        'route': '/orders/payment-completed'
    }])

@api_view(['POST'])
def payment_completed(request):
    # Dapr wraps events in CloudEvents format
    cloud_event = request.data
    event_data = cloud_event.get('data', {})

    order_id = event_data.get('order_id')
    order = get_state(f'order-{order_id}')
    if order:
        order['status'] = 'paid'
        save_state(f'order-{order_id}', order)

    return Response({'status': 'SUCCESS'})
```

Wire up URLs:

```python
# orders/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('orders', views.OrderListView.as_view()),
    path('orders/<str:order_id>', views.OrderDetailView.as_view()),
    path('dapr/subscribe', views.dapr_subscribe),
    path('orders/payment-completed', views.payment_completed),
]
```

## Running with Dapr CLI

```bash
dapr run \
  --app-id order-service \
  --app-port 8000 \
  --dapr-http-port 3500 \
  -- python manage.py runserver 0.0.0.0:8000
```

## Summary

Integrating Dapr with Django REST Framework adds distributed state, pub/sub, and service invocation to Python microservices with minimal code changes. The Dapr Python SDK wraps client calls cleanly, and DRF's class-based views work naturally with Dapr's subscription pattern for handling incoming events.
