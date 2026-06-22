# Validation Summary: How to Fix 'Policy Not Applied' Errors in RabbitMQ

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- RabbitMQ policies
- RabbitMQ CLI (`rabbitmqctl`)
- RabbitMQ Management HTTP API
- Bash
- Python
- Regular expressions

## Sources Consulted
- RabbitMQ Policies documentation: https://www.rabbitmq.com/docs/policies
- RabbitMQ `rabbitmqctl` manual: https://www.rabbitmq.com/docs/man/rabbitmqctl.8
- RabbitMQ Queues documentation: https://www.rabbitmq.com/docs/queues
- RabbitMQ Exchanges documentation: https://www.rabbitmq.com/docs/exchanges
- RabbitMQ HTTP API reference: https://www.rabbitmq.com/docs/http-api-reference
- RabbitMQ Queue Length Limit documentation: https://www.rabbitmq.com/docs/maxlength
- RabbitMQ Time-To-Live and Expiration documentation: https://www.rabbitmq.com/docs/ttl
- RabbitMQ Dead Letter Exchanges documentation: https://www.rabbitmq.com/docs/dlx
- RabbitMQ Quorum Queues documentation: https://www.rabbitmq.com/docs/quorum-queues
- RabbitMQ Lazy Queues documentation: https://www.rabbitmq.com/docs/lazy-queues
- RabbitMQ Classic Queue Mirroring documentation: https://www.rabbitmq.com/docs/3.13/ha

## Issues Found
- Fixed an invalid regular expression in the Mermaid policy example from `*.queue` to `.*\.queue`.
- Updated Python regex checks from `re.match` to `re.search` so the examples match RabbitMQ's unanchored regular expression behavior and the stated substring example.
- Expanded the documented `apply-to` values to include current RabbitMQ options such as `classic_queues`, `quorum_queues`, and `streams`.
- Fixed the Bash Management API example to percent-encode both the vhost and queue name, not only `/` in the vhost.
- Corrected the policy key for message TTL from the client argument name `x-message-ttl` to the policy key `message-ttl`.
- Replaced removed/deprecated classic mirroring policy keys (`ha-mode`, `ha-params`, `ha-sync-mode`) with a current quorum queue `delivery-limit` policy example.
- Replaced the obsolete lazy queue policy example (`queue-mode: lazy`) with a current queue TTL policy example (`expires`).
- Updated the policy template code so the quorum-only delivery limit policy uses `apply-to` `quorum_queues`.
- Corrected the equal-priority conflict rule: RabbitMQ chooses an effective policy non-deterministically when matching policies have equal priorities; it does not choose the alphabetically first policy.

## Review Notes
- The Python examples were checked for syntax validity.
- The diagnostic Bash snippet was checked with `bash -n`.
- `rabbitmqctl` was not available in the local environment, so CLI verification was performed against the official RabbitMQ manual and current RabbitMQ documentation.
