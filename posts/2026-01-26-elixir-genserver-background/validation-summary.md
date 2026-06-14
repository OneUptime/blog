# Validation Summary: How to Use GenServers for Background Processing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elixir
- GenServer
- OTP supervisors
- Erlang `:queue`
- Elixir processes and timers
- Telemetry
- ExUnit

## Sources Consulted
- Elixir GenServer documentation: https://hexdocs.pm/elixir/GenServer.html
- Elixir Supervisor documentation: https://hexdocs.pm/elixir/Supervisor.html
- Elixir Process documentation: https://hexdocs.pm/elixir/Process.html
- Erlang `queue` module documentation: https://www.erlang.org/doc/apps/stdlib/queue.html
- Telemetry documentation: https://hexdocs.pm/telemetry/

## Issues Found
- The first GenServer example said the `:name` option registers the process globally. Official GenServer documentation states atom names are registered locally on the current node; global registration requires `{:global, term}`. Updated the comment accordingly.
- The introduction said processing messages one at a time means "no race conditions." That was too broad because sequential GenServer callbacks protect the server's own state but do not eliminate races between clients or external processes. Narrowed the statement to the GenServer's own state.
- The advanced queue pause comment said it cancels the next tick, but the code sets a flag and ignores tick messages rather than cancelling a `Process.send_after/3` timer reference. Updated the comment.
- The worker pool async example used `available?/1` followed by `cast`, which could let concurrent callers assign multiple async tasks to the same worker after a stale availability check. Changed async assignment to a short `GenServer.call/3` so the worker accepts or rejects the task while updating its state, and documented possible error tuples.
- The graceful shutdown snippet implied trapping exits always gets `terminate/2` called. GenServer shutdown cleanup is conditional and not guaranteed for brutal kills; trapping exits allows `terminate/2` to run during supervisor shutdown. Updated the comment.
- The ExUnit crash/restart test killed a linked process started in `setup`, which would not verify supervisor restart behavior and could terminate the test process. Marked the example test as skipped and clarified that it needs a supervised queue process.

## Review Notes
Elixir was not installed in the local environment, so snippets could not be compiled with `elixir` or `mix`. The review was performed against official Elixir, Erlang/OTP, and Telemetry documentation. The examples are intentionally simplified; for production-grade job processing, a dedicated library such as Oban or Broadway may be preferable depending on persistence, retries, rate limits, and distributed execution requirements.
