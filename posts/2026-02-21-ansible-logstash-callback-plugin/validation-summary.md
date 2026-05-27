# Validation Summary: How to Use the Ansible logstash Callback Plugin

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible callback plugins
- `community.general.logstash` callback plugin
- Logstash TCP input, JSON codec, JSON filter, Ruby filter, Grok filter, and Elasticsearch output
- Elasticsearch composable index templates
- Kibana data views and visualizations
- Elasticsearch Watcher and ElastAlert

## Sources Consulted
- Ansible `community.general.logstash` callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/logstash_callback.html
- Ansible callback plugin documentation: https://docs.ansible.com/projects/ansible-core/devel/plugins/callback.html
- Ansible configuration settings for `callbacks_enabled`: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible `ansible.builtin.default` callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/default_callback.html
- `community.general.logstash` callback source: https://raw.githubusercontent.com/ansible-collections/community.general/main/plugins/callback/logstash.py
- Elastic Logstash TCP input plugin documentation: https://www.elastic.co/docs/reference/logstash/plugins/plugins-inputs-tcp
- Elastic Logstash JSON codec documentation: https://www.elastic.co/docs/reference/logstash/plugins/plugins-codecs-json
- Elastic Logstash JSON filter documentation: https://www.elastic.co/docs/reference/logstash/plugins/plugins-filters-json
- Elastic Logstash Ruby filter documentation: https://www.elastic.co/guide/en/logstash/current/plugins-filters-ruby.html
- Elastic Logstash Elasticsearch output documentation: https://www.elastic.co/docs/reference/logstash/plugins/plugins-outputs-elasticsearch
- Elasticsearch create or update index template API documentation: https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-put-template.html
- Kibana data views documentation: https://www.elastic.co/guide/en/kibana/current/data-views.html
- Elasticsearch Watcher webhook action documentation: https://www.elastic.co/docs/explore-analyze/alerting/watcher/actions-webhook
- Logstash persistent queues documentation: https://www.elastic.co/guide/en/logstash/master/persistent-queues.html

## Issues Found
- The prerequisites said the callback can use TCP or UDP Logstash input and either `python-logstash` or `python-logstash-async`. The callback source imports the `logstash` Python module and creates a `TCPLogstashHandler`, so I changed the prerequisite to TCP input and `python-logstash` only.
- The Ansible configuration used the older `callback_whitelist` and `ANSIBLE_CALLBACK_WHITELIST` names. I changed them to current `callbacks_enabled` and `ANSIBLE_CALLBACKS_ENABLED`.
- The Logstash TCP input used `codec => json_lines`; the official callback example and TCP input documentation use JSON decoding for JSON-over-TCP. I changed it to `codec => json`.
- The Logstash filter attempted to parse a non-existent `ansible_timestamp` field and renamed fields that later examples still queried under their original names. I removed those incorrect transformations.
- The sample event used fields that do not match the callback source (`ansible_play` instead of `ansible_play_name`) and represented `ansible_result` as an object even though the callback serializes it as a JSON string. I corrected the event examples, mapping, and advanced filter accordingly.
- The Kibana section used the older term "index pattern" and `.keyword` subfields for fields explicitly mapped as `keyword`. I updated the wording to "data view" and used the mapped field names directly.
- The Elasticsearch template included ILM rollover settings without defining the policy, write alias, or matching Logstash output behavior. I removed the rollover settings from the simple template example.
- The `curl` command omitted the URL scheme, which would be parsed incorrectly by curl. I changed it to `http://elasticsearch:9200/...`.
- The combined callbacks example used `stdout_callback = yaml`, which is outdated for current Ansible. I changed it to `ansible.builtin.default` with `callback_result_format = yaml`, and used FQCNs for the timer/profile callbacks.
- The performance section recommended `python-logstash-async`, which the callback does not use. I removed that recommendation.

## Review Notes
The callback documentation still uses "whitelisting" terminology and its example still shows `callback_whitelist`, but current Ansible configuration documentation lists `callbacks_enabled` / `ANSIBLE_CALLBACKS_ENABLED`. The post now follows the current configuration names while keeping the same tutorial intent.
