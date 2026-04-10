# Validation Summary: How to Configure Bucket Notifications to RabbitMQ in Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- RabbitMQ (AMQP broker)
- AWS CLI (S3 and SNS compatible commands against RGW)
- rabbitmqadmin CLI tool
- AMQP / AMQPS protocols

## Sources Consulted
- Ceph official documentation -- Bucket Notifications: https://docs.ceph.com/en/latest/radosgw/notifications/
- Ceph official documentation -- S3 Notification Compatibility: https://docs.ceph.com/en/latest/radosgw/s3-notification-compatibility/
- Ceph source -- notifications.rst on GitHub: https://github.com/ceph/ceph/blob/main/doc/radosgw/notifications.rst
- RabbitMQ official documentation -- Management CLI: https://www.rabbitmq.com/docs/management-cli
- RabbitMQ rabbitmqadmin source on GitHub: https://github.com/rabbitmq/rabbitmq-management/blob/master/bin/rabbitmqadmin

## Issues Found
No technical issues found.

## Review Notes
- The `amqp-ack-level` attribute "broker" is correct and is the default value. Two other valid values exist: "none" and "routable" (the latter added post-Nautilus). The blog does not enumerate all options, which is fine for a focused tutorial.
- The SSL section uses `amqps://` in the push-endpoint URI, which is sufficient to enable TLS. Ceph also supports a separate `use-ssl` attribute as an alternative way to enable SSL, but it is redundant when the `amqps://` scheme is used. The blog's approach is correct.
- The `rabbitmqadmin get queue=s3-queue` command will consume (remove) the message from the queue by default. For a non-destructive peek, `ackmode=ack_requeue_true` could be appended. Since the blog uses this in a test/verification context, consuming the message is acceptable behavior.
- Sending AMQP credentials in cleartext (non-HTTPS) requires the Ceph config option `rgw_allow_notification_secrets_in_cleartext` to be set to `true`. The blog's non-SSL example includes credentials in the AMQP URI, which may require this config flag. The SSL section addresses this for production use.
- The ARN format `arn:aws:sns:default::s3-events` is correct, where "default" is the zone-group and the empty field between the colons represents an empty tenant.
