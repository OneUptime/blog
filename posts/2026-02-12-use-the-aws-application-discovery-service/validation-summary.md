# Validation Summary: How to Use the AWS Application Discovery Service

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- AWS Application Discovery Service
- AWS Application Discovery Service Agentless Collector
- AWS Application Discovery Agent
- AWS Migration Hub
- AWS SDK for Python (boto3)
- Python
- PowerShell
- Ansible
- VMware vCenter

## Sources Consulted
- AWS Application Discovery Service availability change: https://docs.aws.amazon.com/application-discovery/latest/userguide/application-discovery-service-availability-change.html
- Application Discovery Service Agentless Collector documentation: https://docs.aws.amazon.com/application-discovery/latest/userguide/agentless-collector.html
- AWS Application Discovery Agent installation documentation: https://docs.aws.amazon.com/application-discovery/latest/userguide/install.html
- AWS Application Discovery Service API Reference, DescribeConfigurations: https://docs.aws.amazon.com/application-discovery/latest/APIReference/API_DescribeConfigurations.html
- AWS Application Discovery Service API Reference, StartDataCollectionByAgentIds: https://docs.aws.amazon.com/application-discovery/latest/APIReference/API_StartDataCollectionByAgentIds.html
- AWS CLI v2 Reference, discovery start-export-task: https://docs.aws.amazon.com/cli/latest/reference/discovery/start-export-task.html
- AWS CLI examples for Application Discovery Service list-configurations and describe-configurations: https://docs.aws.amazon.com/cli/v1/userguide/cli_application-discovery-service_code_examples.html
- AWS Application Discovery Service export server data documentation: https://docs.aws.amazon.com/application-discovery/latest/userguide/export-server-data.html
- AWS Application Discovery Agent data fields: https://docs.aws.amazon.com/application-discovery/latest/userguide/discovery-agent.html
- AWS deprecation notice for Discovery Connector: https://aws.amazon.com/blogs/migration-and-modernization/deprecation-of-aws-application-discovery-service-discovery-connector/

## Issues Found
- AWS Application Discovery Service is no longer open to new customers as of November 7, 2025. Added this caveat and pointed new projects toward AWS Transform.
- The post described the deprecated Discovery Connector as the current agentless path. Updated the terminology and behavior to use Application Discovery Service Agentless Collector.
- The Linux, Windows, and Ansible installer examples downloaded from a us-west-2 bucket while installing for us-east-1. Updated the URLs to match the example home region.
- The Windows installer example used an MSI and msiexec parameters, but AWS documents the current installer as AWSDiscoveryAgentInstaller.exe with `/quiet`. Updated the command.
- The server listing example used a paginator for `describe_configurations`, which is not a paginated list API and does not accept `configurationType`. Changed it to the documented `list_configurations` paginator.
- The server listing example printed CPU and RAM keys that are not part of the list output. Replaced them with `server.configurationId` and `server.agentId`, which are documented list output fields.
- The export example used `agentId` and a wildcard value. `start_export_task` supports the filter name `agentIds` and selects a single Discovery Agent. Updated the example accordingly.
- The network dependency text and sample code referenced a generic `network_connections.csv` file and `bytesTransferred`, which are not the documented export names/fields. Updated the text and example to use source process connection CSV data and `occurrence`.
- The right-sizing example used nonexistent server keys such as `server.cpuNumberOfCores`, `server.totalRamInMB`, and `server.performance.maxRamUsagePct`. Updated it to use `describe_configurations`, `server.performance.numCores`, `server.performance.totalRAMInKB`, and `server.performance.minFreeRAMInKB`.

## Review Notes
The examples are still illustrative and require a configured Migration Hub home Region, existing Application Discovery Service access, valid credentials, and real agent or configuration IDs. AWS now recommends AWS Transform for new discovery projects.
