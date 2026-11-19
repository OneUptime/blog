# How to Prevent Concurrent C++ gRPC Writes from Triggering Too Many Operations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: gRPC, C++, Concurrency, Streaming

Description: Fix overlapping C++ gRPC stream writes by waiting for write completion, preserving message lifetime, and giving producers one output owner.

`too many operations` or a related C++ gRPC assertion can appear when two producers write to the same stream. A particularly subtle version occurs even with a mutex: the mutex protects calls to `StartWrite()`, but the first asynchronous write is still active when the second call begins.

Serialize completion, not just invocation. There may be one read and one write in flight, but not two writes on the same stream. That requirement applies across the streaming APIs; the completion signal differs between callback and completion-queue code.

## Recognize the insufficient lock

This is not enough for a callback reactor:

```cpp
// Incorrect: the first write can still be in flight after this lock releases.
std::lock_guard<std::mutex> lock(mu);
StartWrite(&message);
```

`StartWrite()` initiates asynchronous work. Its return does not mean gRPC has finished using `message`. Starting the next write immediately, modifying the message, or destroying a local variable can violate separate operation and lifetime requirements.

## Chain a finite sequence through completion

This reactor illustrates the ordering with a prebuilt batch. It assumes `Reply` is your generated protobuf response type and is created by the corresponding generated callback service method.

```cpp
#include <grpcpp/grpcpp.h>
#include <utility>
#include <vector>

class OrderedReplies final : public grpc::ServerWriteReactor<Reply> {
 public:
  explicit OrderedReplies(std::vector<Reply> replies)
      : replies_(std::move(replies)) {
    if (replies_.empty()) {
      Finish(grpc::Status::OK);
    } else {
      StartWrite(&replies_[0]);
    }
  }

  void OnWriteDone(bool ok) override {
    if (!ok) {
      Finish(grpc::Status(grpc::StatusCode::CANCELLED,
                          "stream write failed"));
      return;
    }
    ++next_;
    if (next_ == replies_.size()) {
      Finish(grpc::Status::OK);
    } else {
      StartWrite(&replies_[next_]);
    }
  }

  void OnDone() override { delete this; }

 private:
  std::vector<Reply> replies_;
  std::size_t next_ = 0;
};
```

The vector is owned by the reactor and is never resized or modified while writes are active. The next write starts only from the previous write's completion reaction. `OnDone()` performs final deletion; the service must not also delete the returned reactor.

This finite example does not support external producers or a large unbounded backlog. Its purpose is to expose the operation lifetime. The [callback tutorial](https://grpc.io/docs/languages/cpp/callback/) shows how reactors connect to generated service methods.

## Give concurrent producers a queue

For a live stream, producers should offer owned messages to a bounded queue. One output owner keeps a stable in-flight message and a `write_pending` flag. It sets that flag before starting a write and clears it only on completion. Queue insertion and completion both trigger a drain decision.

Protect cancellation and finish state with the same ownership model. Once finishing starts, reject new offers and prevent later producer callbacks from touching the reactor. Most reactions may run concurrently, so a state field updated by cancellation needs synchronization even when writes themselves are sequential.

Do not block `OnWriteDone()` waiting for the next producer. Return and let a later offer wake the drain path. Keep message storage alive through the completion reaction, including error completion.

## Translate the rule to other C++ APIs

With a completion queue, wait for the active write's completion tag before issuing another write. Keep distinct operation tags and interpret their `ok` values correctly. With synchronous streaming, use a single writer; a separate reader may progress concurrently, but multiple concurrent writers remain invalid.

Avoid mixing callback and completion-queue examples mechanically. Their state machines share the one-write rule but have different notification and cleanup mechanisms.

## Confirm the real cause

Log a per-stream write sequence and transitions between idle and pending. An assertion that `write_pending` is false before every initiation can expose the overlap near its source.

Test two simultaneous producers, a slow reader, cancellation during a write, and producer completion while the queue is nonempty. Other API misuse can also produce operation errors, so compare the failing operation and library diagnostics before assuming every assertion is this race.

## Conclusion

A lock around `StartWrite()` is only part of the solution. Keep one write active until its completion arrives, retain its message, and route concurrent producers through one bounded output owner.

## Official Documentation

- [C++ streaming operation and reaction rules](https://grpc.io/docs/languages/cpp/best_practices/)
- [C++ callback service tutorial](https://grpc.io/docs/languages/cpp/callback/)
- [ServerWriteReactor write API](https://grpc.github.io/grpc/cpp/classgrpc_1_1_server_write_reactor.html)
