# Validation Summary: How to Configure Prometheus Relabeling to Extract IPv4 Addresses from Targets

## Status
validated

## Post Type
Guide

## Technologies Covered
- Prometheus
- Prometheus target relabeling (`relabel_configs`)
- Consul service discovery
- YAML configuration
- RE2 regular expressions used by Prometheus relabeling

## Sources Consulted
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Go `regexp/syntax` reference for RE2-compatible grouping syntax used by Prometheus regexes: https://pkg.go.dev/regexp/syntax

## Issues Found
- The result sentence in the static target example implied all scraped series would receive `ipv4_address="10.0.0.10"` even though the config defines two targets. I corrected it to show the per-target label values Prometheus would attach after relabeling.
- The Consul introduction implied the scrape target address itself "includes service metadata." Prometheus documents Consul metadata as `__meta_consul_*` labels during relabeling, with the default scrape address assembled from `__meta_consul_address` and `__meta_consul_service_port`. I corrected the text to describe the `__meta_consul_service_address` case accurately.
- The comment on `__meta_consul_node` described it as a node address, but Prometheus defines it as the Consul node name. I corrected the comment.
- The comment on `__meta_consul_service_address` said the rule "extracts" an IPv4 address, but the snippet simply copies that label value into `ipv4_address`. I corrected the wording to match the actual relabel action.

## Review Notes
- Prometheus relabel regexes use RE2 syntax and are anchored on both ends by default. The regex examples in the post are valid for IPv4-style `host:port` targets, but they are not written to handle IPv6 addresses.
