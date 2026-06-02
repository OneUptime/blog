# Validation Summary: How to Set Up X-Ray Daemon on EC2 for Tracing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS X-Ray daemon
- Amazon EC2
- IAM instance profiles and AWS managed policies
- AWS CLI
- systemd
- X-Ray SDK for Node.js
- X-Ray SDK for Python
- OpenTelemetry

## Sources Consulted
- AWS X-Ray daemon documentation: https://docs.aws.amazon.com/xray/latest/devguide/xray-daemon.html
- Running the X-Ray daemon on Amazon EC2: https://docs.aws.amazon.com/xray/latest/devguide/xray-daemon-ec2.html
- Configuring the AWS X-Ray daemon: https://docs.aws.amazon.com/xray/latest/devguide/xray-daemon-configuration.html
- AWSXRayDaemonWriteAccess managed policy reference: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSXRayDaemonWriteAccess.html
- X-Ray SDK and Daemon support timeline: https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-daemon-timeline.html
- Tracing incoming requests with the X-Ray SDK for Node.js: https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-nodejs-middleware.html
- Configuring the X-Ray SDK for Node.js: https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-nodejs-configuration.html
- Tracing incoming requests with the X-Ray SDK for Python middleware: https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-python-middleware.html
- Configuring the X-Ray SDK for Python: https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-python-configuration.html
- Current AWS X-Ray daemon DEB package contents from the official S3 package URL, including `/etc/amazon/xray/cfg.yaml` and `xray.service`.

## Issues Found
- The sample IAM policy block was labeled as JSON but included a `//` comment, which is not valid JSON. Removed the comment and added the official `Sid` field shown in the AWS managed policy reference.
- The daemon configuration example omitted the required `Version` field. Added `Version: 2`, matching AWS daemon configuration documentation and the current packaged default configuration.
- The post did not mention that the AWS X-Ray SDKs and daemon entered maintenance mode on February 25, 2026. Added a short caveat and AWS's OpenTelemetry recommendation.
- The log rotation step used an external `logrotate` rule with `systemctl reload xray`, but the packaged service does not define a reload action and the daemon supports built-in log rotation. Replaced it with a check for `Logging.LogRotation: true`.
- The troubleshooting guidance suggested increasing `TotalBufferSizeMB` for high memory usage. Updated it to recommend setting an explicit buffer limit, since `TotalBufferSizeMB` controls the daemon's memory cap and `0` uses 1% of host memory.

## Review Notes
The install URLs, daemon binary command, systemd service name, AWS CLI commands, X-Ray daemon port behavior, IAM permissions, and Node.js/Python SDK snippets were consistent with AWS documentation. The X-Ray SDKs and daemon remain usable, but AWS now recommends OpenTelemetry for new instrumentation work.
