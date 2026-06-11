# Validation Summary: How to Build RabbitMQ Custom Exchange Types

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RabbitMQ (versions 3.12.x discussed)
- Erlang/OTP (version 26)
- `rabbit_exchange_type` behaviour
- `rabbit_binding`, `rabbit_registry`, `rabbit_misc`, `rabbit_log` modules
- Python `pika` client library
- Node.js `amqplib` client library
- `erlang.mk` build system
- `rabbitmqadmin` CLI
- `jsx` Erlang JSON parsing library
- EUnit test framework
- Mermaid diagrams

## Sources Consulted
- [rabbitmq-server rabbit_exchange_type.erl (v3.12.13)](https://github.com/rabbitmq/rabbitmq-server/blob/v3.12.13/deps/rabbit/src/rabbit_exchange_type.erl) — canonical behaviour callbacks
- [rabbitmq-server rabbit_exchange_type.erl (v3.13.7)](https://github.com/rabbitmq/rabbitmq-server/blob/v3.13.7/deps/rabbit/src/rabbit_exchange_type.erl) — newer behaviour (route/3)
- [rabbitmq_random_exchange plugin source](https://github.com/rabbitmq/rabbitmq-server/tree/main/deps/rabbitmq_random_exchange) — reference implementation
- [rabbitmq_consistent_hash_exchange source](https://github.com/rabbitmq/rabbitmq-server/blob/main/deps/rabbitmq_consistent_hash_exchange/src/rabbit_exchange_type_consistent_hash.erl) — reference callback signatures in main branch
- [rabbit_binding.erl](https://github.com/rabbitmq/rabbitmq-server/blob/v3.12.13/deps/rabbit/src/rabbit_binding.erl) — verified `list_for_source/1`
- [rabbit_misc.erl](https://github.com/rabbitmq/rabbitmq-server/blob/v3.12.13/deps/rabbit_common/src/rabbit_misc.erl) — verified `table_lookup/2`
- [rabbit_registry.erl](https://github.com/rabbitmq/rabbitmq-server/blob/v3.12.13/deps/rabbit_common/src/rabbit_registry.erl) — verified `register/3`
- [rabbit_log.erl](https://github.com/rabbitmq/rabbitmq-server/blob/v3.12.13/deps/rabbit_common/src/rabbit_log.erl) — verified `debug/2`
- [RabbitMQ Exchanges documentation](https://www.rabbitmq.com/docs/exchanges)
- [rabbitmq-external-exchange plugin docs](https://github.com/rabbitmq/rabbitmq-external-exchange)

## Issues Found

1. **Incorrect `delete/3` callback arity** — The `rabbit_exchange_type` behaviour in RabbitMQ defines `delete/2` (taking `serial()` and `exchange()`), not `delete/3`. The post originally exported `delete/3` and defined `delete(_Tx, _Exchange, _Bindings) -> ok.` in both the random exchange and the content-based exchange modules. With `delete/3`, the `-behaviour(rabbit_exchange_type).` declaration would generate a "callback function not exported" compile warning and the actual `delete/2` callback would be missing, so the plugin would not satisfy the behaviour contract.
   - **Fix:** Changed export from `delete/3` to `delete/2` and updated the function definition to `delete(_Serial, _Exchange) -> ok.` in both Erlang modules.

2. **Inconsistent parameter naming (`_Tx` vs `_Serial`)** — The behaviour spec uses `serial()` for the first argument of `create/2`, `delete/2`, `add_binding/3`, and `remove_bindings/3`, not a transaction. The original `_Tx` naming was misleading.
   - **Fix:** Renamed `_Tx` to `_Serial` throughout the random exchange and content-based exchange modules for technical accuracy. (Cosmetic in compiled behavior, but matches the official spec.)

3. **Inaccurate `broker_version_requirements`** — The original `.app.src` listed `["3.12.0", "3.13.0", "4.0.0"]`, but the `route/2` signature used in the post only matches the behaviour in RabbitMQ 3.12.x. In 3.13.x and 4.x, the behaviour callback is `route/3` (taking exchange, message-container state, and route options), so the post's code would not compile against 3.13+ headers.
   - **Fix:** Narrowed the version constraint to `["3.12.0"]` to match the actual code shape.

## Review Notes

- The `route/2` signature shown in the post is correct for RabbitMQ 3.12.x. RabbitMQ 3.13 introduced a new `route/3` callback (with `mc:state()` and `rabbit_exchange:route_opts()`); a future revision should explain this evolution or rewrite to use `route/3` for the modern API.
- The official `rabbitmq_random_exchange` plugin uses a `-rabbit_boot_step` registration directive (via `rabbit_registry:register/3`) instead of an OTP `application` behaviour with `start/2`. The post's `start/2` → `register/0` pattern is an alternative but is not the canonical RabbitMQ plugin idiom; readers may see different patterns in upstream plugins. This is a stylistic difference, not a defect, so it was left as-is.
- The `register/0` function name does not collide with the Erlang BIF `erlang:register/2` because arities differ; the local call `register()` resolves to the module-local function. Worth noting in a future edit for clarity.
- The official `rabbitmq_random_exchange` also implements `recover/2`. It is not in the formal `-callback` list of `rabbit_exchange_type` in 3.12.x but is invoked by RabbitMQ when present. The post omits it, which is acceptable for a no-op exchange.
- The Python `pika` and Node.js `amqplib` examples use current, non-deprecated APIs and would work as written.
- The `rabbitmqadmin` `declare binding` command syntax is correct; omitting `routing_key` defaults it to an empty string, which is appropriate for the random exchange (which ignores routing keys).
- `jsx:decode(Payload, [return_maps])` is valid for `jsx` 2.x/3.x. Note that `jsx` is not bundled with RabbitMQ by default; a real plugin would need to add it as a dependency in `DEPS` in the Makefile (the post mentions this in a comment but does not show the Makefile change).
- The `rabbit_log:debug/2` example binds the `Message` variable without using it, which would emit an unused-variable warning. Since this snippet is an excerpt, this is acceptable in tutorial context.
- All Mermaid diagrams are syntactically valid.
