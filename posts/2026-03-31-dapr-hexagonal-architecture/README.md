# How to Use Dapr with Hexagonal Architecture

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Hexagonal Architecture, Ports And Adapters, Design Pattern, Microservice

Description: Apply Hexagonal Architecture (Ports and Adapters) to Dapr microservices, using ports for domain contracts and Dapr as a pluggable adapter for infrastructure.

---

## What is Hexagonal Architecture?

Hexagonal Architecture (also called Ports and Adapters) places the application core at the center, surrounded by ports (interfaces) and adapters (concrete implementations). Dapr building blocks are excellent candidates for adapters - they implement your ports for state storage, messaging, and service invocation.

## Hexagonal Structure for a Dapr Service

```text
src/
- core/                          # Application core
  - domain/
    - Order.py
  - ports/
    - outbound/
      - OrderRepositoryPort.py   # Port (interface)
      - EventBusPort.py
    - inbound/
      - OrderServicePort.py
  - services/
    - OrderService.py            # Uses ports only
- adapters/
  - outbound/
    - dapr/
      - DaprOrderRepository.py  # Adapter for Dapr state
      - DaprEventBus.py         # Adapter for Dapr pub/sub
  - inbound/
    - http/
      - OrderController.py      # Exposes OrderServicePort via HTTP
```

## Define Outbound Ports

```python
# core/ports/outbound/OrderRepositoryPort.py
from abc import ABC, abstractmethod
from core.domain.order import Order

class OrderRepositoryPort(ABC):

    @abstractmethod
    async def find_by_id(self, order_id: str) -> Order:
        pass

    @abstractmethod
    async def save(self, order: Order) -> None:
        pass
```

## Implement the Dapr Adapter

```python
# adapters/outbound/dapr/DaprOrderRepository.py
import aiohttp
from core.ports.outbound.OrderRepositoryPort import OrderRepositoryPort
from core.domain.order import Order

class DaprOrderRepository(OrderRepositoryPort):
    DAPR_URL = "http://localhost:3500/v1.0"
    STORE_NAME = "statestore"

    async def find_by_id(self, order_id: str) -> Order:
        async with aiohttp.ClientSession() as session:
            url = f"{self.DAPR_URL}/state/{self.STORE_NAME}/{order_id}"
            async with session.get(url) as resp:
                data = await resp.json()
                return Order(**data)

    async def save(self, order: Order) -> None:
        async with aiohttp.ClientSession() as session:
            url = f"{self.DAPR_URL}/state/{self.STORE_NAME}"
            await session.post(url, json=[{
                "key": order.id,
                "value": order.__dict__
            }])
```

## Application Core Service

```python
# core/services/OrderService.py
from core.ports.outbound.OrderRepositoryPort import OrderRepositoryPort
from core.ports.outbound.EventBusPort import EventBusPort
from core.domain.order import Order

class OrderService:
    def __init__(
        self,
        repo: OrderRepositoryPort,
        event_bus: EventBusPort,
    ):
        self._repo = repo
        self._event_bus = event_bus

    async def create_order(self, customer_id: str, items: list) -> Order:
        order = Order.create(customer_id, items)
        await self._repo.save(order)
        await self._event_bus.publish("order-created", {"orderId": order.id})
        return order
```

## Wire Adapters via Dependency Injection

```python
# main.py
from fastapi import FastAPI, Depends
from adapters.outbound.dapr.DaprOrderRepository import DaprOrderRepository
from adapters.outbound.dapr.DaprEventBus import DaprEventBus
from core.services.OrderService import OrderService

app = FastAPI()

def get_order_service() -> OrderService:
    return OrderService(
        repo=DaprOrderRepository(),
        event_bus=DaprEventBus(),
    )

@app.post("/orders")
async def create_order(
    request: CreateOrderRequest,
    service: OrderService = Depends(get_order_service)
):
    order = await service.create_order(request.customer_id, request.items)
    return {"orderId": order.id}
```

## Swap Adapters for Testing

```python
# tests/test_order_service.py
from unittest.mock import AsyncMock
from core.services.OrderService import OrderService

async def test_create_order():
    mock_repo = AsyncMock()
    mock_bus = AsyncMock()

    service = OrderService(repo=mock_repo, event_bus=mock_bus)
    order = await service.create_order("cust-1", ["item-a"])

    mock_repo.save.assert_called_once()
    mock_bus.publish.assert_called_once_with("order-created", {"orderId": order.id})
```

## Summary

Hexagonal Architecture maps naturally to Dapr microservices - your application core defines ports as Python/Java/C# interfaces, and Dapr building blocks become pluggable outbound adapters. This separation allows full unit testing of business logic without a running Dapr sidecar and enables swapping Dapr components with in-memory fakes during development.
