# Validation Summary: How to Use MySQL with RabbitMQ

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (8.0+ for `SKIP LOCKED` support)
- RabbitMQ
- Python (pika library for RabbitMQ, mysql-connector-python for MySQL)
- Outbox pattern for dual-write consistency

## Sources Consulted
- MySQL 8.0 Reference Manual — JSON data type: https://dev.mysql.com/doc/refman/8.0/en/json.html
- MySQL 8.0 Reference Manual — SELECT ... FOR UPDATE SKIP LOCKED: https://dev.mysql.com/doc/refman/8.0/en/innodb-locking-reads.html
- MySQL 8.0 Reference Manual — JSON_OBJECT function: https://dev.mysql.com/doc/refman/8.0/en/json-creation-functions.html
- pika documentation — BasicProperties and basic_publish: https://pika.readthedocs.io/en/stable/
- mysql-connector-python documentation: https://dev.mysql.com/doc/connector-python/en/

## Issues Found
1. **Double JSON encoding in the outbox relay** (line 83): The relay script used `json.dumps(msg['payload'])` as the message body. Since `mysql-connector-python` returns MySQL JSON columns as Python strings (already JSON-formatted), calling `json.dumps()` on them double-encodes the payload — wrapping it in extra quotes and escaping internal characters. This would cause the consumer's `json.loads(body)` to return a plain string instead of a dict, making `data['order_id']` raise a `TypeError`. **Fix:** Changed `body=json.dumps(msg['payload'])` to `body=msg['payload']`, passing the already-valid JSON string directly to RabbitMQ.

## Review Notes
- The `SELECT ... FOR UPDATE SKIP LOCKED` syntax requires MySQL 8.0+. The post does not mention this version requirement, but it is not critical since MySQL 8.0 has been GA since 2018 and is widely adopted.
- The outbox relay commits all status updates in a single batch at the end. If the process crashes mid-loop, messages already published to RabbitMQ will be re-published on the next poll. This is the expected at-least-once delivery trade-off of the outbox pattern, and the post does not claim exactly-once semantics.
- The consumer code does not handle idempotency for duplicate messages. This is a valid design concern but outside the scope of this introductory tutorial.
- The `json` import in the relay script is still present but no longer used after the fix. However, removing it would be a stylistic change — it may still be useful if the reader extends the code.
