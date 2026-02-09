# How to Deploy Temporal Workflow Engine on Kubernetes for Durable Serverless Workflows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Temporal, Kubernetes, Workflows, Serverless, Orchestration

Description: Deploy Temporal workflow engine on Kubernetes to build durable, fault-tolerant serverless workflows with automatic retries, timeouts, and long-running process orchestration.

---

Temporal is a workflow orchestration platform that makes building reliable, distributed applications straightforward. It handles the complexity of retries, timeouts, and state management while your code focuses on business logic. This guide shows you how to deploy Temporal on Kubernetes and build durable workflows.

## Understanding Temporal

Temporal workflows are functions that can run for seconds or years. The engine persists workflow state automatically, so failures don't lose progress. If a worker crashes, another picks up where it left off. This makes building reliable long-running processes simple.

Workflows orchestrate activities, which are the actual work units. Activities can fail and retry with exponential backoff automatically. Temporal handles all the complex retry logic, timeout management, and state persistence you'd otherwise build yourself.

## Installing Temporal on Kubernetes

Deploy using Helm:

```bash
# Add Temporal Helm repo
helm repo add temporalio https://go.temporal.io/helm-charts
helm repo update

# Create namespace
kubectl create namespace temporal

# Install with PostgreSQL
helm install temporal temporalio/temporal \
  --namespace temporal \
  --set server.replicaCount=3 \
  --set server.config.persistence.default.sql.driver=postgres12 \
  --set server.config.persistence.default.sql.host=postgres \
  --set server.config.persistence.default.sql.port=5432 \
  --set server.config.persistence.default.sql.database=temporal \
  --set server.config.persistence.default.sql.user=temporal \
  --set server.config.persistence.default.sql.password=temporal

# Wait for deployment
kubectl wait --for=condition=available --timeout=300s deployment/temporal-frontend -n temporal

# Verify
kubectl get pods -n temporal
```

Install Web UI:

```bash
helm install temporal-web temporalio/temporal-web \
  --namespace temporal \
  --set service.type=LoadBalancer
```

## Building Your First Workflow

Create a simple order processing workflow:

```python
# workflows.py
from temporalio import workflow, activity
from datetime import timedelta
from dataclasses import dataclass

@dataclass
class Order:
    order_id: str
    customer_id: str
    total: float

@activity.defn
async def charge_payment(order: Order) -> str:
    """Charge customer for order"""
    print(f"Charging ${order.total} for order {order.order_id}")
    # Payment processing logic
    return f"PAYMENT-{order.order_id}"

@activity.defn
async def reserve_inventory(order: Order) -> bool:
    """Reserve inventory items"""
    print(f"Reserving inventory for order {order.order_id}")
    # Inventory logic
    return True

@activity.defn
async def ship_order(order: Order) -> str:
    """Ship the order"""
    print(f"Shipping order {order.order_id}")
    # Shipping logic
    return f"SHIP-{order.order_id}"

@workflow.defn
class OrderWorkflow:
    """Orchestrate order processing"""

    @workflow.run
    async def run(self, order: Order) -> str:
        """Main workflow logic"""

        # Step 1: Charge payment with retry
        payment_id = await workflow.execute_activity(
            charge_payment,
            order,
            start_to_close_timeout=timedelta(minutes=5),
            retry_policy={
                'maximum_attempts': 3,
                'initial_interval': timedelta(seconds=1),
                'backoff_coefficient': 2.0
            }
        )

        # Step 2: Reserve inventory
        reserved = await workflow.execute_activity(
            reserve_inventory,
            order,
            start_to_close_timeout=timedelta(minutes=2)
        )

        if not reserved:
            # Compensate - refund payment
            await workflow.execute_activity(
                refund_payment,
                payment_id,
                start_to_close_timeout=timedelta(minutes=5)
            )
            return "ORDER_CANCELLED"

        # Step 3: Ship order
        tracking = await workflow.execute_activity(
            ship_order,
            order,
            start_to_close_timeout=timedelta(hours=24)
        )

        return f"ORDER_COMPLETED: {tracking}"
```

Deploy the worker:

```python
# worker.py
import asyncio
from temporalio.client import Client
from temporalio.worker import Worker
from workflows import OrderWorkflow, charge_payment, reserve_inventory, ship_order

async def main():
    client = await Client.connect("temporal-frontend.temporal:7233")

    worker = Worker(
        client,
        task_queue="order-processing",
        workflows=[OrderWorkflow],
        activities=[charge_payment, reserve_inventory, ship_order]
    )

    print("Worker started, processing workflows...")
    await worker.run()

if __name__ == "__main__":
    asyncio.run(main())
```

Deploy worker as Kubernetes deployment:

```yaml
# temporal-worker.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-worker
  namespace: temporal
spec:
  replicas: 3
  selector:
    matchLabels:
      app: order-worker
  template:
    metadata:
      labels:
        app: order-worker
    spec:
      containers:
      - name: worker
        image: your-registry/order-worker:latest
        env:
        - name: TEMPORAL_ADDRESS
          value: "temporal-frontend.temporal:7233"
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
```

## Starting Workflows

Create a service to start workflows:

```python
# workflow_starter.py
from flask import Flask, request, jsonify
from temporalio.client import Client
from workflows import OrderWorkflow, Order
import asyncio

app = Flask(__name__)

async def get_client():
    return await Client.connect("temporal-frontend.temporal:7233")

@app.route('/orders', methods=['POST'])
def create_order():
    data = request.get_json()

    order = Order(
        order_id=data['order_id'],
        customer_id=data['customer_id'],
        total=data['total']
    )

    async def start_workflow():
        client = await get_client()

        handle = await client.start_workflow(
            OrderWorkflow.run,
            order,
            id=f"order-{order.order_id}",
            task_queue="order-processing"
        )

        return handle.id

    workflow_id = asyncio.run(start_workflow())

    return jsonify({
        'workflow_id': workflow_id,
        'status': 'started'
    })

@app.route('/orders/<workflow_id>', methods=['GET'])
def get_order_status(workflow_id):
    async def check_status():
        client = await get_client()
        handle = client.get_workflow_handle(workflow_id)

        try:
            result = await handle.result()
            return {'status': 'completed', 'result': result}
        except:
            return {'status': 'running'}

    status = asyncio.run(check_status())
    return jsonify(status)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

## Implementing Long-Running Workflows

Build a workflow with human approval:

```python
# approval_workflow.py
from temporalio import workflow
from datetime import timedelta

@workflow.defn
class ApprovalWorkflow:
    def __init__(self):
        self.approved = False

    @workflow.run
    async def run(self, request: dict) -> str:
        # Send approval request
        await workflow.execute_activity(
            send_approval_email,
            request,
            start_to_close_timeout=timedelta(minutes=1)
        )

        # Wait for approval signal (could be days)
        try:
            await workflow.wait_condition(
                lambda: self.approved,
                timeout=timedelta(days=7)
            )
        except asyncio.TimeoutError:
            return "APPROVAL_TIMEOUT"

        if self.approved:
            await workflow.execute_activity(
                process_approved_request,
                request,
                start_to_close_timeout=timedelta(hours=1)
            )
            return "APPROVED_AND_PROCESSED"
        else:
            return "REJECTED"

    @workflow.signal
    async def approve(self):
        self.approved = True

    @workflow.signal
    async def reject(self):
        self.approved = False
```

Signal the workflow:

```python
# Send approval signal
async def approve_request(workflow_id):
    client = await Client.connect("temporal-frontend.temporal:7233")
    handle = client.get_workflow_handle(workflow_id)
    await handle.signal(ApprovalWorkflow.approve)
```

## Monitoring Workflows

Query workflow state:

```python
# Add query to workflow
@workflow.defn
class OrderWorkflow:
    def __init__(self):
        self.current_step = "STARTED"

    @workflow.query
    def get_status(self) -> str:
        return self.current_step

    @workflow.run
    async def run(self, order: Order) -> str:
        self.current_step = "CHARGING_PAYMENT"
        payment_id = await workflow.execute_activity(...)

        self.current_step = "RESERVING_INVENTORY"
        reserved = await workflow.execute_activity(...)

        self.current_step = "SHIPPING"
        tracking = await workflow.execute_activity(...)

        self.current_step = "COMPLETED"
        return tracking

# Query from client
handle = client.get_workflow_handle(workflow_id)
status = await handle.query(OrderWorkflow.get_status)
```

## Best Practices

Keep workflows deterministic. Don't use random numbers, current time, or external calls directly in workflow code. Use activities for non-deterministic operations.

Design idempotent activities. Activities may be retried. Ensure repeated execution produces the same result.

Set appropriate timeouts. Configure start-to-close timeouts for activities based on expected execution time. Use longer timeouts for workflows.

Use signals for external interactions. When workflows need input from external systems, use signals rather than polling.

Monitor workflow metrics. Track workflow completion rates, failure rates, and duration. Set up alerts for anomalies.

Version workflows carefully. Temporal supports versioning to allow safe workflow updates without breaking running instances.

## Conclusion

Temporal provides a robust foundation for building durable serverless workflows on Kubernetes. By handling state persistence, retries, and failure recovery automatically, it lets you focus on business logic rather than distributed systems complexity. The combination of workflows for orchestration and activities for execution creates a powerful model for building reliable long-running processes that survive failures and can run for days, months, or years.
