# How to Handle Memory Leaks in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Memory Leaks, Debugging, tracemalloc, objgraph, Performance, Garbage Collection

Description: Learn how to identify, debug, and fix memory leaks in Python applications using tracemalloc, objgraph, and garbage collector debugging. This guide covers common leak patterns and production-safe debugging techniques.

---

> Memory leaks in Python are subtle. Unlike C, Python has garbage collection, so you don't expect leaks. But they happen - circular references, cached objects that never expire, closures holding references, event handlers that aren't removed. This guide shows you how to find and fix them.

A memory leak doesn't mean memory is truly lost; it means your program holds references to objects it no longer needs, preventing garbage collection. Over time, memory usage grows until your container gets OOMKilled.

---

## Understanding Python Memory Management

Python uses reference counting plus a cyclic garbage collector:

```python
# Reference counting
x = [1, 2, 3]  # refcount = 1
y = x          # refcount = 2
del x          # refcount = 1
del y          # refcount = 0, memory freed

# Circular references need GC
class Node:
    def __init__(self):
        self.parent = None
        self.children = []

a = Node()
b = Node()
a.children.append(b)  # a -> b
b.parent = a          # b -> a (circular!)
# Reference counting can't free this, GC handles it
```

---

## Detecting Memory Leaks

### Using tracemalloc

Python's built-in memory tracer:

```python
# tracemalloc_basic.py
import tracemalloc

def detect_leak():
    """Basic memory leak detection"""

    # Start tracing
    tracemalloc.start()

    # Take a snapshot before suspicious code
    snapshot1 = tracemalloc.take_snapshot()

    # Run code that might leak
    leaked_data = []
    for i in range(10000):
        leaked_data.append({'key': f'value_{i}' * 100})

    # Take snapshot after
    snapshot2 = tracemalloc.take_snapshot()

    # Compare snapshots
    top_stats = snapshot2.compare_to(snapshot1, 'lineno')

    print("Top memory allocations:")
    for stat in top_stats[:10]:
        print(stat)

    tracemalloc.stop()

if __name__ == "__main__":
    detect_leak()
```

### Continuous Memory Monitoring

```python
# memory_monitor.py
import tracemalloc
import gc
import logging
from datetime import datetime
from typing import Optional, List, Tuple
import threading
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MemoryMonitor:
    """Monitor memory usage and detect leaks"""

    def __init__(self, warn_threshold_mb: float = 100, interval: float = 60):
        self.warn_threshold = warn_threshold_mb * 1024 * 1024
        self.interval = interval
        self._snapshots: List[Tuple[datetime, any]] = []
        self._running = False
        self._thread: Optional[threading.Thread] = None

    def start(self):
        """Start monitoring"""
        tracemalloc.start(25)  # Store 25 frames for traceback
        self._running = True
        self._thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self._thread.start()
        logger.info("Memory monitoring started")

    def stop(self):
        """Stop monitoring"""
        self._running = False
        if self._thread:
            self._thread.join()
        tracemalloc.stop()
        logger.info("Memory monitoring stopped")

    def _monitor_loop(self):
        """Background monitoring loop"""
        while self._running:
            self._check_memory()
            time.sleep(self.interval)

    def _check_memory(self):
        """Check current memory usage"""
        current, peak = tracemalloc.get_traced_memory()

        logger.info(
            f"Memory: current={current / 1024 / 1024:.2f}MB, "
            f"peak={peak / 1024 / 1024:.2f}MB"
        )

        if current > self.warn_threshold:
            logger.warning(
                f"Memory usage exceeds threshold: "
                f"{current / 1024 / 1024:.2f}MB > "
                f"{self.warn_threshold / 1024 / 1024:.2f}MB"
            )
            self._dump_top_allocations()

    def _dump_top_allocations(self):
        """Log top memory allocations"""
        snapshot = tracemalloc.take_snapshot()
        top_stats = snapshot.statistics('lineno')

        logger.warning("Top 10 memory allocations:")
        for stat in top_stats[:10]:
            logger.warning(str(stat))

    def take_snapshot(self, label: str = ""):
        """Take a labeled snapshot for comparison"""
        snapshot = tracemalloc.take_snapshot()
        self._snapshots.append((datetime.now(), label, snapshot))
        logger.info(f"Snapshot taken: {label}")

    def compare_snapshots(self, index1: int = -2, index2: int = -1):
        """Compare two snapshots"""
        if len(self._snapshots) < 2:
            logger.warning("Need at least 2 snapshots to compare")
            return

        _, label1, snap1 = self._snapshots[index1]
        _, label2, snap2 = self._snapshots[index2]

        diff = snap2.compare_to(snap1, 'lineno')

        logger.info(f"Memory diff between '{label1}' and '{label2}':")
        for stat in diff[:10]:
            logger.info(str(stat))


# Usage
monitor = MemoryMonitor(warn_threshold_mb=500)
monitor.start()

# Your application runs here
# Take snapshots at key points
monitor.take_snapshot("after_startup")
# ... run some operations ...
monitor.take_snapshot("after_batch_job")
monitor.compare_snapshots()
```

---

## Using objgraph

objgraph helps visualize object references:

```bash
pip install objgraph graphviz
```

```python
# objgraph_debug.py
import objgraph
import gc

class Connection:
    """Example class that might leak"""
    _registry = []  # Class-level list holding references

    def __init__(self, name):
        self.name = name
        Connection._registry.append(self)  # Leak!

def find_leaks():
    """Find memory leaks using objgraph"""

    # Create some objects
    for i in range(100):
        conn = Connection(f"conn_{i}")

    # Force garbage collection
    gc.collect()

    # Show most common types
    print("Most common types:")
    objgraph.show_most_common_types(limit=10)

    # Show growth since last call
    print("\nNew objects since last check:")
    objgraph.show_growth(limit=10)

    # Find specific objects
    connections = objgraph.by_type('Connection')
    print(f"\nConnection objects: {len(connections)}")

    # Show what's holding references to an object
    if connections:
        print("\nBackrefs to first Connection:")
        objgraph.show_backrefs(
            connections[0],
            max_depth=3,
            filename='connection_backrefs.png'
        )

def visualize_references():
    """Create reference graph visualization"""
    # Find objects
    leaky_objects = objgraph.by_type('Connection')[:3]

    # Show what these objects reference
    objgraph.show_refs(
        leaky_objects,
        max_depth=2,
        filename='refs_from_objects.png'
    )

    # Show what references these objects
    objgraph.show_backrefs(
        leaky_objects,
        max_depth=3,
        too_many=50,
        filename='refs_to_objects.png'
    )

if __name__ == "__main__":
    find_leaks()
```

---

## Common Memory Leak Patterns

### Pattern 1: Unbounded Caches

```python
# leak_cache.py
from functools import lru_cache
from typing import Dict, Any
import time

# BAD: Unbounded cache
_cache: Dict[str, Any] = {}

def bad_cached_fetch(key: str):
    """This cache grows forever"""
    if key not in _cache:
        _cache[key] = fetch_from_database(key)
    return _cache[key]

# GOOD: LRU cache with size limit
@lru_cache(maxsize=1000)
def good_cached_fetch(key: str):
    """Cache limited to 1000 entries"""
    return fetch_from_database(key)

# BETTER: TTL cache with automatic expiration
class TTLCache:
    """Cache with time-to-live expiration"""

    def __init__(self, ttl_seconds: int = 300, max_size: int = 1000):
        self._cache: Dict[str, tuple] = {}
        self._ttl = ttl_seconds
        self._max_size = max_size

    def get(self, key: str):
        if key in self._cache:
            value, timestamp = self._cache[key]
            if time.time() - timestamp < self._ttl:
                return value
            del self._cache[key]
        return None

    def set(self, key: str, value: Any):
        # Enforce max size
        if len(self._cache) >= self._max_size:
            self._evict_oldest()
        self._cache[key] = (value, time.time())

    def _evict_oldest(self):
        """Remove oldest entries"""
        if not self._cache:
            return
        oldest_key = min(self._cache, key=lambda k: self._cache[k][1])
        del self._cache[oldest_key]
```

### Pattern 2: Event Handler Leaks

```python
# leak_events.py
from typing import Callable, List
import weakref

# BAD: Strong references to handlers
class BadEventEmitter:
    def __init__(self):
        self._handlers: List[Callable] = []

    def on(self, handler: Callable):
        self._handlers.append(handler)  # Strong reference

    def emit(self, *args):
        for handler in self._handlers:
            handler(*args)

# Objects that register handlers but don't unregister will leak
class LeakySubscriber:
    def __init__(self, emitter: BadEventEmitter):
        emitter.on(self.handle_event)  # Self stays alive forever!

    def handle_event(self, *args):
        print(f"Handled: {args}")


# GOOD: Weak references to handlers
class GoodEventEmitter:
    def __init__(self):
        self._handlers: List[weakref.ref] = []

    def on(self, handler: Callable):
        self._handlers.append(weakref.ref(handler))

    def emit(self, *args):
        # Clean up dead references while iterating
        live_handlers = []
        for ref in self._handlers:
            handler = ref()
            if handler is not None:
                handler(*args)
                live_handlers.append(ref)
        self._handlers = live_handlers

# BETTER: Explicit subscription management
class BetterEventEmitter:
    def __init__(self):
        self._handlers: dict = {}
        self._next_id = 0

    def on(self, handler: Callable) -> int:
        """Returns subscription ID for unsubscription"""
        sub_id = self._next_id
        self._next_id += 1
        self._handlers[sub_id] = handler
        return sub_id

    def off(self, sub_id: int):
        """Unsubscribe by ID"""
        self._handlers.pop(sub_id, None)

    def emit(self, *args):
        for handler in self._handlers.values():
            handler(*args)
```

### Pattern 3: Closure Leaks

```python
# leak_closures.py
import gc

# BAD: Closure captures large data
def bad_create_processor(large_data: list):
    """Closure keeps large_data alive"""
    def process(item):
        # Only uses item, but large_data is captured
        return item * 2
    return process

# large_data stays in memory as long as process exists
large_data = list(range(1000000))
processor = bad_create_processor(large_data)
del large_data  # Doesn't free memory! Closure holds reference


# GOOD: Only capture what you need
def good_create_processor(large_data: list):
    """Extract needed data before creating closure"""
    data_length = len(large_data)  # Only keep what we need

    def process(item):
        return item * 2  # No reference to large_data
    return process


# BETTER: Use class with explicit cleanup
class DataProcessor:
    def __init__(self, data: list):
        self._precomputed = self._precompute(data)
        # Don't store data itself

    def _precompute(self, data: list):
        return sum(data)

    def process(self, item):
        return item * 2
```

### Pattern 4: Circular References

```python
# leak_circular.py
import gc
import weakref

# BAD: Circular reference
class Parent:
    def __init__(self):
        self.children = []

    def add_child(self, child):
        self.children.append(child)
        child.parent = self  # Circular!

class Child:
    def __init__(self):
        self.parent = None


# GOOD: Use weakref for back-references
class BetterParent:
    def __init__(self):
        self.children = []

    def add_child(self, child):
        self.children.append(child)
        child._parent_ref = weakref.ref(self)  # Weak reference

class BetterChild:
    def __init__(self):
        self._parent_ref = None

    @property
    def parent(self):
        if self._parent_ref:
            return self._parent_ref()
        return None


# Testing circular reference cleanup
def test_cleanup():
    gc.collect()
    before = len(gc.get_objects())

    # Create circular structure
    parent = Parent()
    for i in range(100):
        child = Child()
        parent.add_child(child)

    del parent
    gc.collect()

    after = len(gc.get_objects())
    print(f"Objects before: {before}, after: {after}")
```

### Pattern 5: Thread Local Leaks

```python
# leak_threadlocal.py
import threading
from concurrent.futures import ThreadPoolExecutor
import gc

# BAD: Thread locals in thread pools
_thread_local = threading.local()

def bad_process_request(request_id):
    """Thread local data accumulates in pooled threads"""
    if not hasattr(_thread_local, 'history'):
        _thread_local.history = []
    _thread_local.history.append(request_id)  # Grows forever!
    return len(_thread_local.history)


# GOOD: Clean up thread locals
def good_process_request(request_id):
    """Clean up after each request"""
    try:
        _thread_local.request_id = request_id
        return process(request_id)
    finally:
        # Clean up
        if hasattr(_thread_local, 'request_id'):
            del _thread_local.request_id


# BETTER: Use context variables (Python 3.7+)
from contextvars import ContextVar

request_id_var: ContextVar[str] = ContextVar('request_id')

def better_process_request(request_id):
    """Context vars are automatically cleaned up"""
    token = request_id_var.set(request_id)
    try:
        return process(request_id)
    finally:
        request_id_var.reset(token)
```

---

## Garbage Collector Debugging

### Inspecting the GC

```python
# gc_debug.py
import gc
import sys

def debug_gc():
    """Debug garbage collector behavior"""

    # Enable GC debugging
    gc.set_debug(gc.DEBUG_STATS | gc.DEBUG_LEAK)

    # Get GC thresholds
    thresholds = gc.get_threshold()
    print(f"GC thresholds: {thresholds}")

    # Get current counts
    counts = gc.get_count()
    print(f"GC counts: {counts}")

    # Force collection
    collected = gc.collect()
    print(f"Collected {collected} objects")

    # Find uncollectable objects (usually circular references with __del__)
    print(f"Uncollectable objects: {gc.garbage}")

def find_reference_cycles():
    """Find objects involved in reference cycles"""
    gc.collect()

    # Get all objects
    all_objects = gc.get_objects()
    print(f"Total tracked objects: {len(all_objects)}")

    # Find objects with referrers
    cycles = []
    for obj in all_objects:
        referrers = gc.get_referrers(obj)
        if len(referrers) > 1:  # Has multiple referrers
            cycles.append((type(obj).__name__, len(referrers)))

    # Show types with most referrers
    from collections import Counter
    type_counts = Counter(t for t, _ in cycles)
    print("Types with multiple referrers:")
    for type_name, count in type_counts.most_common(10):
        print(f"  {type_name}: {count}")

def get_object_size(obj):
    """Get approximate size of object and its references"""
    seen = set()
    size = 0

    def sizeof_recursive(obj):
        nonlocal size
        obj_id = id(obj)
        if obj_id in seen:
            return
        seen.add(obj_id)
        size += sys.getsizeof(obj)

        if isinstance(obj, dict):
            for k, v in obj.items():
                sizeof_recursive(k)
                sizeof_recursive(v)
        elif hasattr(obj, '__dict__'):
            sizeof_recursive(obj.__dict__)
        elif hasattr(obj, '__iter__') and not isinstance(obj, (str, bytes)):
            for item in obj:
                sizeof_recursive(item)

    sizeof_recursive(obj)
    return size
```

### Forcing Garbage Collection

```python
# gc_control.py
import gc
import time
import logging

logger = logging.getLogger(__name__)

class GCController:
    """Control garbage collection behavior"""

    def __init__(self):
        self._original_threshold = gc.get_threshold()

    def disable_gc(self):
        """Disable automatic GC (for performance-critical sections)"""
        gc.disable()
        logger.info("GC disabled")

    def enable_gc(self):
        """Re-enable automatic GC"""
        gc.enable()
        logger.info("GC enabled")

    def collect_now(self):
        """Force full garbage collection"""
        start = time.time()

        # Collect all generations
        gen0 = gc.collect(0)
        gen1 = gc.collect(1)
        gen2 = gc.collect(2)

        duration = time.time() - start
        logger.info(
            f"GC collected: gen0={gen0}, gen1={gen1}, gen2={gen2} "
            f"in {duration*1000:.2f}ms"
        )

        return gen0 + gen1 + gen2

    def set_aggressive_gc(self):
        """Configure GC for memory-constrained environments"""
        # Lower thresholds = more frequent GC
        gc.set_threshold(100, 5, 5)
        logger.info("Set aggressive GC thresholds")

    def set_relaxed_gc(self):
        """Configure GC for performance (may use more memory)"""
        # Higher thresholds = less frequent GC
        gc.set_threshold(50000, 500, 100)
        logger.info("Set relaxed GC thresholds")

    def restore_defaults(self):
        """Restore original GC settings"""
        gc.set_threshold(*self._original_threshold)
        logger.info(f"Restored GC thresholds: {self._original_threshold}")
```

---

## Production Memory Monitoring

### Memory Metrics for Prometheus

```python
# memory_metrics.py
import gc
import os
import psutil
from prometheus_client import Gauge, Counter
import tracemalloc

# Metrics
process_memory_bytes = Gauge(
    'process_memory_bytes',
    'Process memory usage',
    ['type']
)

gc_collections = Counter(
    'gc_collections_total',
    'Garbage collection runs',
    ['generation']
)

gc_collected_objects = Counter(
    'gc_collected_objects_total',
    'Objects collected by GC',
    ['generation']
)

python_objects = Gauge(
    'python_objects_count',
    'Number of tracked Python objects'
)

def collect_memory_metrics():
    """Collect memory metrics for Prometheus"""

    # Process memory from psutil
    process = psutil.Process(os.getpid())
    mem_info = process.memory_info()

    process_memory_bytes.labels(type='rss').set(mem_info.rss)
    process_memory_bytes.labels(type='vms').set(mem_info.vms)

    # Python object counts
    python_objects.set(len(gc.get_objects()))

    # tracemalloc metrics if running
    if tracemalloc.is_tracing():
        current, peak = tracemalloc.get_traced_memory()
        process_memory_bytes.labels(type='tracemalloc_current').set(current)
        process_memory_bytes.labels(type='tracemalloc_peak').set(peak)

class GCMetricsCallback:
    """Callback to track GC statistics"""

    def __init__(self):
        self._last_stats = gc.get_stats()

    def collect(self):
        """Collect GC metrics"""
        stats = gc.get_stats()

        for i, (current, last) in enumerate(zip(stats, self._last_stats)):
            collections_diff = current['collections'] - last['collections']
            collected_diff = current['collected'] - last['collected']

            if collections_diff > 0:
                gc_collections.labels(generation=str(i)).inc(collections_diff)
            if collected_diff > 0:
                gc_collected_objects.labels(generation=str(i)).inc(collected_diff)

        self._last_stats = stats
```

### Memory Leak Detection Service

```python
# leak_detector_service.py
import tracemalloc
import logging
import asyncio
from datetime import datetime
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

class LeakDetectorService:
    """Background service for detecting memory leaks"""

    def __init__(
        self,
        check_interval: int = 300,  # 5 minutes
        growth_threshold_mb: float = 50,
        snapshot_count: int = 10
    ):
        self.check_interval = check_interval
        self.growth_threshold = growth_threshold_mb * 1024 * 1024
        self.snapshot_count = snapshot_count
        self._snapshots: List[Dict] = []
        self._running = False

    async def start(self):
        """Start the leak detector"""
        tracemalloc.start(10)
        self._running = True
        logger.info("Leak detector started")

        while self._running:
            await self._check_for_leaks()
            await asyncio.sleep(self.check_interval)

    def stop(self):
        """Stop the leak detector"""
        self._running = False
        tracemalloc.stop()
        logger.info("Leak detector stopped")

    async def _check_for_leaks(self):
        """Check for memory growth"""
        snapshot = tracemalloc.take_snapshot()
        current, peak = tracemalloc.get_traced_memory()

        snapshot_data = {
            'timestamp': datetime.now(),
            'snapshot': snapshot,
            'current': current,
            'peak': peak
        }

        self._snapshots.append(snapshot_data)

        # Keep only recent snapshots
        if len(self._snapshots) > self.snapshot_count:
            self._snapshots.pop(0)

        # Check for consistent growth
        if len(self._snapshots) >= 3:
            await self._analyze_growth()

    async def _analyze_growth(self):
        """Analyze memory growth trend"""
        recent = self._snapshots[-3:]
        memory_values = [s['current'] for s in recent]

        # Check if memory is consistently growing
        is_growing = all(
            memory_values[i] < memory_values[i+1]
            for i in range(len(memory_values)-1)
        )

        growth = memory_values[-1] - memory_values[0]

        if is_growing and growth > self.growth_threshold:
            logger.warning(
                f"Potential memory leak detected! "
                f"Growth: {growth / 1024 / 1024:.2f}MB over "
                f"{len(recent)} checks"
            )

            # Log top allocations
            await self._log_top_allocations()

    async def _log_top_allocations(self):
        """Log the top memory allocations"""
        if len(self._snapshots) < 2:
            return

        old_snapshot = self._snapshots[0]['snapshot']
        new_snapshot = self._snapshots[-1]['snapshot']

        diff = new_snapshot.compare_to(old_snapshot, 'lineno')

        logger.warning("Top memory growth locations:")
        for stat in diff[:10]:
            logger.warning(f"  {stat}")
```

---

## Fixing Memory Leaks

### Checklist for Memory Leak Investigation

1. **Enable tracemalloc** - Track where memory is allocated
2. **Take snapshots** - Before and after suspicious operations
3. **Compare snapshots** - Find what's growing
4. **Use objgraph** - Visualize object references
5. **Check for common patterns**:
   - Unbounded caches/lists
   - Event handlers not removed
   - Circular references
   - Thread locals in pools
   - Global state accumulation

### Example: Fixing a Real Leak

```python
# leak_fix_example.py
import weakref
from typing import Dict, Optional, Callable
import time

# BEFORE: Leaking implementation
class LeakingRequestHandler:
    _active_requests: Dict[str, 'LeakingRequestHandler'] = {}  # Class-level!

    def __init__(self, request_id: str):
        self.request_id = request_id
        self.data = bytearray(1024 * 1024)  # 1MB per request
        self._callbacks = []

        # Leak 1: Never removed from class dict
        LeakingRequestHandler._active_requests[request_id] = self

    def on_complete(self, callback: Callable):
        # Leak 2: Callback might reference self
        self._callbacks.append(callback)

    def process(self):
        # ... processing ...
        for cb in self._callbacks:
            cb(self)


# AFTER: Fixed implementation
class FixedRequestHandler:
    _active_requests: Dict[str, weakref.ref] = {}  # Weak references

    def __init__(self, request_id: str):
        self.request_id = request_id
        self.data = bytearray(1024 * 1024)
        self._callbacks: list = []

        # Fix 1: Use weak reference
        FixedRequestHandler._active_requests[request_id] = weakref.ref(
            self,
            lambda ref: FixedRequestHandler._active_requests.pop(request_id, None)
        )

    def on_complete(self, callback: Callable):
        # Fix 2: Store weak reference to callback if it's a bound method
        if hasattr(callback, '__self__'):
            self._callbacks.append(weakref.WeakMethod(callback))
        else:
            self._callbacks.append(weakref.ref(callback))

    def process(self):
        # ... processing ...
        for cb_ref in self._callbacks:
            cb = cb_ref()
            if cb is not None:
                cb(self)

    def cleanup(self):
        """Explicit cleanup"""
        self._callbacks.clear()
        self.data = None

    def __del__(self):
        self.cleanup()
```

---

## Best Practices

1. **Use context managers** for resources
2. **Prefer weak references** for caches and callbacks
3. **Set size limits** on caches
4. **Clean up** thread locals in thread pools
5. **Monitor memory** in production
6. **Profile regularly** during development
7. **Avoid __del__** methods (interferes with GC)

---

## Conclusion

Memory leaks in Python are usually about holding references too long, not about forgetting to free memory. Key tools:

- **tracemalloc**: Track allocations and compare snapshots
- **objgraph**: Visualize object references
- **gc module**: Debug garbage collector behavior
- **Weak references**: Break reference cycles

Regular memory profiling catches leaks before they cause production issues.

---

*Need to monitor memory usage in production? [OneUptime](https://oneuptime.com) provides infrastructure monitoring with memory tracking, alerts, and historical analysis to catch memory issues early.*

**Related Reading:**
- [How to Profile Python Applications with cProfile and py-spy](https://oneuptime.com/blog/post/2025-01-06-profile-python-cprofile-pyspy/view)
