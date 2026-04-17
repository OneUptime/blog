# How to Build a gRPC API on Top of ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, gRPC, Protocol Buffer, API Design, Go

Description: Build a gRPC API over ClickHouse using Go and Protocol Buffers to expose analytics queries with streaming support and strong type safety.

---

## Why gRPC for ClickHouse APIs

gRPC offers strong type safety, efficient binary serialization, and native streaming - all useful when exposing ClickHouse analytics to internal services. Server-side streaming is particularly useful for large result sets that would be expensive to buffer entirely in memory.

## Proto Definition

```protobuf
// analytics.proto
syntax = "proto3";
package analytics;
option go_package = "./pb";

message EventQueryRequest {
  string start_date = 1;
  string end_date = 2;
  string event_type = 3;
  uint32 limit = 4;
}

message Event {
  string event_time = 1;
  string event_type = 2;
  uint64 user_id = 3;
  string page_url = 4;
}

message DailyMetric {
  string date = 1;
  uint64 total_events = 2;
  uint64 unique_users = 3;
}

message MetricsRequest {
  uint32 days = 1;
}

service AnalyticsService {
  // Server-side streaming for daily metric rows
  rpc GetDailyMetrics(MetricsRequest) returns (stream DailyMetric);
  // Server-side streaming for large event results
  rpc StreamEvents(EventQueryRequest) returns (stream Event);
}
```

## Generate Go Code

```bash
protoc --go_out=. --go-grpc_out=. analytics.proto
```

## Go gRPC Server Implementation

```go
// server.go
package main

import (
    "context"
    "fmt"
    "log"
    "net"

    "github.com/ClickHouse/clickhouse-go/v2"
    "google.golang.org/grpc"
    pb "your-module/pb"
)

type server struct {
    pb.UnimplementedAnalyticsServiceServer
    db clickhouse.Conn
}

func (s *server) GetDailyMetrics(req *pb.MetricsRequest, stream pb.AnalyticsService_GetDailyMetricsServer) error {
    query := fmt.Sprintf(`
        SELECT
            toString(toDate(event_time)) AS date,
            count() AS total_events,
            uniq(user_id) AS unique_users
        FROM events
        WHERE event_time >= today() - %d
        GROUP BY date
        ORDER BY date DESC
    `, req.Days)

    rows, err := s.db.Query(context.Background(), query)
    if err != nil {
        return err
    }
    defer rows.Close()

    for rows.Next() {
        var metric pb.DailyMetric
        if err := rows.Scan(&metric.Date, &metric.TotalEvents, &metric.UniqueUsers); err != nil {
            return err
        }
        if err := stream.Send(&metric); err != nil {
            return err
        }
    }
    return rows.Err()
}

func (s *server) StreamEvents(req *pb.EventQueryRequest, stream pb.AnalyticsService_StreamEventsServer) error {
    rows, err := s.db.Query(context.Background(),
        `SELECT
            formatDateTime(event_time, '%Y-%m-%dT%H:%i:%s'),
            event_type,
            user_id,
            page_url
         FROM events
         WHERE event_time BETWEEN ? AND ?
           AND event_type = ?
         LIMIT ?`,
        req.StartDate, req.EndDate, req.EventType, req.Limit,
    )
    if err != nil {
        return err
    }
    defer rows.Close()

    for rows.Next() {
        var evt pb.Event
        if err := rows.Scan(&evt.EventTime, &evt.EventType, &evt.UserId, &evt.PageUrl); err != nil {
            return err
        }
        if err := stream.Send(&evt); err != nil {
            return err
        }
    }
    return rows.Err()
}

func main() {
    conn, err := clickhouse.Open(&clickhouse.Options{
        Addr: []string{"localhost:9000"},
    })
    if err != nil {
        log.Fatal(err)
    }

    lis, err := net.Listen("tcp", ":50051")
    if err != nil {
        log.Fatal(err)
    }

    grpcServer := grpc.NewServer()
    pb.RegisterAnalyticsServiceServer(grpcServer, &server{db: conn})
    log.Println("gRPC server listening on :50051")
    grpcServer.Serve(lis)
}
```

## Go Client Example

```go
// client_example.go
conn, _ := grpc.Dial("localhost:50051", grpc.WithInsecure())
client := pb.NewAnalyticsServiceClient(conn)

stream, _ := client.GetDailyMetrics(context.Background(), &pb.MetricsRequest{Days: 30})
for {
    metric, err := stream.Recv()
    if err != nil {
        break
    }
    fmt.Printf("%s: %d events, %d users\n", metric.Date, metric.TotalEvents, metric.UniqueUsers)
}
```

## Summary

A gRPC API over ClickHouse uses server-side streaming to efficiently transfer large result sets row by row, avoiding memory overhead of buffering entire result sets. Define your schema in Protocol Buffers, implement stream handlers that scan ClickHouse rows and send them to the stream, and use the native ClickHouse Go driver for best performance.
