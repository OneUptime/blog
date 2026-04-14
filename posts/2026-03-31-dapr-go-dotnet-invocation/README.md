# How to Use Dapr Service Invocation Between Go and .NET

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Go, .NET, Service Invocation, Microservice

Description: Set up Dapr service invocation between a Go service and a .NET service, using the Go Dapr SDK and .NET Dapr client for bidirectional cross-language communication.

---

Go and .NET are common language pairings in enterprise microservices. Dapr service invocation lets these services call each other using native SDKs with automatic mTLS, retries, and load balancing.

## .NET Service (Target)

Create a .NET Minimal API that the Go service will call:

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseUrls("http://0.0.0.0:8080");
var app = builder.Build();

app.MapPost("/process", (ProcessRequest request) =>
{
    var result = new ProcessResult(
        JobId: Guid.NewGuid().ToString(),
        Status: "accepted",
        Input: request.Payload,
        ProcessedAt: DateTime.UtcNow
    );
    return Results.Ok(result);
});

app.MapGet("/health", () => Results.Ok(new { status = "healthy" }));
app.Run();

record ProcessRequest(string Payload);
record ProcessResult(string JobId, string Status, string Input, DateTime ProcessedAt);
```

Kubernetes annotations for the .NET service:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "processor-dotnet"
  dapr.io/app-port: "8080"
```

## Go Service (Caller)

Install the Dapr Go SDK:

```bash
go get github.com/dapr/go-sdk/client
```

Invoke the .NET service from Go:

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "log"
    "net/http"

    dapr "github.com/dapr/go-sdk/client"
)

type ProcessRequest struct {
    Payload string `json:"payload"`
}

type ProcessResult struct {
    JobID       string `json:"jobId"`
    Status      string `json:"status"`
    ProcessedAt string `json:"processedAt"`
}

func submitJob(w http.ResponseWriter, r *http.Request) {
    client, err := dapr.NewClient()
    if err != nil {
        http.Error(w, "failed to create dapr client", http.StatusInternalServerError)
        return
    }
    defer client.Close()

    req := &ProcessRequest{Payload: "go-generated-data-123"}
    content, _ := json.Marshal(req)

    resp, err := client.InvokeMethodWithContent(
        context.Background(),
        "processor-dotnet",  // .NET app-id
        "process",           // endpoint
        "POST",
        &dapr.DataContent{
            ContentType: "application/json",
            Data:        content,
        },
    )
    if err != nil {
        log.Printf("Invocation error: %v", err)
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    var result ProcessResult
    json.Unmarshal(resp, &result)

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(result)
}

func handleSubmit(w http.ResponseWriter, r *http.Request) {
    fmt.Println("Received invocation from .NET service")
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{"status": "received"})
}

func main() {
    http.HandleFunc("/submit-job", submitJob)
    http.HandleFunc("/submit", handleSubmit)
    log.Fatal(http.ListenAndServe(":8081", nil))
}
```

## Bidirectional Communication

The .NET service can also call back to the Go service:

```csharp
// In .NET service calling Go service
// Requires: builder.Services.AddDaprClient(); before builder.Build()
// Requires NuGet package: Dapr.AspNetCore
app.MapGet("/trigger-go", async (DaprClient daprClient) =>
{
    var response = await daprClient.InvokeMethodAsync<ProcessRequest, ProcessResult>(
        HttpMethod.Post,
        "submitter-go",  // Go service app-id
        "submit",
        new ProcessRequest("dotnet-payload")
    );
    return Results.Ok(response);
});
```

## Running Locally with Dapr CLI

Test the cross-language setup locally:

```bash
# Start .NET service with Dapr sidecar
dapr run --app-id processor-dotnet --app-port 8080 -- dotnet run

# Start Go service with Dapr sidecar (separate terminal)
dapr run --app-id submitter-go --app-port 8081 -- go run main.go

# Test Go calling .NET
curl http://localhost:8081/submit-job
```

## Summary

Dapr service invocation between Go and .NET uses the respective language SDKs to send typed HTTP requests through the Dapr sidecar. The app ID abstraction means neither service needs to know the other's IP, port, or location. Both services can call each other bidirectionally, making Go and .NET first-class citizens in the same microservices mesh.
