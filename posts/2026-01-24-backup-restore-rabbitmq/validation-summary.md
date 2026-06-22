# Validation Summary: How to Backup and Restore RabbitMQ

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- RabbitMQ
- RabbitMQ Management HTTP API
- rabbitmqctl
- rabbitmqadmin
- RabbitMQ Shovel plugin
- RabbitMQ quorum queues
- Python
- Pika
- Bash
- Kubernetes CronJob
- AWS S3
- Boto3

## Sources Consulted
- RabbitMQ Definition Export and Import: https://www.rabbitmq.com/docs/definitions
- RabbitMQ Backup and Restore: https://www.rabbitmq.com/docs/backup
- RabbitMQ HTTP API Reference: https://www.rabbitmq.com/docs/next/http-api-reference
- RabbitMQ Dynamic Shovel Configuration: https://www.rabbitmq.com/docs/shovel-dynamic
- RabbitMQ Command Line Tools: https://www.rabbitmq.com/docs/cli
- Pika BlockingConnection documentation: https://pika.readthedocs.io/en/stable/modules/adapters/blocking.html
- Pika basic_get example: https://pika.readthedocs.io/en/stable/examples/blocking_basic_get.html
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Boto3 S3 documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/s3.html
- Boto3 S3 put_object documentation: https://docs.aws.amazon.com/goto/boto3/s3-2006-03-01/PutObject

## Issues Found
- The post described definitions as stored specifically in a Mnesia database. RabbitMQ documentation describes definitions as stored in the node data directory's internal database, so the data-location table was updated to avoid outdated storage-engine-specific wording.
- The message backup table suggested Shovel as a backup method for messages. RabbitMQ documentation states that backing up messages from a running node is discouraged and that message backup requires stopped-node file copies, so the table now says message backup is a file copy while stopped.
- The `rabbitmqadmin export` and `rabbitmqadmin import` examples used old syntax. They were updated to the current `rabbitmqadmin definitions export` and `rabbitmqadmin definitions import` commands.
- The `rabbitmqctl export_definitions --format=json` example used an unsupported option. It was replaced with a current vhost-specific export example using `rabbitmqadmin --vhost "/" definitions export_from_vhost`.
- The Shovel example claimed to copy queue messages to a backup queue. A shovel that consumes from `src-queue` drains that queue, so the example was changed to replicate newly routed messages from an exchange and a note was added clarifying that `src-queue` is for moving or replaying backlog, not non-destructive backup.
- The file-system backup script used `rabbitmqctl stop_app` while saying the node must be stopped for consistency. RabbitMQ documentation says message backup requires stopping the node, so the script now uses `systemctl stop rabbitmq-server` and `systemctl start rabbitmq-server`.
- The quorum queue section described a no-downtime hot backup using an Erlang `eval` checkpoint call and copying live quorum data. RabbitMQ documentation discourages live message-store backups, so the section was changed to a stopped RabbitMQ file-system backup for quorum queue data.
- Several file-system backup messages still referred narrowly to Mnesia. They were changed to "node data directory" while preserving the default `/var/lib/rabbitmq/mnesia` path used by RabbitMQ package installations.

## Review Notes
The snippets were syntax-checked locally where practical: all Python code blocks parse successfully, all Bash blocks pass `bash -n`, and the Kubernetes YAML parses successfully. The restore examples are still intentionally simplified; production restores should also account for node names, Erlang cookies, RabbitMQ version compatibility, cluster-wide shutdown requirements for replicated queue message backups, and the fact that definition imports are merged and can be partially applied on errors.
