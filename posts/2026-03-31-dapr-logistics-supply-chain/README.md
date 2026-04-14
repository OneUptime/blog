# How to Use Dapr for Logistics and Supply Chain Systems

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Logistics, Supply Chain, Microservice, Event-Driven

Description: Build logistics and supply chain systems with Dapr for shipment tracking, warehouse management, route optimization, and real-time carrier integration.

---

Logistics and supply chain systems handle complex workflows: shipment creation, warehouse operations, carrier integration, and real-time tracking updates. Dapr's workflow engine manages long-running shipment workflows, pub/sub handles real-time tracking events, and bindings integrate with carrier APIs and IoT devices.

## Supply Chain Architecture with Dapr

```text
Order Management -> Shipment Service (Dapr) -> Warehouse Service (Dapr)
                                            -> Carrier Integration (Dapr)
                                            -> Tracking Service (Dapr)
                                            -> Customer Notifications (Dapr)
```

## Shipment Workflow with Dapr Workflow

```python
# shipment_service/workflows/shipment_workflow.py
import dapr.ext.workflow as wf
from datetime import timedelta

wf_runtime = wf.WorkflowRuntime()

@wf_runtime.workflow(name='shipment_workflow')
def shipment_workflow(ctx: wf.DaprWorkflowContext, order: dict):
    # Step 1: Create shipment record
    shipment = yield ctx.call_activity(create_shipment_record, input=order)

    # Step 2: Allocate warehouse pick
    pick_task = yield ctx.call_activity(allocate_warehouse_pick, input={
        'shipment_id': shipment['id'],
        'items': order['items'],
        'warehouse': shipment['warehouse']
    })

    # Step 3: Wait for warehouse to confirm pick (up to 4 hours)
    pick_event = ctx.wait_for_external_event("pick-confirmed")
    pick_timeout = ctx.create_timer(timedelta(hours=4))
    winner = yield wf.when_any([pick_event, pick_timeout])
    if winner == pick_timeout:
        yield ctx.call_activity(escalate_pick_delay, input=shipment)

    # Step 4: Book carrier
    booking = yield ctx.call_activity(book_carrier, input={
        'shipment': shipment,
        'items': order['items'],
        'destination': order['shipping_address']
    })

    # Step 5: Print label
    label = yield ctx.call_activity(generate_label, input=booking)

    # Step 6: Wait for handoff to carrier (up to 24 hours)
    handoff_event = ctx.wait_for_external_event("carrier-handoff")
    handoff_timeout = ctx.create_timer(timedelta(hours=24))
    yield wf.when_any([handoff_event, handoff_timeout])

    # Step 7: Begin tracking updates
    yield ctx.call_activity(start_tracking, input={
        'tracking_number': booking['tracking_number'],
        'carrier': booking['carrier']
    })

    return {'status': 'in_transit', 'tracking_number': booking['tracking_number']}
```

## Real-Time Tracking via IoT Bindings

Receive tracking events from carrier APIs or IoT devices:

```yaml
# components/carrier-webhook.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: carrier-events
spec:
  type: bindings.http
  version: v1
  metadata:
    - name: url
      value: https://api.carrier.com/webhooks/events
```

Handle tracking updates:

```python
# tracking_service/tracking.py
import json
from flask import Flask, request, jsonify
from dapr.clients import DaprClient

app = Flask(__name__)

@app.route('/carrier-events', methods=['POST'])
def handle_carrier_event():
    """Receives tracking updates from carrier via Dapr HTTP binding"""
    event = request.json

    tracking_update = {
        'tracking_number': event.get('trackingNumber'),
        'status': event.get('eventType'),
        'location': event.get('location'),
        'timestamp': event.get('timestamp'),
        'estimated_delivery': event.get('estimatedDelivery')
    }

    with DaprClient() as client:
        # Update shipment state
        client.save_state("tracking-statestore",
                          f"tracking:{tracking_update['tracking_number']}",
                          json.dumps(tracking_update))

        # Publish tracking event to notify customers
        client.publish_event("pubsub", "shipment-status-updated", tracking_update)

        # Resume workflow if delivered
        if tracking_update['status'] == 'DELIVERED':
            client.raise_workflow_event(
                instance_id=get_workflow_id(tracking_update['tracking_number']),
                workflow_component="dapr",
                event_name="delivery-confirmed",
                event_data=tracking_update
            )

    return jsonify({'status': 'SUCCESS'})
```

## Warehouse Management Integration

Handle warehouse pick confirmations:

```python
# warehouse_service/picks.py
@app.route('/picks/<pick_id>/confirm', methods=['POST'])
def confirm_pick(pick_id: str):
    pick_data = request.json

    with DaprClient() as client:
        # Update pick state
        client.save_state("warehouse-statestore", f"pick:{pick_id}",
                          json.dumps({**pick_data, 'status': 'confirmed'}))

        # Signal the shipment workflow to continue
        shipment_id = pick_data.get('shipment_id')
        workflow_id = f"shipment-{shipment_id}"

        client.raise_workflow_event(
            instance_id=workflow_id,
            workflow_component="dapr",
            event_name="pick-confirmed",
            event_data={'pick_id': pick_id, 'confirmed_at': pick_data['timestamp']}
        )

    return jsonify({'status': 'confirmed'})
```

## Route Optimization via Service Invocation

Call a route optimization service during carrier booking:

```python
wf_runtime = wf.WorkflowRuntime()

@wf_runtime.activity(name='book_carrier')
def book_carrier(ctx: wf.WorkflowActivityContext, input_data: dict) -> dict:
    shipment = input_data['shipment']
    destination = input_data['destination']

    with DaprClient() as client:
        # Get optimized route
        route = client.invoke_method(
            app_id="route-optimizer",
            method_name="optimize",
            http_verb="POST",
            data=json.dumps({
                'origin': shipment['warehouse_address'],
                'destination': destination,
                'items': input_data['items'],
                'priority': shipment.get('priority', 'standard')
            }).encode()
        )

        route_data = json.loads(route.data)

        # Book with selected carrier
        booking = client.invoke_method(
            app_id=f"carrier-{route_data['carrier']}-service",
            method_name="book",
            http_verb="POST",
            data=json.dumps({**shipment, 'route': route_data}).encode()
        )

        return json.loads(booking.data)
```

## Summary

Dapr enables logistics and supply chain systems through durable Workflow orchestration that handles long-running shipment processes with timeouts and escalations, HTTP bindings for carrier webhook integration, pub/sub for real-time tracking event distribution, and service invocation for route optimization. External event signaling lets carrier and warehouse systems drive workflow progression without polling.
