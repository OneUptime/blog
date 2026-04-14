# How to Invoke Actor Methods in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Method Invocation, HTTP, SDK

Description: Learn how to invoke Dapr actor methods using HTTP, gRPC, and language SDKs, including how to pass parameters and handle responses correctly.

---

Dapr actors expose methods that can be invoked from other services or clients. Understanding how method invocation works - including routing, serialization, and error handling - is key to building reliable actor-based systems.

## Invoking via HTTP

The Dapr HTTP API for actor method invocation follows this pattern:

```text
POST http://localhost:{daprPort}/v1.0/actors/{actorType}/{actorId}/method/{methodName}
```

Example invoking a `Transfer` method on a `BankAccount` actor:

```bash
curl -X POST http://localhost:3500/v1.0/actors/BankAccount/acct-001/method/Transfer \
  -H "Content-Type: application/json" \
  -d '{
    "toAccount": "acct-002",
    "amount": 150.00
  }'
```

## Invoking via the Go SDK

```go
package main

import (
  "context"
  "encoding/json"
  "fmt"
  "log"

  dapr "github.com/dapr/go-sdk/client"
)

type TransferRequest struct {
  ToAccount string  `json:"toAccount"`
  Amount    float64 `json:"amount"`
}

type BalanceResponse struct {
  Balance float64 `json:"balance"`
}

func main() {
  client, err := dapr.NewClient()
  if err != nil {
    log.Fatalf("failed to create client: %v", err)
  }
  defer client.Close()

  ctx := context.Background()

  // Invoke a method with a request body
  req := TransferRequest{ToAccount: "acct-002", Amount: 150.00}
  data, _ := json.Marshal(req)
  resp, err := client.InvokeActor(ctx, &dapr.InvokeActorRequest{
    ActorType: "BankAccount",
    ActorID:   "acct-001",
    Method:    "Transfer",
    Data:      data,
  })
  if err != nil {
    panic(err)
  }

  fmt.Println("Transfer response:", string(resp.Data))
}
```

## Invoking via the Python SDK

```python
import asyncio
import json
from dapr.actor import ActorProxy, ActorId

async def main():
    proxy = ActorProxy.create("BankAccount", ActorId("acct-001"))
    resp = await proxy.invoke_method(
        "Transfer",
        json.dumps({"toAccount": "acct-002", "amount": 150.00}).encode()
    )
    print("Response:", resp)

asyncio.run(main())
```

## Handling Method Responses

Actor methods can return data that callers receive in the response body:

```go
// Actor method implementation
func (a *BankAccountActor) GetBalance(ctx context.Context) (*BalanceResponse, error) {
  var balance float64
  a.GetStateManager().Get(ctx, "balance", &balance)
  return &BalanceResponse{Balance: balance}, nil
}
```

Calling this from another service:

```bash
curl -X POST http://localhost:3500/v1.0/actors/BankAccount/acct-001/method/GetBalance
# Response: {"balance": 850.00}
```

## Error Handling

When an actor method returns an error, the Dapr sidecar returns an HTTP 500 with the error detail:

```bash
# If the actor method returns an error, you receive:
# HTTP 500: {"errorCode": "ERR_ACTOR_INVOKE_METHOD", "message": "insufficient funds"}
```

Handle this in your client code:

```go
resp, err := client.InvokeActor(ctx, req)
if err != nil {
  log.Printf("Actor invocation failed: %v", err)
  return err
}
```

## Summary

Dapr actor method invocation is straightforward via HTTP or language SDKs. Dapr handles routing through the placement service, ensuring the correct host receives the call and turn-based concurrency is enforced. Consistent error handling and typed request/response structs make actor-based service communication reliable and predictable.
