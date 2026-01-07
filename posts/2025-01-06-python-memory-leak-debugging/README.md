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

The `tracemalloc` module is Python's built-in memory tracer. It tracks where memory was allocated, making it invaluable for finding leaks by comparing memory state before and after suspicious operations.

```python
# tracemalloc_basic.py
# Basic memory leak detection using tracemalloc
import tracemalloc

def detect_leak():
    """Basic memory leak detection using snapshot comparison"""

    # Start tracing memory allocations (must be called first)
    tracemalloc.start()

    # Take a snapshot BEFORE running suspicious code
    snapshot1 = tracemalloc.take_snapshot()

    # Run code that might leak - this simulates memory growth
    leaked_data = []
    for i in range(10000):
        # Each iteration adds a dict that stays in memory
        leaked_data.append({'key': f'value_{i}' * 100})

    # Take snapshot AFTER - now we can see what was allocated
    snapshot2 = tracemalloc.take_snapshot()

    # Compare snapshots to find what grew
    # 'lineno' groups by source file and line number
    top_stats = snapshot2.compare_to(snapshot1, 'lineno')

    # Show the top 10 locations where memory was allocated
    print("Top memory allocations:")
    for stat in top_stats[:10]:
        print(stat)

    # Stop tracing (frees tracemalloc's internal memory)
    tracemalloc.stop()

if __name__ == "__main__":
    detect_leak()
```

### Continuous Memory Monitoring

This monitor runs in a background thread, periodically checking memory usage and alerting when it exceeds a threshold. Use it in long-running services to catch slow leaks before they cause OOM kills.

```python
# memory_monitor.py
# Continuous memory monitoring for production services
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
    """Monitor memory usage and detect leaks in long-running applications"""

    def __init__(self, warn_threshold_mb: float = 100, interval: float = 60):
        # Convert MB to bytes for comparison
        self.warn_threshold = warn_threshold_mb * 1024 * 1024
        self.interval = interval  # Check interval in seconds
        self._snapshots: List[Tuple[datetime, any]] = []
        self._running = False
        self._thread: Optional[threading.Thread] = None

    def start(self):
        """Start background memory monitoring"""
        # Store 25 stack frames for detailed tracebacks
        tracemalloc.start(25)
        self._running = True
        # Daemon thread dies when main thread exits
        self._thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self._thread.start()
        logger.info("Memory monitoring started")

    def stop(self):
        """Stop monitoring and clean up"""
        self._running = False
        if self._thread:
            self._thread.join()
        tracemalloc.stop()
        logger.info("Memory monitoring stopped")

    def _monitor_loop(self):
        """Background loop that periodically checks memory"""
        while self._running:
            self._check_memory()
            time.sleep(self.interval)

    def _check_memory(self):
        """Check current memory and warn if threshold exceeded"""
        current, peak = tracemalloc.get_traced_memory()

        # Log current status
        logger.info(
            f"Memory: current={current / 1024 / 1024:.2f}MB, "
            f"peak={peak / 1024 / 1024:.2f}MB"
        )

        # Alert if over threshold
        if current > self.warn_threshold:
            logger.warning(
                f"Memory usage exceeds threshold: "
                f"{current / 1024 / 1024:.2f}MB > "
                f"{self.warn_threshold / 1024 / 1024:.2f}MB"
            )
            # Dump allocation info to help diagnose
            self._dump_top_allocations()

    def _dump_top_allocations(self):
        """Log top memory allocations for debugging"""
        snapshot = tracemalloc.take_snapshot()
        top_stats = snapshot.statistics('lineno')

        logger.warning("Top 10 memory allocations:")
        for stat in top_stats[:10]:
            logger.warning(str(stat))

    def take_snapshot(self, label: str = ""):
        """Take a labeled snapshot for later comparison"""
        snapshot = tracemalloc.take_snapshot()
        self._snapshots.append((datetime.now(), label, snapshot))
        logger.info(f"Snapshot taken: {label}")

    def compare_snapshots(self, index1: int = -2, index2: int = -1):
        """Compare two snapshots to find memory growth"""
        if len(self._snapshots) < 2:
            logger.warning("Need at least 2 snapshots to compare")
            return

        _, label1, snap1 = self._snapshots[index1]
        _, label2, snap2 = self._snapshots[index2]

        # Find what grew between snapshots
        diff = snap2.compare_to(snap1, 'lineno')

        logger.info(f"Memory diff between '{label1}' and '{label2}':")
        for stat in diff[:10]:
            logger.info(str(stat))


# Usage example
monitor = MemoryMonitor(warn_threshold_mb=500)
monitor.start()

# Your application runs here
# Take snapshots at key points to track growth
monitor.take_snapshot("after_startup")
# ... run some operations ...
monitor.take_snapshot("after_batch_job")
# Compare to find what grew
monitor.compare_snapshots()
```

---

## Using objgraph

The `objgraph` library visualizes object references, helping you understand why objects aren't being garbage collected. It can generate PNG diagrams showing the reference chain keeping objects alive.

```bash
pip install objgraph graphviz
```

```python
# objgraph_debug.py
# Visualize object references to find memory leaks
import objgraph
import gc

class Connection:
    """Example class that demonstrates a common leak pattern"""
    _registry = []  # Class-level list - objects added here never get GC'd

    def __init__(self, name):
        self.name = name
        # LEAK: Adding to class-level list keeps objects alive forever
        Connection._registry.append(self)

def find_leaks():
    """Find memory leaks using objgraph analysis"""

    # Create objects that leak
    for i in range(100):
        conn = Connection(f"conn_{i}")
        # conn goes out of scope, but stays alive via _registry

    # Force garbage collection - won't help because objects are still referenced
    gc.collect()

    # Show most common object types in memory
    print("Most common types:")
    objgraph.show_most_common_types(limit=10)

    # Show what grew since last show_growth() call - useful for finding leaks
    print("\nNew objects since last check:")
    objgraph.show_growth(limit=10)

    # Find all instances of a specific type
    connections = objgraph.by_type('Connection')
    print(f"\nConnection objects: {len(connections)}")

    # Show what's keeping an object alive (the key to finding leaks!)
    if connections:
        print("\nBackrefs to first Connection:")
        # This generates a PNG showing the reference chain
        objgraph.show_backrefs(
            connections[0],
            max_depth=3,                      # How far to follow references
            filename='connection_backrefs.png'  # Output file
        )

def visualize_references():
    """Create reference graph visualizations for debugging"""
    # Get a sample of leaky objects
    leaky_objects = objgraph.by_type('Connection')[:3]

    # Show what these objects reference (forward references)
    objgraph.show_refs(
        leaky_objects,
        max_depth=2,
        filename='refs_from_objects.png'
    )

    # Show what references these objects (back references) - most useful!
    objgraph.show_backrefs(
        leaky_objects,
        max_depth=3,
        too_many=50,  # Don't show nodes with > 50 referrers
        filename='refs_to_objects.png'
    )

if __name__ == "__main__":
    find_leaks()
```

---

## Common Memory Leak Patterns

### Pattern 1: Unbounded Caches

Caches without size limits are the most common source of memory leaks in Python. Each unique key adds an entry that never gets removed, causing memory to grow indefinitely.

```python
# leak_cache.py
# Demonstrates cache-related memory leaks and fixes
from functools import lru_cache
from typing import Dict, Any
import time

# BAD: Unbounded cache - grows forever with each unique key
_cache: Dict[str, Any] = {}

def bad_cached_fetch(key: str):
    """This cache grows forever - MEMORY LEAK!"""
    if key not in _cache:
        _cache[key] = fetch_from_database(key)
    return _cache[key]

# GOOD: LRU cache with size limit - oldest entries evicted automatically
@lru_cache(maxsize=1000)
def good_cached_fetch(key: str):
    """Cache limited to 1000 entries - uses built-in LRU eviction"""
    return fetch_from_database(key)

# BETTER: TTL cache with automatic expiration AND size limit
class TTLCache:
    """Cache with time-to-live expiration and maximum size"""

    def __init__(self, ttl_seconds: int = 300, max_size: int = 1000):
        self._cache: Dict[str, tuple] = {}  # key -> (value, timestamp)
        self._ttl = ttl_seconds              # How long entries live
        self._max_size = max_size            # Maximum entries allowed

    def get(self, key: str):
        """Get value if exists and not expired"""
        if key in self._cache:
            value, timestamp = self._cache[key]
            if time.time() - timestamp < self._ttl:
                return value  # Cache hit
            del self._cache[key]  # Expired - remove it
        return None  # Cache miss

    def set(self, key: str, value: Any):
        """Store value with current timestamp"""
        # Enforce max size by evicting oldest entry
        if len(self._cache) >= self._max_size:
            self._evict_oldest()
        self._cache[key] = (value, time.time())

    def _evict_oldest(self):
        """Remove the oldest entry to make room"""
        if not self._cache:
            return
        # Find key with oldest timestamp
        oldest_key = min(self._cache, key=lambda k: self._cache[k][1])
        del self._cache[oldest_key]
```

### Pattern 2: Event Handler Leaks

When objects register event handlers (callbacks), the event emitter holds a reference to the handler. If the handler is a bound method (like `self.handle_event`), it keeps the entire object alive.

```python
# leak_events.py
# Event handler memory leak patterns and solutions
from typing import Callable, List
import weakref

# BAD: Strong references to handlers keep subscribers alive
class BadEventEmitter:
    def __init__(self):
        self._handlers: List[Callable] = []

    def on(self, handler: Callable):
        # Strong reference - handler (and its object) can never be GC'd
        self._handlers.append(handler)

    def emit(self, *args):
        for handler in self._handlers:
            handler(*args)

# Objects that register handlers but don't unregister WILL LEAK
class LeakySubscriber:
    def __init__(self, emitter: BadEventEmitter):
        # self.handle_event is a bound method that references self
        # This keeps self alive as long as emitter exists!
        emitter.on(self.handle_event)

    def handle_event(self, *args):
        print(f"Handled: {args}")


# GOOD: Weak references allow handlers to be garbage collected
class GoodEventEmitter:
    def __init__(self):
        self._handlers: List[weakref.ref] = []

    def on(self, handler: Callable):
        # Weak reference - doesn't prevent GC
        self._handlers.append(weakref.ref(handler))

    def emit(self, *args):
        # Clean up dead references while iterating
        live_handlers = []
        for ref in self._handlers:
            handler = ref()  # Dereference - returns None if collected
            if handler is not None:
                handler(*args)
                live_handlers.append(ref)
        self._handlers = live_handlers  # Remove dead refs

# BETTER: Explicit subscription management with unsubscribe
class BetterEventEmitter:
    def __init__(self):
        self._handlers: dict = {}  # id -> handler
        self._next_id = 0

    def on(self, handler: Callable) -> int:
        """Subscribe and return ID for later unsubscription"""
        sub_id = self._next_id
        self._next_id += 1
        self._handlers[sub_id] = handler
        return sub_id  # Caller must save this to unsubscribe

    def off(self, sub_id: int):
        """Unsubscribe using the ID returned from on()"""
        self._handlers.pop(sub_id, None)

    def emit(self, *args):
        for handler in self._handlers.values():
            handler(*args)
```

### Pattern 3: Closure Leaks

Closures capture variables from their enclosing scope. If the closure captures a large object even accidentally, that object stays in memory as long as the closure exists.

```python
# leak_closures.py
# Closure-related memory leaks
import gc

# BAD: Closure captures large data unintentionally
def bad_create_processor(large_data: list):
    """Closure keeps large_data alive even though it doesn't use it"""
    def process(item):
        # Only uses 'item', but large_data is captured in closure's scope!
        return item * 2
    return process

# Demonstration of the leak:
large_data = list(range(1000000))  # ~8MB of data
processor = bad_create_processor(large_data)
del large_data  # Doesn't free memory! Closure holds reference


# GOOD: Only capture what you need
def good_create_processor(large_data: list):
    """Extract needed data before creating closure"""
    # Extract only what the closure needs - don't capture large_data
    data_length = len(large_data)

    def process(item):
        # Now closure only references data_length (8 bytes), not large_data
        return item * 2
    return process


# BETTER: Use class with explicit data handling
class DataProcessor:
    """Class-based approach makes dependencies explicit"""

    def __init__(self, data: list):
        # Precompute what we need, don't store raw data
        self._precomputed = self._precompute(data)
        # data goes out of scope after __init__ returns

    def _precompute(self, data: list):
        """Extract needed information from data"""
        return sum(data)

    def process(self, item):
        return item * 2
```

### Pattern 4: Circular References

Circular references occur when objects reference each other. Python's GC can handle these, but they delay collection and can cause issues with `__del__` methods.

```python
# leak_circular.py
# Circular reference patterns and solutions
import gc
import weakref

# BAD: Circular reference between parent and child
class Parent:
    def __init__(self):
        self.children = []

    def add_child(self, child):
        self.children.append(child)  # Parent -> Child
        child.parent = self            # Child -> Parent (circular!)

class Child:
    def __init__(self):
        self.parent = None


# GOOD: Use weakref for back-references (child doesn't keep parent alive)
class BetterParent:
    def __init__(self):
        self.children = []

    def add_child(self, child):
        self.children.append(child)  # Strong reference (parent owns child)
        # Weak reference for back-reference (child doesn't own parent)
        child._parent_ref = weakref.ref(self)

class BetterChild:
    def __init__(self):
        self._parent_ref = None

    @property
    def parent(self):
        """Get parent if still alive, None otherwise"""
        if self._parent_ref:
            return self._parent_ref()  # Returns None if parent was collected
        return None


# Testing circular reference cleanup
def test_cleanup():
    """Demonstrate that circular refs delay but don't prevent collection"""
    gc.collect()  # Clean slate
    before = len(gc.get_objects())

    # Create circular structure
    parent = Parent()
    for i in range(100):
        child = Child()
        parent.add_child(child)  # Creates circular refs

    del parent
    gc.collect()  # GC handles circular refs (but it's slower)

    after = len(gc.get_objects())
    print(f"Objects before: {before}, after: {after}")
```

### Pattern 5: Thread Local Leaks

Thread pools reuse threads. If you store data in thread locals without cleanup, that data accumulates across requests. Each thread keeps growing its local storage.

```python
# leak_threadlocal.py
# Thread local memory leaks in thread pools
import threading
from concurrent.futures import ThreadPoolExecutor
import gc

# BAD: Thread locals accumulate data in pooled threads
_thread_local = threading.local()

def bad_process_request(request_id):
    """Thread local data accumulates - threads are reused in pools!"""
    if not hasattr(_thread_local, 'history'):
        _thread_local.history = []
    # Each request adds to history - it's never cleared!
    _thread_local.history.append(request_id)
    return len(_thread_local.history)  # Grows forever per thread


# GOOD: Clean up thread locals after each use
def good_process_request(request_id):
    """Explicit cleanup prevents accumulation"""
    try:
        _thread_local.request_id = request_id
        return process(request_id)
    finally:
        # IMPORTANT: Clean up after each request
        if hasattr(_thread_local, 'request_id'):
            del _thread_local.request_id


# BETTER: Use context variables (Python 3.7+) - auto cleanup
from contextvars import ContextVar

# ContextVar handles cleanup automatically when async tasks complete
request_id_var: ContextVar[str] = ContextVar('request_id')

def better_process_request(request_id):
    """Context vars are isolated per async task and auto-cleaned"""
    # set() returns a token for resetting
    token = request_id_var.set(request_id)
    try:
        return process(request_id)
    finally:
        # Reset to previous value (or undefined)
        request_id_var.reset(token)
```

---

## Garbage Collector Debugging

### Inspecting the GC

Python's `gc` module provides tools to understand and debug garbage collection behavior. This is useful for diagnosing why objects aren't being collected.

```python
# gc_debug.py
# Debugging the garbage collector
import gc
import sys

def debug_gc():
    """Debug garbage collector behavior and find collection issues"""

    # Enable GC debugging - logs collection stats and potential leaks
    gc.set_debug(gc.DEBUG_STATS | gc.DEBUG_LEAK)

    # Get GC thresholds (gen0, gen1, gen2 allocation counts that trigger GC)
    thresholds = gc.get_threshold()
    print(f"GC thresholds: {thresholds}")

    # Get current allocation counts for each generation
    counts = gc.get_count()
    print(f"GC counts: {counts}")

    # Force a full garbage collection
    collected = gc.collect()
    print(f"Collected {collected} objects")

    # Show objects that couldn't be collected (circular refs with __del__)
    print(f"Uncollectable objects: {gc.garbage}")

def find_reference_cycles():
    """Find objects involved in reference cycles"""
    gc.collect()  # Start with clean state

    # Get all objects tracked by GC
    all_objects = gc.get_objects()
    print(f"Total tracked objects: {len(all_objects)}")

    # Find objects with multiple referrers (potential cycle participants)
    cycles = []
    for obj in all_objects:
        referrers = gc.get_referrers(obj)
        if len(referrers) > 1:  # Multiple things point to this object
            cycles.append((type(obj).__name__, len(referrers)))

    # Aggregate by type to find problematic object types
    from collections import Counter
    type_counts = Counter(t for t, _ in cycles)
    print("Types with multiple referrers (potential cycles):")
    for type_name, count in type_counts.most_common(10):
        print(f"  {type_name}: {count}")

def get_object_size(obj):
    """Calculate total memory used by object and all its references"""
    seen = set()  # Track visited objects to avoid double-counting
    size = 0

    def sizeof_recursive(obj):
        nonlocal size
        obj_id = id(obj)
        if obj_id in seen:
            return  # Already counted this object
        seen.add(obj_id)
        size += sys.getsizeof(obj)  # Add this object's size

        # Recursively measure referenced objects
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

Sometimes you need explicit control over when garbage collection runs, especially in memory-constrained environments or performance-critical code.

```python
# gc_control.py
# Manual garbage collection control
import gc
import time
import logging

logger = logging.getLogger(__name__)

class GCController:
    """Control garbage collection behavior for different scenarios"""

    def __init__(self):
        # Save original settings for restoration
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
        """Force full garbage collection across all generations"""
        start = time.time()

        # Collect each generation separately for visibility
        gen0 = gc.collect(0)  # Young objects (most garbage)
        gen1 = gc.collect(1)  # Middle-aged objects
        gen2 = gc.collect(2)  # Old objects (survives many collections)

        duration = time.time() - start
        logger.info(
            f"GC collected: gen0={gen0}, gen1={gen1}, gen2={gen2} "
            f"in {duration*1000:.2f}ms"
        )

        return gen0 + gen1 + gen2

    def set_aggressive_gc(self):
        """Configure GC for memory-constrained environments (Kubernetes pods)"""
        # Lower thresholds = GC runs more often = lower memory, more CPU
        gc.set_threshold(100, 5, 5)
        logger.info("Set aggressive GC thresholds")

    def set_relaxed_gc(self):
        """Configure GC for performance (trades memory for speed)"""
        # Higher thresholds = GC runs less often = higher memory, less CPU
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

Export memory metrics to Prometheus for alerting and dashboards. These metrics help you detect memory growth before it causes OOM kills.

```python
# memory_metrics.py
# Prometheus metrics for memory monitoring
import gc
import os
import psutil
from prometheus_client import Gauge, Counter
import tracemalloc

# Define Prometheus metrics
process_memory_bytes = Gauge(
    'process_memory_bytes',
    'Process memory usage in bytes',
    ['type']  # Label: rss, vms, tracemalloc_current, tracemalloc_peak
)

gc_collections = Counter(
    'gc_collections_total',
    'Total garbage collection runs',
    ['generation']  # Label: 0, 1, 2
)

gc_collected_objects = Counter(
    'gc_collected_objects_total',
    'Total objects collected by GC',
    ['generation']
)

python_objects = Gauge(
    'python_objects_count',
    'Number of objects tracked by GC'
)

def collect_memory_metrics():
    """Collect memory metrics - call periodically or on /metrics endpoint"""

    # Get OS-level memory usage via psutil
    process = psutil.Process(os.getpid())
    mem_info = process.memory_info()

    # RSS = Resident Set Size (actual memory used)
    process_memory_bytes.labels(type='rss').set(mem_info.rss)
    # VMS = Virtual Memory Size (includes swapped)
    process_memory_bytes.labels(type='vms').set(mem_info.vms)

    # Track number of Python objects (growth indicates potential leak)
    python_objects.set(len(gc.get_objects()))

    # Include tracemalloc metrics if tracing is enabled
    if tracemalloc.is_tracing():
        current, peak = tracemalloc.get_traced_memory()
        process_memory_bytes.labels(type='tracemalloc_current').set(current)
        process_memory_bytes.labels(type='tracemalloc_peak').set(peak)

class GCMetricsCallback:
    """Track GC statistics as Prometheus metrics"""

    def __init__(self):
        # Store last stats to calculate deltas
        self._last_stats = gc.get_stats()

    def collect(self):
        """Update GC metrics - call periodically"""
        stats = gc.get_stats()

        # Calculate deltas for each generation (0, 1, 2)
        for i, (current, last) in enumerate(zip(stats, self._last_stats)):
            # How many GC runs since last check
            collections_diff = current['collections'] - last['collections']
            # How many objects were collected
            collected_diff = current['collected'] - last['collected']

            if collections_diff > 0:
                gc_collections.labels(generation=str(i)).inc(collections_diff)
            if collected_diff > 0:
                gc_collected_objects.labels(generation=str(i)).inc(collected_diff)

        self._last_stats = stats
```

### Memory Leak Detection Service

This async service runs in the background, periodically checking for consistent memory growth. When it detects a potential leak (memory growing across multiple checks), it logs the top allocation sources.

```python
# leak_detector_service.py
# Async background service for automatic leak detection
import tracemalloc
import logging
import asyncio
from datetime import datetime
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

class LeakDetectorService:
    """Background service that monitors for memory leaks"""

    def __init__(
        self,
        check_interval: int = 300,      # Check every 5 minutes
        growth_threshold_mb: float = 50, # Alert if growth exceeds 50MB
        snapshot_count: int = 10         # Keep last 10 snapshots
    ):
        self.check_interval = check_interval
        self.growth_threshold = growth_threshold_mb * 1024 * 1024
        self.snapshot_count = snapshot_count
        self._snapshots: List[Dict] = []
        self._running = False

    async def start(self):
        """Start the leak detector background task"""
        tracemalloc.start(10)  # Store 10 stack frames
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
        """Take a snapshot and check for growth"""
        snapshot = tracemalloc.take_snapshot()
        current, peak = tracemalloc.get_traced_memory()

        # Store snapshot with timestamp
        snapshot_data = {
            'timestamp': datetime.now(),
            'snapshot': snapshot,
            'current': current,
            'peak': peak
        }

        self._snapshots.append(snapshot_data)

        # Keep only recent snapshots to limit memory usage
        if len(self._snapshots) > self.snapshot_count:
            self._snapshots.pop(0)

        # Need at least 3 snapshots to detect a trend
        if len(self._snapshots) >= 3:
            await self._analyze_growth()

    async def _analyze_growth(self):
        """Analyze memory trend across recent snapshots"""
        recent = self._snapshots[-3:]
        memory_values = [s['current'] for s in recent]

        # Check if memory is consistently growing (leak indicator)
        is_growing = all(
            memory_values[i] < memory_values[i+1]
            for i in range(len(memory_values)-1)
        )

        growth = memory_values[-1] - memory_values[0]

        # Alert if consistent growth exceeds threshold
        if is_growing and growth > self.growth_threshold:
            logger.warning(
                f"Potential memory leak detected! "
                f"Growth: {growth / 1024 / 1024:.2f}MB over "
                f"{len(recent)} checks"
            )

            # Show where memory is being allocated
            await self._log_top_allocations()

    async def _log_top_allocations(self):
        """Log top memory growth locations for debugging"""
        if len(self._snapshots) < 2:
            return

        old_snapshot = self._snapshots[0]['snapshot']
        new_snapshot = self._snapshots[-1]['snapshot']

        # Compare oldest to newest to find what grew
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

This side-by-side comparison shows how to fix a common leak pattern: a request handler that stores itself in a class-level registry and accepts callbacks. The fix uses weak references and proper cleanup.

```python
# leak_fix_example.py
# Before and after: fixing a real memory leak
import weakref
from typing import Dict, Optional, Callable
import time

# BEFORE: Leaking implementation - DON'T DO THIS
class LeakingRequestHandler:
    # Class-level dict holds STRONG references to all handlers
    _active_requests: Dict[str, 'LeakingRequestHandler'] = {}

    def __init__(self, request_id: str):
        self.request_id = request_id
        self.data = bytearray(1024 * 1024)  # 1MB per request
        self._callbacks = []

        # LEAK 1: Adds self to class dict - never removed!
        LeakingRequestHandler._active_requests[request_id] = self

    def on_complete(self, callback: Callable):
        # LEAK 2: If callback is a bound method, it references its object
        # which may reference self -> circular reference
        self._callbacks.append(callback)

    def process(self):
        # ... processing ...
        for cb in self._callbacks:
            cb(self)


# AFTER: Fixed implementation - USE THIS PATTERN
class FixedRequestHandler:
    # Use weak references - doesn't prevent GC
    _active_requests: Dict[str, weakref.ref] = {}

    def __init__(self, request_id: str):
        self.request_id = request_id
        self.data = bytearray(1024 * 1024)
        self._callbacks: list = []

        # FIX 1: Weak reference with cleanup callback
        # When self is GC'd, the cleanup callback removes from dict
        FixedRequestHandler._active_requests[request_id] = weakref.ref(
            self,
            lambda ref: FixedRequestHandler._active_requests.pop(request_id, None)
        )

    def on_complete(self, callback: Callable):
        # FIX 2: Use WeakMethod for bound methods, weakref for functions
        if hasattr(callback, '__self__'):
            # Bound method - use WeakMethod to avoid circular reference
            self._callbacks.append(weakref.WeakMethod(callback))
        else:
            self._callbacks.append(weakref.ref(callback))

    def process(self):
        # ... processing ...
        for cb_ref in self._callbacks:
            cb = cb_ref()  # Dereference - returns None if collected
            if cb is not None:
                cb(self)

    def cleanup(self):
        """Explicit cleanup - call when done with handler"""
        self._callbacks.clear()
        self.data = None  # Release large data

    def __del__(self):
        # Note: Avoid __del__ when possible - use context managers instead
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
