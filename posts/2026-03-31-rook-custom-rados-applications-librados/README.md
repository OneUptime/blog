# How to Create Custom RADOS Applications with librados

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, librados, Application Development, RADOS

Description: Learn how to design and build a complete custom RADOS application using librados, combining object storage, metadata management, and distributed coordination.

---

Building a custom RADOS application means designing your data model directly on top of Ceph's object store, taking advantage of RADOS primitives like omap, xattrs, object classes, and watch/notify. This guide walks through building a simple distributed task queue as a practical example.

## Application Design Principles

When building on RADOS, apply these design principles:

1. **Objects as records** - Each task, message, or entity is a RADOS object
2. **Omap for indexes** - Use omap key-value stores for sorted lookups and queues
3. **Xattrs for metadata** - Store per-object metadata as extended attributes
4. **Atomic operations** - Use compare-and-swap for distributed coordination

## Example: Distributed Task Queue

A task queue where producers submit tasks and consumers claim and complete them:

```python
import rados
import json
import time
import uuid

class RADOSTaskQueue:
    def __init__(self, conf, pool):
        self.conf = conf
        self.pool = pool

    def _get_ioctx(self, cluster):
        return cluster.open_ioctx(self.pool)

    def submit_task(self, task_type, payload):
        task_id = str(uuid.uuid4())
        task_data = json.dumps({
            "id": task_id,
            "type": task_type,
            "payload": payload,
            "status": "pending",
            "created": time.time()
        }).encode()

        with rados.Rados(conffile=self.conf) as cluster:
            with self._get_ioctx(cluster) as ioctx:
                # Write task object
                ioctx.write_full(f"task:{task_id}", task_data)

                # Set status xattr
                ioctx.set_xattr(f"task:{task_id}", "status", b"pending")

                # Add to pending queue index via omap on a queue object
                with rados.WriteOpCtx() as write_op:
                    ioctx.set_omap(write_op,
                        (f"{time.time()}:{task_id}",),
                        (task_id.encode(),))
                    ioctx.operate_write_op(write_op, "queue:pending")

        return task_id

    def claim_task(self):
        with rados.Rados(conffile=self.conf) as cluster:
            with self._get_ioctx(cluster) as ioctx:
                # Read first entry from pending queue
                with rados.ReadOpCtx() as read_op:
                    omap_iter, ret = ioctx.get_omap_vals(
                        read_op, "", "", 1)
                    ioctx.operate_read_op(read_op, "queue:pending")
                    items = list(omap_iter)

                if not items:
                    return None

                queue_key, task_id_bytes = items[0]
                task_id = task_id_bytes.decode()

                # Read task data
                raw = ioctx.read(f"task:{task_id}")
                task = json.loads(raw)
                task["status"] = "running"
                task["claimed"] = time.time()

                # Update task status atomically
                ioctx.write_full(
                    f"task:{task_id}",
                    json.dumps(task).encode()
                )
                ioctx.set_xattr(f"task:{task_id}", "status", b"running")

                # Remove from pending, add to running
                with rados.WriteOpCtx() as write_op:
                    ioctx.remove_omap_keys(write_op, (queue_key,))
                    ioctx.operate_write_op(write_op, "queue:pending")
                with rados.WriteOpCtx() as write_op:
                    ioctx.set_omap(write_op,
                        (task_id,), (task_id.encode(),))
                    ioctx.operate_write_op(write_op, "queue:running")

                return task

    def complete_task(self, task_id, result):
        with rados.Rados(conffile=self.conf) as cluster:
            with self._get_ioctx(cluster) as ioctx:
                raw = ioctx.read(f"task:{task_id}")
                task = json.loads(raw)
                task["status"] = "done"
                task["result"] = result
                task["completed"] = time.time()

                ioctx.write_full(
                    f"task:{task_id}",
                    json.dumps(task).encode()
                )
                ioctx.set_xattr(f"task:{task_id}", "status", b"done")
                with rados.WriteOpCtx() as write_op:
                    ioctx.remove_omap_keys(write_op, (task_id,))
                    ioctx.operate_write_op(write_op, "queue:running")

# Usage
queue = RADOSTaskQueue("/etc/ceph/ceph.conf", "tasks")
tid = queue.submit_task("resize_image", {"src": "photo.jpg", "width": 800})
print(f"Submitted: {tid}")

task = queue.claim_task()
if task:
    print(f"Processing: {task['id']}")
    queue.complete_task(task["id"], {"output": "photo_800.jpg"})
```

## Watch/Notify for Real-Time Coordination

Use watch/notify to signal consumers when new tasks arrive:

```python
def on_notify(notify_id, notifier_id, watch_id, data):
    print(f"New task notification: {data.decode()}")

# Producer: notify after submitting
ioctx.notify("queue:pending", "new_task", 5000)

# Consumer: watch for notifications
watch = ioctx.watch("queue:pending", on_notify)
```

## Summary

Custom RADOS applications use objects as records, omap for sorted queues and indexes, xattrs for metadata, and watch/notify for real-time coordination. The distributed task queue example demonstrates these patterns in a realistic scenario, showing how to combine RADOS primitives to build reliable distributed systems directly on Ceph without requiring additional middleware.
