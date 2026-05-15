# Validation Summary: How to Forward Logs to Elasticsearch or Splunk from RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- rsyslog
- rsyslog omelasticsearch
- rsyslog omhttp
- Elasticsearch
- Splunk Universal Forwarder
- Splunk HTTP Event Collector

## Sources Consulted
- rsyslog omelasticsearch official documentation: https://docs.rsyslog.com/doc/configuration/modules/omelasticsearch.html
- rsyslog omhttp official documentation: https://docs.rsyslog.com/doc/configuration/modules/omhttp.html
- rsyslog template and property documentation: https://docs.rsyslog.com/doc/configuration/templates.html
- Splunk HEC event format documentation: https://help.splunk.com/en/splunk-cloud-platform/get-started/get-data-in/10.3.2512/get-data-with-http-event-collector/format-events-for-http-event-collector
- Splunk Universal Forwarder start/stop documentation: https://docs.splunk.com/Documentation/Forwarder/latest/Forwarder/StartorStoptheuniversalforwarder
- Splunk Universal Forwarder file monitoring documentation: https://help.splunk.com/en/data-management/splunk-cloud-platform-admin-manual/10.2.2510/get-data-into-splunk-cloud-platform/forward-data-from-files-and-directories-to-splunk-cloud-platform
- Red Hat Enterprise Linux 8.2 release notes for rsyslog omhttp availability: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/pdf/8.2_release_notes/red_hat_enterprise_linux-8-8.2_release_notes-en-us.pdf

## Issues Found
- The Elasticsearch JSON template only escaped the message field. Updated the template to use `option.json="on"` so all emitted fields are JSON-safe, matching rsyslog's documented omelasticsearch pattern.
- The Splunk Universal Forwarder commands configured forwarding before starting the forwarder and accepting the license. Moved the first `splunk start --accept-license` before the CLI configuration commands, then added a restart after configuration changes.
- The Splunk HEC section installed `rsyslog-mmjsonparse`, but the configuration loads `omhttp`. Replaced that with installing `rsyslog`, which includes the HTTP output module on supported RHEL versions.
- The Splunk HEC action enabled `retry` with `retry.ruleset="splunk_retry"` but did not define that ruleset. Added a matching retry ruleset and retry template.
- The Splunk HEC batching configuration did not specify a batch format. Added `batch.format="newline"` explicitly because Splunk HEC batches multiple event objects stacked in one request, not as a JSON array.

## Review Notes
The examples still use placeholder hosts and tokens, and real deployments should configure TLS, authentication, indexes, sourcetypes, and Splunk receiver/HEC settings according to their environment.
