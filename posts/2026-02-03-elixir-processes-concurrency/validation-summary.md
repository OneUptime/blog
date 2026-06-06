# Validation Summary: How to Use Elixir Processes for Concurrency

## Status
validated

## Post Type
Tutorial / Guide — practical, code-driven walkthrough of Elixir's process model, message passing, links, monitors, the Task module, and several real-world patterns (worker pool, rate limiter, circuit breaker).

## Technologies Covered
- Elixir (language and standard library)
- Erlang/OTP and the BEAM virtual machine
- `Process`, `Task`, `:queue` (Erlang stdlib), `:erlang.memory/1`
- Core concurrency primitives: `spawn/1`, `spawn/3`, `spawn_link`, `spawn_monitor`, `send/2`, `receive`/`after`, `Process.monitor`, `Process.flag(:trap_exit, true)`, `Process.send_after`, `Process.register`, `Process.info`
- Patterns: worker pool, rate limiter (token bucket), circuit breaker, simple supervisor

## Sources Consulted
- Elixir `Process` module docs — https://hexdocs.pm/elixir/Process.html
- Elixir `Task` module docs — https://hexdocs.pm/elixir/Task.html (especially `async/1`, `await/1`, `await_many/1` introduced in 1.11, `async_stream/3`, `yield/2`, `start/1`)
- Elixir `Kernel` docs for `spawn/1`, `spawn/3`, `spawn_link`, `spawn_monitor`, `send/2`, `make_ref/0`, `self/0`, `exit/1` — https://hexdocs.pm/elixir/Kernel.html
- Erlang `erlang` module docs for `spawn_monitor`, exit semantics, `DOWN` message format — https://www.erlang.org/doc/man/erlang.html
- Erlang `queue` module docs — https://www.erlang.org/doc/man/queue.html
- Erlang process docs — https://www.erlang.org/doc/reference_manual/processes.html (exit reasons, monitor messages, link semantics, trap_exit behavior)
- BEAM scheduler / reduction counting reference material — Erlang Efficiency Guide

## Issues Found
1. **`spawn_monitor` example incorrectly claimed return value becomes the exit reason.**
   - Original code returned `:completed` from the spawned function and a comment stated "Return value becomes exit reason for normal exit", with example output `Process exited with: :completed`.
   - This is technically wrong: when a spawned function returns normally, the exit reason is always `:normal`. The return value is discarded. The example output as written would never occur from a normal return.
   - Fix: changed the body to `exit(:completed)` and updated the comment to clarify that a normal return would yield `:normal` regardless of the function's return value. This keeps the example output (`Process exited with: :completed`) accurate while preserving the section's intent of demonstrating custom DOWN reasons.

## Review Notes
- The example modules named `defmodule Registry` and `defmodule Supervisor` shadow built-in stdlib modules of the same name (`Elixir.Registry` and `Elixir.Supervisor`). Code is technically valid in isolation but in a real project (or even pasted into IEx) it would override or conflict with the real modules. Not a code correctness bug — left as-is since the post otherwise clearly labels these as simplified demos.
- The "Memory per process: ~2500 bytes" output is in the right ballpark; the documented initial process size on a 64-bit BEAM is roughly 326 words (~2.6KB), which matches the post's "around 2KB" claim closely enough.
- In the `QueueDemo` slow consumer, the receive clause for `:check_queue` is listed first, but selective-receive semantics dictate that the FIRST mailbox message matching ANY clause is selected. Since `:check_queue` messages are appended after the 100 `{:work, n}` messages, the work messages are processed in order before `:check_queue` is ever matched. The illustrative output ("Queue length: 95", "90", …) is therefore optimistic but the concepts demonstrated (mailbox queue length growing, `Process.info(self(), :message_queue_len)` usage) are sound. Left as-is because the educational point about queue buildup is still valid.
- "Roughly one reduction per function call" for BEAM scheduling is a useful simplification; in reality reductions also account for BIFs, allocations, etc. — fine as an introductory framing.
- `Task.await_many/1` is correct; available since Elixir 1.11. Modern versions are fine.
- Naming a function `start_link` and using `spawn_link` (rather than being started under a supervisor through `Supervisor.start_link/2`) is idiomatic for stand-alone examples but worth noting that in production code one would typically wrap such a process as a `GenServer` started under a supervision tree — the post already calls this out in its summary.
