# Validation Summary: How to Set Topic Persistency and Notification Settings in Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Rook (Ceph operator for Kubernetes)
- S3-compatible bucket notifications
- Apache Kafka
- RabbitMQ/AMQP
- AWS CLI (SNS and S3 API)

## Sources Consulted
- Ceph Bucket Notifications documentation: https://docs.ceph.com/en/latest/radosgw/notifications/
- Ceph RGW config options source: https://github.com/ceph/ceph/blob/main/src/common/options/rgw.yaml.in
- Ceph notifications.rst source: https://github.com/ceph/ceph/blob/main/doc/radosgw/notifications.rst
- radosgw-admin CLI help: https://docs.ceph.com/en/latest/man/8/radosgw-admin/
- Persistent Bucket Notifications Deep Dive: https://ceph.io/en/news/blog/2021/persistent-bucket-notifications-deep-dive/

## Issues Found

1. **`rgw_enable_apis` used `pubsub` instead of `notifications`**: The correct API name to enable bucket notifications is `notifications`, not `pubsub`. The `pubsub` name refers to an older PubSub Sync Module that was deprecated. Fixed all three occurrences (Key Notification Parameters section, Rook ConfigMap, and Summary).

2. **`rgw_persist_notification` is not a real Ceph config option**: This option does not exist. Persistent delivery is enabled per-topic by setting the `persistent` attribute to `true` when creating a topic via the SNS API. The real global config options for persistent notification behavior are `rgw_topic_persistency_max_retries`, `rgw_topic_persistency_sleep_duration`, and `rgw_topic_persistency_time_to_live`. Replaced with these real options.

3. **`rgw_notification_retry_hint` is not a real Ceph config option**: This option does not exist in Ceph. The actual retry-related config is `rgw_topic_persistency_sleep_duration` (minimum time between retries). Replaced in all occurrences.

4. **`rgw_max_pending_chunks` is not a real notification config option**: This option does not exist for notifications. Replaced with `rgw_topic_persistency_time_to_live` which is an actual persistent notification config option.

5. **Misleading comment "Number of notification worker threads"**: The comment on the `rgw_notification_retry_hint` line was inaccurate even for the (non-existent) option. Corrected comments to accurately describe the replacement options.

6. **Summary section referenced non-existent config**: Updated the summary to correctly describe persistence as a per-topic attribute rather than a global config toggle.

## Review Notes
- The SNS `create-topic` command with `push-endpoint`, `kafka-ack-level`, and `persistent` attributes is correct per Ceph documentation.
- The `radosgw-admin` commands (`topic list`, `topic get`, `notification list`) are all valid.
- The S3 bucket notification configuration JSON format is correct and S3-compatible.
- The Rook `rook-config-override` ConfigMap approach for applying RGW settings is a valid pattern.
