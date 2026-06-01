# Validation Summary: How to Implement WCF Relay for Legacy Service Integration in Azure

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Relay
- WCF Relay
- Azure CLI
- .NET Framework
- Windows Communication Foundation
- C#
- SOAP
- Azure Service Bus relay bindings

## Sources Consulted
- Microsoft Learn: Tutorial: Expose an on-premises Windows Communication Foundation (WCF) service to external client by using Azure WCF Relay - https://learn.microsoft.com/en-us/azure/azure-relay/service-bus-relay-tutorial
- Microsoft Learn: Azure Relay API overview - https://learn.microsoft.com/en-us/azure/azure-relay/relay-api-overview
- Microsoft Learn: Azure Relay port settings - https://learn.microsoft.com/en-us/azure/azure-relay/relay-port-settings
- Microsoft Learn: Azure CLI `az relay namespace` reference - https://learn.microsoft.com/en-us/cli/azure/relay/namespace?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az relay namespace authorization-rule` reference - https://learn.microsoft.com/en-us/cli/azure/relay/namespace/authorization-rule?view=azure-cli-latest
- Microsoft Learn: Azure WCF Relay REST tutorial - https://learn.microsoft.com/en-us/azure/azure-relay/service-bus-relay-rest-tutorial

## Issues Found
- The NuGet package command installed `Microsoft.Azure.Relay`, but the sample code uses `Microsoft.ServiceBus`, `NetTcpRelayBinding`, `TransportClientEndpointBehavior`, and `ServiceBusEnvironment`. Official Azure Relay documentation maps WCF Relay on .NET Framework to the `WindowsAzure.ServiceBus` package, so the command was changed to `dotnet add package WindowsAzure.ServiceBus`.
- The prerequisites implied that any .NET CLI project would be sufficient. WCF Relay with the shown APIs is a .NET Framework WCF programming model, so the prerequisite was clarified to Visual Studio or the .NET CLI with an SDK-style .NET Framework project.
- The post stated that the outbound connection is established over port 443. Official Azure Relay port documentation lists different WCF Relay port requirements for `NetTcpRelayBinding`, including 5671, 9352, and HTTP fallback, while port 443 is specifically documented for Hybrid Connections. The statement was changed to reference the documented WCF Relay ports.
- The post described WCF Relay as transparent to both sides. Because the sample itself requires relay bindings and SAS credentials on both host and client, the wording was adjusted to say the service contract and operation calls remain familiar WCF code while endpoints and credentials still need relay configuration.

## Review Notes
The remaining examples are consistent with the documented WCF Relay programming model and Azure CLI command shapes. For future improvement, a complete runnable sample could include project target framework guidance and separate host/client project files, but that is outside the scope of technical correction for this post.
