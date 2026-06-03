# Validation Summary: How to Create Network Firewall with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Network Firewall
- Terraform
- HashiCorp AWS Provider
- AWS VPC routing
- AWS CloudWatch Logs
- Suricata-compatible rules

## Sources Consulted
- AWS Network Firewall Developer Guide: Stateful domain list rule groups: https://docs.aws.amazon.com/network-firewall/latest/developerguide/stateful-rule-groups-domain-names.html
- AWS Network Firewall Developer Guide: Managing evaluation order for Suricata compatible rules: https://docs.aws.amazon.com/network-firewall/latest/developerguide/suricata-rule-evaluation-order.html
- AWS Network Firewall API Reference: SyncState: https://docs.aws.amazon.com/network-firewall/latest/APIReference/API_SyncState.html
- AWS Network Firewall Developer Guide: Sending logs to Amazon CloudWatch Logs: https://docs.aws.amazon.com/network-firewall/latest/developerguide/logging-cw-logs.html
- Terraform AWS Provider documentation: aws_networkfirewall_rule_group: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/networkfirewall_rule_group
- Terraform AWS Provider documentation: aws_networkfirewall_firewall_policy: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/networkfirewall_firewall_policy
- Terraform AWS Provider documentation: aws_networkfirewall_firewall: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/networkfirewall_firewall
- Terraform AWS Provider documentation: aws_networkfirewall_logging_configuration: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/networkfirewall_logging_configuration
- OneUptime referenced blog link: https://oneuptime.com/blog/post/2026-02-02-pulumi-aws-infrastructure/view

## Issues Found
- The stateless rule labeled "Allow established TCP traffic" was not actually matching established traffic. It matched all TCP packets from `10.0.0.0/8` to any destination and used `aws:pass`, which bypasses stateful inspection. Changed the rule description and action to forward matching TCP traffic to the stateful engine.
- The firewall policy used `stateful_engine_options { rule_order = "STRICT_ORDER" }` while referencing stateful rule groups that were not configured for strict order. Terraform AWS Provider documentation requires strict-order firewall policies to reference only strict-order stateful rule groups, and strict-order priorities would also be required on the references. Removed the strict-order block so the shown policy is compatible with the listed rule groups.
- The route example selected firewall endpoint IDs by converting `sync_states` to a list and indexing by `count.index`. `sync_states` is a set, so its order is not a reliable match for Availability Zone order. Added a local map keyed by `availability_zone` and used it to select the endpoint for each public subnet's AZ.
- The logging explanation said alert logs capture traffic matching rules with alert or drop actions. Updated it to match the provider documentation more precisely: alert logs report traffic matching stateful rules configured to send log messages, and flow logs are standard network traffic flow records.
- The introduction referred broadly to "inspecting TLS traffic." Since the examples use `TLS_SNI` domain matching rather than TLS inspection configuration, changed this to "inspecting TLS SNI."

## Review Notes
The post is now technically valid as a focused example. A future expansion could show the complete subnet route table setup for both ingress and egress paths, because production Network Firewall deployments usually require additional per-AZ route tables beyond the internet gateway route table shown here.
