# How to Implement Graceful Shutdown in Dapr Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Graceful Shutdown, Microservice, Kubernetes, Reliability, Signal Handling

Description: Learn how to implement graceful shutdown in Dapr applications to drain in-flight requests and finish active subscriptions before terminating.

---

Graceful shutdown ensures that your Dapr application finishes processing in-flight requests before it exits. Without it, a deployment rollout or pod eviction can terminate a service mid-request, causing data loss, duplicate processing, or failed client calls. This guide covers the patterns and techniques for implementing reliable graceful shutdown across Dapr's key building blocks.

## Why Graceful Shutdown Matters in Dapr

Dapr applications receive work through multiple channels that each require careful cleanup:
- HTTP service invocation requests that are currently being processed
- Pub/Sub messages that have been received but not yet acknowledged
- Workflow activities currently executing
- Outbound requests being made through the Dapr sidecar

Without graceful shutdown, terminating a pod mid-request can cause the Dapr sidecar to drop those operations, leading to unhandled messages, orphaned workflow steps, and failed client calls.

## Handling OS Signals in Python

Use signal handlers to intercept SIGTERM and SIGINT and initiate an orderly shutdown.

```python
import signal
import threading
import time
import logging
from flask import Flask, request, jsonify

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Shared shutdown state
shutdown_event = threading.Event()
active_requests = 0
active_requests_lock = threading.Lock()


class ShutdownMiddleware:
    """Middleware that tracks active requests and blocks new ones during shutdown."""

    def __init__(self, flask_app):
        self.app = flask_app

    def __call__(self, environ, start_response):
        global active_requests

        if shutdown_event.is_set():
            start_response("503 Service Unavailable", [("Content-Type", "application/json")])
            return [b'{"error": "Service is shutting down"}']

        with active_requests_lock:
            active_requests += 1

        try:
            return self.app(environ, start_response)
        finally:
            with active_requests_lock:
                active_requests -= 1


def graceful_shutdown(signum, frame):
    """Handle SIGTERM and SIGINT with a graceful drain period."""
    logger.info("Received shutdown signal %d, initiating graceful shutdown...", signum)
    shutdown_event.set()

    # Wait up to 30 seconds for active requests to complete
    drain_timeout = 30
    start = time.time()

    while time.time() - start < drain_timeout:
        with active_requests_lock:
            count = active_requests
        if count == 0:
            logger.info("All requests drained, shutting down cleanly")
            break
        logger.info("Waiting for %d active request(s)...", count)
        time.sleep(0.5)
    else:
        logger.warning("Drain timeout reached with active requests still running")


# Register signal handlers
signal.signal(signal.SIGTERM, graceful_shutdown)
signal.signal(signal.SIGINT, graceful_shutdown)


@app.route('/orders', methods=['POST'])
def handle_order():
    if shutdown_event.is_set():
        return jsonify({"error": "Shutting down"}), 503

    order = request.json
    logger.info("Processing order %s", order.get("orderId"))
    # Simulate some processing
    time.sleep(0.1)
    return jsonify({"status": "accepted", "orderId": order.get("orderId")})


@app.route('/health/ready', methods=['GET'])
def readiness():
    """Kubernetes readiness probe - fails when shutting down."""
    if shutdown_event.is_set():
        return jsonify({"status": "shutting_down"}), 503
    return jsonify({"status": "ready"}), 200


app.wsgi_app = ShutdownMiddleware(app.wsgi_app)

if __name__ == "__main__":
    from werkzeug.serving import make_server
    server = make_server("0.0.0.0", 5000, app)
    # Check for shutdown in the serve loop
    while not shutdown_event.is_set():
        server.handle_request()
    logger.info("Server stopped")
```

## Draining Pub/Sub Subscriptions Before Shutdown

When consuming Dapr Pub/Sub messages, stop accepting new messages and finish the current batch before exiting.

```python
import signal
import threading
import queue
import time
import logging
from flask import Flask, request, jsonify

logger = logging.getLogger(__name__)
app = Flask(__name__)

shutdown_event = threading.Event()
message_queue = queue.Queue()
BATCH_SIZE = 10
MAX_WAIT_ON_SHUTDOWN = 30  # seconds


@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    return jsonify([
        {
            "pubsubname": "order-pubsub",
            "topic": "orders",
            "route": "/messages/orders"
        }
    ])


@app.route('/messages/orders', methods=['POST'])
def receive_order():
    if shutdown_event.is_set():
        # Return RETRY to ask Dapr to re-deliver after this instance is gone
        return jsonify({"status": "RETRY"}), 200

    message = request.json
    message_queue.put(message)
    return jsonify({"status": "SUCCESS"}), 200


def message_worker():
    """Process messages from the queue."""
    while not shutdown_event.is_set() or not message_queue.empty():
        try:
            message = message_queue.get(timeout=1.0)
            process_message(message)
            message_queue.task_done()
        except queue.Empty:
            if shutdown_event.is_set():
                break
            continue
    logger.info("Message worker stopped")


def process_message(message: dict):
    data = message.get("data", {})
    order_id = data.get("orderId", "unknown")
    logger.info("Processing message for order %s", order_id)
    time.sleep(0.05)  # Simulate processing


def shutdown_handler(signum, frame):
    logger.info("Shutting down message consumer...")
    shutdown_event.set()

    # Wait for the queue to drain
    deadline = time.time() + MAX_WAIT_ON_SHUTDOWN
    while not message_queue.empty() and time.time() < deadline:
        remaining = message_queue.qsize()
        logger.info("Draining queue: %d messages remaining", remaining)
        time.sleep(0.5)

    if not message_queue.empty():
        logger.warning("Shutdown timeout: %d messages unprocessed", message_queue.qsize())


signal.signal(signal.SIGTERM, shutdown_handler)
signal.signal(signal.SIGINT, shutdown_handler)

# Start background worker
worker = threading.Thread(target=message_worker, daemon=True)
worker.start()

if __name__ == "__main__":
    app.run(port=5000)
    worker.join(timeout=MAX_WAIT_ON_SHUTDOWN)
    logger.info("Application shutdown complete")
```

## Configuring Kubernetes for Graceful Termination

Kubernetes sends SIGTERM to the pod and then waits `terminationGracePeriodSeconds` before force-killing it. Configure this to match your drain timeout.

```yaml
# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-service"
        dapr.io/app-port: "5000"
        dapr.io/graceful-shutdown-seconds: "30"
    spec:
      terminationGracePeriodSeconds: 60
      containers:
      - name: order-service
        image: myregistry/order-service:latest
        ports:
        - containerPort: 5000
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 5000
          initialDelaySeconds: 5
          periodSeconds: 5
          failureThreshold: 3
        lifecycle:
          preStop:
            exec:
              # Give Kubernetes time to remove this pod from service endpoints
              command: ["/bin/sh", "-c", "sleep 5"]
```

The `dapr.io/graceful-shutdown-seconds` annotation tells the Dapr sidecar to wait before stopping, allowing your application's drain logic to complete.

## Graceful Shutdown in .NET with IHostedService

In .NET, implement graceful shutdown by listening to the `IHostApplicationLifetime` events.

```csharp
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

public class OrderProcessor : IHostedService, IDisposable
{
    private readonly ILogger<OrderProcessor> _logger;
    private readonly IHostApplicationLifetime _lifetime;
    private CancellationTokenSource _cts = new();
    private Task? _processingTask;

    public OrderProcessor(
        ILogger<OrderProcessor> logger,
        IHostApplicationLifetime lifetime)
    {
        _logger = logger;
        _lifetime = lifetime;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _lifetime.ApplicationStopping.Register(OnStopping);
        _processingTask = ProcessOrdersAsync(_cts.Token);
        return Task.CompletedTask;
    }

    private void OnStopping()
    {
        _logger.LogInformation("Application stopping - beginning graceful drain...");
        _cts.Cancel();
    }

    private async Task ProcessOrdersAsync(CancellationToken token)
    {
        try
        {
            while (!token.IsCancellationRequested)
            {
                // Process an order batch
                _logger.LogDebug("Processing order batch");
                await Task.Delay(100, token).ConfigureAwait(false);
            }
        }
        catch (OperationCanceledException)
        {
            // Expected when shutdown is requested
        }
        _logger.LogInformation("Order processor drained successfully");
    }

    public async Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("StopAsync called - waiting for drain...");
        if (_processingTask != null)
        {
            await Task.WhenAny(_processingTask, Task.Delay(TimeSpan.FromSeconds(30), cancellationToken));
        }
        _logger.LogInformation("Graceful shutdown complete");
    }

    public void Dispose()
    {
        _cts?.Dispose();
    }
}
```

Register the hosted service in `Program.cs`:

```csharp
builder.Services.AddHostedService<OrderProcessor>();
builder.Services.Configure<HostOptions>(options =>
{
    options.ShutdownTimeout = TimeSpan.FromSeconds(45);
});
```

## Summary

Implementing graceful shutdown in Dapr applications requires coordinating signal handling, request draining, and Kubernetes lifecycle configuration. You learned how to intercept OS signals to set a shared shutdown flag, use middleware to reject new requests and drain active ones, return `RETRY` to Dapr Pub/Sub instead of dropping in-flight messages, configure `terminationGracePeriodSeconds` and the Dapr graceful shutdown annotation in Kubernetes, and implement graceful shutdown in .NET with `IHostedService`. These techniques together ensure your Dapr services can be restarted or scaled without dropping user requests or losing messages.
