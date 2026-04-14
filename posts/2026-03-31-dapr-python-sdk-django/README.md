# How to Use Dapr Python SDK with Django

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Python, Django, Microservice, State Management

Description: Learn how to integrate the Dapr Python SDK into a Django application for state management, pub/sub messaging, and service invocation.

---

## Introduction

Django is a full-featured Python web framework widely used for building web applications and APIs. Integrating Dapr into a Django project enables it to participate in a microservices architecture with access to state stores, pub/sub messaging, and service invocation through the Dapr sidecar.

## Prerequisites

```bash
pip install dapr django djangorestframework
django-admin startproject myproject
cd myproject
python manage.py startapp orders
```

## Configuring Dapr in Django Settings

```python
# myproject/settings.py
INSTALLED_APPS = [
    ...
    "rest_framework",
    "orders",
]

# Dapr configuration
DAPR_STATE_STORE = "statestore"
DAPR_PUBSUB = "pubsub"
DAPR_ORDER_TOPIC = "order-created"
```

## Creating a Dapr Service Class

Wrap `DaprClient` in a reusable service class:

```python
# orders/dapr_service.py
import json
from dapr.clients import DaprClient
from django.conf import settings

class OrderDaprService:
    def save_order(self, order_id: str, order_data: dict):
        with DaprClient() as client:
            client.save_state(
                store_name=settings.DAPR_STATE_STORE,
                key=order_id,
                value=json.dumps(order_data)
            )

    def get_order(self, order_id: str) -> dict | None:
        with DaprClient() as client:
            result = client.get_state(
                store_name=settings.DAPR_STATE_STORE,
                key=order_id
            )
            if result.data:
                return json.loads(result.data.decode("utf-8"))
            return None

    def publish_order(self, order_data: dict):
        with DaprClient() as client:
            client.publish_event(
                pubsub_name=settings.DAPR_PUBSUB,
                topic_name=settings.DAPR_ORDER_TOPIC,
                data=json.dumps(order_data),
                data_content_type="application/json"
            )
```

## Django REST Framework Views

```python
# orders/views.py
import json
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .dapr_service import OrderDaprService

dapr_service = OrderDaprService()

class OrderView(APIView):
    def post(self, request):
        order = request.data
        order_id = order.get("id")
        if not order_id:
            return Response({"error": "id required"}, status=400)
        dapr_service.save_order(order_id, order)
        dapr_service.publish_order(order)
        return Response({"order_id": order_id, "status": "created"}, status=201)

    def get(self, request, order_id):
        order = dapr_service.get_order(order_id)
        if order:
            return Response(order)
        return Response({"error": "not found"}, status=404)
```

## URL Configuration

```python
# orders/urls.py
from django.urls import path
from .views import OrderView, subscribe, handle_inventory_update

urlpatterns = [
    path("orders/", OrderView.as_view()),
    path("orders/<str:order_id>/", OrderView.as_view()),
    path("dapr/subscribe", subscribe),
    path("inventory-update", handle_inventory_update),
]
```

## Handling Pub/Sub Subscriptions

```python
# orders/views.py (subscription handler)
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json

@csrf_exempt
def subscribe(request):
    return JsonResponse([{
        "pubsubname": "pubsub",
        "topic": "inventory-updated",
        "route": "/inventory-update"
    }], safe=False)

@csrf_exempt
def handle_inventory_update(request):
    body = json.loads(request.body)
    data = body.get("data", {})
    print(f"Inventory updated: {data}")
    return JsonResponse({"status": "SUCCESS"})
```

## Running Django with Dapr

```bash
dapr run \
  --app-id django-service \
  --app-port 8000 \
  -- python manage.py runserver 0.0.0.0:8000
```

## Summary

Dapr integrates cleanly with Django by wrapping `DaprClient` in service classes that you call from Django views. State management and pub/sub are available through the standard `DaprClient` API, while pub/sub subscriptions use Django URL routes. This approach keeps Dapr concerns separate from Django business logic.
