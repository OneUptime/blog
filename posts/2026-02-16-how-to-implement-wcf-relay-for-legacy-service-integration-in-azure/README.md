# How to Implement WCF Relay for Legacy Service Integration in Azure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, WCF Relay, Legacy Integration, SOAP, .NET, Service Bus, Hybrid

Description: Implement WCF Relay in Azure to expose legacy on-premises WCF services to cloud applications without rewriting the service layer.

---

Many enterprises still run critical business logic in WCF (Windows Communication Foundation) services. These services work, they are tested, and they handle important workflows. Rewriting them as REST APIs or gRPC services would be expensive and risky. Azure WCF Relay gives you a way to expose these legacy services to cloud applications through Azure Service Bus without modifying the WCF service code.

In this post, I will explain how WCF Relay works, walk through the configuration, and show you how to connect a cloud application to an on-premises WCF service through the relay.

## What Is WCF Relay?

WCF Relay is a feature of Azure Relay that specifically targets WCF services. It works by registering your WCF service endpoint with Azure Service Bus. The service opens an outbound connection to the relay, and clients connect to the relay endpoint instead of directly to the service. The relay bridges the two connections.

The key advantage over Hybrid Connections is that WCF Relay preserves the SOAP messaging model. Clients can use standard WCF proxies to call the service, and the service contract stays the same. It is transparent to both sides.

## Prerequisites

- An Azure subscription
- .NET Framework 4.6.2 or later (WCF is a .NET Framework technology)
- Visual Studio or the .NET CLI
- An existing WCF service you want to expose (or we will create a simple one)

## Step 1: Create the Relay Namespace

```bash
# Create the Relay namespace
az relay namespace create \
  --name my-wcf-relay-ns \
  --resource-group rg-relay \
  --location eastus

# Get the connection string for authentication
az relay namespace authorization-rule keys list \
  --name RootManageSharedAccessKey \
  --namespace-name my-wcf-relay-ns \
  --resource-group rg-relay \
  --query primaryConnectionString -o tsv
```

## Step 2: Create a Simple WCF Service

If you do not already have a WCF service, here is a simple one for demonstration.

First, define the service contract.

```csharp
// ICalculatorService.cs - Service contract definition
using System.ServiceModel;

namespace LegacyServices
{
    // This is a standard WCF service contract
    [ServiceContract(Namespace = "http://legacyservices.example.com")]
    public interface ICalculatorService
    {
        [OperationContract]
        double Add(double a, double b);

        [OperationContract]
        double Multiply(double a, double b);

        [OperationContract]
        string GetServerInfo();
    }
}
```

Then implement the service.

```csharp
// CalculatorService.cs - Service implementation
using System;

namespace LegacyServices
{
    // Standard WCF service implementation - no relay-specific code here
    public class CalculatorService : ICalculatorService
    {
        public double Add(double a, double b)
        {
            Console.WriteLine($"Add({a}, {b}) called");
            return a + b;
        }

        public double Multiply(double a, double b)
        {
            Console.WriteLine($"Multiply({a}, {b}) called");
            return a * b;
        }

        public string GetServerInfo()
        {
            return $"Server: {Environment.MachineName}, Time: {DateTime.Now}";
        }
    }
}
```

## Step 3: Configure the WCF Service to Use the Relay

The magic happens in the configuration. Install the Azure Relay NuGet package and configure the service to use a relay binding.

```bash
# Install the Azure Relay NuGet package
dotnet add package Microsoft.Azure.Relay
```

Here is the service host configuration that exposes the WCF service through Azure Relay.

```csharp
// Program.cs - Host the WCF service with Azure Relay binding
using System;
using System.ServiceModel;
using Microsoft.ServiceBus;

namespace LegacyServices.Host
{
    class Program
    {
        static void Main(string[] args)
        {
            // Azure Relay connection details
            string relayNamespace = "my-wcf-relay-ns";
            string keyName = "RootManageSharedAccessKey";
            string key = Environment.GetEnvironmentVariable("RELAY_KEY");

            // Build the relay URI
            // This is the public endpoint clients will connect to
            Uri relayAddress = ServiceBusEnvironment.CreateServiceUri(
                "sb",                    // Scheme
                relayNamespace,          // Namespace
                "calculator"             // Service path
            );

            Console.WriteLine($"Relay URI: {relayAddress}");

            // Create the service host
            ServiceHost host = new ServiceHost(typeof(CalculatorService));

            // Use the NetTcpRelayBinding for WCF relay
            var binding = new NetTcpRelayBinding();

            // Configure the relay credentials
            var endpoint = host.AddServiceEndpoint(
                typeof(ICalculatorService),
                binding,
                relayAddress
            );

            // Set the credentials for the relay
            var behavior = new TransportClientEndpointBehavior
            {
                TokenProvider = TokenProvider.CreateSharedAccessSignatureTokenProvider(
                    keyName, key
                )
            };
            endpoint.EndpointBehaviors.Add(behavior);

            // Open the service host
            host.Open();
            Console.WriteLine("WCF Relay service is running.");
            Console.WriteLine("Press Enter to stop...");
            Console.ReadLine();

            host.Close();
        }
    }
}
```

When you run this, the service registers with Azure Relay and starts listening for requests. The outbound connection is established over port 443.

## Step 4: Build the Client

The client connects to the relay endpoint and calls the WCF service just like it would call any other WCF service. The only difference is the endpoint address and the relay credential.

```csharp
// Client.cs - WCF client that calls the service through Azure Relay
using System;
using System.ServiceModel;
using Microsoft.ServiceBus;

namespace LegacyServices.Client
{
    class Program
    {
        static void Main(string[] args)
        {
            string relayNamespace = "my-wcf-relay-ns";
            string keyName = "RootManageSharedAccessKey";
            string key = Environment.GetEnvironmentVariable("RELAY_KEY");

            // Build the same relay URI the service is registered at
            Uri relayAddress = ServiceBusEnvironment.CreateServiceUri(
                "sb",
                relayNamespace,
                "calculator"
            );

            // Create the channel factory with the relay binding
            var binding = new NetTcpRelayBinding();
            var factory = new ChannelFactory<ICalculatorService>(binding, new EndpointAddress(relayAddress));

            // Add the relay credentials
            var behavior = new TransportClientEndpointBehavior
            {
                TokenProvider = TokenProvider.CreateSharedAccessSignatureTokenProvider(
                    keyName, key
                )
            };
            factory.Endpoint.EndpointBehaviors.Add(behavior);

            // Create the channel and call the service
            ICalculatorService channel = factory.CreateChannel();

            try
            {
                double sum = channel.Add(5.0, 3.0);
                Console.WriteLine($"5 + 3 = {sum}");

                double product = channel.Multiply(4.0, 7.0);
                Console.WriteLine($"4 * 7 = {product}");

                string info = channel.GetServerInfo();
                Console.WriteLine($"Server info: {info}");
            }
            finally
            {
                ((IClientChannel)channel).Close();
                factory.Close();
            }
        }
    }
}
```

## Available Relay Bindings

WCF Relay supports several binding types, each suited for different scenarios.

**NetTcpRelayBinding**: The most common choice. Provides TCP-level performance through the relay with binary message encoding.

**BasicHttpRelayBinding**: Uses HTTP and SOAP 1.1. Good for interoperability with non-WCF clients that can speak SOAP.

**WebHttpRelayBinding**: Exposes the service as a REST-like endpoint through the relay. Useful when you want to call the service from non-WCF clients using HTTP.

**NetOnewayRelayBinding**: For fire-and-forget messaging patterns where the client does not expect a response.

```csharp
// binding-examples.cs - Different relay binding configurations

// For REST-style access from non-WCF clients
var webBinding = new WebHttpRelayBinding();
webBinding.Security.RelayClientAuthenticationType = RelayClientAuthenticationType.None;

// For SOAP 1.1 interoperability
var basicBinding = new BasicHttpRelayBinding();

// For high-performance binary communication
var tcpBinding = new NetTcpRelayBinding();
tcpBinding.ConnectionMode = TcpRelayConnectionMode.Relayed; // Always relay through Azure
```

## Security Modes

WCF Relay supports different security configurations depending on your needs.

```csharp
// security-config.cs - Configuring relay security

// Relay authentication only (default)
var binding = new NetTcpRelayBinding();
binding.Security.Mode = EndToEndSecurityMode.Transport;

// No client authentication required (public endpoint)
binding.Security.RelayClientAuthenticationType = RelayClientAuthenticationType.None;

// Require client SAS authentication
binding.Security.RelayClientAuthenticationType = RelayClientAuthenticationType.RelayAccessToken;
```

When `RelayClientAuthenticationType` is set to `RelayAccessToken`, clients must present a valid SAS token to connect. When set to `None`, anyone who knows the endpoint URL can connect.

## Monitoring and Diagnostics

Enable WCF tracing to diagnose issues with the relay connection.

```xml
<!-- App.config - Enable WCF relay diagnostics -->
<system.diagnostics>
  <sources>
    <source name="System.ServiceModel" switchValue="Information, ActivityTracing">
      <listeners>
        <add name="traceListener"
             type="System.Diagnostics.XmlWriterTraceListener"
             initializeData="relay-traces.svclog"/>
      </listeners>
    </source>
  </sources>
</system.diagnostics>
```

Common issues to watch for:

- **Token expiration**: SAS tokens expire. Make sure your token provider generates fresh tokens.
- **Connection drops**: The relay connection can drop. WCF Relay handles reconnection automatically, but there is a brief period where requests may fail.
- **Timeout mismatches**: The default WCF timeout settings may be too short when going through the relay. Increase `SendTimeout` and `ReceiveTimeout` on both client and server.

## Migration Path

WCF Relay is a bridge technology. It lets you keep your existing WCF services running while you gradually modernize. A common migration path is:

1. Expose the WCF service through Azure Relay (what this post covers).
2. Build new cloud-native clients that call the service through the relay.
3. Gradually extract functionality from the WCF service into new microservices.
4. Retire the WCF service once all functionality has been migrated.

This approach avoids the big-bang rewrite and lets you move at a pace that makes sense for your team.

## Wrapping Up

WCF Relay is a pragmatic solution for integrating legacy WCF services with cloud applications. It preserves the WCF programming model, requires minimal changes to your existing service, and does not need any inbound firewall rules. Configure the relay binding, set up the SAS credentials, and your WCF service is accessible from anywhere through Azure. It is not the future of service communication, but it is an effective bridge between legacy on-premises services and modern cloud applications.
