# How to Instrument gRPC-Web and Connect-RPC Services with OpenTelemetry for Browser-to-Backend Tracing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, gRPC-Web, Connect-RPC, Browser Tracing

Description: Instrument gRPC-Web and Connect-RPC services with OpenTelemetry to trace requests from the browser all the way to your backend services.

gRPC-Web and Connect-RPC bring gRPC to the browser. gRPC-Web uses a proxy (like Envoy) to translate between the browser's HTTP/1.1 and gRPC's HTTP/2. Connect-RPC takes a different approach by supporting gRPC, gRPC-Web, and a simple HTTP JSON protocol natively. Both can carry OpenTelemetry trace context, enabling end-to-end traces from the browser to your backend.

## gRPC-Web with OpenTelemetry in the Browser

First, set up OpenTelemetry in the browser:

```javascript
// browser-tracing.js
import { WebTracerProvider } from "@opentelemetry/sdk-trace-web";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { Resource } from "@opentelemetry/resources";
import { trace, context, propagation } from "@opentelemetry/api";
import { W3CTraceContextPropagator } from "@opentelemetry/core";

// Set up the global propagator
propagation.setGlobalPropagator(new W3CTraceContextPropagator());

const provider = new WebTracerProvider({
  resource: new Resource({
    "service.name": "web-frontend",
  }),
});

provider.addSpanProcessor(
  new BatchSpanProcessor(
    new OTLPTraceExporter({
      url: "https://otel-collector.example.com/v1/traces",
    })
  )
);

provider.register();

const tracer = trace.getTracer("grpc-web-client");
```

## Wrapping gRPC-Web Calls with Trace Context

```javascript
import { grpc } from "@improbable-eng/grpc-web";
import { OrderServiceClient } from "./generated/order_pb_service";
import { GetOrderRequest } from "./generated/order_pb";

function createTracedGrpcWebClient() {
  const client = new OrderServiceClient("https://api.example.com");

  return {
    getOrder(orderId) {
      return tracer.startActiveSpan(
        "OrderService.GetOrder",
        { kind: trace.SpanKind.CLIENT },
        (span) => {
          return new Promise((resolve, reject) => {
            const request = new GetOrderRequest();
            request.setOrderId(orderId);

            // Inject trace context into gRPC metadata
            const metadata = new grpc.Metadata();
            const carrier = {};
            propagation.inject(context.active(), carrier);

            // Copy trace headers into gRPC metadata
            Object.entries(carrier).forEach(([key, value]) => {
              metadata.set(key, value);
            });

            span.setAttribute("rpc.system", "grpc-web");
            span.setAttribute("rpc.method", "GetOrder");
            span.setAttribute("order.id", orderId);

            grpc.unary(OrderServiceClient.GetOrder, {
              request: request,
              host: "https://api.example.com",
              metadata: metadata,
              onEnd: (response) => {
                if (response.status === grpc.Code.OK) {
                  span.setAttribute("rpc.grpc.status_code", 0);
                  span.end();
                  resolve(response.message);
                } else {
                  span.setAttribute("rpc.grpc.status_code", response.status);
                  span.setStatus({ code: trace.SpanStatusCode.ERROR });
                  span.end();
                  reject(new Error(response.statusMessage));
                }
              },
            });
          });
        }
      );
    },
  };
}
```

## Connect-RPC with OpenTelemetry

Connect-RPC has a cleaner integration story because it supports standard HTTP semantics. Here is how to instrument it:

```typescript
// connect-client.ts
import { createConnectTransport } from "@connectrpc/connect-web";
import { createClient } from "@connectrpc/connect";
import { OrderService } from "./gen/order_connect";
import { trace, context, propagation, SpanKind } from "@opentelemetry/api";

const tracer = trace.getTracer("connect-rpc-client");

// Create a custom transport that injects trace context
function createTracedTransport(baseUrl: string) {
  return createConnectTransport({
    baseUrl,
    // Interceptor that adds trace context to every request
    interceptors: [
      (next) => async (req) => {
        const span = tracer.startSpan(`${req.service.typeName}.${req.method.name}`, {
          kind: SpanKind.CLIENT,
          attributes: {
            "rpc.system": "connect-rpc",
            "rpc.service": req.service.typeName,
            "rpc.method": req.method.name,
          },
        });

        const ctx = trace.setSpan(context.active(), span);

        return context.with(ctx, async () => {
          // Inject trace context into request headers
          const carrier: Record<string, string> = {};
          propagation.inject(context.active(), carrier);

          Object.entries(carrier).forEach(([key, value]) => {
            req.header.set(key, value);
          });

          try {
            const response = await next(req);
            span.setAttribute("rpc.grpc.status_code", 0);
            span.end();
            return response;
          } catch (err) {
            span.recordException(err as Error);
            span.setStatus({ code: trace.SpanStatusCode.ERROR });
            span.end();
            throw err;
          }
        });
      },
    ],
  });
}

// Usage
const transport = createTracedTransport("https://api.example.com");
const client = createClient(OrderService, transport);

async function getOrder(orderId: string) {
  const response = await client.getOrder({ orderId });
  return response;
}
```

## Server-Side: Connect-RPC with OpenTelemetry in Go

```go
package main

import (
    "context"
    "net/http"

    "connectrpc.com/connect"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/propagation"
    "go.opentelemetry.io/otel/trace"
    orderv1 "example.com/gen/order/v1"
    "example.com/gen/order/v1/orderv1connect"
)

var serverTracer = otel.Tracer("connect-rpc-server")

// OpenTelemetry interceptor for Connect-RPC
func otelInterceptor() connect.UnaryInterceptorFunc {
    return func(next connect.UnaryFunc) connect.UnaryFunc {
        return func(ctx context.Context, req connect.AnyRequest) (connect.AnyResponse, error) {
            // Extract trace context from incoming headers
            prop := otel.GetTextMapPropagator()
            ctx = prop.Extract(ctx, propagation.HeaderCarrier(req.Header()))

            // Start a server span
            ctx, span := serverTracer.Start(ctx, req.Spec().Procedure,
                trace.WithSpanKind(trace.SpanKindServer),
            )
            defer span.End()

            span.SetAttributes(
                attribute.String("rpc.system", "connect-rpc"),
                attribute.String("rpc.method", req.Spec().Procedure),
            )

            resp, err := next(ctx, req)
            if err != nil {
                span.RecordError(err)
                span.SetStatus(codes.Error, err.Error())
            }
            return resp, err
        }
    }
}

func main() {
    mux := http.NewServeMux()

    path, handler := orderv1connect.NewOrderServiceHandler(
        &orderServer{},
        connect.WithInterceptors(otelInterceptor()),
    )
    mux.Handle(path, handler)

    http.ListenAndServe(":8080", mux)
}
```

## Envoy Proxy Configuration for gRPC-Web

If you use Envoy as the gRPC-Web proxy, configure it to pass through trace headers:

```yaml
http_filters:
  - name: envoy.filters.http.grpc_web
    typed_config:
      "@type": type.googleapis.com/envoy.extensions.filters.http.grpc_web.v3.GrpcWeb
  - name: envoy.filters.http.router
    typed_config:
      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

# Make sure these headers are not stripped
route_config:
  request_headers_to_add:
    - header:
        key: "x-request-id"
        value: "%REQ(x-request-id)%"
  # traceparent and tracestate are passed through by default
```

By instrumenting both the browser client (gRPC-Web or Connect-RPC) and the backend server, you get a complete trace that starts from the user's click and follows the request through your entire service mesh. This end-to-end visibility is what makes debugging production issues in web applications manageable.
