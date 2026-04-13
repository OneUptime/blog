# How to Use Dapr Wasm Output Binding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, WebAssembly, Binding, Microservice, Cloud Native

Description: Learn how to configure and use the Dapr Wasm output binding to execute WebAssembly modules from your microservices with practical examples.

---

## What Is the Dapr Wasm Output Binding?

The Dapr Wasm output binding allows microservices to invoke WebAssembly (Wasm) modules at runtime without managing Wasm execution infrastructure directly. This is useful for running sandboxed, portable logic - such as data transformations, validation functions, or business rules - compiled from languages like Rust, Go, or C.

## Setting Up the Wasm Output Binding

First, define the component spec. The Wasm binding requires a path to the `.wasm` file that will be executed.

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: wasm-transformer
  namespace: default
spec:
  type: bindings.wasm
  version: v1
  metadata:
    - name: url
      value: "file://./functions/transform.wasm"
```

You can also reference a remote Wasm file via an HTTP URL:

```yaml
    - name: url
      value: "https://example.com/functions/transform.wasm"
```

## Compiling a Wasm Module

The Wasm binary must be compiled with the WebAssembly System Interface (WASI). The binding executes the module's `main` function, passing request data via STDIN and capturing the result from STDOUT.

Here is a minimal Go program that reads input from STDIN, doubles an integer, and writes the result to STDOUT:

```go
package main

import (
	"encoding/json"
	"fmt"
	"os"
)

type Input struct {
	Input int `json:"input"`
}

func main() {
	var in Input
	json.NewDecoder(os.Stdin).Decode(&in)
	fmt.Print(in.Input * 2)
}
```

Compile it with TinyGo targeting WASI:

```bash
tinygo build -o ./functions/transform.wasm -scheduler=none --no-debug -target=wasi main.go
```

Alternatively, with Rust, use the `wasm32-wasip1` target:

```bash
cargo build --target wasm32-wasip1 --release
cp target/wasm32-wasip1/release/wasm_transform.wasm ./functions/transform.wasm
```

## Invoking the Wasm Binding from Your Service

With the Dapr sidecar running, use the output binding endpoint to call the Wasm module:

```bash
curl -X POST http://localhost:3500/v1.0/bindings/wasm-transformer \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "execute",
    "data": { "input": 21 }
  }'
```

From a Node.js service:

```javascript
const { DaprClient } = require("@dapr/dapr");

const client = new DaprClient();

async function runWasm() {
  const result = await client.binding.send("wasm-transformer", "execute", {
    input: 21,
  });
  console.log("Result:", result); // 42
}

runWasm();
```

## Passing Metadata to the Wasm Module

You can pass per-request metadata to provide command-line arguments to the Wasm module:

```javascript
const result = await client.binding.send(
  "wasm-transformer",
  "execute",
  { input: 10 },
  { "args": "--verbose,--format=json" }
);
```

The `args` field accepts a comma-separated list of arguments that are passed to the Wasm program as `os.Args`.

## Running the Wasm Binding Locally

Start your service with the Dapr sidecar:

```bash
dapr run \
  --app-id wasm-service \
  --app-port 3000 \
  --components-path ./components \
  node app.js
```

Ensure the `.wasm` file path in the component spec resolves correctly relative to the sidecar's working directory.

## Security Considerations

Wasm modules run in a sandboxed environment. However, you should:
- Only load Wasm binaries from trusted sources or artifact registries
- Use OCI image signing (cosign) when pulling from remote registries
- Restrict filesystem access within the module using WASI capabilities

## Summary

The Dapr Wasm output binding makes it straightforward to run WebAssembly logic from any Dapr-enabled microservice. By defining a component YAML and invoking the binding via HTTP or a Dapr SDK, you can execute portable, sandboxed functions without coupling your service to a specific runtime or language.
