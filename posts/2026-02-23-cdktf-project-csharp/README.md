# How to Create a CDKTF Project with C#

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CDKTF, C#, .NET, Infrastructure as Code, DevOps, CDK for Terraform

Description: A practical guide to building infrastructure with CDKTF and C#, covering .NET project setup, resource creation, custom constructs, unit testing with xUnit, and deployment patterns.

---

If your team works in the .NET ecosystem, CDKTF's C# support lets you write infrastructure code in the same language as your applications. You get the full power of C# - strong typing, LINQ, async patterns, and the rich .NET standard library - applied to infrastructure provisioning. This guide walks through creating a CDKTF project with C# from scratch.

## Prerequisites

You need:
- .NET 6.0 SDK or later
- Node.js 18 or later (for the CDKTF CLI)
- Terraform 1.2 or later
- CDKTF CLI installed

```bash
dotnet --version
node --version
cdktf --version
terraform --version
```

## Project Setup

```bash
mkdir cdktf-csharp-demo
cd cdktf-csharp-demo

# Initialize with the C# template
cdktf init --template=csharp --local
```

This generates a .NET project:

```text
cdktf-csharp-demo/
  Main.cs                 # Entry point
  MyStack.cs              # Stack definition
  cdktf.json              # CDKTF configuration
  cdktf-csharp-demo.csproj  # .NET project file
  .gen/                   # Generated provider bindings
```

## Adding Providers

Add the AWS provider to `cdktf.json`:

```json
{
  "language": "csharp",
  "app": "dotnet run",
  "terraformProviders": [
    "hashicorp/aws@~> 5.30"
  ]
}
```

Generate the C# bindings:

```bash
cdktf get
```

Restore packages:

```bash
dotnet restore
```

## Basic Stack

```csharp
// MyStack.cs
using Constructs;
using HashiCorp.Cdktf;
using aws.Provider;
using aws.Vpc;
using aws.Subnet;
using aws.Instance;
using System.Collections.Generic;

namespace CdktfCsharpDemo
{
    public class MyStack : TerraformStack
    {
        public MyStack(Construct scope, string id) : base(scope, id)
        {
            // Configure the AWS provider
            new AwsProvider(this, "aws", new AwsProviderConfig
            {
                Region = "us-east-1"
            });

            // Create a VPC
            var vpc = new Vpc(this, "main-vpc", new VpcConfig
            {
                CidrBlock = "10.0.0.0/16",
                EnableDnsHostnames = true,
                EnableDnsSupport = true,
                Tags = new Dictionary<string, string>
                {
                    { "Name", "cdktf-csharp-vpc" },
                    { "ManagedBy", "cdktf" }
                }
            });

            // Create a subnet
            var subnet = new Subnet(this, "public-subnet", new SubnetConfig
            {
                VpcId = vpc.Id,
                CidrBlock = "10.0.1.0/24",
                AvailabilityZone = "us-east-1a",
                MapPublicIpOnLaunch = true,
                Tags = new Dictionary<string, string>
                {
                    { "Name", "cdktf-public-subnet" }
                }
            });

            // Create an EC2 instance
            var instance = new Instance(this, "web-server", new InstanceConfig
            {
                Ami = "ami-0c02fb55956c7d316",
                InstanceType = "t3.micro",
                SubnetId = subnet.Id,
                Tags = new Dictionary<string, string>
                {
                    { "Name", "cdktf-web-server" }
                }
            });

            // Outputs
            new TerraformOutput(this, "instance_id", new TerraformOutputConfig
            {
                Value = instance.Id
            });
        }
    }
}
```

```csharp
// Main.cs
using HashiCorp.Cdktf;
using CdktfCsharpDemo;

var app = new App();
new MyStack(app, "development");
app.Synth();
```

## Configuration with Records

C# records work well for immutable configuration:

```csharp
// StackConfig.cs
using System.Collections.Generic;

namespace CdktfCsharpDemo
{
    // Record type for clean, immutable configuration
    public record StackConfig(
        string Environment,
        string Region,
        string VpcCidr,
        List<string> AvailabilityZones,
        string DbPassword,
        string DbInstanceClass = "db.t3.micro",
        bool MultiAz = false
    );

    // Predefined configurations for each environment
    public static class Environments
    {
        public static StackConfig Dev => new(
            Environment: "dev",
            Region: "us-east-1",
            VpcCidr: "10.0.0.0/16",
            AvailabilityZones: new List<string> { "us-east-1a", "us-east-1b" },
            DbPassword: System.Environment.GetEnvironmentVariable("DEV_DB_PASSWORD") ?? "changeme",
            DbInstanceClass: "db.t3.micro",
            MultiAz: false
        );

        public static StackConfig Prod => new(
            Environment: "prod",
            Region: "us-east-1",
            VpcCidr: "10.1.0.0/16",
            AvailabilityZones: new List<string> { "us-east-1a", "us-east-1b", "us-east-1c" },
            DbPassword: System.Environment.GetEnvironmentVariable("PROD_DB_PASSWORD") ?? "changeme",
            DbInstanceClass: "db.r6g.large",
            MultiAz: true
        );
    }
}
```

## Custom Constructs

Create reusable constructs as C# classes:

```csharp
// Constructs/NetworkingConstruct.cs
using Constructs;
using aws.Vpc;
using aws.Subnet;
using aws.InternetGateway;
using aws.RouteTable;
using aws.Route;
using aws.RouteTableAssociation;
using System.Collections.Generic;

namespace CdktfCsharpDemo.Constructs
{
    public class NetworkingConstruct : Construct
    {
        public Vpc Vpc { get; }
        public List<Subnet> PublicSubnets { get; } = new();
        public List<Subnet> PrivateSubnets { get; } = new();

        public NetworkingConstruct(
            Construct scope,
            string id,
            StackConfig config
        ) : base(scope, id)
        {
            // VPC
            Vpc = new Vpc(this, "vpc", new VpcConfig
            {
                CidrBlock = config.VpcCidr,
                EnableDnsHostnames = true,
                EnableDnsSupport = true,
                Tags = new Dictionary<string, string>
                {
                    { "Name", $"{config.Environment}-vpc" }
                }
            });

            // Internet Gateway
            var igw = new InternetGateway(this, "igw", new InternetGatewayConfig
            {
                VpcId = Vpc.Id,
                Tags = new Dictionary<string, string>
                {
                    { "Name", $"{config.Environment}-igw" }
                }
            });

            // Public route table
            var publicRt = new RouteTable(this, "public-rt", new RouteTableConfig
            {
                VpcId = Vpc.Id,
                Tags = new Dictionary<string, string>
                {
                    { "Name", $"{config.Environment}-public-rt" }
                }
            });

            new Route(this, "public-route", new RouteConfig
            {
                RouteTableId = publicRt.Id,
                DestinationCidrBlock = "0.0.0.0/0",
                GatewayId = igw.Id
            });

            // Create subnets for each AZ
            for (int i = 0; i < config.AvailabilityZones.Count; i++)
            {
                var az = config.AvailabilityZones[i];

                // Public subnet
                var publicSubnet = new Subnet(this, $"public-{i}", new SubnetConfig
                {
                    VpcId = Vpc.Id,
                    CidrBlock = $"10.0.{i}.0/24",
                    AvailabilityZone = az,
                    MapPublicIpOnLaunch = true,
                    Tags = new Dictionary<string, string>
                    {
                        { "Name", $"{config.Environment}-public-{az}" }
                    }
                });
                PublicSubnets.Add(publicSubnet);

                // Route table association
                new RouteTableAssociation(this, $"public-rta-{i}",
                    new RouteTableAssociationConfig
                    {
                        SubnetId = publicSubnet.Id,
                        RouteTableId = publicRt.Id
                    });

                // Private subnet
                var privateSubnet = new Subnet(this, $"private-{i}", new SubnetConfig
                {
                    VpcId = Vpc.Id,
                    CidrBlock = $"10.0.{i + 100}.0/24",
                    AvailabilityZone = az,
                    Tags = new Dictionary<string, string>
                    {
                        { "Name", $"{config.Environment}-private-{az}" }
                    }
                });
                PrivateSubnets.Add(privateSubnet);
            }
        }
    }
}
```

## Database Construct

```csharp
// Constructs/DatabaseConstruct.cs
using Constructs;
using aws.DbInstance;
using aws.DbSubnetGroup;
using aws.SecurityGroup;
using System.Collections.Generic;
using System.Linq;

namespace CdktfCsharpDemo.Constructs
{
    public class DatabaseConstruct : Construct
    {
        public DbInstance Database { get; }

        public DatabaseConstruct(
            Construct scope,
            string id,
            StackConfig config,
            string vpcId,
            string vpcCidr,
            IEnumerable<string> subnetIds
        ) : base(scope, id)
        {
            // Security group
            var dbSg = new SecurityGroup(this, "db-sg", new SecurityGroupConfig
            {
                VpcId = vpcId,
                Name = $"{config.Environment}-db-sg",
                Description = "Security group for RDS PostgreSQL",
                Ingress = new[]
                {
                    new SecurityGroupIngress
                    {
                        FromPort = 5432,
                        ToPort = 5432,
                        Protocol = "tcp",
                        CidrBlocks = new[] { vpcCidr },
                        Description = "PostgreSQL from VPC"
                    }
                },
                Egress = new[]
                {
                    new SecurityGroupEgress
                    {
                        FromPort = 0,
                        ToPort = 0,
                        Protocol = "-1",
                        CidrBlocks = new[] { "0.0.0.0/0" }
                    }
                }
            });

            // Subnet group
            var subnetGroup = new DbSubnetGroup(this, "db-subnet-group",
                new DbSubnetGroupConfig
                {
                    Name = $"{config.Environment}-db-subnets",
                    SubnetIds = subnetIds.ToArray()
                });

            // RDS instance
            Database = new DbInstance(this, "postgres", new DbInstanceConfig
            {
                Identifier = $"{config.Environment}-postgres",
                Engine = "postgres",
                EngineVersion = "15.4",
                InstanceClass = config.DbInstanceClass,
                AllocatedStorage = 20,
                DbName = "appdb",
                Username = "dbadmin",
                Password = config.DbPassword,
                DbSubnetGroupName = subnetGroup.Name,
                VpcSecurityGroupIds = new[] { dbSg.Id },
                SkipFinalSnapshot = config.Environment != "prod",
                MultiAz = config.MultiAz,
                Tags = new Dictionary<string, string>
                {
                    { "Name", $"{config.Environment}-postgres" }
                }
            });
        }
    }
}
```

## Full Stack Composition

```csharp
// InfrastructureStack.cs
using Constructs;
using HashiCorp.Cdktf;
using aws.Provider;
using CdktfCsharpDemo.Constructs;
using System.Collections.Generic;
using System.Linq;

namespace CdktfCsharpDemo
{
    public class InfrastructureStack : TerraformStack
    {
        public InfrastructureStack(Construct scope, string id, StackConfig config)
            : base(scope, id)
        {
            // Remote backend
            new S3Backend(this, new S3BackendConfig
            {
                Bucket = "my-terraform-state",
                Key = $"cdktf/{config.Environment}/terraform.tfstate",
                Region = config.Region,
                Encrypt = true
            });

            // Provider with default tags
            new AwsProvider(this, "aws", new AwsProviderConfig
            {
                Region = config.Region,
                DefaultTags = new[]
                {
                    new AwsProviderDefaultTags
                    {
                        Tags = new Dictionary<string, string>
                        {
                            { "Environment", config.Environment },
                            { "ManagedBy", "cdktf" }
                        }
                    }
                }
            });

            // Networking layer
            var networking = new NetworkingConstruct(this, "networking", config);

            // Database layer
            var database = new DatabaseConstruct(this, "database",
                config,
                networking.Vpc.Id,
                config.VpcCidr,
                networking.PrivateSubnets.Select(s => s.Id)
            );

            // Outputs
            new TerraformOutput(this, "vpc_id", new TerraformOutputConfig
            {
                Value = networking.Vpc.Id
            });

            new TerraformOutput(this, "db_endpoint", new TerraformOutputConfig
            {
                Value = database.Database.Endpoint,
                Sensitive = true
            });
        }
    }
}
```

## Updated Entry Point

```csharp
// Main.cs
using HashiCorp.Cdktf;
using CdktfCsharpDemo;

var app = new App();

new InfrastructureStack(app, "dev", Environments.Dev);
new InfrastructureStack(app, "prod", Environments.Prod);

app.Synth();
```

## Testing with xUnit

Add the test project:

```bash
dotnet new xunit -n CdktfCsharpDemo.Tests
cd CdktfCsharpDemo.Tests
dotnet add reference ../cdktf-csharp-demo.csproj
dotnet add package HashiCorp.Cdktf
```

```csharp
// Tests/InfrastructureStackTests.cs
using Xunit;
using HashiCorp.Cdktf;
using CdktfCsharpDemo;
using System.Collections.Generic;

namespace CdktfCsharpDemo.Tests
{
    public class InfrastructureStackTests
    {
        private StackConfig TestConfig => new(
            Environment: "test",
            Region: "us-east-1",
            VpcCidr: "10.0.0.0/16",
            AvailabilityZones: new List<string> { "us-east-1a", "us-east-1b" },
            DbPassword: "test-password"
        );

        [Fact]
        public void StackSynthesizesValidTerraform()
        {
            var app = Testing.App();
            var stack = new InfrastructureStack(app, "test", TestConfig);
            var synthesized = Testing.Synth(stack);

            Assert.True(Testing.ToBeValidTerraform(synthesized));
        }

        [Fact]
        public void StackCreatesVpc()
        {
            var app = Testing.App();
            var stack = new InfrastructureStack(app, "test", TestConfig);
            var synthesized = Testing.Synth(stack);

            Assert.True(Testing.ToHaveResource(synthesized, "aws_vpc"));
        }

        [Fact]
        public void ProductionUsesMultiAzDatabase()
        {
            var prodConfig = new StackConfig(
                Environment: "prod",
                Region: "us-east-1",
                VpcCidr: "10.1.0.0/16",
                AvailabilityZones: new List<string> { "us-east-1a", "us-east-1b" },
                DbPassword: "test-password",
                DbInstanceClass: "db.r6g.large",
                MultiAz: true
            );

            var app = Testing.App();
            var stack = new InfrastructureStack(app, "test", prodConfig);
            var synthesized = Testing.Synth(stack);

            Assert.True(Testing.ToHaveResourceWithProperties(
                synthesized, "aws_db_instance",
                new Dictionary<string, object> { { "multi_az", true } }
            ));
        }
    }
}
```

Run tests:

```bash
dotnet test
```

## Using LINQ for Dynamic Resources

C#'s LINQ works naturally for creating resources from collections:

```csharp
// Define services and create security groups dynamically
var services = new[]
{
    new { Name = "api", Port = 8080, Cpu = 256, Memory = 512 },
    new { Name = "worker", Port = 0, Cpu = 512, Memory = 1024 },
    new { Name = "web", Port = 3000, Cpu = 256, Memory = 512 },
};

foreach (var svc in services)
{
    var ingressRules = svc.Port > 0
        ? new[] { new SecurityGroupIngress
            {
                FromPort = svc.Port,
                ToPort = svc.Port,
                Protocol = "tcp",
                CidrBlocks = new[] { config.VpcCidr }
            }}
        : System.Array.Empty<SecurityGroupIngress>();

    new SecurityGroup(this, $"{svc.Name}-sg", new SecurityGroupConfig
    {
        VpcId = networking.Vpc.Id,
        Name = $"{config.Environment}-{svc.Name}-sg",
        Ingress = ingressRules
    });
}
```

## Deployment

```bash
# Build
dotnet build

# See the plan
cdktf diff dev

# Deploy
cdktf deploy dev

# Deploy with auto-approve
cdktf deploy dev --auto-approve

# Destroy
cdktf destroy dev
```

## Summary

CDKTF with C# brings the .NET ecosystem's strengths to infrastructure code - strong typing with records, pattern matching for conditional logic, LINQ for collection operations, and xUnit for testing. The code is more verbose than Python or TypeScript but provides excellent IDE support in Visual Studio and Rider. For .NET shops, having infrastructure and application code in the same language simplifies onboarding and code sharing. For setup instructions, see [Install and Set Up CDKTF](https://oneuptime.com/blog/post/2026-02-23-install-setup-cdktf/view). For other languages, check out [TypeScript](https://oneuptime.com/blog/post/2026-02-23-cdktf-project-typescript/view), [Python](https://oneuptime.com/blog/post/2026-02-23-cdktf-project-python/view), [Go](https://oneuptime.com/blog/post/2026-02-23-cdktf-project-go/view), and [Java](https://oneuptime.com/blog/post/2026-02-23-cdktf-project-java/view).
