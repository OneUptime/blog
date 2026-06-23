# Validation Summary: How to Profile Python Applications with cProfile and py-spy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python (3.x)
- cProfile / pstats (standard library)
- py-spy (sampling profiler)
- memory_profiler
- tracemalloc (standard library)
- objgraph
- line_profiler / kernprof
- yappi (async/threaded profiling)
- asyncio (standard library)
- Flask (profiling middleware)
- OpenTelemetry (Python SDK)

## Sources Consulted
- Python `cProfile`/`profile` docs — https://docs.python.org/3/library/profile.html
- Python `pstats` docs — https://docs.python.org/3/library/profile.html#module-pstats
- Python `tracemalloc` docs — https://docs.python.org/3/library/tracemalloc.html
- py-spy README / CLI — https://github.com/benfred/py-spy
- memory_profiler — https://pypi.org/project/memory-profiler/
- line_profiler — https://github.com/pyutils/line_profiler
- yappi — https://github.com/sumerc/yappi
- objgraph — https://mg.pov.lt/objgraph/
- Python `sys.\_current_frames` / `asyncio` docs — https://docs.python.org/3/library/sys.html
- Local verification with Python 3.12.3 (`pstats.Stats.total_calls`, `tracemalloc.take_snapshot/compare_to/statistics`, `sys._current_frames`)

## Issues Found
No technical issues found.

All code and commands were verified:
- **cProfile/pstats**: `Profile().enable()/disable()`, `pstats.Stats(...).sort_stats(...).print_stats(...)`, `dump_stats()`, and the `total_calls` attribute used in the OpenTelemetry example are all valid (verified `total_calls` exists on a live `pstats.Stats` object).
- **Command-line cProfile**: `python -m cProfile -s cumtime`, `-o output.prof`, and the `pstats.Stats(...).sort_stats('cumulative').print_stats(20)` one-liner are correct.
- **py-spy**: `top --pid`, `record -o file.svg --pid --duration 30`, `--native`, `record -o file -- python script.py`, `--format speedscope`, `--subprocesses`, and `dump --pid` all match the current py-spy CLI. The note that `top`/attaching requires root on Linux and the `--cap-add SYS_PTRACE` Docker guidance are correct.
- **memory_profiler**: `@profile` decorator usage and `python -m memory_profiler` invocation are correct; the sample output format matches the tool's actual layout.
- **tracemalloc**: `start()`, `take_snapshot()`, `statistics('lineno')`, `compare_to()`, `get_traced_memory()`, `stop()` all verified against the live API.
- **objgraph / line_profiler / yappi / asyncio / continuous sampler**: APIs (`show_most_common_types`, `show_growth`, `by_type`, `show_backrefs`; `LineProfiler.add_function/enable_by_count`; `kernprof -l -v`; `yappi.set_clock_type/get_func_stats/get_thread_stats`; `sys._current_frames`) are all valid and used correctly.

## Review Notes
- cProfile is correctly characterized as a *deterministic* tracing profiler vs. py-spy as a *statistical sampling* profiler — this distinction is accurate.
- The post profiles async code with cProfile, which works but only attributes time to the running coroutine frames (time spent in `await`/the event loop is not broken down per-coroutine). The post appropriately follows up with `yappi` (with `set_clock_type("wall")`) which handles async/threaded workloads better, so the guidance is sound.
- Memory size estimates (e.g. "~38MB for 1M integers") are illustrative ballpark figures; actual values vary by platform and CPython version, which is reasonable for a tutorial.
- The Flask profiling middleware is correctly gated behind an env var and noted as development-only due to overhead — good practice.
