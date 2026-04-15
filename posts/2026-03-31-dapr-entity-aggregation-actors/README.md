# How to Implement Entity Aggregation with Dapr Actors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Aggregation, DDD, Stateful

Description: Learn how to implement domain entity aggregation using Dapr actors to enforce business invariants and encapsulate all state mutations for an aggregate root.

---

## What Is Entity Aggregation with Actors?

In Domain-Driven Design, an aggregate is a cluster of entities with a root that enforces consistency. Dapr actors are a natural fit: the actor ID is the aggregate root ID, the actor state is the aggregate state, and all mutations go through the actor - ensuring business rules are always enforced.

## Order Aggregate Actor Interface

```typescript
// IOrderActor.ts
export interface IOrderActor {
  addItem(item: OrderItem): Promise<void>;
  removeItem(productId: string): Promise<void>;
  applyDiscount(code: string, percent: number): Promise<void>;
  confirm(): Promise<Order>;
  cancel(reason: string): Promise<void>;
  getOrder(): Promise<Order>;
}
```

## Order Aggregate Actor Implementation (Python)

```python
from dapr.actor import Actor, ActorInterface, actormethod


class OrderActorInterface(ActorInterface):
    @actormethod(name='add_item')
    async def add_item(self, item: dict) -> None: ...

    @actormethod(name='apply_discount')
    async def apply_discount(self, code: str, percent: float) -> None: ...

    @actormethod(name='confirm')
    async def confirm(self) -> dict: ...

    @actormethod(name='get_order')
    async def get_order(self) -> dict: ...


class OrderActor(Actor, OrderActorInterface):
    STATE_KEY = "order"

    async def _on_activate(self):
        order = await self._state_manager.try_get_state(self.STATE_KEY)
        if not order[0]:
            await self._state_manager.set_state(self.STATE_KEY, {
                "id": self.id.id,
                "items": [],
                "status": "draft",
                "totalAmount": 0,
                "discounts": []
            })

    async def add_item(self, item: dict):
        order = await self._state_manager.get_state(self.STATE_KEY)
        if order["status"] != "draft":
            raise ValueError(f"Cannot add items to order in {order['status']} status")

        existing = next((i for i in order["items"] if i["productId"] == item["productId"]), None)
        if existing:
            existing["quantity"] += item["quantity"]
        else:
            order["items"].append(item)

        order["totalAmount"] = sum(i["price"] * i["quantity"] for i in order["items"])
        await self._state_manager.set_state(self.STATE_KEY, order)

    async def apply_discount(self, code: str, percent: float):
        order = await self._state_manager.get_state(self.STATE_KEY)
        if order["status"] != "draft":
            raise ValueError("Discounts can only be applied to draft orders")
        if any(d["code"] == code for d in order["discounts"]):
            raise ValueError(f"Discount {code} already applied")
        if percent <= 0 or percent > 50:
            raise ValueError("Discount must be between 1% and 50%")

        order["discounts"].append({"code": code, "percent": percent})
        order["totalAmount"] *= (1 - percent / 100)
        await self._state_manager.set_state(self.STATE_KEY, order)

    async def confirm(self):
        order = await self._state_manager.get_state(self.STATE_KEY)
        if not order["items"]:
            raise ValueError("Cannot confirm an empty order")
        if order["status"] != "draft":
            raise ValueError(f"Order already {order['status']}")

        order["status"] = "confirmed"
        order["confirmedAt"] = __import__("datetime").datetime.utcnow().isoformat()
        await self._state_manager.set_state(self.STATE_KEY, order)
        return order

    async def get_order(self):
        return await self._state_manager.get_state(self.STATE_KEY)
```

## Invoking the Aggregate from a Controller

```javascript
const { DaprClient, ActorProxyBuilder, ActorId } = require('@dapr/dapr');
const client = new DaprClient();

class OrderActor {} // client-side stub matching the actor type name
const builder = new ActorProxyBuilder(OrderActor, client);

app.post('/orders/:orderId/items', async (req, res) => {
  const actor = builder.build(new ActorId(req.params.orderId));
  await actor.add_item(req.body);
  const order = await actor.get_order();
  res.json(order);
});

app.post('/orders/:orderId/confirm', async (req, res) => {
  const actor = builder.build(new ActorId(req.params.orderId));
  const confirmed = await actor.confirm();
  res.json(confirmed);
});
```

## Turn-Based Concurrency Protects Invariants

Dapr actors process one call at a time per actor instance. This means two concurrent `add_item` calls for the same order queue up - no race conditions and no need for pessimistic locks.

## Summary

Dapr actors enforce aggregate root invariants through turn-based concurrency and encapsulated state. By routing all mutations through actor methods, you guarantee that business rules - like no discounts over 50% and no items on confirmed orders - are always checked before state is persisted.
