# How to Publish and Receive Pub/Sub Messages in a Go Application with Concurrency Controls

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Pub/Sub, Go, Concurrency, Google Cloud

Description: Learn how to publish and receive Google Cloud Pub/Sub messages in a Go application with proper concurrency controls for reliable message processing.

---

Google Cloud Pub/Sub is one of those services that looks simple on the surface but can get tricky once you start thinking about concurrency. You publish messages, you subscribe to them - straightforward enough. But what happens when your subscriber is processing hundreds of messages per second and you need to control how many goroutines are running at once? That is where concurrency controls come in.

In this post, I will walk through building a Go application that both publishes and receives Pub/Sub messages, with sensible concurrency settings that keep your application stable under load.

## Prerequisites

Before we start, make sure you have:

- A GCP project with Pub/Sub API enabled
- Go 1.21 or later installed
- The `gcloud` CLI configured with your project

## Setting Up the Project

First, initialize a Go module and pull in the Pub/Sub client library.

```bash
# Initialize the Go module and install the Pub/Sub dependency
go mod init pubsub-demo
go get cloud.google.com/go/pubsub
```

## Creating a Topic and Subscription

You can create these through the console or the CLI. Here is the CLI approach.

```bash
# Create a topic and a subscription attached to it
gcloud pubsub topics create my-topic
gcloud pubsub subscriptions create my-subscription --topic=my-topic
```

## The Publisher

Let us start with the publishing side. The Pub/Sub client library in Go allows you to configure publish settings that control batching and concurrency.

Here is a publisher with tuned settings:

```go
package main

import (
    "context"
    "fmt"
    "log"
    "sync"
    "time"

    "cloud.google.com/go/pubsub"
)

// publishMessages sends a batch of messages to the given topic
// with concurrency controls on the publish side
func publishMessages(projectID, topicID string, messageCount int) error {
    ctx := context.Background()

    // Create the Pub/Sub client
    client, err := pubsub.NewClient(ctx, projectID)
    if err != nil {
        return fmt.Errorf("failed to create client: %w", err)
    }
    defer client.Close()

    topic := client.Topic(topicID)

    // Configure publish settings for controlled throughput
    topic.PublishSettings = pubsub.PublishSettings{
        // Maximum number of messages to batch before sending
        CountThreshold: 100,
        // Maximum size of a batch in bytes
        ByteThreshold:  1e6,
        // Maximum time to wait before sending a batch
        DelayThreshold: 10 * time.Millisecond,
        // Number of goroutines used for publishing
        NumGoroutines:  4,
        // Flow control to prevent memory overuse
        FlowControlSettings: pubsub.FlowControlSettings{
            MaxOutstandingMessages: 500,
            MaxOutstandingBytes:    50 * 1024 * 1024, // 50 MB
            LimitExceededBehavior:  pubsub.FlowControlBlock,
        },
    }

    var wg sync.WaitGroup
    var mu sync.Mutex
    var publishErrors []error

    for i := 0; i < messageCount; i++ {
        wg.Add(1)
        // Publish returns a future - the actual send happens asynchronously
        result := topic.Publish(ctx, &pubsub.Message{
            Data: []byte(fmt.Sprintf("message-%d", i)),
            Attributes: map[string]string{
                "origin": "go-demo",
                "index":  fmt.Sprintf("%d", i),
            },
        })

        // Handle the result in a goroutine
        go func(i int, res *pubsub.PublishResult) {
            defer wg.Done()
            id, err := res.Get(ctx)
            if err != nil {
                mu.Lock()
                publishErrors = append(publishErrors, err)
                mu.Unlock()
                return
            }
            log.Printf("Published message %d with ID: %s", i, id)
        }(i, result)
    }

    wg.Wait()
    topic.Stop()

    if len(publishErrors) > 0 {
        return fmt.Errorf("encountered %d publish errors", len(publishErrors))
    }
    return nil
}
```

The key settings to pay attention to are `NumGoroutines` and `FlowControlSettings`. The `NumGoroutines` parameter controls how many goroutines the client uses to send batches to the server. Setting this too high can overwhelm your network, and setting it too low can bottleneck throughput.

The `FlowControlSettings` are your safety net. When `LimitExceededBehavior` is set to `FlowControlBlock`, the `Publish` call will block instead of buffering unlimited messages in memory. This prevents your application from running out of memory during traffic spikes.

## The Subscriber

The subscriber side is where concurrency controls matter even more. If your message handler does any I/O - database writes, HTTP calls, file processing - you need to limit how many messages are being processed simultaneously.

```go
// receiveMessages pulls messages from the subscription with
// concurrency limits to prevent resource exhaustion
func receiveMessages(projectID, subscriptionID string) error {
    ctx := context.Background()

    client, err := pubsub.NewClient(ctx, projectID)
    if err != nil {
        return fmt.Errorf("failed to create client: %w", err)
    }
    defer client.Close()

    sub := client.Subscription(subscriptionID)

    // Configure receive settings for controlled concurrency
    sub.ReceiveSettings = pubsub.ReceiveSettings{
        // Maximum number of unprocessed messages
        MaxOutstandingMessages: 100,
        // Maximum total size of unprocessed messages
        MaxOutstandingBytes:    100 * 1024 * 1024, // 100 MB
        // Number of goroutines for pulling messages from the server
        NumGoroutines: 2,
    }

    log.Println("Listening for messages...")

    // Receive blocks until the context is cancelled
    err = sub.Receive(ctx, func(ctx context.Context, msg *pubsub.Message) {
        // Process the message
        log.Printf("Received message: %s (ID: %s)", string(msg.Data), msg.ID)

        // Simulate some processing work
        processMessage(msg)

        // Acknowledge the message after successful processing
        msg.Ack()
    })

    if err != nil {
        return fmt.Errorf("receive error: %w", err)
    }
    return nil
}

// processMessage simulates work on a message
func processMessage(msg *pubsub.Message) {
    // In a real app, this might write to a database or call an API
    time.Sleep(50 * time.Millisecond)
}
```

The `MaxOutstandingMessages` setting is the most important concurrency control on the subscriber side. It caps how many messages your callback can be processing at once. If you set this to 100, the client will never have more than 100 in-flight messages. Once you `Ack()` or `Nack()` a message, the client pulls the next one.

## Putting It All Together

Here is the main function that ties the publisher and subscriber together:

```go
func main() {
    projectID := "your-gcp-project"
    topicID := "my-topic"
    subscriptionID := "my-subscription"

    // Start the subscriber in a goroutine
    go func() {
        if err := receiveMessages(projectID, subscriptionID); err != nil {
            log.Fatalf("Subscriber error: %v", err)
        }
    }()

    // Give the subscriber a moment to start
    time.Sleep(2 * time.Second)

    // Publish a batch of messages
    if err := publishMessages(projectID, topicID, 1000); err != nil {
        log.Fatalf("Publisher error: %v", err)
    }

    // Keep the subscriber running
    select {}
}
```

## How Concurrency Controls Interact

Here is a visual overview of how the publisher and subscriber concurrency settings relate to each other.

```mermaid
flowchart LR
    A[Publisher] -->|NumGoroutines=4| B[Pub/Sub Topic]
    B --> C[Subscription]
    C -->|NumGoroutines=2| D[Subscriber]
    D -->|MaxOutstandingMessages=100| E[Message Handler]
    E -->|Ack/Nack| C

    style A fill:#4285F4,color:#fff
    style B fill:#34A853,color:#fff
    style C fill:#FBBC05,color:#000
    style D fill:#EA4335,color:#fff
    style E fill:#4285F4,color:#fff
```

## Tuning Tips

Here are some practical guidelines I have found helpful:

1. **Start conservative** - Set `MaxOutstandingMessages` to something low like 10, then increase it while monitoring CPU and memory usage.

2. **Match your resources** - If your handler makes database calls and your connection pool has 20 connections, do not set `MaxOutstandingMessages` to 500. You will just create contention.

3. **Use flow control on the publisher** - Even if your subscriber can handle the load, an uncontrolled publisher can create message backlogs that are hard to drain.

4. **Monitor acknowledgment deadlines** - If messages are being nacked because processing takes too long, either increase the ack deadline on the subscription or reduce `MaxOutstandingMessages`.

5. **Watch for ordering issues** - If you need ordered processing, set `NumGoroutines` to 1 on the subscriber and use ordering keys on the publisher side.

## Handling Errors and Nacks

When processing fails, you should nack the message so Pub/Sub redelivers it:

```go
err = sub.Receive(ctx, func(ctx context.Context, msg *pubsub.Message) {
    if err := processMessage(msg); err != nil {
        log.Printf("Failed to process message %s: %v", msg.ID, err)
        // Nack triggers redelivery after the ack deadline
        msg.Nack()
        return
    }
    msg.Ack()
})
```

Be careful with nacks though. If your handler consistently fails, you can end up in a tight redelivery loop. Consider setting a dead-letter topic on the subscription so poison messages get moved aside after a few delivery attempts.

## Conclusion

Getting Pub/Sub concurrency right in Go is mostly about understanding the knobs the client library gives you and tuning them for your workload. Start with conservative settings, measure your throughput and resource usage, and adjust from there. The combination of `FlowControlSettings` on the publisher and `MaxOutstandingMessages` on the subscriber gives you enough control to handle most production scenarios without writing custom concurrency logic.

If you are running into issues with message processing in production, consider using OneUptime to monitor your Pub/Sub metrics and set up alerts when acknowledgment latencies spike or message backlogs grow.
