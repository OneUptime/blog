# Validation Summary: How to Use Supervisors in Elixir

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elixir (language)
- OTP / BEAM (runtime)
- Supervisor behaviour
- DynamicSupervisor
- Task.Supervisor
- GenServer
- Registry
- Application (Mix application supervision)
- ExUnit (testing)

## Sources Consulted
- Elixir `Supervisor` module — https://hexdocs.pm/elixir/Supervisor.html
- Elixir `DynamicSupervisor` module — https://hexdocs.pm/elixir/DynamicSupervisor.html
- Elixir `Task.Supervisor` module — https://hexdocs.pm/elixir/Task.Supervisor.html
- Elixir `Task` module — https://hexdocs.pm/elixir/Task.html (`await_many/2`)
- Elixir `System` module — https://hexdocs.pm/elixir/System.html (`convert_time_unit/3`)
- Elixir `Logger` module — https://hexdocs.pm/elixir/Logger.html (`warning/2` vs deprecated `warn/2`)
- Elixir `Registry` module — https://hexdocs.pm/elixir/Registry.html
- Elixir `GenServer` module — https://hexdocs.pm/elixir/GenServer.html

## Issues Found

1. **Incorrect strategy count (Section 4).** Post claimed "Supervisors support four different restart strategies" but only listed three. The Elixir `Supervisor` module supports exactly three: `:one_for_one`, `:one_for_all`, `:rest_for_one`. (`:simple_one_for_one` was deprecated and replaced by `DynamicSupervisor`.) Changed "four" to "three".

2. **Invalid time unit `:minute` (Section 7, Session module).** Code used `System.convert_time_unit(elapsed, :native, :minute)`, but `:minute` is not a valid unit — `System.convert_time_unit/3` only accepts `:second`, `:millisecond`, `:microsecond`, `:nanosecond`, `:native`, or a positive integer (parts per second). This would raise `ArgumentError` at runtime. Replaced with conversion to `:second` followed by `div(elapsed_seconds, 60)`.

3. **Non-existent function `Supervisor.get_all_specs/1` (Section 14).** This function does not exist in Elixir's `Supervisor` module. Replaced the example with a working `Supervisor.which_children/1` lookup that finds a child by ID — which is the actual documented introspection API.

4. **Non-existent function `Supervisor.get_callback_module/1` (Section 14).** Also not a real function in the Elixir `Supervisor` module. Removed the example block.

5. **Invalid `:restart` option on `Task.Supervisor.start_link/1` (Section 10).** `Task.Supervisor.start_link/1` accepts `:name`, `:max_restarts`, `:max_seconds`, and `:max_children`. The docs explicitly state that `:restart` and `:shutdown` have been deprecated at the supervisor level and should be passed to `start_child/2` instead. Replaced with `max_children: 1000`, which is a real and useful supervisor-level option.

## Review Notes

- `Logger.warning/2` (used in Section 13) is correct; it has been the recommended replacement for deprecated `Logger.warn/2` since Elixir 1.11.
- `Task.await_many/2` (used in Section 10) is correct; available since Elixir 1.11.
- The `:queue` Erlang module usage in the worker pool example (Section 15) is correct.
- `DynamicSupervisor.init(strategy: :one_for_one)` is correct — DynamicSupervisor only supports `:one_for_one`.
- The `child_spec` map shapes, `Supervisor.child_spec/2` overrides, and `{:via, Registry, {name, key}}` tuples all match current docs.
- The post requires Elixir 1.11+ (for `Logger.warning/2` and `Task.await_many/2`). Worth a version note in a future revision, but not a correctness issue today.
- The "nine nines" (99.9999999%) framing in the intro is the commonly cited Ericsson/AXD301 figure; it's marketing-grade rather than rigorous, but it's the standard story in Erlang/OTP material and not technically incorrect.
