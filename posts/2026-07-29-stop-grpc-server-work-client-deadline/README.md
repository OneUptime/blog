# How to Stop Server Work When a gRPC Client Deadline Expires

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: gRPC, Go, Cancellation, Timeout, Resource Management

Description: Make gRPC handlers cooperatively stop loops, database calls, child RPCs, and goroutines when the client deadline cancels the server call.

---

When a gRPC deadline expires, the library cancels the call, but it cannot forcibly interrupt arbitrary application code. The server handler and every function it invokes must cooperate with cancellation.

In Go, unary handlers receive a `context.Context`. Generated streaming handlers expose a context through `ServerStream.Context()`. Pass that context through every request-scoped operation and check it in work that does not naturally block on a context-aware API.

## Start with the Handler Context

A unary Go handler can reject already-expired calls before doing expensive work:

```go
package rebuild

import (
	"context"

	"google.golang.org/grpc/status"
	pb "example.com/platform/gen/rebuild/v1"
)

func (s *Server) RebuildIndex(
	ctx context.Context,
	req *pb.RebuildIndexRequest,
) (*pb.RebuildIndexResponse, error) {
	if err := ctx.Err(); err != nil {
		return nil, status.FromContextError(err).Err()
	}

	result, err := s.rebuild(ctx, req.GetIndexId())
	if err != nil {
		return nil, err
	}

	return &pb.RebuildIndexResponse{
		DocumentsProcessed: result.DocumentsProcessed,
	}, nil
}
```

`status.FromContextError()` maps `context.DeadlineExceeded` to gRPC `DeadlineExceeded` and `context.Canceled` to `Canceled`.

The early check saves work for a call that arrived with no useful budget. It is not enough for a long operation because the context can be canceled after the check.

## Make Loops Cancellation-Aware

Check `ctx.Done()` at useful interruption points:

```go
func (s *Server) rebuild(
	ctx context.Context,
	indexID string,
) (Result, error) {
	documents, err := s.repository.ListDocuments(ctx, indexID)
	if err != nil {
		return Result{}, err
	}

	result := Result{}
	for _, document := range documents {
		select {
		case <-ctx.Done():
			return Result{}, status.FromContextError(ctx.Err()).Err()
		default:
		}

		if err := s.indexer.Add(ctx, document); err != nil {
			return Result{}, err
		}
		result.DocumentsProcessed++
	}

	return result, nil
}
```

Choose check frequency based on the cost of one iteration. Checking once per million-item batch can leave seconds of abandoned CPU work. Checking on every tiny arithmetic operation can add unnecessary noise. Context-aware blocking calls already wake on cancellation when implemented correctly.

## Pass Context into Database Calls

Go's `database/sql` package provides context-aware methods:

```go
func (r *Repository) ListDocuments(
	ctx context.Context,
	indexID string,
) ([]Document, error) {
	rows, err := r.db.QueryContext(
		ctx,
		`
			SELECT id, body
			FROM documents
			WHERE index_id = $1
			ORDER BY id
		`,
		indexID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var documents []Document
	for rows.Next() {
		if err := ctx.Err(); err != nil {
			return nil, err
		}

		var document Document
		if err := rows.Scan(&document.ID, &document.Body); err != nil {
			return nil, err
		}
		documents = append(documents, document)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return documents, nil
}
```

Whether cancellation reaches the database and how quickly it stops work depend on the driver and server. Keep a server-side statement timeout as another bound, and observe cancellation latency.

Closing rows and returning connections remain necessary. Cancellation does not excuse resource cleanup.

## Propagate Context to Child RPCs

In Go, make downstream calls with the handler context:

```go
profile, err := s.profileClient.GetProfile(
	ctx,
	&profilev1.GetProfileRequest{UserId: userID},
)
```

When the parent call is canceled, the child RPC receives cancellation through the context. The propagated deadline contains only the remaining time.

Do not replace the context with `context.Background()`:

```go
// This detaches the child RPC from the client deadline.
profile, err := s.profileClient.GetProfile(
	context.Background(),
	&profilev1.GetProfileRequest{UserId: userID},
)
```

Derive a shorter local timeout only when a dependency needs a smaller share:

```go
childCtx, cancel := context.WithTimeout(ctx, 200*time.Millisecond)
defer cancel()

profile, err := s.profileClient.GetProfile(childCtx, request)
```

Because `childCtx` descends from `ctx`, the earlier parent cancellation still wins.

## Do Not Leak Goroutines

Every request-scoped goroutine needs:

- the request context;
- a way to stop blocking;
- an owner that waits for its exit;
- bounded cleanup.

`errgroup.WithContext` coordinates parallel work:

```go
import "golang.org/x/sync/errgroup"

func loadParts(
	ctx context.Context,
	orderID string,
) (Customer, []Item, error) {
	group, groupCtx := errgroup.WithContext(ctx)

	var customer Customer
	var items []Item

	group.Go(func() error {
		value, err := loadCustomer(groupCtx, orderID)
		if err == nil {
			customer = value
		}
		return err
	})

	group.Go(func() error {
		value, err := loadItems(groupCtx, orderID)
		if err == nil {
			items = value
		}
		return err
	})

	if err := group.Wait(); err != nil {
		return Customer{}, nil, err
	}
	return customer, items, nil
}
```

The functions must themselves honor `groupCtx`. `errgroup` signals cancellation; it cannot stop a function stuck in a non-cancellable library.

Avoid returning from a handler while request goroutines continue to access local state or pooled resources.

## Handle Streams

For a generated server-streaming method, retrieve the stream context and stop when either it is canceled or `Send()` fails:

```go
func (s *Server) Export(
	req *pb.ExportRequest,
	stream pb.ExportService_ExportServer,
) error {
	ctx := stream.Context()

	for batch := range s.exporter.Batches(ctx, req.GetExportId()) {
		if err := ctx.Err(); err != nil {
			return status.FromContextError(err).Err()
		}
		if err := stream.Send(batch); err != nil {
			return err
		}
	}

	return nil
}
```

The exporter must close its output channel on every exit path. A producer blocked forever while sending to a channel after the consumer exits is still a leak.

For client-streaming and bidirectional methods, any non-`io.EOF` `Recv()` error or any `Send()` error is a termination signal. A `Recv()` result of `io.EOF` is a normal client half-close: stop receiving, then complete the method's defined response behavior, such as calling `SendAndClose()` in a client-streaming handler. Do not continue business work after the RPC itself has ended unless the API explicitly accepted durable asynchronous work.

## Cancellation Cannot Undo a Commit

This pattern reduces unnecessary work:

```go
if err := ctx.Err(); err != nil {
	return nil, status.FromContextError(err).Err()
}

if err := repository.CommitOrder(ctx, order); err != nil {
	return nil, err
}
```

It cannot close the race between the check and an irreversible commit. Cancellation might arrive immediately after the check, or the commit can succeed while its acknowledgment is lost.

For state-changing RPCs:

- accept a client-generated operation ID;
- enforce uniqueness with the business write;
- return the previous result for a duplicate;
- expose operation status where useful;
- use an outbox for external messages;
- make retries use the same operation ID.

Cancellation protects resources. Idempotency protects correctness.

## Model Durable Jobs Explicitly

Sometimes work should survive the caller:

```protobuf
rpc StartExport(StartExportRequest) returns (Operation);
rpc GetOperation(GetOperationRequest) returns (Operation);
```

The start method durably records the job and returns promptly. A worker runs it under a job-owned context, lease, and deadline. Client cancellation stops waiting for acceptance; it does not silently redefine the accepted job's lifecycle.

Do not turn every unary RPC into a hidden background job by launching a goroutine with `context.Background()`.

## Test Cancellation

Use a fake dependency that blocks until canceled:

```go
type BlockingRepository struct {
	stopped chan struct{}
}

func (r *BlockingRepository) ListDocuments(
	ctx context.Context,
	indexID string,
) ([]Document, error) {
	<-ctx.Done()
	close(r.stopped)
	return nil, ctx.Err()
}
```

The test should:

1. create a context with a short deadline or a cancel function;
2. invoke the handler in a goroutine;
3. call the cancel function, or let the deadline expire;
4. wait for the handler to return;
5. assert that the dependency observed cancellation;
6. check that request-owned goroutines and resources returned to baseline.

Also integration-test a real driver and downstream gRPC service. A fake proves propagation in your code, not the cancellation behavior of external libraries.

## Observe Cancellation as a Lifecycle

Record:

- deadline remaining at handler entry;
- cancellation reason;
- time from cancellation to handler return;
- time for child RPCs and database calls to stop;
- work units completed after cancellation;
- goroutine, thread, and pool-resource counts;
- commits that occurred near or after client expiry;
- retry attempts tied to the same operation ID.

Alert when cancellation-to-stop latency grows or canceled calls continue consuming a meaningful share of CPU and database time.

## Implementation Checklist

1. Pass the handler context into every request-scoped function.
2. Use context-aware database, HTTP, and gRPC APIs.
3. Check cancellation inside CPU loops and custom queues.
4. Derive child contexts from the parent, never from a background context.
5. Coordinate and wait for child goroutines.
6. Close rows, files, and pooled resources on every exit, and terminate server streams by returning from the handler.
7. Return on stream send errors and non-`io.EOF` receive errors; handle `io.EOF` as a normal half-close.
8. Protect irreversible writes with idempotency.
9. Give durable jobs an explicit operation API and lifecycle.
10. Test and measure how quickly real dependencies stop.

Deadline cancellation is cooperative control flow. It works only when every layer preserves the signal and owns the cleanup needed to return capacity to the next request.

## Official Documentation

- [gRPC cancellation guide](https://grpc.io/docs/guides/cancellation/)
- [gRPC deadlines and propagation](https://grpc.io/docs/guides/deadlines/)
- [gRPC Go generated-code reference](https://grpc.io/docs/languages/go/generated-code/)
- [Go context package](https://pkg.go.dev/context)
- [Go database/sql context-aware APIs](https://pkg.go.dev/database/sql)
- [gRPC-Go status package](https://pkg.go.dev/google.golang.org/grpc/status)
