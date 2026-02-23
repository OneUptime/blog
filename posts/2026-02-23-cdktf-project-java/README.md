# How to Create a CDKTF Project with Java

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CDKTF, Java, Infrastructure as Code, DevOps, CDK for Terraform

Description: A practical guide to building infrastructure with CDKTF and Java, covering Maven project setup, resource creation, custom constructs, unit testing with JUnit, and deployment patterns.

---

Java might not be the first language that comes to mind for infrastructure as code, but CDKTF's Java support is solid and particularly appealing for organizations that have standardized on the JVM. You get compile-time type checking, mature testing frameworks, and the ability to share code between your application and infrastructure projects. This guide covers building a CDKTF project with Java from setup to deployment.

## Prerequisites

You need:
- JDK 11 or later
- Maven 3.6 or later
- Node.js 18 or later (for the CDKTF CLI)
- Terraform 1.2 or later
- CDKTF CLI installed (`npm install -g cdktf-cli`)

```bash
java --version
mvn --version
cdktf --version
```

## Project Setup

```bash
mkdir cdktf-java-demo
cd cdktf-java-demo

# Initialize with the Java template
cdktf init --template=java --local
```

This creates a Maven project with the following structure:

```
cdktf-java-demo/
  src/
    main/
      java/
        com/mycompany/app/
          Main.java          # Entry point
    test/
      java/
        com/mycompany/app/
          MainTest.java      # Tests
  pom.xml                    # Maven configuration
  cdktf.json                 # CDKTF configuration
```

## Adding Providers

Add the AWS provider to `cdktf.json`:

```json
{
  "language": "java",
  "app": "mvn -e -q compile exec:java",
  "terraformProviders": [
    "hashicorp/aws@~> 5.30"
  ]
}
```

Generate the Java bindings:

```bash
cdktf get
```

This creates Java classes under `src/main/java/imports/` with builder patterns for all AWS resources.

Update dependencies:

```bash
mvn compile
```

## Basic Stack

```java
// src/main/java/com/mycompany/app/Main.java
package com.mycompany.app;

import software.constructs.Construct;
import com.hashicorp.cdktf.App;
import com.hashicorp.cdktf.TerraformStack;
import com.hashicorp.cdktf.TerraformOutput;
import com.hashicorp.cdktf.TerraformOutputConfig;

import imports.aws.provider.AwsProvider;
import imports.aws.provider.AwsProviderConfig;
import imports.aws.vpc.Vpc;
import imports.aws.vpc.VpcConfig;
import imports.aws.subnet.Subnet;
import imports.aws.subnet.SubnetConfig;
import imports.aws.instance.Instance;
import imports.aws.instance.InstanceConfig;

import java.util.Map;

public class Main extends TerraformStack {

    public Main(final Construct scope, final String id) {
        super(scope, id);

        // Configure the AWS provider
        new AwsProvider(this, "aws", AwsProviderConfig.builder()
            .region("us-east-1")
            .build());

        // Create a VPC
        Vpc vpc = new Vpc(this, "main-vpc", VpcConfig.builder()
            .cidrBlock("10.0.0.0/16")
            .enableDnsHostnames(true)
            .enableDnsSupport(true)
            .tags(Map.of("Name", "cdktf-java-vpc"))
            .build());

        // Create a subnet
        Subnet subnet = new Subnet(this, "public-subnet", SubnetConfig.builder()
            .vpcId(vpc.getId())
            .cidrBlock("10.0.1.0/24")
            .availabilityZone("us-east-1a")
            .mapPublicIpOnLaunch(true)
            .tags(Map.of("Name", "cdktf-public-subnet"))
            .build());

        // Create an EC2 instance
        Instance instance = new Instance(this, "web-server", InstanceConfig.builder()
            .ami("ami-0c02fb55956c7d316")
            .instanceType("t3.micro")
            .subnetId(subnet.getId())
            .tags(Map.of("Name", "cdktf-web-server"))
            .build());

        // Output the instance ID
        new TerraformOutput(this, "instance_id", TerraformOutputConfig.builder()
            .value(instance.getId())
            .build());
    }

    public static void main(String[] args) {
        App app = new App();
        new Main(app, "development");
        app.synth();
    }
}
```

## Configuration Class

Use a configuration class for type-safe environment settings:

```java
// src/main/java/com/mycompany/app/StackConfig.java
package com.mycompany.app;

import java.util.List;

public class StackConfig {
    private final String environment;
    private final String region;
    private final String vpcCidr;
    private final List<String> availabilityZones;
    private final String dbPassword;
    private final String dbInstanceClass;
    private final boolean multiAz;

    // Builder pattern for clean configuration
    public static class Builder {
        private String environment;
        private String region = "us-east-1";
        private String vpcCidr;
        private List<String> availabilityZones;
        private String dbPassword;
        private String dbInstanceClass = "db.t3.micro";
        private boolean multiAz = false;

        public Builder environment(String env) { this.environment = env; return this; }
        public Builder region(String region) { this.region = region; return this; }
        public Builder vpcCidr(String cidr) { this.vpcCidr = cidr; return this; }
        public Builder availabilityZones(List<String> azs) { this.availabilityZones = azs; return this; }
        public Builder dbPassword(String password) { this.dbPassword = password; return this; }
        public Builder dbInstanceClass(String cls) { this.dbInstanceClass = cls; return this; }
        public Builder multiAz(boolean multiAz) { this.multiAz = multiAz; return this; }

        public StackConfig build() {
            return new StackConfig(this);
        }
    }

    private StackConfig(Builder builder) {
        this.environment = builder.environment;
        this.region = builder.region;
        this.vpcCidr = builder.vpcCidr;
        this.availabilityZones = builder.availabilityZones;
        this.dbPassword = builder.dbPassword;
        this.dbInstanceClass = builder.dbInstanceClass;
        this.multiAz = builder.multiAz;
    }

    // Getters
    public String getEnvironment() { return environment; }
    public String getRegion() { return region; }
    public String getVpcCidr() { return vpcCidr; }
    public List<String> getAvailabilityZones() { return availabilityZones; }
    public String getDbPassword() { return dbPassword; }
    public String getDbInstanceClass() { return dbInstanceClass; }
    public boolean isMultiAz() { return multiAz; }
}
```

## Custom Constructs

Create reusable constructs for common infrastructure patterns:

```java
// src/main/java/com/mycompany/app/constructs/NetworkingConstruct.java
package com.mycompany.app.constructs;

import software.constructs.Construct;
import imports.aws.vpc.Vpc;
import imports.aws.vpc.VpcConfig;
import imports.aws.subnet.Subnet;
import imports.aws.subnet.SubnetConfig;
import imports.aws.internet_gateway.InternetGateway;
import imports.aws.internet_gateway.InternetGatewayConfig;
import imports.aws.route_table.RouteTable;
import imports.aws.route_table.RouteTableConfig;
import imports.aws.route.Route;
import imports.aws.route.RouteConfig;
import imports.aws.route_table_association.RouteTableAssociation;
import imports.aws.route_table_association.RouteTableAssociationConfig;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class NetworkingConstruct extends Construct {

    private final Vpc vpc;
    private final List<Subnet> publicSubnets = new ArrayList<>();
    private final List<Subnet> privateSubnets = new ArrayList<>();

    public NetworkingConstruct(
        Construct scope,
        String id,
        String environment,
        String vpcCidr,
        List<String> availabilityZones
    ) {
        super(scope, id);

        // Create VPC
        this.vpc = new Vpc(this, "vpc", VpcConfig.builder()
            .cidrBlock(vpcCidr)
            .enableDnsHostnames(true)
            .enableDnsSupport(true)
            .tags(Map.of("Name", environment + "-vpc"))
            .build());

        // Internet Gateway
        InternetGateway igw = new InternetGateway(this, "igw",
            InternetGatewayConfig.builder()
                .vpcId(vpc.getId())
                .tags(Map.of("Name", environment + "-igw"))
                .build());

        // Public route table
        RouteTable publicRt = new RouteTable(this, "public-rt",
            RouteTableConfig.builder()
                .vpcId(vpc.getId())
                .tags(Map.of("Name", environment + "-public-rt"))
                .build());

        new Route(this, "public-route", RouteConfig.builder()
            .routeTableId(publicRt.getId())
            .destinationCidrBlock("0.0.0.0/0")
            .gatewayId(igw.getId())
            .build());

        // Create subnets for each AZ
        for (int i = 0; i < availabilityZones.size(); i++) {
            String az = availabilityZones.get(i);

            // Public subnet
            Subnet publicSubnet = new Subnet(this, "public-" + i,
                SubnetConfig.builder()
                    .vpcId(vpc.getId())
                    .cidrBlock(String.format("10.0.%d.0/24", i))
                    .availabilityZone(az)
                    .mapPublicIpOnLaunch(true)
                    .tags(Map.of("Name", environment + "-public-" + az))
                    .build());
            publicSubnets.add(publicSubnet);

            new RouteTableAssociation(this, "public-rta-" + i,
                RouteTableAssociationConfig.builder()
                    .subnetId(publicSubnet.getId())
                    .routeTableId(publicRt.getId())
                    .build());

            // Private subnet
            Subnet privateSubnet = new Subnet(this, "private-" + i,
                SubnetConfig.builder()
                    .vpcId(vpc.getId())
                    .cidrBlock(String.format("10.0.%d.0/24", i + 100))
                    .availabilityZone(az)
                    .tags(Map.of("Name", environment + "-private-" + az))
                    .build());
            privateSubnets.add(privateSubnet);
        }
    }

    public Vpc getVpc() { return vpc; }
    public List<Subnet> getPublicSubnets() { return publicSubnets; }
    public List<Subnet> getPrivateSubnets() { return privateSubnets; }
}
```

## Composing the Full Stack

```java
// src/main/java/com/mycompany/app/InfrastructureStack.java
package com.mycompany.app;

import software.constructs.Construct;
import com.hashicorp.cdktf.TerraformStack;
import com.hashicorp.cdktf.TerraformOutput;
import com.hashicorp.cdktf.TerraformOutputConfig;
import com.hashicorp.cdktf.S3Backend;
import com.hashicorp.cdktf.S3BackendConfig;

import imports.aws.provider.AwsProvider;
import imports.aws.provider.AwsProviderConfig;
import imports.aws.provider.AwsProviderDefaultTags;

import com.mycompany.app.constructs.NetworkingConstruct;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public class InfrastructureStack extends TerraformStack {

    public InfrastructureStack(Construct scope, String id, StackConfig config) {
        super(scope, id);

        // Remote backend
        new S3Backend(this, S3BackendConfig.builder()
            .bucket("my-terraform-state")
            .key("cdktf/" + config.getEnvironment() + "/terraform.tfstate")
            .region(config.getRegion())
            .encrypt(true)
            .build());

        // Provider with default tags
        new AwsProvider(this, "aws", AwsProviderConfig.builder()
            .region(config.getRegion())
            .defaultTags(List.of(AwsProviderDefaultTags.builder()
                .tags(Map.of(
                    "Environment", config.getEnvironment(),
                    "ManagedBy", "cdktf"
                ))
                .build()))
            .build());

        // Networking
        NetworkingConstruct networking = new NetworkingConstruct(
            this, "networking",
            config.getEnvironment(),
            config.getVpcCidr(),
            config.getAvailabilityZones()
        );

        // Outputs
        new TerraformOutput(this, "vpc_id", TerraformOutputConfig.builder()
            .value(networking.getVpc().getId())
            .build());
    }
}
```

## Updated Main Class

```java
// src/main/java/com/mycompany/app/Main.java
package com.mycompany.app;

import com.hashicorp.cdktf.App;
import java.util.List;

public class Main {

    public static void main(String[] args) {
        App app = new App();

        // Dev environment
        StackConfig devConfig = new StackConfig.Builder()
            .environment("dev")
            .region("us-east-1")
            .vpcCidr("10.0.0.0/16")
            .availabilityZones(List.of("us-east-1a", "us-east-1b"))
            .dbPassword(System.getenv().getOrDefault("DEV_DB_PASSWORD", "changeme"))
            .dbInstanceClass("db.t3.micro")
            .multiAz(false)
            .build();

        // Production environment
        StackConfig prodConfig = new StackConfig.Builder()
            .environment("prod")
            .region("us-east-1")
            .vpcCidr("10.1.0.0/16")
            .availabilityZones(List.of("us-east-1a", "us-east-1b", "us-east-1c"))
            .dbPassword(System.getenv().getOrDefault("PROD_DB_PASSWORD", "changeme"))
            .dbInstanceClass("db.r6g.large")
            .multiAz(true)
            .build();

        new InfrastructureStack(app, "dev", devConfig);
        new InfrastructureStack(app, "prod", prodConfig);

        app.synth();
    }
}
```

## Writing Tests with JUnit

```java
// src/test/java/com/mycompany/app/InfrastructureStackTest.java
package com.mycompany.app;

import com.hashicorp.cdktf.Testing;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class InfrastructureStackTest {

    private StackConfig testConfig() {
        return new StackConfig.Builder()
            .environment("test")
            .region("us-east-1")
            .vpcCidr("10.0.0.0/16")
            .availabilityZones(List.of("us-east-1a", "us-east-1b"))
            .dbPassword("test-password")
            .build();
    }

    @Test
    void testStackSynthesizes() {
        // Verify the stack produces valid Terraform
        var app = Testing.app();
        var stack = new InfrastructureStack(app, "test", testConfig());
        var synthesized = Testing.synth(stack);

        assertTrue(Testing.toBeValidTerraform(synthesized));
    }

    @Test
    void testVpcIsCreated() {
        var app = Testing.app();
        var stack = new InfrastructureStack(app, "test", testConfig());
        var synthesized = Testing.synth(stack);

        assertTrue(Testing.toHaveResource(synthesized, "aws_vpc"));
    }

    @Test
    void testCorrectNumberOfSubnets() {
        var app = Testing.app();
        var config = new StackConfig.Builder()
            .environment("test")
            .region("us-east-1")
            .vpcCidr("10.0.0.0/16")
            .availabilityZones(List.of("us-east-1a", "us-east-1b", "us-east-1c"))
            .dbPassword("test-password")
            .build();
        var stack = new InfrastructureStack(app, "test", config);
        var synthesized = Testing.synth(stack);

        // Should have 3 public + 3 private = 6 subnets
        assertTrue(Testing.toHaveResource(synthesized, "aws_subnet"));
    }
}
```

Run tests:

```bash
mvn test
```

## Maven POM Configuration

The generated `pom.xml` handles most dependencies, but you may want to add:

```xml
<!-- pom.xml additions for testing -->
<dependency>
    <groupId>org.junit.jupiter</groupId>
    <artifactId>junit-jupiter</artifactId>
    <version>5.10.0</version>
    <scope>test</scope>
</dependency>
```

## Deployment

```bash
# Compile the project
mvn compile

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

CDKTF with Java brings the discipline of strongly-typed enterprise Java to infrastructure code. The builder pattern maps naturally to resource configuration, custom constructs provide clean encapsulation, and JUnit gives you battle-tested unit testing. The main downside is verbosity compared to Python or TypeScript, but for Java shops, writing infrastructure in the same language as the application reduces the learning curve significantly. For setup instructions, see [Install and Set Up CDKTF](https://oneuptime.com/blog/post/2026-02-23-install-setup-cdktf/view). For other language options, check out [TypeScript](https://oneuptime.com/blog/post/2026-02-23-cdktf-project-typescript/view), [Python](https://oneuptime.com/blog/post/2026-02-23-cdktf-project-python/view), [Go](https://oneuptime.com/blog/post/2026-02-23-cdktf-project-go/view), and [C#](https://oneuptime.com/blog/post/2026-02-23-cdktf-project-csharp/view).
