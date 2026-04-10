# How to Use Async Communication with librados

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, librados, Async, Performance

Description: Learn how to use librados asynchronous I/O operations with completion callbacks to achieve higher throughput by pipelining multiple object operations.

---

librados supports asynchronous I/O that allows multiple operations to be in-flight simultaneously. By using async operations with completions, applications can achieve far higher throughput than sequential synchronous calls, especially across high-latency network paths.

## Why Async Matters

Synchronous operations serialize each request-response cycle:

```text
Write A --> Wait --> Write B --> Wait --> Write C --> Wait
Total time = 3 * (write_time + network_RTT)
```

Async operations pipeline multiple requests:

```text
Write A --> Write B --> Write C --> Wait for all
Total time ≈ max(write_time) + 1 * network_RTT
```

## Async Operations in Python

```python
import rados

with rados.Rados(conffile="/etc/ceph/ceph.conf") as cluster:
    with cluster.open_ioctx("mypool") as ioctx:
        completions = []

        # Submit 10 async writes simultaneously
        for i in range(10):
            obj_name = f"async-obj-{i}"
            data = f"Data for object {i}".encode()

            comp = ioctx.aio_write_full(
                obj_name,
                data,
                oncomplete=lambda c, _name=obj_name: print(f"Write complete for object: {_name}"),
                onsafe=None
            )
            completions.append(comp)

        # Wait for all completions
        for comp in completions:
            comp.wait_for_complete_and_cb()
            if comp.get_return_value() != 0:
                print(f"Write failed: {comp.get_return_value()}")

        print("All async writes complete")
```

## Async Reads in Python

```python
read_results = {}

def on_read_complete(completion, data, name):
    if completion.get_return_value() > 0:
        read_results[name] = data

with rados.Rados(conffile="/etc/ceph/ceph.conf") as cluster:
    with cluster.open_ioctx("mypool") as ioctx:
        completions = []
        for i in range(10):
            name = f"async-obj-{i}"
            comp = ioctx.aio_read(
                name,
                256,
                0,
                oncomplete=lambda c, d, _n=name: on_read_complete(c, d, _n)
            )
            completions.append(comp)

        for comp in completions:
            comp.wait_for_complete_and_cb()
```

## Async Operations in C

```c
#include <rados/librados.h>

void write_callback(rados_completion_t comp, void *arg) {
    printf("Async write complete for: %s\n", (char *)arg);
}

/* In main: */
rados_completion_t comp;
rados_aio_create_completion(
    "myobj",          /* user arg */
    write_callback,   /* oncomplete callback */
    NULL,             /* onsafe callback */
    &comp
);

rados_aio_write_full(io, "myobj", comp, "Hello async!", 12);

/* Do other work here */

rados_aio_wait_for_complete(comp);
rados_aio_release(comp);
```

## Throttling In-Flight Operations

For large batches, limit concurrent operations to avoid overwhelming the cluster:

```python
MAX_IN_FLIGHT = 50

with rados.Rados(conffile="/etc/ceph/ceph.conf") as cluster:
    with cluster.open_ioctx("mypool") as ioctx:
        in_flight = []

        for i in range(1000):
            # Throttle: wait if too many in flight
            while len(in_flight) >= MAX_IN_FLIGHT:
                in_flight[0].wait_for_complete_and_cb()
                in_flight.pop(0)

            comp = ioctx.aio_write_full(f"obj-{i}", f"data-{i}".encode())
            in_flight.append(comp)

        # Drain remaining
        for comp in in_flight:
            comp.wait_for_complete_and_cb()
```

## Summary

librados async I/O uses completion objects to pipeline multiple operations simultaneously, dramatically improving throughput compared to sequential synchronous calls. Python uses `aio_write_full` and `aio_read` with callback functions and `wait_for_complete_and_cb()`, while C uses `rados_aio_create_completion` and `rados_aio_write_full`. Throttling in-flight operations with a maximum concurrency limit prevents overwhelming the cluster while maintaining high pipeline depth.
