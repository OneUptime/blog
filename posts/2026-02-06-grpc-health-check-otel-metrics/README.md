# How to Monitor gRPC Health Checking Service Status Changes with OpenTelemetry Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, gRPC, Health Checking, Service Monitoring

Description: Monitor gRPC health checking service status transitions with OpenTelemetry metrics to track service availability and detect flapping.

gRPC has a standard health checking protocol defined in `grpc.health.v1.Health`. Services report their serving status as SERVING, NOT_SERVING, or UNKNOWN. By monitoring these status changes with OpenTelemetry metrics, you can track service availability, detect flapping (rapid status oscillations), and build dashboards that show the health of your entire gRPC fleet.

## The gRPC Health Check Protocol

The health check service exposes two RPCs:
- `Check`: Unary RPC that returns current status
- `Watch`: Server streaming RPC that streams status changes

## Instrumenting the Health Check Server

```go
package main

import (
    "context"
    "sync"
    "time"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/metric"
    healthpb "google.golang.org/grpc/health/grpc_health_v1"
)

var meter = otel.Meter("grpc.health.monitoring")

var (
    // Track status transitions
    statusTransitions metric.Int64Counter

    // Current status as a gauge (1 = SERVING, 0 = NOT_SERVING, -1 = UNKNOWN)
    currentStatus metric.Int64ObservableGauge

    // Time in current state
    statusDuration metric.Float64Histogram

    // Health check request count
    checkRequests metric.Int64Counter
)

func initHealthMetrics() {
    var err error

    statusTransitions, err = meter.Int64Counter(
        "grpc.health.status_transitions",
        metric.WithDescription("Number of health status transitions"),
    )
    check(err)

    checkRequests, err = meter.Int64Counter(
        "grpc.health.check_requests",
        metric.WithDescription("Number of health check requests received"),
    )
    check(err)

    statusDuration, err = meter.Float64Histogram(
        "grpc.health.status_duration",
        metric.WithDescription("Duration spent in each health status"),
        metric.WithUnit("s"),
    )
    check(err)
}

func check(err error) {
    if err != nil {
        panic(err)
    }
}

type InstrumentedHealthServer struct {
    healthpb.UnimplementedHealthServer
    mu             sync.RWMutex
    statuses       map[string]healthpb.HealthCheckResponse_ServingStatus
    lastTransition map[string]time.Time
    watchers       map[string][]chan healthpb.HealthCheckResponse_ServingStatus
}

func NewInstrumentedHealthServer() *InstrumentedHealthServer {
    s := &InstrumentedHealthServer{
        statuses:       make(map[string]healthpb.HealthCheckResponse_ServingStatus),
        lastTransition: make(map[string]time.Time),
        watchers:       make(map[string][]chan healthpb.HealthCheckResponse_ServingStatus),
    }

    // Register observable gauge for current status
    meter.Int64ObservableGauge(
        "grpc.health.current_status",
        metric.WithDescription("Current health status per service"),
        metric.WithInt64Callback(s.observeStatuses),
    )

    return s
}

func (s *InstrumentedHealthServer) observeStatuses(
    ctx context.Context,
    obs metric.Int64Observer,
) error {
    s.mu.RLock()
    defer s.mu.RUnlock()

    for service, status := range s.statuses {
        var value int64
        switch status {
        case healthpb.HealthCheckResponse_SERVING:
            value = 1
        case healthpb.HealthCheckResponse_NOT_SERVING:
            value = 0
        default:
            value = -1
        }
        obs.Observe(value, metric.WithAttributes(
            attribute.String("grpc.health.service", service),
            attribute.String("grpc.health.status", status.String()),
        ))
    }
    return nil
}
```

## Setting Service Status with Metrics

```go
func (s *InstrumentedHealthServer) SetServingStatus(
    service string,
    status healthpb.HealthCheckResponse_ServingStatus,
) {
    s.mu.Lock()

    prevStatus, existed := s.statuses[service]
    s.statuses[service] = status

    // Record the duration in the previous state
    if existed {
        if lastChange, ok := s.lastTransition[service]; ok {
            duration := time.Since(lastChange).Seconds()
            statusDuration.Record(context.Background(), duration,
                metric.WithAttributes(
                    attribute.String("grpc.health.service", service),
                    attribute.String("grpc.health.from_status", prevStatus.String()),
                ),
            )
        }
    }

    s.lastTransition[service] = time.Now()

    // Record the transition
    if !existed || prevStatus != status {
        fromStatus := "NONE"
        if existed {
            fromStatus = prevStatus.String()
        }

        statusTransitions.Add(context.Background(), 1,
            metric.WithAttributes(
                attribute.String("grpc.health.service", service),
                attribute.String("grpc.health.from_status", fromStatus),
                attribute.String("grpc.health.to_status", status.String()),
            ),
        )
    }

    // Notify watchers
    if watchers, ok := s.watchers[service]; ok {
        for _, ch := range watchers {
            select {
            case ch <- status:
            default:
                // Watcher is not keeping up, skip
            }
        }
    }

    s.mu.Unlock()
}
```

## Handling Health Check Requests

```go
func (s *InstrumentedHealthServer) Check(
    ctx context.Context,
    req *healthpb.HealthCheckRequest,
) (*healthpb.HealthCheckResponse, error) {
    checkRequests.Add(ctx, 1, metric.WithAttributes(
        attribute.String("grpc.health.service", req.Service),
        attribute.String("grpc.health.check_type", "unary"),
    ))

    s.mu.RLock()
    status, ok := s.statuses[req.Service]
    s.mu.RUnlock()

    if !ok {
        return nil, grpc.Errorf(codes.NotFound, "unknown service: %s", req.Service)
    }

    return &healthpb.HealthCheckResponse{Status: status}, nil
}

func (s *InstrumentedHealthServer) Watch(
    req *healthpb.HealthCheckRequest,
    stream healthpb.Health_WatchServer,
) error {
    checkRequests.Add(stream.Context(), 1, metric.WithAttributes(
        attribute.String("grpc.health.service", req.Service),
        attribute.String("grpc.health.check_type", "watch"),
    ))

    ch := make(chan healthpb.HealthCheckResponse_ServingStatus, 10)

    s.mu.Lock()
    s.watchers[req.Service] = append(s.watchers[req.Service], ch)

    // Send current status immediately
    if status, ok := s.statuses[req.Service]; ok {
        ch <- status
    }
    s.mu.Unlock()

    for {
        select {
        case <-stream.Context().Done():
            return nil
        case status := <-ch:
            err := stream.Send(&healthpb.HealthCheckResponse{Status: status})
            if err != nil {
                return err
            }
        }
    }
}
```

## Client-Side Health Monitoring

```go
func monitorServiceHealth(client healthpb.HealthClient, serviceName string) {
    stream, err := client.Watch(context.Background(), &healthpb.HealthCheckRequest{
        Service: serviceName,
    })
    if err != nil {
        log.Printf("Failed to watch health: %v", err)
        return
    }

    for {
        resp, err := stream.Recv()
        if err != nil {
            log.Printf("Health watch error: %v", err)
            return
        }

        // Record the observed status from the client side
        statusTransitions.Add(context.Background(), 1,
            metric.WithAttributes(
                attribute.String("grpc.health.service", serviceName),
                attribute.String("grpc.health.observed_status", resp.Status.String()),
                attribute.String("grpc.health.observer", "client"),
            ),
        )

        log.Printf("Service %s health: %s", serviceName, resp.Status.String())
    }
}
```

## Detecting Flapping

A key alert to set up is flapping detection, which catches services that oscillate between SERVING and NOT_SERVING:

```yaml
groups:
  - name: grpc_health
    rules:
      - alert: ServiceFlapping
        expr: |
          sum(rate(grpc_health_status_transitions_total[5m]))
          by (grpc_health_service) > 3
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Service {{ $labels.grpc_health_service }} is flapping"

      - alert: ServiceNotServing
        expr: grpc_health_current_status == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.grpc_health_service }} is NOT_SERVING"
```

Monitoring health check status changes with OpenTelemetry gives you a real-time view of service availability. You can track how long services stay healthy, detect instability through flapping alerts, and understand the health of your entire gRPC infrastructure from a single dashboard.
