# How to Troubleshoot Python gRPC Instrumentation Failing Silently

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Python, gRPC, Version Conflicts

Description: Resolve silent gRPC instrumentation failures caused by version mismatches between grpcio and the OpenTelemetry gRPC instrumentation package.

The OpenTelemetry gRPC instrumentation for Python (`opentelemetry-instrumentation-grpc`) declares which versions of the `grpcio` package it can instrument. When there is a version mismatch, OpenTelemetry's dependency check prevents the instrumentation from applying. With manual instrumentation this is logged as a dependency conflict; with auto-instrumentation it can still look like a silent failure if you only notice that no spans are generated for your gRPC calls.

## Diagnosing the Version Mismatch

Check your installed versions:

```bash
pip show grpcio
pip show opentelemetry-instrumentation-grpc
```

Then check the instrumentation dependency range:

```bash
python -c "from opentelemetry.instrumentation.grpc import GrpcInstrumentorClient; print(GrpcInstrumentorClient().instrumentation_dependencies())"
```

For `opentelemetry-instrumentation-grpc==0.44b0`, this reports `grpcio ~= 1.27`, which means `grpcio>=1.27,<2.0`. Current releases report `grpcio >= 1.42.0`. If `grpcio` is outside the reported range, the instrumentation skips patching.

## The Fix

Install compatible versions:

```bash
# Install the instrumentation package with its instrumented-library dependency

pip install "opentelemetry-instrumentation-grpc[instruments]==0.44b0"

# Or install a matching grpcio version explicitly
pip install "grpcio>=1.27,<2.0"
```

Or let pip resolve the dependencies:

```bash
pip install opentelemetry-instrumentation-grpc grpcio
```

## Testing the Instrumentation

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import ConsoleSpanExporter, SimpleSpanProcessor
from opentelemetry.instrumentation.grpc import GrpcInstrumentorClient, GrpcInstrumentorServer

provider = TracerProvider()
provider.add_span_processor(SimpleSpanProcessor(ConsoleSpanExporter()))
trace.set_tracer_provider(provider)

# Instrument both client and server
GrpcInstrumentorClient().instrument()
GrpcInstrumentorServer().instrument()

# Make a gRPC call and check console output for spans
```

## Server-Side Instrumentation

```python
from concurrent import futures

import grpc
from opentelemetry.instrumentation.grpc import GrpcInstrumentorServer

GrpcInstrumentorServer().instrument()

server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
# Add your servicers
server.add_insecure_port('[::]:50051')
server.start()
```

## Client-Side Instrumentation

```python
import grpc
from opentelemetry.instrumentation.grpc import GrpcInstrumentorClient

GrpcInstrumentorClient().instrument()

channel = grpc.insecure_channel('localhost:50051')
# The channel is now instrumented - calls will generate spans
stub = MyServiceStub(channel)
response = stub.MyMethod(request)
```

## Common Version Conflict Scenarios

**Scenario 1**: Your application uses an older grpcio than the instrumentation supports:

```bash
grpcio==1.26.0  # Older than the supported range
opentelemetry-instrumentation-grpc==0.44b0  # Requires grpcio>=1.27,<2.0
```

Fix: Update `grpcio` or choose an instrumentation package whose reported dependency range matches the `grpcio` version your application needs.

**Scenario 2**: The OTLP gRPC exporter also depends on grpcio:

```bash
opentelemetry-exporter-otlp-proto-grpc requires grpcio>=1.0.0,<2.0
opentelemetry-instrumentation-grpc==0.44b0 reports grpcio>=1.27,<2.0
```

Fix: If you do not need the OTLP gRPC transport, use the HTTP exporter to avoid adding another grpcio dependency:

```bash
pip install opentelemetry-exporter-otlp-proto-http  # No grpcio dependency
```

## Verifying Spans

After fixing the version, verify that spans are generated:

```python
# Expected span output for a gRPC call:
# {
#   "name": "/mypackage.MyService/MyMethod",
#   "kind": "SpanKind.CLIENT",
#   "attributes": {
#     "rpc.system": "grpc",
#     "rpc.service": "mypackage.MyService",
#     "rpc.method": "MyMethod",
#     "rpc.grpc.status_code": 0
#   }
# }
```

If no spans appear after fixing versions, make sure you are instrumenting both client and server sides, and that the instrumentation is applied before creating channels or servers.

## Using opentelemetry-instrument with gRPC

The `opentelemetry-instrument` CLI can detect and apply gRPC instrumentation automatically:

```bash
OTEL_SERVICE_NAME=grpc-service \
opentelemetry-instrument python server.py
```

However, the CLI still requires the instrumentation package to be installed and version-compatible with your grpcio installation. If the CLI produces no gRPC spans, the version mismatch is likely the cause.

## Adding gRPC Interceptors Manually

If auto-instrumentation does not work for your gRPC version, you can use OpenTelemetry interceptors directly:

```python
from concurrent import futures

import grpc
from opentelemetry import trace
from opentelemetry.instrumentation.grpc import (
    client_interceptor,
    server_interceptor,
)

# Server side - add interceptor when creating the server
server = grpc.server(
    futures.ThreadPoolExecutor(max_workers=10),
    interceptors=[server_interceptor(tracer_provider=trace.get_tracer_provider())],
)

# Client side - add interceptor to the channel
channel = grpc.intercept_channel(
    grpc.insecure_channel('localhost:50051'),
    client_interceptor(tracer_provider=trace.get_tracer_provider()),
)
```

This approach gives you more control and may work even when the automatic instrumentation has version compatibility issues.

## Pinning Compatible Versions in requirements.txt

To prevent version drift across your team, pin all related packages together:

```txt
# requirements.txt
grpcio==1.60.0
grpcio-tools==1.60.0
opentelemetry-instrumentation-grpc==0.44b0
opentelemetry-api==1.23.0
opentelemetry-sdk==1.23.0
```

Run a compatibility check after any update:

```bash
pip install -r requirements.txt
python -c "from opentelemetry.instrumentation.grpc import GrpcInstrumentorClient; print('Compatible')"
```

If the import succeeds without error, the package is installed correctly. To verify that the versions are compatible, run the instrumentation dependency check shown earlier and compare it with your installed `grpcio` version. If manual instrumentation logs a `DependencyConflict` or auto-instrumentation produces no gRPC spans, check and adjust your pins.

The key takeaway: always check version compatibility between `grpcio` and `opentelemetry-instrumentation-grpc`. When versions do not match, the instrumentation is not applied, and the most visible symptom is missing spans.
