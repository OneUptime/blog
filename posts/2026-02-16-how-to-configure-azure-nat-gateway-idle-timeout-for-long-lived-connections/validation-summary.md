# Validation Summary: How to Configure Azure NAT Gateway Idle Timeout for Long-Lived Connections

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure NAT Gateway
- Azure CLI
- Azure Monitor metrics and metric alerts
- TCP idle timeout and TCP keep-alives
- Linux sysctl TCP keep-alive settings
- Python socket programming
- PostgreSQL / psycopg2 connection parameters

## Sources Consulted
- Azure NAT Gateway resource documentation: https://learn.microsoft.com/en-us/azure/nat-gateway/nat-gateway-resource
- Azure NAT Gateway overview: https://learn.microsoft.com/en-us/azure/nat-gateway/nat-overview
- Azure NAT Gateway metrics and alerts: https://learn.microsoft.com/en-us/azure/nat-gateway/nat-metrics
- Azure CLI NAT Gateway reference: https://learn.microsoft.com/en-us/cli/azure/network/nat/gateway
- Azure CLI Monitor metrics reference: https://learn.microsoft.com/en-us/cli/azure/monitor/metrics
- Azure public IP prefix CLI quickstart: https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/create-public-ip-prefix-cli
- Python socket module documentation: https://docs.python.org/3/library/socket.html
- PostgreSQL libpq connection parameters: https://www.postgresql.org/docs/current/libpq-connect.html

## Issues Found
- The Azure Monitor metric example used `DroppedPackets`, but the documented metric name is `PacketDropCount`. Updated the command to use `PacketDropCount`.
- The Azure Monitor metric example used `--metric` with multiple values. Updated it to `--metrics`, which is the documented Azure CLI parameter for a space-separated list of metric names.
- The alert example used `SNATConnectionCount > 50000` for high active SNAT usage. Microsoft recommends using `TotalConnectionCount` for total active SNAT connections and alerting around 80% of the 2 million active-connection limit, so the example now uses `TotalConnectionCount > 1600000`.
- The post said each public IP provides approximately 64,000 SNAT ports. Microsoft documents the exact value as 64,512 SNAT ports per public IP, so the wording was corrected.
- The post stated that existing connections keep their current timer after an idle-timeout update. I did not find official documentation confirming that behavior, so the sentence was replaced with a narrower statement that the setting applies at the NAT Gateway resource level.

## Review Notes
The core NAT Gateway idle-timeout explanation is accurate: TCP idle timeout defaults to 4 minutes, can be configured up to 120 minutes, traffic on the flow resets the timer, and NAT Gateway sends a unidirectional TCP RST only when it later detects traffic for a flow that no longer exists. The Python socket and psycopg2 keep-alive examples align with documented Linux/Python socket options and PostgreSQL libpq connection parameters.
