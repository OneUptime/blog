# How to Use Dapr for Retail and E-Commerce Platforms

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Retail, E-Commerce, Microservice, Event-Driven

Description: Build a scalable retail and e-commerce platform using Dapr for order management, inventory tracking, shopping cart, and real-time promotions.

---

E-commerce platforms are classic microservices use cases: high traffic spikes, diverse backend requirements, and the need for reliable order processing. Dapr's building blocks map directly to e-commerce patterns - shopping carts in state stores, order events in pub/sub, and payment workflows in Dapr Workflow.

## E-Commerce Architecture with Dapr

```text
Web/Mobile -> API Gateway -> Product Service (Dapr)
                          -> Cart Service (Dapr)
                          -> Order Service (Dapr)
                          -> Inventory Service (Dapr)
                          -> Payment Service (Dapr)
                          -> Notification Service (Dapr)
```

## Shopping Cart with Dapr State

Cart data is per-user, session-like data that benefits from Dapr's distributed state:

```typescript
// cart-service/src/routes/cart.ts
import { DaprClient, HttpMethod } from '@dapr/dapr';
import express from 'express';

const router = express.Router();
const daprClient = new DaprClient();

interface CartItem {
  productId: string;
  quantity: number;
  price: number;
}

router.get('/:userId', async (req, res) => {
  const { userId } = req.params;
  const cart = await daprClient.state.get('cart-statestore', `cart:${userId}`);
  res.json(cart || { items: [], total: 0 });
});

router.post('/:userId/items', async (req, res) => {
  const { userId } = req.params;
  const { productId, quantity } = req.body;

  // Get current product price via service invocation
  const product = await daprClient.invoker.invoke(
    'product-service', `products/${productId}`, HttpMethod.GET
  );

  const cart = await daprClient.state.get('cart-statestore', `cart:${userId}`)
    || { items: [], total: 0 };

  const existingItem = cart.items.find((i: CartItem) => i.productId === productId);
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.items.push({ productId, quantity, price: product.price });
  }

  cart.total = cart.items.reduce(
    (sum: number, item: CartItem) => sum + item.price * item.quantity, 0
  );

  // Save cart with TTL (expire abandoned carts after 24h)
  await daprClient.state.save('cart-statestore', [{
    key: `cart:${userId}`,
    value: cart,
    metadata: { ttlInSeconds: '86400' }
  }]);

  res.json(cart);
});

export default router;
```

## Order Processing with Workflow

```python
# order_service/workflows/checkout_workflow.py
from dapr.ext.workflow import WorkflowRuntime, DaprWorkflowContext

wfr = WorkflowRuntime()

@wfr.workflow(name='checkout_workflow')
def checkout_workflow(ctx: DaprWorkflowContext, checkout: dict):
    # Validate and reserve inventory
    reservation = yield ctx.call_activity(reserve_inventory, input=checkout)
    if not reservation['success']:
        return {'status': 'failed', 'reason': 'items_unavailable',
                'unavailable': reservation.get('unavailable', [])}

    # Process payment
    payment = yield ctx.call_activity(process_payment, input={
        'amount': checkout['total'],
        'payment_method': checkout['payment_method'],
        'customer_id': checkout['customer_id']
    })

    if not payment['success']:
        yield ctx.call_activity(release_inventory, input=reservation)
        return {'status': 'failed', 'reason': payment.get('reason', 'payment_failed')}

    # Create order record
    order = yield ctx.call_activity(create_order_record, input={
        'checkout': checkout,
        'payment_id': payment['payment_id']
    })

    # Send confirmation notification
    yield ctx.call_activity(send_confirmation, input={
        'order': order,
        'customer_email': checkout['customer_email']
    })

    return {'status': 'confirmed', 'order_id': order['id']}
```

## Real-Time Inventory Updates

Sync inventory across services via pub/sub:

```python
# inventory_service/events.py
@app.route('/events/order-confirmed', methods=['POST'])
def handle_order_confirmed():
    order = request.json.get('data', {})

    with DaprClient() as client:
        for item in order.get('items', []):
            # Reduce inventory
            state = client.get_state("inventory-statestore",
                                     f"product:{item['product_id']}")
            inventory = json.loads(state.data)
            inventory['available'] -= item['quantity']
            inventory['reserved'] = max(0, inventory.get('reserved', 0) - item['quantity'])

            client.save_state("inventory-statestore",
                              f"product:{item['product_id']}",
                              json.dumps(inventory))

            # Alert if stock low
            if inventory['available'] < inventory.get('reorder_threshold', 10):
                client.publish_event("pubsub", "low-stock-alert", {
                    'product_id': item['product_id'],
                    'available': inventory['available']
                })

    return jsonify({'status': 'SUCCESS'})
```

## Promotional Pricing via Bindings

Fetch promotional prices from an external pricing service on a schedule:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pricing-scheduler
spec:
  type: bindings.cron
  version: v1
  metadata:
    - name: schedule
      value: "0 */6 * * *"  # Every 6 hours
```

```python
@app.route('/pricing-scheduler', methods=['POST'])
def refresh_promotions():
    """Called by Dapr cron binding every 6 hours"""
    with DaprClient() as client:
        promotions = client.invoke_method(
            "pricing-service", "promotions/active", http_verb="GET"
        )
        client.save_state("product-statestore", "active-promotions",
                          promotions.data.decode())
    return '', 200
```

## Summary

Dapr enables retail and e-commerce platforms through distributed shopping cart state with TTL for abandoned cart cleanup, Workflow for reliable checkout orchestration with inventory compensation, pub/sub for real-time inventory sync, and cron bindings for promotional price updates. These patterns handle flash sales and traffic spikes reliably.
