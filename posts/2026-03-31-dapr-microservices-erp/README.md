# How to Build a Microservices-Based ERP with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, ERP, Microservice, Architecture, Workflow

Description: Architect a microservices-based ERP system using Dapr for inventory, procurement, finance, and HR modules connected via event-driven workflows and state management.

---

## ERP Architecture with Dapr

An Enterprise Resource Planning (ERP) system integrates multiple business domains. With Dapr, each module becomes an independent microservice while Dapr's building blocks provide the integration layer.

Core ERP modules:
- **Inventory Service** - Stock levels, warehouses, product catalog
- **Procurement Service** - Purchase orders, supplier management
- **Finance Service** - Ledger, accounts payable/receivable, invoicing
- **HR Service** - Employee records, payroll, time tracking
- **Reporting Service** - Cross-domain analytics and reports

```yaml
# dapr/components/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.postgresql
  version: v1
  metadata:
  - name: connectionString
    secretKeyRef:
      name: db-secret
      key: connection-string
  - name: tableName
    value: dapr_state
```

## Inventory Service with Optimistic Concurrency

```go
// inventory/main.go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "log"
    "net/http"

    dapr "github.com/dapr/go-sdk/client"
    daprd "github.com/dapr/go-sdk/service/http"
)

type StockItem struct {
    ProductID   string  `json:"productId"`
    ProductName string  `json:"productName"`
    Quantity    int     `json:"quantity"`
    ReorderPoint int   `json:"reorderPoint"`
    UnitCost    float64 `json:"unitCost"`
    WarehouseID string  `json:"warehouseId"`
}

func updateStock(ctx context.Context, client dapr.Client,
    productID string, quantityDelta int) error {

    key := "inventory-" + productID
    item, err := client.GetState(ctx, "statestore", key, nil)
    if err != nil {
        return err
    }

    var stock StockItem
    json.Unmarshal(item.Value, &stock)
    stock.Quantity += quantityDelta

    if stock.Quantity < 0 {
        return fmt.Errorf("insufficient stock for %s", productID)
    }

    updated, _ := json.Marshal(stock)
    if err := client.SaveStateWithETag(ctx, "statestore", key, updated, item.Etag, nil); err != nil {
        return fmt.Errorf("concurrent stock update conflict: %w", err)
    }

    // Trigger reorder if below threshold
    if stock.Quantity <= stock.ReorderPoint {
        client.PublishEvent(ctx, "pubsub", "reorder-triggered",
            map[string]interface{}{
                "productId":     productID,
                "currentStock":  stock.Quantity,
                "reorderPoint":  stock.ReorderPoint,
            })
    }

    return nil
}
```

## Procurement Workflow with Dapr Workflow

```python
# procurement_workflow.py
from dapr.ext.workflow import WorkflowActivityContext, DaprWorkflowClient
from dapr.clients import DaprClient
import json

def purchase_order_workflow(ctx, po: dict):
    """Multi-step procurement workflow."""
    po_id = po["purchaseOrderId"]

    # Step 1: Validate supplier
    supplier = yield ctx.call_activity(validate_supplier, input=po["supplierId"])
    if not supplier["approved"]:
        yield ctx.call_activity(reject_po, input={"poId": po_id, "reason": "unapproved_supplier"})
        return

    # Step 2: Finance approval for large orders
    if po["totalAmount"] > 10000:
        approved = yield ctx.call_activity(request_finance_approval, input=po)
        if not approved:
            yield ctx.call_activity(reject_po, input={"poId": po_id, "reason": "finance_rejected"})
            return

    # Step 3: Create PO in system
    yield ctx.call_activity(create_purchase_order, input=po)

    # Step 4: Notify supplier
    yield ctx.call_activity(notify_supplier, input={
        "supplierId": po["supplierId"],
        "poId": po_id,
        "totalAmount": po["totalAmount"]
    })

def create_purchase_order(ctx: WorkflowActivityContext, po: dict):
    with DaprClient() as client:
        client.save_state("statestore", f"po-{po['purchaseOrderId']}", json.dumps(po))
        client.publish_event("pubsub", "po-created", json.dumps(po))
```

## Finance Service - Event-Driven Ledger

```csharp
// Finance service subscribes to events from other modules
[Topic("pubsub", "po-created")]
[HttpPost("finance/po-received")]
public async Task<IActionResult> HandlePurchaseOrder(
    [FromBody] CloudEvent<PurchaseOrder> cloudEvent)
{
    var po = cloudEvent.Data!;

    // Create accounts payable entry
    var apEntry = new LedgerEntry
    {
        EntryId = Guid.NewGuid().ToString(),
        Type = LedgerEntryType.AccountsPayable,
        Amount = po.TotalAmount,
        Reference = $"PO-{po.PurchaseOrderId}",
        DueDate = po.ExpectedDelivery.AddDays(30),
        VendorId = po.SupplierId
    };

    await _dapr.SaveStateAsync("statestore", $"ap-{apEntry.EntryId}", apEntry);
    await _dapr.PublishEventAsync("pubsub", "ap-entry-created", apEntry);

    return Ok();
}
```

## Cross-Module Reporting via Service Invocation

```bash
# Reporting service aggregates data from all modules
curl http://localhost:3500/v1.0/invoke/inventory-service/method/api/summary
curl http://localhost:3500/v1.0/invoke/finance-service/method/api/ledger/summary
curl http://localhost:3500/v1.0/invoke/procurement-service/method/api/po/summary
```

## Summary

A Dapr-based ERP separates each business module into an independent microservice connected through pub/sub events and service invocation. Dapr's state management with ETags handles concurrent stock updates safely, workflows orchestrate multi-step procurement approval processes, and the finance service reacts to events from other modules to maintain ledger consistency. This architecture enables each ERP module to be deployed, scaled, and updated independently.
