# How to Handle Large Payloads in Dapr Service Invocation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Service Invocation, Performance, Streaming, Payload

Description: Handle large payloads in Dapr service invocation using chunking, compression, reference patterns, and streaming to avoid size limits and performance degradation.

---

## Large Payload Challenges in Dapr

Dapr service invocation has practical payload size limits imposed by gRPC (default 4MB) and HTTP proxy buffers. Sending large documents, reports, or data exports directly through service invocation causes timeouts and memory spikes. There are three strategies to handle this, plus a configuration option to increase the limit.

## Strategy 1: Chunked Transfer

Split large payloads into smaller chunks and reassemble on the receiver side.

```csharp
// Sender service - .NET
public class ChunkedInvoker
{
    private readonly DaprClient _dapr;
    private const int ChunkSize = 512 * 1024; // 512KB chunks

    public ChunkedInvoker(DaprClient dapr)
    {
        _dapr = dapr;
    }

    public async Task<string> SendLargePayloadAsync(string appId,
        string method, byte[] data)
    {
        var transferId = Guid.NewGuid().ToString();
        var chunks = SplitIntoChunks(data, ChunkSize);

        foreach (var (chunk, index) in chunks.Select((c, i) => (c, i)))
        {
            var request = new ChunkRequest
            {
                TransferId = transferId,
                ChunkIndex = index,
                TotalChunks = chunks.Length,
                Data = Convert.ToBase64String(chunk),
                IsLast = index == chunks.Length - 1
            };

            await _dapr.InvokeMethodAsync(
                appId, $"{method}/chunk", request);
        }

        // Request final assembly
        var result = await _dapr.InvokeMethodAsync<AssembleRequest, AssembleResponse>(
            appId, $"{method}/assemble",
            new AssembleRequest { TransferId = transferId });

        return result.ResultId;
    }

    private byte[][] SplitIntoChunks(byte[] data, int chunkSize)
    {
        return Enumerable.Range(0, (int)Math.Ceiling((double)data.Length / chunkSize))
            .Select(i => data.Skip(i * chunkSize).Take(chunkSize).ToArray())
            .ToArray();
    }
}
```

## Strategy 2: Compression Before Invocation

```go
// compress-client.go
package main

import (
    "bytes"
    "compress/gzip"
    "encoding/json"
    "fmt"

    dapr "github.com/dapr/go-sdk/client"
    "context"
)

type CompressedPayload struct {
    Compressed bool   `json:"compressed"`
    Algorithm  string `json:"algorithm"`
    Data       []byte `json:"data"`
    OrigSize   int    `json:"originalSize"`
}

func invokeWithCompression(ctx context.Context, client dapr.Client,
    appId, method string, payload interface{}) ([]byte, error) {

    raw, err := json.Marshal(payload)
    if err != nil {
        return nil, fmt.Errorf("marshal failed: %w", err)
    }

    // Only compress if payload is large enough
    if len(raw) < 10*1024 { // 10KB threshold
        return client.InvokeMethodWithContent(ctx, appId, method, "post",
            &dapr.DataContent{Data: raw, ContentType: "application/json"})
    }

    var buf bytes.Buffer
    gz := gzip.NewWriter(&buf)
    if _, err := gz.Write(raw); err != nil {
        return nil, err
    }
    gz.Close()

    wrapper := CompressedPayload{
        Compressed: true,
        Algorithm:  "gzip",
        Data:       buf.Bytes(),
        OrigSize:   len(raw),
    }

    wrapperBytes, _ := json.Marshal(wrapper)
    return client.InvokeMethodWithContent(ctx, appId, method, "post",
        &dapr.DataContent{Data: wrapperBytes, ContentType: "application/json"})
}
```

## Strategy 3: Reference Pattern

Store large data in a shared store and pass a reference key:

```javascript
// Node.js - reference pattern
const { DaprClient, HttpMethod } = require('@dapr/dapr');
const crypto = require('crypto');

const client = new DaprClient();

async function invokeWithReference(appId, method, largePayload) {
  // Store large payload in shared state store
  const refId = crypto.randomUUID();
  const stateKey = `temp-payload-${refId}`;

  await client.state.save('statestore', [
    { key: stateKey, value: largePayload,
      metadata: { ttlInSeconds: '300' } }
  ]);

  // Invoke with just the reference
  const result = await client.invoker.invoke(
    appId, method, HttpMethod.POST,
    { payloadRef: stateKey, transferId: refId }
  );

  // Clean up
  await client.state.delete('statestore', stateKey);
  return result;
}

// Receiver retrieves the large payload from state
app.post('/api/process-report', async (req, res) => {
  const { payloadRef } = req.body;
  const largePayload = await daprClient.state.get('statestore', payloadRef);
  // process...
  res.json({ status: 'processed' });
});
```

## Increase gRPC Max Message Size

On Kubernetes, set the annotation on your pod spec:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/max-body-size: "16Mi"
```

For self-hosted mode, pass the flag when running your app:

```bash
dapr run --app-id myapp --max-body-size 16Mi -- ./myapp
```

This applies to both HTTP and gRPC traffic.

## Summary

Large payloads in Dapr service invocation should be handled through one of three patterns: chunked transfer for sequential reassembly, compression middleware to reduce payload size before transmission, or the reference pattern where large data is stored in a shared state store and the invocation carries only a lookup key. Increase the gRPC max message size as a last resort, as it impacts all service invocations cluster-wide.
