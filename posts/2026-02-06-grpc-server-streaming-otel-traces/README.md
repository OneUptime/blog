# How to Trace gRPC Server Streaming RPCs with OpenTelemetry and Capture Stream Duration and Message Counts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, gRPC, Server Streaming, Stream Metrics

Description: Trace gRPC server streaming RPCs with OpenTelemetry capturing stream duration, message counts, and per-message timing data.

Server streaming RPCs are common in gRPC. The client sends one request and the server responds with a stream of messages. Think of it like subscribing to a real-time feed: stock prices, log tails, or search results that arrive incrementally. Tracing these streams means capturing the full duration, the number of messages sent, and optionally timing individual messages.

## The Proto Definition

```protobuf
syntax = "proto3";

service StockService {
  // Server streaming: client sends a request, server streams back prices
  rpc WatchPrices(WatchRequest) returns (stream PriceUpdate);
}

message WatchRequest {
  repeated string symbols = 1;
}

message PriceUpdate {
  string symbol = 1;
  double price = 2;
  int64 timestamp = 3;
}
```

## Server-Side Instrumentation in Go

```go
package main

import (
    "time"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/metric"
    "go.opentelemetry.io/otel/trace"
    pb "example.com/stocks/proto"
)

var (
    tracer = otel.Tracer("stock-service")
    meter  = otel.Meter("stock-service")
)

// Metrics specific to streaming
var (
    streamDuration    metric.Float64Histogram
    streamMessagesSent metric.Int64Counter
    streamActive      metric.Int64UpDownCounter
)

func init() {
    var err error
    streamDuration, err = meter.Float64Histogram(
        "grpc.server.stream.duration",
        metric.WithDescription("Duration of server streaming RPCs"),
        metric.WithUnit("ms"),
    )
    if err != nil {
        panic(err)
    }

    streamMessagesSent, err = meter.Int64Counter(
        "grpc.server.stream.messages_sent",
        metric.WithDescription("Messages sent in server streaming RPCs"),
    )
    if err != nil {
        panic(err)
    }

    streamActive, err = meter.Int64UpDownCounter(
        "grpc.server.stream.active",
        metric.WithDescription("Currently active server streams"),
    )
    if err != nil {
        panic(err)
    }
}

type stockServer struct {
    pb.UnimplementedStockServiceServer
    priceSource PriceSource
}

func (s *stockServer) WatchPrices(req *pb.WatchRequest, stream pb.StockService_WatchPricesServer) error {
    ctx := stream.Context()

    // Start a parent span for the entire stream
    ctx, span := tracer.Start(ctx, "StockService.WatchPrices",
        trace.WithSpanKind(trace.SpanKindServer),
        trace.WithAttributes(
            attribute.String("rpc.system", "grpc"),
            attribute.String("rpc.service", "StockService"),
            attribute.String("rpc.method", "WatchPrices"),
            attribute.StringSlice("stock.symbols", req.Symbols),
            attribute.Int("stock.symbol_count", len(req.Symbols)),
        ),
    )
    defer span.End()

    // Track active streams
    streamActive.Add(ctx, 1, metric.WithAttributes(
        attribute.String("rpc.method", "WatchPrices"),
    ))
    defer streamActive.Add(ctx, -1, metric.WithAttributes(
        attribute.String("rpc.method", "WatchPrices"),
    ))

    streamStart := time.Now()
    messageCount := 0

    // Stream price updates until the client disconnects
    priceChan := s.priceSource.Subscribe(req.Symbols)
    defer s.priceSource.Unsubscribe(priceChan)

    for {
        select {
        case <-ctx.Done():
            // Client disconnected or deadline exceeded
            span.SetAttributes(
                attribute.Int("rpc.grpc.messages_sent", messageCount),
                attribute.Float64("stream.duration_ms",
                    float64(time.Since(streamStart).Milliseconds())),
                attribute.String("stream.close_reason", "client_disconnect"),
            )

            streamDuration.Record(ctx,
                float64(time.Since(streamStart).Milliseconds()),
                metric.WithAttributes(
                    attribute.String("rpc.method", "WatchPrices"),
                    attribute.String("stream.close_reason", "client_disconnect"),
                ),
            )
            return ctx.Err()

        case update, ok := <-priceChan:
            if !ok {
                // Channel closed, stream complete
                span.SetAttributes(
                    attribute.Int("rpc.grpc.messages_sent", messageCount),
                    attribute.String("stream.close_reason", "source_closed"),
                )
                streamDuration.Record(ctx,
                    float64(time.Since(streamStart).Milliseconds()),
                    metric.WithAttributes(
                        attribute.String("rpc.method", "WatchPrices"),
                        attribute.String("stream.close_reason", "source_closed"),
                    ),
                )
                return nil
            }

            // Send the price update
            err := stream.Send(&pb.PriceUpdate{
                Symbol:    update.Symbol,
                Price:     update.Price,
                Timestamp: update.Timestamp,
            })
            if err != nil {
                span.RecordError(err)
                return err
            }

            messageCount++
            streamMessagesSent.Add(ctx, 1, metric.WithAttributes(
                attribute.String("rpc.method", "WatchPrices"),
                attribute.String("stock.symbol", update.Symbol),
            ))

            // Add span events for significant price changes
            if update.ChangePercent > 5.0 || update.ChangePercent < -5.0 {
                span.AddEvent("significant_price_change", trace.WithAttributes(
                    attribute.String("stock.symbol", update.Symbol),
                    attribute.Float64("stock.price", update.Price),
                    attribute.Float64("stock.change_percent", update.ChangePercent),
                ))
            }
        }
    }
}
```

## Client-Side Stream Consumption

```go
func watchPrices(client pb.StockServiceClient, symbols []string) error {
    ctx, span := tracer.Start(context.Background(), "WatchPrices.Client",
        trace.WithSpanKind(trace.SpanKindClient),
        trace.WithAttributes(
            attribute.StringSlice("stock.symbols", symbols),
        ),
    )
    defer span.End()

    stream, err := client.WatchPrices(ctx, &pb.WatchRequest{
        Symbols: symbols,
    })
    if err != nil {
        span.RecordError(err)
        return err
    }

    messageCount := 0
    firstMessageReceived := false
    streamStart := time.Now()

    for {
        update, err := stream.Recv()
        if err != nil {
            span.SetAttributes(
                attribute.Int("rpc.grpc.messages_received", messageCount),
                attribute.Float64("stream.duration_ms",
                    float64(time.Since(streamStart).Milliseconds())),
            )
            if err == io.EOF {
                return nil
            }
            span.RecordError(err)
            return err
        }

        messageCount++

        // Track time to first message
        if !firstMessageReceived {
            ttfm := float64(time.Since(streamStart).Milliseconds())
            span.SetAttributes(
                attribute.Float64("stream.time_to_first_message_ms", ttfm),
            )
            firstMessageReceived = true
        }

        handlePriceUpdate(update)
    }
}
```

## Key Metrics to Watch

```promql
# Average stream duration by method
histogram_avg(grpc_server_stream_duration[5m])

# Active streams right now
grpc_server_stream_active

# Message throughput (messages per second)
sum(rate(grpc_server_stream_messages_sent_total[1m])) by (rpc_method)

# Messages per stream (are streams too chatty or too quiet?)
sum(rate(grpc_server_stream_messages_sent_total[5m])) by (rpc_method)
/
sum(rate(grpc_server_stream_duration_count[5m])) by (rpc_method)
```

Tracking stream duration and message counts tells you how your streaming RPCs behave over time. You can detect streams that run too long, identify symbols that generate excessive updates, and monitor how many concurrent streams your server is handling. This is the kind of visibility that prevents streaming-related resource exhaustion before it happens.
