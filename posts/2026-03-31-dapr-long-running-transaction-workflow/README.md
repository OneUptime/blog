# How to Implement Long-Running Transaction Workflow with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Saga, Transaction, Compensation

Description: Learn how to implement long-running distributed transactions with Dapr Workflow using the Saga pattern to ensure consistency across multiple services.

---

## The Problem with Distributed Transactions

Traditional ACID transactions do not span multiple services. When an order workflow touches inventory, payment, and shipping services, a failure halfway through leaves the system in an inconsistent state. The Saga pattern solves this with a sequence of local transactions, each paired with a compensating transaction that undoes its effect if a later step fails.

## Designing the Saga

Map out each step and its compensation:

| Step | Forward Action | Compensation |
|------|----------------|--------------|
| 1 | Reserve inventory | Release inventory |
| 2 | Debit payment | Refund payment |
| 3 | Create shipment | Cancel shipment |
| 4 | Send confirmation | Send cancellation |

## Implementing the Saga Workflow

```csharp
public class OrderSagaWorkflow : Workflow<OrderInput, OrderResult>
{
    public override async Task<OrderResult> RunAsync(
        WorkflowContext context, OrderInput input)
    {
        var compensations = new Stack<(string Activity, object Arg)>();

        try
        {
            // Step 1: Reserve inventory
            await context.CallActivityAsync(
                nameof(ReserveInventoryActivity), input.Items);
            compensations.Push((nameof(ReleaseInventoryActivity), input.Items));

            // Step 2: Debit payment
            var paymentId = await context.CallActivityAsync<string>(
                nameof(DebitPaymentActivity), input.Payment);
            compensations.Push((nameof(RefundPaymentActivity), paymentId));

            // Step 3: Create shipment
            var shipmentId = await context.CallActivityAsync<string>(
                nameof(CreateShipmentActivity), input.Shipping);
            compensations.Push((nameof(CancelShipmentActivity), shipmentId));

            // Step 4: Send confirmation
            await context.CallActivityAsync(
                nameof(SendConfirmationActivity), input.CustomerId);

            return new OrderResult { Status = "Completed" };
        }
        catch (Exception ex)
        {
            context.SetCustomStatus($"Compensating due to: {ex.Message}");

            // Execute compensations in reverse order
            while (compensations.Count > 0)
            {
                var (activity, arg) = compensations.Pop();
                try
                {
                    await context.CallActivityAsync(activity, arg);
                }
                catch (Exception compEx)
                {
                    // Log but continue - best effort compensation
                    context.SetCustomStatus(
                        $"Compensation {activity} failed: {compEx.Message}");
                }
            }

            return new OrderResult { Status = "Failed", Reason = ex.Message };
        }
    }
}
```

## Compensation Activities

```csharp
public class RefundPaymentActivity : WorkflowActivity<string, bool>
{
    private readonly PaymentService _payments;

    public RefundPaymentActivity(PaymentService payments)
    {
        _payments = payments;
    }

    public override async Task<bool> RunAsync(
        WorkflowActivityContext context, string paymentId)
    {
        await _payments.RefundAsync(paymentId);
        return true;
    }
}
```

## Monitoring Saga Progress

Dapr Workflow preserves the custom status string in its state store:

```bash
# Query workflow status
curl http://localhost:3500/v1.0/workflows/dapr/order-saga-001
```

Response:

```json
{
  "instanceID": "order-saga-001",
  "workflowName": "OrderSagaWorkflow",
  "createdAt": "2026-03-31T10:00:00Z",
  "lastUpdatedAt": "2026-03-31T10:01:30Z",
  "runtimeStatus": "RUNNING",
  "properties": {
    "dapr.workflow.custom_status": "\"Compensating due to: Payment gateway timeout\""
  }
}
```

## Idempotency in Activities

Compensation activities must be idempotent - safe to call multiple times:

```csharp
public override async Task<bool> RunAsync(
    WorkflowActivityContext context, string paymentId)
{
    var payment = await _payments.GetAsync(paymentId);
    if (payment?.Status == "Refunded") return true; // already done

    await _payments.RefundAsync(paymentId);
    return true;
}
```

## Summary

Dapr Workflow is well-suited for implementing the Saga pattern for long-running distributed transactions. By maintaining a compensation stack and executing compensations in reverse order on failure, you achieve eventual consistency across services without distributed locks. Always make compensation activities idempotent so they survive retries without side effects.
