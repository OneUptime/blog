# Validation Summary: How to Configure AWX Logging and Auditing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWX
- Ansible job output and activity stream auditing
- AWX external log aggregation
- Splunk HTTP Event Collector
- Logstash / Elastic Stack
- Kubernetes logging
- Fluent Bit
- Python requests

## Sources Consulted
- AWX logging administration documentation: https://docs.ansible.com/projects/awx/en/latest/administration/logging.html
- AWX REST API filtering documentation: https://docs.ansible.com/projects/awx/en/latest/rest_api/filtering.html
- AWX settings source for logging options: https://github.com/ansible/awx/blob/devel/awx/main/conf.py
- AWX activity stream model source: https://github.com/ansible/awx/blob/devel/awx/main/models/activity_stream.py
- AWX cleanup_jobs management command source: https://github.com/ansible/awx/blob/devel/awx/main/management/commands/cleanup_jobs.py
- AWX cleanup_activitystream management command source: https://github.com/ansible/awx/blob/devel/awx/main/management/commands/cleanup_activitystream.py
- Python datetime documentation: https://docs.python.org/3/library/datetime.html

## Issues Found
- The post described activity stream as recording login/logout events. AWX activity stream records object operations such as create, update, delete, associate, and disassociate, so the wording and diagram were corrected.
- The activity stream examples filtered on `object1=...`, which is not the right way to select related AWX objects. The examples now use related-field API filters such as `job_template__isnull=false`, `credential__isnull=false`, `role__isnull=false`, and `user__isnull=false`.
- The 24-hour activity stream command used `date -v-1d`, which is BSD/macOS-specific. It was replaced with a Python UTC timestamp expression that works on typical Linux AWX administration hosts.
- The Splunk example supplied a full HEC URL and also set `LOG_AGGREGATOR_PORT`. AWX documents the port as optional when the port is already included in the logging aggregator value, so the example now uses `null`.
- The compliance report tried to fetch login events via `object1=o_auth2_access_token`, which does not match the AWX activity stream model. This was changed to report user-object changes from the activity stream instead.
- The retention section patched `DEFAULT_JOB_TIMEOUT` and `DEFAULT_INVENTORY_UPDATE_TIMEOUT`, which are timeout settings, not retention settings. It now uses `awx-manage cleanup_jobs` and mentions Management Jobs scheduling, with a separate `cleanup_activitystream` example.
- The Python audit script used `datetime.utcnow()`, which is deprecated in current Python documentation. It now uses timezone-aware `datetime.now(timezone.utc)`.

## Review Notes
- AWX deployment names in the Kubernetes examples assume an AWX custom resource named `awx`; other installations may use different deployment names.
- Newer AWX source includes additional logger options such as `broadcast_websocket` and `job_lifecycle`. The existing logger list remains valid for the categories covered in the post.
