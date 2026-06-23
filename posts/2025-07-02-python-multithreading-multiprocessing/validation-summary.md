# Validation Summary: How to Implement Multithreading vs Multiprocessing in Python

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python (CPython)
- Global Interpreter Lock (GIL)
- `threading` module
- `multiprocessing` module
- `concurrent.futures` (ThreadPoolExecutor, ProcessPoolExecutor)
- `asyncio`
- FastAPI
- NumPy
- `requests` / `httpx`

## Sources Consulted
- Python `threading` docs — https://docs.python.org/3/library/threading.html
- Python `multiprocessing` docs — https://docs.python.org/3/library/multiprocessing.html
- Python `concurrent.futures` docs — https://docs.python.org/3/library/concurrent.futures.html
- Python GIL reference / glossary — https://docs.python.org/3/glossary.html#term-global-interpreter-lock
- CPython "What's the deal with the GIL" / reference counting (CPython internals docs)
- Python `asyncio` event loop docs — https://docs.python.org/3/library/asyncio-eventloop.html
- FastAPI docs — https://fastapi.tiangolo.com/
- NumPy API reference — https://numpy.org/doc/stable/reference/

## Issues Found
- **Incorrect GIL claim in `gil_demo.py` (CPU-bound counter example).** The inline comment on `counter += 1` read `# Not atomic! GIL saves us from race conditions`. This is technically wrong and self-contradictory: `counter += 1` is a read-modify-write that compiles to multiple bytecodes, and the GIL can be released between them, so concurrent threads DO produce lost updates. The GIL does not make `+=` atomic — this is precisely a case where it does *not* protect you (which is why the surrounding text later promotes `threading.Lock` for shared counters). Changed the comment to `# Not atomic! The GIL does NOT prevent this race` so it correctly reflects what the demo shows (a final counter below the expected total).

## Review Notes
- The FastAPI examples use `asyncio.get_event_loop()` inside `async` endpoints. This works correctly because a running loop exists at that point, but the modern preferred form inside a coroutine is `asyncio.get_running_loop()` (and `asyncio.to_thread()` is a convenient shorthand for thread offloading on Python 3.9+). Left as-is since it is not incorrect.
- The core technical claims are accurate: the GIL serializes Python bytecode execution within a process; it is released during blocking I/O (so threading helps I/O-bound work); multiprocessing sidesteps the GIL with separate interpreters/processes each holding their own GIL (so it helps CPU-bound work); the GIL's existence is tied to CPython's reference-counting memory management.
- All other code samples (ThreadPoolExecutor/ProcessPoolExecutor patterns, `Pool.map` ordered results, `Value`/`Array`/`Manager` for shared state, pickle-ability pitfalls with lambdas/local functions, consistent lock ordering / RLock / lock timeouts for deadlock avoidance, NumPy chunking) are syntactically correct and use current, non-deprecated APIs.
- The summary table and decision flowcharts are accurate and consistent with the body of the post.
- Note: the post predates / does not discuss the experimental free-threaded (no-GIL) builds introduced via PEP 703 in Python 3.13+. This is not an error for a general guide, but a future revision could mention it.
