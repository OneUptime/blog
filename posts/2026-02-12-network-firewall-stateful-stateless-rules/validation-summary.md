# Validation Summary: How to Use Network Firewall Stateful and Stateless Rules

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Network Firewall
- AWS VPC
- AWS CLI
- AWS Network Firewall stateless rule groups
- AWS Network Firewall stateful rule groups
- Suricata-compatible rules
- Amazon CloudWatch metrics

## Sources Consulted
- AWS Network Firewall Developer Guide: Network Firewall stateless and stateful rules engines - https://docs.aws.amazon.com/network-firewall/latest/developerguide/firewall-rules-engines.html
- AWS Network Firewall Developer Guide: Stateful domain list rule groups - https://docs.aws.amazon.com/network-firewall/latest/developerguide/stateful-rule-groups-domain-names.html
- AWS Network Firewall Developer Guide: Setting rule group capacity - https://docs.aws.amazon.com/network-firewall/latest/developerguide/nwfw-rule-group-capacity.html
- AWS Network Firewall Developer Guide: Managing evaluation order for Suricata compatible rules - https://docs.aws.amazon.com/network-firewall/latest/developerguide/suricata-rule-evaluation-order.html
- AWS CLI Command Reference: network-firewall create-rule-group - https://docs.aws.amazon.com/cli/latest/reference/network-firewall/create-rule-group.html
- AWS CLI Command Reference: network-firewall create-firewall-policy - https://docs.aws.amazon.com/cli/latest/reference/network-firewall/create-firewall-policy.html
- AWS Network Firewall Developer Guide: CloudWatch metrics - https://docs.aws.amazon.com/network-firewall/latest/developerguide/monitoring-cloudwatch.html

## Issues Found
- The post said unmatched packets in the stateless rule group hit "the default action" without specifying that this default is configured on the firewall policy. Updated the wording to identify the firewall policy's stateless default action.
- The stateful domain-list and 5-tuple examples were later referenced from a strict-order firewall policy, but the rule groups did not set compatible `StatefulRuleOptions`. Added `RuleOrder: STRICT_ORDER` to those stateful rule group examples.
- The stateful evaluation-order section reversed the default behavior. AWS Network Firewall defaults to `DEFAULT_ACTION_ORDER`, where Suricata processes pass rules before drop, reject, and alert rules. Reworded the section to describe strict order as the opt-in mode.
- The strict-order example was labeled as action-order evaluation and used an action-order policy name. Updated the comment and policy name to strict order.
- The post said strict order evaluates rules within a group by SID. AWS documentation says strict order evaluates rule groups by priority and rules within each group in the order they are defined. Corrected the explanation.
- The stateful capacity bullets were too specific for domain lists. AWS documents stateful capacity as the number of individual rules expected and recommends dry run or consumed capacity for exact sizing. Reworded the stateful capacity guidance.
- The monitoring section implied the CloudWatch metric command shows rule hits. `DroppedPackets` is an aggregate packet metric, while alert logs are needed to see rule triggers. Updated the wording to separate alert logging from aggregate metrics.

## Review Notes
The AWS CLI command shapes and JSON field names used in the examples match the current AWS CLI reference.
