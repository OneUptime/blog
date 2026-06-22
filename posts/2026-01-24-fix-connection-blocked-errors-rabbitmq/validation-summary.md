# Validation Summary: How to Fix 'Connection Blocked' Errors in RabbitMQ

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- RabbitMQ
- rabbitmqctl
- RabbitMQ resource alarms, memory alarms, disk alarms, and flow control
- RabbitMQ quorum queues and queue limits
- Pika for Python
- amqplib for Node.js
- Prometheus alerting

## Sources Consulted
- RabbitMQ Blocked Connection Notifications: https://www.rabbitmq.com/docs/connection-blocked
- RabbitMQ Memory Alarm Threshold: https://www.rabbitmq.com/docs/memory
- RabbitMQ 3.13 Memory Alarm Threshold and CQv1 paging notes: https://www.rabbitmq.com/docs/3.13/memory
- RabbitMQ Memory and Disk Alarms: https://www.rabbitmq.com/docs/alarms
- RabbitMQ Free Disk Space Alarms: https://www.rabbitmq.com/docs/disk-alarms
- RabbitMQ Configuration Reference: https://www.rabbitmq.com/docs/configure
- RabbitMQ rabbitmqctl Manual: https://www.rabbitmq.com/docs/man/rabbitmqctl.8
- RabbitMQ Prometheus and Grafana Monitoring: https://www.rabbitmq.com/docs/prometheus
- RabbitMQ Quorum Queues: https://www.rabbitmq.com/docs/quorum-queues
- Pika BlockingConnection documentation: https://pika.readthedocs.io/en/stable/modules/adapters/blocking.html
- Pika heartbeat and blocked connection timeout example: https://pika.readthedocs.io/en/stable/examples/heartbeat_and_blocked_timeouts.html
- amqplib Channel API Reference: https://amqp-node.github.io/amqplib/channel_api.html
- RabbitMQ Delayed Message Exchange plugin: https://github.com/rabbitmq/rabbitmq-delayed-message-exchange

## Issues Found
- The post described the RabbitMQ memory high watermark default as 40% without a version caveat. Updated it to 60% for RabbitMQ 4.x and noted that 40% applies to RabbitMQ 3.13 and earlier.
- The post listed file descriptor exhaustion as a direct connection-blocking trigger. Updated the wording because RabbitMQ refuses new client connections when file descriptors are exhausted; memory and disk alarms are the documented connection blocking triggers.
- The `rabbitmqctl list_connections name state blocked_by` command used a non-documented `blocked_by` field. Removed that field.
- Several `rabbitmqctl` JSON examples used `--formatter=json`; changed them to the documented `--formatter json` form.
- The queue memory script reported "Total queue memory" for only the top 10 queues. Updated it to sum all queues.
- The memory configuration example used RabbitMQ 3.x-era defaults and paging guidance without version context. Updated the default and marked `vm_memory_high_watermark_paging_ratio` as RabbitMQ 3.13/CQv1-specific.
- The "Enable Message Paging" example used `queue_master_locator = min-masters`, which is unrelated to paging and obsolete naming. Replaced it with current queue paging guidance and a CQv1-only paging example.
- The disk cleanup section recommended `rabbitmqctl reset` under "compact Mnesia database"; this deletes broker data and is not compaction. Replaced it with targeted queue purge guidance and removed the unsupported quorum checkpoint `eval` example.
- The Pika blocked/unblocked callback signatures were incorrect for `BlockingConnection`. Updated them to accept `(connection, method_frame)` and read the block reason from `method_frame.method.reason`.
- The amqplib example attempted to configure heartbeat as a socket option. Updated the default URL to include `?heartbeat=60`, which is the supported AMQP tuning parameter form.
- The Python throttling example modeled asynchronous pending confirms using `BlockingConnection`, but Pika's blocking confirm mode does not work that way. Replaced it with a simple producer-side rate throttle while keeping publisher confirms enabled.
- The delayed exchange example described plugin-based delayed delivery as built-in TTL rate limiting and included `x-max-priority` on a quorum queue. Updated the comments to call out the delayed-message plugin, removed the ignored priority argument, and used increasing per-message delay for pacing.
- The Prometheus alert used `rabbitmq_connections_state{state="blocked"}`, which is not part of the current official RabbitMQ Prometheus metric list. Replaced it with an alert based on the official resource alarm metrics.
- The related-reading links pointed to the generic blog root. Updated them to the specific OneUptime posts.

## Review Notes
Code snippets were syntax-checked for Python and JavaScript. `rabbitmqctl` was not installed in the local environment, so CLI behavior was verified against the official RabbitMQ manual instead of live command execution.
