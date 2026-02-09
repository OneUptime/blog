# How to Instrument gRPC Bidirectional Streaming with OpenTelemetry for Per-Message Span Tracking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, gRPC, Bidirectional Streaming, Per-Message Tracing

Description: Instrument gRPC bidirectional streaming RPCs with OpenTelemetry to create per-message spans that track individual message flow.

Bidirectional streaming in gRPC allows both the client and server to send a stream of messages independently. Tracing these streams is harder than tracing unary RPCs because there is no single request-response pair. You need to decide whether to create one span per RPC, one span per message, or both.

The most useful approach is a parent span for the entire stream and child spans for individual messages on both sides.

## The Proto Definition

```protobuf
syntax = "proto3";

service ChatService {
  // Bidirectional streaming: both client and server send messages
  rpc Chat(stream ChatMessage) returns (stream ChatMessage);
}

message ChatMessage {
  string user_id = 1;
  string content = 2;
  int64 timestamp = 3;
}
```

## Server-Side Instrumentation in Go

```go
package main

import (
    "context"
    "io"
    "log"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/trace"
    pb "example.com/chat/proto"
)

var tracer = otel.Tracer("chat-service")

type chatServer struct {
    pb.UnimplementedChatServiceServer
}

func (s *chatServer) Chat(stream pb.ChatService_ChatServer) error {
    // Create a parent span for the entire bidirectional stream
    ctx, parentSpan := tracer.Start(
        stream.Context(),
        "ChatService.Chat",
        trace.WithSpanKind(trace.SpanKindServer),
        trace.WithAttributes(
            attribute.String("rpc.system", "grpc"),
            attribute.String("rpc.service", "ChatService"),
            attribute.String("rpc.method", "Chat"),
        ),
    )
    defer parentSpan.End()

    messagesSent := 0
    messagesReceived := 0

    for {
        // Create a span for each received message
        _, recvSpan := tracer.Start(ctx, "ChatService.Chat.Receive",
            trace.WithAttributes(
                attribute.Int("rpc.grpc.message.sequence", messagesReceived+1),
                attribute.String("rpc.grpc.message.type", "RECEIVED"),
            ),
        )

        msg, err := stream.Recv()
        if err == io.EOF {
            recvSpan.SetAttributes(attribute.Bool("stream.eof", true))
            recvSpan.End()
            break
        }
        if err != nil {
            recvSpan.RecordError(err)
            recvSpan.End()
            parentSpan.RecordError(err)
            return err
        }

        messagesReceived++
        recvSpan.SetAttributes(
            attribute.String("chat.user_id", msg.UserId),
            attribute.Int("chat.content_length", len(msg.Content)),
        )
        recvSpan.End()

        // Process the message and send a response
        response := processMessage(msg)

        // Create a span for each sent message
        _, sendSpan := tracer.Start(ctx, "ChatService.Chat.Send",
            trace.WithAttributes(
                attribute.Int("rpc.grpc.message.sequence", messagesSent+1),
                attribute.String("rpc.grpc.message.type", "SENT"),
            ),
        )

        if err := stream.Send(response); err != nil {
            sendSpan.RecordError(err)
            sendSpan.End()
            return err
        }

        messagesSent++
        sendSpan.End()
    }

    // Record totals on the parent span
    parentSpan.SetAttributes(
        attribute.Int("rpc.grpc.messages_sent", messagesSent),
        attribute.Int("rpc.grpc.messages_received", messagesReceived),
    )

    return nil
}

func processMessage(msg *pb.ChatMessage) *pb.ChatMessage {
    return &pb.ChatMessage{
        UserId:  "server",
        Content: "Received: " + msg.Content,
    }
}
```

## Client-Side Instrumentation in Go

```go
func chatWithServer(client pb.ChatServiceClient, messages []string) error {
    ctx, parentSpan := tracer.Start(
        context.Background(),
        "ChatService.Chat.Client",
        trace.WithSpanKind(trace.SpanKindClient),
    )
    defer parentSpan.End()

    stream, err := client.Chat(ctx)
    if err != nil {
        parentSpan.RecordError(err)
        return err
    }

    // Goroutine to receive messages from the server
    done := make(chan error)
    receivedCount := 0

    go func() {
        for {
            _, recvSpan := tracer.Start(ctx, "ChatService.Chat.Client.Receive",
                trace.WithAttributes(
                    attribute.Int("rpc.grpc.message.sequence", receivedCount+1),
                ),
            )

            resp, err := stream.Recv()
            if err == io.EOF {
                recvSpan.SetAttributes(attribute.Bool("stream.eof", true))
                recvSpan.End()
                done <- nil
                return
            }
            if err != nil {
                recvSpan.RecordError(err)
                recvSpan.End()
                done <- err
                return
            }

            receivedCount++
            recvSpan.SetAttributes(
                attribute.String("chat.response_content", resp.Content),
            )
            recvSpan.End()
        }
    }()

    // Send messages to the server
    for i, msg := range messages {
        _, sendSpan := tracer.Start(ctx, "ChatService.Chat.Client.Send",
            trace.WithAttributes(
                attribute.Int("rpc.grpc.message.sequence", i+1),
                attribute.String("rpc.grpc.message.type", "SENT"),
                attribute.Int("chat.content_length", len(msg)),
            ),
        )

        err := stream.Send(&pb.ChatMessage{
            UserId:  "client-1",
            Content: msg,
        })
        if err != nil {
            sendSpan.RecordError(err)
            sendSpan.End()
            return err
        }
        sendSpan.End()
    }

    // Close the send direction
    stream.CloseSend()

    // Wait for all responses
    if err := <-done; err != nil {
        parentSpan.RecordError(err)
        return err
    }

    parentSpan.SetAttributes(
        attribute.Int("rpc.grpc.messages_sent", len(messages)),
        attribute.Int("rpc.grpc.messages_received", receivedCount),
    )

    return nil
}
```

## What the Trace Looks Like

The resulting trace has a clear structure:

```
ChatService.Chat (parent - server)
  ├── ChatService.Chat.Receive (message 1)
  ├── ChatService.Chat.Send (response 1)
  ├── ChatService.Chat.Receive (message 2)
  ├── ChatService.Chat.Send (response 2)
  └── ChatService.Chat.Receive (EOF)
```

Each message has its own span with sequence numbers, content lengths, and timing information. The parent span shows the total duration and message counts. This gives you visibility into both the overall stream performance and individual message latency, which is exactly what you need to debug streaming RPC issues.
