# Validation Summary: How to Set Up Bucket Notifications in Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Rook (Ceph operator for Kubernetes)
- AWS CLI (used as S3-compatible client)
- AWS SNS API (topic management)
- AWS S3 API (bucket notification configuration)
- Apache Kafka
- AMQP / RabbitMQ

## Sources Consulted
- Ceph official documentation — Bucket Notifications: https://docs.ceph.com/en/latest/radosgw/notifications/
- Ceph official documentation — S3 Notification Compatibility: https://docs.ceph.com/en/latest/radosgw/s3-notification-compatibility/
- Ceph official documentation — Bucket Operations (S3): https://docs.ceph.com/en/latest/radosgw/s3/bucketops/
- Ceph source code (notifications.rst, s3-notification-compatibility.rst)

## Issues Found
No technical issues found.

## Review Notes
- **Port 7480**: The post uses `http://your-rgw-host:7480` throughout all examples. Port 7480 was the default for the legacy Civetweb frontend. Modern Ceph deployments using the Beast frontend (default since Luminous/Mimic) default to port 80 (HTTP) or 443 (HTTPS). Rook-managed clusters also typically expose RGW on port 80. Since the post uses `your-rgw-host` as a clear placeholder and port configuration varies by deployment, this is not a hard error, but readers using modern Ceph or Rook may need to adjust the port.
- **Topic ARN zone-group**: The ARN `arn:aws:sns:default::my-http-topic` uses `default` as the zone-group name. This is valid when the zone-group is actually named "default" (common in single-zone setups), but readers with custom zone-group names would need to substitute their own.
- The sample event payload is intentionally simplified. Real Ceph RGW event records include additional fields such as `eventTime`, `awsRegion`, `requestParameters`, `responseElements`, and `userIdentity`. The post acknowledges this with "similar to" phrasing.
- Ceph RGW also supports regex-based key filtering (a Ceph extension beyond S3), metadata attribute filtering, and object tag filtering, which are not mentioned in the post. This is fine for an introductory tutorial.
