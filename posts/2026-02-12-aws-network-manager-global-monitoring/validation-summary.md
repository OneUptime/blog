# Validation Summary: How to Use AWS Network Manager for Global Network Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Network Manager / AWS Global Networks for Transit Gateways
- AWS Transit Gateway
- AWS CLI
- Amazon EventBridge
- AWS Lambda with Python and boto3
- Amazon SNS
- Amazon CloudWatch metrics and dashboards

## Sources Consulted
- AWS Global Networks for Transit Gateways overview and pricing: https://docs.aws.amazon.com/network-manager/latest/tgwnm/what-are-global-networks.html
- AWS Global Networks for Transit Gateways workflow and supported registered attachments: https://docs.aws.amazon.com/vpc/latest/tgw/how-network-manager-works.html
- Transit gateway registration in Network Manager: https://docs.aws.amazon.com/network-manager/latest/tgwnm/tgw-registrations.html
- AWS CLI `networkmanager create-global-network`: https://docs.aws.amazon.com/cli/latest/reference/networkmanager/create-global-network.html
- AWS CLI `networkmanager register-transit-gateway`: https://docs.aws.amazon.com/cli/latest/reference/networkmanager/register-transit-gateway.html
- AWS CLI `networkmanager create-site`: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/networkmanager/create-site.html
- AWS CLI `networkmanager create-device`: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/networkmanager/create-device.html
- AWS CLI `networkmanager create-link`: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/networkmanager/create-link.html
- AWS CLI `networkmanager associate-customer-gateway`: https://docs.aws.amazon.com/cli/latest/reference/networkmanager/associate-customer-gateway.html
- AWS Network Manager events in Amazon EventBridge: https://docs.aws.amazon.com/eventbridge/latest/ref/events-ref-networkmanager.html
- AWS Global Networks for Transit Gateways EventBridge event examples: https://docs.aws.amazon.com/network-manager/latest/tgwnm/monitoring-events.html
- AWS CLI `networkmanager start-route-analysis`: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/networkmanager/start-route-analysis.html
- AWS CLI `networkmanager get-route-analysis`: https://docs.aws.amazon.com/cli/latest/reference/networkmanager/get-route-analysis.html
- AWS Transit Gateway Route Analyzer FAQ: https://aws.amazon.com/transit-gateway/faqs/
- CloudWatch metrics for AWS Transit Gateway: https://docs.aws.amazon.com/vpc/latest/tgw/transit-gateway-cloudwatch-metrics.html

## Issues Found
- Network Manager CLI commands did not specify the Network Manager home Region. Added a `NETWORK_MANAGER_REGION="us-west-2"` variable and passed `--region $NETWORK_MANAGER_REGION` to Network Manager commands so the examples use the supported home Region.
- The `create-link` example used `UploadSpeedMbps` and `DownloadSpeedMbps`, which are not valid AWS CLI bandwidth keys. Changed them to `UploadSpeed` and `DownloadSpeed`.
- The EventBridge rule omitted `Network Manager Routing Update` even though the text said routing updates are generated. Added that detail type to the event pattern.
- The EventBridge examples used default Region behavior and `us-east-1` SNS ARNs. Updated the EventBridge commands and sample SNS ARNs to `us-west-2`, matching where Network Manager events are delivered.
- The Lambda sample checked `detail.status` and `detail.resourceArn`, but Network Manager service event examples use fields such as `changeType`, `changeDescription`, and the top-level `resources` array. Updated the sample to derive severity from `changeType`, include `change_type`, read the resource from `resources`, and include the event description.
- The Route Analyzer description claimed it verifies security policies. AWS states Route Analyzer verifies Transit Gateway route tables and does not analyze security groups or network ACLs. Reworded that claim to route table verification.
- The route analysis command did not request a return-path analysis while the prose said the output shows whether the route exists in both directions. Added `--include-return-path`.

## Review Notes
The remaining examples are illustrative and still require real AWS resource IDs, a configured AWS CLI profile, IAM permissions, and existing SNS topics/Lambda wiring to run in an account. No commands were executed against AWS.
