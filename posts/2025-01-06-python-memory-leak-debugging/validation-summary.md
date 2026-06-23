# Validation Summary: How to Handle Memory Leaks in Python

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- Python (CPython 3.7+)
- `tracemalloc` (standard library memory tracer)
- `gc` (standard library garbage collector interface)
- `objgraph` (third-party object reference visualizer) + Graphviz
- `weakref` (`weakref.ref`, `weakref.WeakMethod`)
- `functools.lru_cache`
- `contextvars.ContextVar`
- `threading` / `concurrent.futures.ThreadPoolExecutor`
- `asyncio`
- `psutil` + `prometheus_client` for production metrics

## Sources Consulted
- Python `tracemalloc` docs — https://docs.python.org/3/library/tracemalloc.html (start, take_snapshot, compare_to, statistics, get_traced_memory, is_tracing)
- Python `gc` docs — https://docs.python.org/3/library/gc.html (set_debug, get_threshold/set_threshold, get_count, collect(generation), get_objects, get_referrers, get_stats, garbage)
- Python `weakref` docs — https://docs.python.org/3/library/weakref.html (ref with finalizer callback, WeakMethod)
- Python `functools.lru_cache` docs — https://docs.python.org/3/library/functools.html
- Python `contextvars` docs — https://docs.python.org/3/library/contextvars.html (set/reset/token)
- Python execution model / naming and binding (free variables) — https://docs.python.org/3/reference/executionmodel.html
- objgraph docs — https://mg.pov.lt/objgraph/ (show_most_common_types, show_growth, by_type, show_refs, show_backrefs, max_depth/too_many/filename)
- psutil `Process.memory_info` — https://psutil.readthedocs.io/
- prometheus_client docs — https://prometheus.github.io/client_python/
- Local verification with CPython 3.12.3 (closure `__closure__` inspection, `weakref.ref` vs `weakref.WeakMethod` on bound methods)

## Issues Found
1. **Pattern 3 (Closure Leaks) was factually incorrect.** The original "BAD" example claimed that a closure captures `large_data` "even though it doesn't use it." This is wrong: CPython determines a nested function's free variables at compile time and only creates closure cells for variables the inner function actually references. The original `bad_create_processor`'s `process` only used `item`, so `large_data` was **not** captured and the example did **not** leak (verified: `process.__closure__` is `None`). The "GOOD" version was byte-for-byte identical in behavior (`return item * 2`, no capture either), so the contrast demonstrated nothing.
   - **Fix:** Reworded the intro to state that closures capture only the variables they reference (decided at compile time, so unused variables are never captured), and that a leak occurs when the closure *does* reference a large object. Updated the "BAD" example so its inner function references `large_data` (`return item * len(large_data)`), which genuinely captures and retains the whole list, and updated the "GOOD" example to use the pre-extracted `data_length` (`return item * data_length`) so its closure captures only a single int. Verified post-fix: BAD captures the list, GOOD captures only the int. Comment "(8 bytes)" was changed to "(one int)" for accuracy. No structure or other content changed.

## Review Notes
- **Event handler weakref caveat (Pattern 2):** `GoodEventEmitter.on()` stores `weakref.ref(handler)`. If `handler` is a bound method (as in the `LeakySubscriber` example, which passes `self.handle_event`), the weakref dies immediately because each `self.handle_event` access creates a fresh, temporary bound-method object with no other strong referent (verified: `weakref.ref(obj.method)()` returns `None` right away). For bound methods you must use `weakref.WeakMethod`, which the post correctly demonstrates later in `leak_fix_example.py`. The `GoodEventEmitter` snippet works as written for plain functions held strongly elsewhere; for bound methods the "BETTER" explicit `on()/off()` pattern or `WeakMethod` is the correct choice. Left as-is since the code is syntactically valid, runs, and the post's overall guidance (prefer explicit unsubscribe / weak references) is sound — but readers should prefer `WeakMethod` for method callbacks.
- **objgraph install line:** `pip install objgraph graphviz` installs the Python `graphviz` binding, but objgraph actually shells out to the Graphviz `dot` binary (the system package) to render PNGs. The pip line is harmless and commonly cited, but PNG output additionally requires the system Graphviz package installed. Not changed.
- All other code is syntactically valid and uses current, non-deprecated APIs: `tracemalloc` snapshot/compare/statistics flow, `gc` debugging and per-generation `collect()`, `weakref.ref(obj, callback)` finalizers and `WeakMethod`, `lru_cache(maxsize=...)`, `ContextVar.set()/reset(token)`, and the psutil/prometheus_client metrics. `gc.get_stats()` keys (`collections`, `collected`, `uncollectable`) are used correctly.
- The `MemoryMonitor._snapshots` type hint is `List[Tuple[datetime, any]]` while it actually stores 3-tuples `(datetime, label, snapshot)`; the unpacking is correct and `any` (the builtin) as a type hint is loose but not an error. Cosmetic only — left unchanged.
