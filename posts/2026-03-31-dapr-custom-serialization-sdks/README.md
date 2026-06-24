# How to Handle Custom Serialization in Dapr SDKs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Serialization, SDK, Custom, State Management

Description: Implement custom serialization in Dapr SDKs for .NET, Go, Python, and Node.js to handle special types, encryption, compression, and non-standard formats.

---

## When You Need Custom Serialization

Dapr SDKs handle JSON serialization by default, but custom serialization is needed when:
- Encrypting state data before storing
- Compressing large payloads
- Handling types not natively supported (e.g., `decimal`, `TimeSpan`, complex generics)
- Bridging legacy binary formats from existing systems

## Custom Serializer in .NET Dapr SDK

```csharp
using System.Text.Json;
using System.Text.Json.Serialization;
using Dapr.Client;

// Custom converter for decimal precision
public class PreciseDecimalConverter : JsonConverter<decimal>
{
    public override decimal Read(ref Utf8JsonReader reader,
        Type typeToConvert, JsonSerializerOptions options)
    {
        return reader.GetDecimal();
    }

    public override void Write(Utf8JsonWriter writer,
        decimal value, JsonSerializerOptions options)
    {
        // Always write with 4 decimal places for financial data
        writer.WriteRawValue(value.ToString("F4",
            System.Globalization.CultureInfo.InvariantCulture));
    }
}

// Register custom serialization options with Dapr
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDaprClient(clientBuilder =>
{
    clientBuilder.UseJsonSerializationOptions(new JsonSerializerOptions
    {
        Converters =
        {
            new PreciseDecimalConverter(),
            new JsonStringEnumConverter(),
        },
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    });
});
```

## Encrypted State Wrapper in Go

```go
// encrypted_state.go
package state

import (
    "crypto/aes"
    "crypto/cipher"
    "crypto/rand"
    "encoding/json"
    "fmt"
    "io"

    "context"

    dapr "github.com/dapr/go-sdk/client"
)

type EncryptedStateClient struct {
    dapr dapr.Client
    key  []byte // 32 bytes for AES-256
}

func (c *EncryptedStateClient) SaveEncrypted(ctx context.Context,
    store, key string, value interface{}) error {

    // Serialize to JSON first
    plaintext, err := json.Marshal(value)
    if err != nil {
        return fmt.Errorf("marshal failed: %w", err)
    }

    // Encrypt with AES-GCM
    ciphertext, err := c.encrypt(plaintext)
    if err != nil {
        return fmt.Errorf("encryption failed: %w", err)
    }

    return c.dapr.SaveState(ctx, store, key, ciphertext, nil)
}

func (c *EncryptedStateClient) GetDecrypted(ctx context.Context,
    store, key string, result interface{}) error {

    item, err := c.dapr.GetState(ctx, store, key, nil)
    if err != nil {
        return err
    }
    if len(item.Value) == 0 {
        return nil
    }

    plaintext, err := c.decrypt(item.Value)
    if err != nil {
        return fmt.Errorf("decryption failed: %w", err)
    }

    return json.Unmarshal(plaintext, result)
}

func (c *EncryptedStateClient) encrypt(plaintext []byte) ([]byte, error) {
    block, err := aes.NewCipher(c.key)
    if err != nil {
        return nil, err
    }
    gcm, err := cipher.NewGCM(block)
    if err != nil {
        return nil, err
    }
    nonce := make([]byte, gcm.NonceSize())
    if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
        return nil, err
    }
    return gcm.Seal(nonce, nonce, plaintext, nil), nil
}

func (c *EncryptedStateClient) decrypt(data []byte) ([]byte, error) {
    block, err := aes.NewCipher(c.key)
    if err != nil {
        return nil, err
    }
    gcm, err := cipher.NewGCM(block)
    if err != nil {
        return nil, err
    }
    nonceSize := gcm.NonceSize()
    if len(data) < nonceSize {
        return nil, fmt.Errorf("ciphertext too short")
    }
    return gcm.Open(nil, data[:nonceSize], data[nonceSize:], nil)
}
```

## Compressed State in Python

```python
# compressed_state.py
import gzip
import json
import base64
from dapr.clients import DaprClient

class CompressedStateClient:
    def __init__(self, store_name: str = "statestore"):
        self.store_name = store_name
        self.threshold_bytes = 1024  # Compress if > 1KB

    def save(self, key: str, value: dict) -> None:
        serialized = json.dumps(value).encode('utf-8')

        if len(serialized) > self.threshold_bytes:
            # Compress large payloads
            compressed = gzip.compress(serialized)
            payload = json.dumps({
                "compressed": True,
                "data": base64.b64encode(compressed).decode('ascii')
            })
        else:
            payload = serialized.decode('utf-8')

        with DaprClient() as client:
            client.save_state(self.store_name, key, payload)

    def get(self, key: str) -> dict:
        with DaprClient() as client:
            result = client.get_state(self.store_name, key)

        raw = json.loads(result.data)
        if isinstance(raw, dict) and raw.get("compressed"):
            decompressed = gzip.decompress(
                base64.b64decode(raw["data"])
            )
            return json.loads(decompressed)
        return raw
```

## Summary

Custom serialization in Dapr SDKs is implemented by intercepting data before it reaches the Dapr API - either through SDK-level serialization options (like .NET's `UseJsonSerializationOptions`) or by wrapping the raw state operations with encoding/decoding logic. Common patterns include encrypted state wrappers, compressed state for large payloads, and custom type converters for precision-sensitive types like financial decimals.
