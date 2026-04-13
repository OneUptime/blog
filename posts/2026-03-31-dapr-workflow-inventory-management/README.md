# How to Use Dapr Workflow for Inventory Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Inventory, Supply Chain, Reorder, Orchestration

Description: Learn how to build inventory management workflows using Dapr Workflow to automate stock monitoring, reorder triggers, and supplier coordination with full audit trails.

---

## Inventory Management as a Workflow Problem

Inventory management involves multiple coordinated actions: monitoring stock levels, triggering reorders, coordinating with suppliers, receiving goods, and updating stock counts. Each step needs to complete reliably and leave an audit trail. Dapr Workflow provides durable orchestration for exactly these kinds of multi-party business processes.

## Use Case: Automated Reorder Workflow

When stock falls below the reorder threshold:
1. Check current stock and calculate order quantity
2. Select best supplier based on price and lead time
3. Create purchase order
4. Notify the supplier
5. Wait for supplier confirmation (up to 24 hours)
6. Update ERP system
7. Schedule receiving reminder

## Workflow in Python

```python
import dapr.ext.workflow as wf
from datetime import timedelta, datetime

def inventory_reorder_workflow(ctx: wf.DaprWorkflowContext, product: dict):
    ctx.set_custom_status("Checking stock levels")

    # Step 1 - calculate reorder quantity
    reorder_plan = yield ctx.call_activity(calculate_reorder, input=product)
    if not reorder_plan["needed"]:
        return {"status": "no_reorder_needed", "sku": product["sku"]}

    # Step 2 - select supplier
    ctx.set_custom_status("Selecting supplier")
    supplier = yield ctx.call_activity(select_best_supplier, input={
        "sku": product["sku"],
        "quantity": reorder_plan["quantity"]
    })

    # Step 3 - create PO
    ctx.set_custom_status("Creating purchase order")
    po = yield ctx.call_activity(create_purchase_order, input={
        "product": product,
        "supplier": supplier,
        "quantity": reorder_plan["quantity"],
        "workflowId": ctx.instance_id
    })

    # Step 4 - notify supplier
    yield ctx.call_activity(notify_supplier, input={
        "supplier": supplier,
        "po": po,
        "workflowId": ctx.instance_id
    })

    ctx.set_custom_status(f"Waiting for PO confirmation from {supplier['name']}")

    # Step 5 - wait up to 24h for supplier confirmation
    confirm_event = ctx.wait_for_external_event("supplier_confirmed")
    timeout = ctx.create_timer(timedelta(hours=24))
    winner = yield wf.when_any([confirm_event, timeout])

    if winner == timeout:
        yield ctx.call_activity(escalate_to_procurement, input={"po": po, "supplier": supplier})
        return {"status": "escalated", "poId": po["id"]}

    confirmation = confirm_event.get_result()

    # Step 6 - update ERP
    yield ctx.call_activity(update_erp_system, input={
        "poId": po["id"],
        "confirmedDeliveryDate": confirmation["deliveryDate"],
        "status": "confirmed"
    })

    # Step 7 - schedule receiving reminder
    delivery_date = datetime.fromisoformat(confirmation["deliveryDate"])
    reminder_time = delivery_date - timedelta(hours=2)
    yield ctx.create_timer(reminder_time)
    yield ctx.call_activity(send_receiving_reminder, input={"po": po})

    return {"status": "confirmed", "poId": po["id"], "eta": confirmation["deliveryDate"]}
```

## Activity: Select Best Supplier

```python
@wf.activity
def select_best_supplier(ctx, request: dict) -> dict:
    resp = requests.get(
        "http://supplier-service/quotes",
        params={"sku": request["sku"], "quantity": request["quantity"]}
    )
    quotes = resp.json()

    # Score suppliers by price and lead time
    best = min(quotes, key=lambda q: q["price"] * 1.0 + q["leadTimeDays"] * 2.0)
    return best
```

## Supplier Confirmation Callback

```python
from flask import Flask, request
from dapr.clients import DaprClient

app = Flask(__name__)

@app.route("/supplier/confirm", methods=["POST"])
def supplier_confirm():
    data = request.get_json()
    workflow_id = data["workflowId"]

    with DaprClient() as d:
        d.raise_workflow_event(
            instance_id=workflow_id,
            workflow_component="dapr",
            event_name="supplier_confirmed",
            event_data={
                "deliveryDate": data["deliveryDate"],
                "confirmedQuantity": data["quantity"]
            }
        )
    return {"status": "acknowledged"}, 200
```

## Triggering Reorders via Stock Monitoring

```python
# In your stock monitoring service
def check_reorder_triggers():
    low_stock = get_low_stock_products()
    with DaprClient() as d:
        for product in low_stock:
            try:
                d.start_workflow(
                    workflow_component="dapr",
                    workflow_name="inventory_reorder_workflow",
                    instance_id=f"reorder-{product['sku']}-{today}",
                    input=product
                )
            except Exception:
                pass  # Workflow already running for this SKU today
```

## Summary

Dapr Workflow enables sophisticated inventory management automation by coordinating stock monitoring, supplier selection, purchase order creation, and external supplier confirmations in a single durable workflow. Built-in timer support handles delivery scheduling, and idempotent instance IDs prevent duplicate reorders for the same SKU.
