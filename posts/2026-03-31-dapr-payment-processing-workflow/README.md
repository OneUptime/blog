# How to Build a Payment Processing System with Dapr Workflow

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Payment, Saga, Finance

Description: Learn how to build a reliable payment processing system using Dapr Workflow with fraud detection, authorization, capture, and settlement as durable workflow steps.

---

## Overview

Payment processing requires reliability, auditability, and careful failure handling. Dapr Workflow provides durable execution that survives process restarts, making it ideal for multi-step payment flows that include fraud checks, authorization, capture, and settlement.

## Payment Workflow Stages

```text
1. Fraud Check         (synchronous, fast)
2. Payment Authorization (synchronous, reversible)
3. Order Fulfillment    (async, long-running)
4. Payment Capture      (synchronous, final)
5. Customer Notification (async, fire-and-forget)
```

## Payment Data Models

```go
package main

type PaymentRequest struct {
    PaymentID   string          `json:"paymentId"`
    OrderID     string          `json:"orderId"`
    CustomerID  string          `json:"customerId"`
    Amount      float64         `json:"amount"`
    Currency    string          `json:"currency"`
    CardToken   string          `json:"cardToken"`
    CardLast4   string          `json:"cardLast4"`
}

type PaymentStatus string

const (
    StatusFraudBlocked  PaymentStatus = "fraud_blocked"
    StatusDeclined      PaymentStatus = "declined"
    StatusAuthorized    PaymentStatus = "authorized"
    StatusCaptured      PaymentStatus = "captured"
    StatusSettled       PaymentStatus = "settled"
    StatusRefunded      PaymentStatus = "refunded"
)
```

## Payment Workflow

```go
func PaymentWorkflow(ctx *workflow.WorkflowContext) (any, error) {
    var payment PaymentRequest
    ctx.GetInput(&payment)

    // Step 1: Fraud check (fast, synchronous)
    var fraudResult FraudCheckResult
    if err := ctx.CallActivity(RunFraudCheck, workflow.ActivityInput(payment)).Await(&fraudResult); err != nil {
        return nil, err
    }
    if fraudResult.IsBlocked {
        return map[string]string{
            "paymentId": payment.PaymentID,
            "status":    string(StatusFraudBlocked),
            "reason":    fraudResult.Reason,
        }, nil
    }

    // Step 2: Authorize payment
    var authResult AuthorizationResult
    if err := ctx.CallActivity(AuthorizePayment, workflow.ActivityInput(payment)).Await(&authResult); err != nil {
        return nil, err
    }
    if !authResult.Approved {
        return map[string]string{
            "paymentId": payment.PaymentID,
            "status":    string(StatusDeclined),
            "code":      authResult.DeclineCode,
        }, nil
    }

    // Step 3: Wait for order fulfillment (with 2-day timeout)
    fulfillmentEvent := ctx.WaitForExternalEvent("order-fulfilled", 48*time.Hour)
    var fulfillment FulfillmentResult
    if err := fulfillmentEvent.Await(&fulfillment); err != nil {
        // Fulfillment timed out - void authorization
        ctx.CallActivity(VoidAuthorization, workflow.ActivityInput(authResult.AuthCode)).Await(nil)
        return map[string]string{"status": "voided", "reason": "fulfillment_timeout"}, nil
    }

    // Step 4: Capture payment
    var captureResult CaptureResult
    if err := ctx.CallActivity(CapturePayment, workflow.ActivityInput(map[string]any{
        "authCode": authResult.AuthCode,
        "amount":   payment.Amount,
    })).Await(&captureResult); err != nil {
        return nil, err
    }

    // Step 5: Notify customer (non-blocking)
    ctx.CallActivity(NotifyCustomer, workflow.ActivityInput(map[string]any{
        "customerId": payment.CustomerID,
        "paymentId":  payment.PaymentID,
        "amount":     payment.Amount,
        "status":     "captured",
    })).Await(nil)

    return map[string]string{
        "paymentId":     payment.PaymentID,
        "status":        string(StatusCaptured),
        "captureRef":    captureResult.Reference,
        "transactionId": captureResult.TransactionID,
    }, nil
}
```

## Fraud Check Activity

```go
func RunFraudCheck(ctx *workflow.ActivityContext) (any, error) {
    var payment PaymentRequest
    ctx.GetInput(&payment)

    client, _ := dapr.NewClient()
    defer client.Close()

    // Call fraud detection service
    result, err := client.InvokeMethodWithContent(
        context.Background(),
        "fraud-service",
        "/check",
        "POST",
        &dapr.DataContent{
            ContentType: "application/json",
            Data: []byte(fmt.Sprintf(
                `{"customerId":"%s","amount":%.2f,"cardToken":"%s"}`,
                payment.CustomerID, payment.Amount, payment.CardToken,
            )),
        },
    )
    if err != nil {
        return nil, err
    }

    var fraudResult FraudCheckResult
    json.Unmarshal(result, &fraudResult)
    return fraudResult, nil
}
```

## Payment Audit Trail

```go
func saveAuditEntry(client dapr.Client, paymentID string, event string, data any) {
    entry := map[string]any{
        "paymentId": paymentID,
        "event":     event,
        "data":      data,
        "timestamp": time.Now().Unix(),
    }
    entryBytes, _ := json.Marshal(entry)
    key := fmt.Sprintf("audit:%s:%d", paymentID, time.Now().UnixNano())
    client.SaveState(context.Background(), "audit-store", key, entryBytes, nil)
}
```

## Starting a Payment

```go
func handlePayment(w http.ResponseWriter, r *http.Request) {
    var req PaymentRequest
    json.NewDecoder(r.Body).Decode(&req)
    req.PaymentID = uuid.New().String()

    wfClient, _ := workflow.NewClient()
    instanceID, err := wfClient.ScheduleNewWorkflow(
        context.Background(),
        "PaymentWorkflow",
        workflow.WithInstanceID(req.PaymentID),
        workflow.WithInput(req),
    )
    if err != nil {
        http.Error(w, err.Error(), 500)
        return
    }

    json.NewEncoder(w).Encode(map[string]string{
        "paymentId":  req.PaymentID,
        "workflowId": instanceID,
        "status":     "processing",
    })
}
```

## Summary

Dapr Workflow provides durable execution for payment processing, ensuring that authorization codes, capture references, and audit entries are never lost even during service restarts. External events handle asynchronous fulfillment confirmation, timers enforce authorization timeouts, and compensation activities void authorizations when fulfillment fails. This architecture delivers the reliability and auditability required for production payment systems.
