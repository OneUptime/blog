# How to Create a CDKTF Project with Go

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CDKTF, Go, Golang, Infrastructure as Code, DevOps, CDK for Terraform

Description: A hands-on guide to building infrastructure with CDKTF and Go, covering project initialization, resource creation, custom constructs, testing, and idiomatic Go patterns for IaC.

---

Go is a strong choice for CDKTF if your team already uses it for backend services or tooling. The static typing catches issues at compile time, the language is fast, and its explicit error handling aligns well with infrastructure operations where failures need to be handled deliberately. This guide covers building a CDKTF project in Go from initialization through deployment.

## Prerequisites

Make sure you have Go 1.18 or later installed:

```bash
go version
# go version go1.22.0 darwin/amd64

# Also need Node.js for CDKTF CLI
node --version

# And the CDKTF CLI
cdktf --version
```

## Project Setup

```bash
# Create the project
mkdir cdktf-go-demo
cd cdktf-go-demo

# Initialize with the Go template
cdktf init --template=go --local
```

This generates:

```text
cdktf-go-demo/
  main.go              # Entry point
  cdktf.json           # CDKTF configuration
  go.mod               # Go module file
  go.sum               # Go dependencies
  generated/           # Generated provider bindings
```

## Adding Providers

Add the AWS provider to `cdktf.json`:

```json
{
  "language": "go",
  "app": "go run main.go",
  "terraformProviders": [
    "hashicorp/aws@~> 5.30"
  ]
}
```

Generate the Go bindings:

```bash
cdktf get
```

This creates Go packages under the `generated/` directory with full type information.

Then update your Go modules:

```bash
go mod tidy
```

## Basic Stack

```go
// main.go
package main

import (
	"github.com/aws/constructs-go/constructs/v10"
	"github.com/aws/jsii-runtime-go"
	"github.com/hashicorp/terraform-cdk-go/cdktf"

	"cdktf-go-demo/generated/hashicorp/aws/provider"
	"cdktf-go-demo/generated/hashicorp/aws/vpc"
	"cdktf-go-demo/generated/hashicorp/aws/subnet"
	"cdktf-go-demo/generated/hashicorp/aws/instance"
)

func NewMyStack(scope constructs.Construct, id string) cdktf.TerraformStack {
	stack := cdktf.NewTerraformStack(scope, &id)

	// Configure the AWS provider
	provider.NewAwsProvider(stack, jsii.String("aws"), &provider.AwsProviderConfig{
		Region: jsii.String("us-east-1"),
	})

	// Create a VPC
	mainVpc := vpc.NewVpc(stack, jsii.String("main-vpc"), &vpc.VpcConfig{
		CidrBlock:          jsii.String("10.0.0.0/16"),
		EnableDnsHostnames: jsii.Bool(true),
		EnableDnsSupport:   jsii.Bool(true),
		Tags: &map[string]*string{
			"Name": jsii.String("cdktf-vpc"),
		},
	})

	// Create a subnet
	mainSubnet := subnet.NewSubnet(stack, jsii.String("main-subnet"), &subnet.SubnetConfig{
		VpcId:               mainVpc.Id(),
		CidrBlock:           jsii.String("10.0.1.0/24"),
		AvailabilityZone:    jsii.String("us-east-1a"),
		MapPublicIpOnLaunch: jsii.Bool(true),
		Tags: &map[string]*string{
			"Name": jsii.String("cdktf-subnet"),
		},
	})

	// Create an EC2 instance
	webServer := instance.NewInstance(stack, jsii.String("web-server"), &instance.InstanceConfig{
		Ami:          jsii.String("ami-0c02fb55956c7d316"),
		InstanceType: jsii.String("t3.micro"),
		SubnetId:     mainSubnet.Id(),
		Tags: &map[string]*string{
			"Name": jsii.String("cdktf-web-server"),
		},
	})

	// Output
	cdktf.NewTerraformOutput(stack, jsii.String("instance_id"), &cdktf.TerraformOutputConfig{
		Value: webServer.Id(),
	})

	return stack
}

func main() {
	app := cdktf.NewApp(nil)
	NewMyStack(app, "development")
	app.Synth()
}
```

Note the use of `jsii.String()` and `jsii.Bool()` - these are pointer helpers required by the jsii runtime that bridges Go with the CDK construct library.

## Configuration with Structs

Use Go structs for type-safe configuration:

```go
// config.go
package main

// StackConfig holds the configuration for an infrastructure stack
type StackConfig struct {
	Environment       string
	Region            string
	VpcCidr           string
	AvailabilityZones []string
	DbPassword        string
	DbInstanceClass   string
	MultiAZ           bool
}

// DefaultDevConfig returns configuration for the dev environment
func DefaultDevConfig() StackConfig {
	return StackConfig{
		Environment:       "dev",
		Region:            "us-east-1",
		VpcCidr:           "10.0.0.0/16",
		AvailabilityZones: []string{"us-east-1a", "us-east-1b"},
		DbPassword:        getEnvOrDefault("DEV_DB_PASSWORD", "changeme"),
		DbInstanceClass:   "db.t3.micro",
		MultiAZ:           false,
	}
}

// DefaultProdConfig returns configuration for the production environment
func DefaultProdConfig() StackConfig {
	return StackConfig{
		Environment:       "prod",
		Region:            "us-east-1",
		VpcCidr:           "10.1.0.0/16",
		AvailabilityZones: []string{"us-east-1a", "us-east-1b", "us-east-1c"},
		DbPassword:        getEnvOrDefault("PROD_DB_PASSWORD", "changeme"),
		DbInstanceClass:   "db.r6g.large",
		MultiAZ:           true,
	}
}
```

## Creating Custom Constructs

Constructs in Go are implemented as functions that create related resources:

```go
// constructs/networking.go
package constructs

import (
	"fmt"

	jsii "github.com/aws/jsii-runtime-go"
	"github.com/aws/constructs-go/constructs/v10"

	"cdktf-go-demo/generated/hashicorp/aws/vpc"
	"cdktf-go-demo/generated/hashicorp/aws/subnet"
	"cdktf-go-demo/generated/hashicorp/aws/internetgateway"
	"cdktf-go-demo/generated/hashicorp/aws/routetable"
	"cdktf-go-demo/generated/hashicorp/aws/route"
	"cdktf-go-demo/generated/hashicorp/aws/routetableassociation"
)

// NetworkingOutputs holds references to created networking resources
type NetworkingOutputs struct {
	Vpc            vpc.Vpc
	PublicSubnets  []subnet.Subnet
	PrivateSubnets []subnet.Subnet
}

// NewNetworking creates a complete networking layer
func NewNetworking(
	scope constructs.Construct,
	id string,
	environment string,
	vpcCidr string,
	azs []string,
) *NetworkingOutputs {
	construct := constructs.NewConstruct(scope, jsii.String(id))

	// Create VPC
	mainVpc := vpc.NewVpc(construct, jsii.String("vpc"), &vpc.VpcConfig{
		CidrBlock:          jsii.String(vpcCidr),
		EnableDnsHostnames: jsii.Bool(true),
		EnableDnsSupport:   jsii.Bool(true),
		Tags: &map[string]*string{
			"Name": jsii.String(fmt.Sprintf("%s-vpc", environment)),
		},
	})

	// Internet Gateway
	igw := internetgateway.NewInternetGateway(construct, jsii.String("igw"),
		&internetgateway.InternetGatewayConfig{
			VpcId: mainVpc.Id(),
			Tags: &map[string]*string{
				"Name": jsii.String(fmt.Sprintf("%s-igw", environment)),
			},
		})

	// Public route table
	publicRt := routetable.NewRouteTable(construct, jsii.String("public-rt"),
		&routetable.RouteTableConfig{
			VpcId: mainVpc.Id(),
		})

	route.NewRoute(construct, jsii.String("public-route"), &route.RouteConfig{
		RouteTableId:         publicRt.Id(),
		DestinationCidrBlock: jsii.String("0.0.0.0/0"),
		GatewayId:            igw.Id(),
	})

	outputs := &NetworkingOutputs{
		Vpc: mainVpc,
	}

	// Create subnets for each AZ
	for i, az := range azs {
		// Public subnet
		pubSubnet := subnet.NewSubnet(construct,
			jsii.String(fmt.Sprintf("public-%d", i)),
			&subnet.SubnetConfig{
				VpcId:               mainVpc.Id(),
				CidrBlock:           jsii.String(fmt.Sprintf("10.0.%d.0/24", i)),
				AvailabilityZone:    jsii.String(az),
				MapPublicIpOnLaunch: jsii.Bool(true),
				Tags: &map[string]*string{
					"Name": jsii.String(fmt.Sprintf("%s-public-%s", environment, az)),
				},
			})
		outputs.PublicSubnets = append(outputs.PublicSubnets, pubSubnet)

		// Associate with route table
		routetableassociation.NewRouteTableAssociation(construct,
			jsii.String(fmt.Sprintf("public-rta-%d", i)),
			&routetableassociation.RouteTableAssociationConfig{
				SubnetId:     pubSubnet.Id(),
				RouteTableId: publicRt.Id(),
			})

		// Private subnet
		privSubnet := subnet.NewSubnet(construct,
			jsii.String(fmt.Sprintf("private-%d", i)),
			&subnet.SubnetConfig{
				VpcId:            mainVpc.Id(),
				CidrBlock:        jsii.String(fmt.Sprintf("10.0.%d.0/24", i+100)),
				AvailabilityZone: jsii.String(az),
				Tags: &map[string]*string{
					"Name": jsii.String(fmt.Sprintf("%s-private-%s", environment, az)),
				},
			})
		outputs.PrivateSubnets = append(outputs.PrivateSubnets, privSubnet)
	}

	return outputs
}
```

## Using the Construct in the Main Stack

```go
// main.go
package main

import (
	"os"

	"github.com/aws/constructs-go/constructs/v10"
	jsii "github.com/aws/jsii-runtime-go"
	"github.com/hashicorp/terraform-cdk-go/cdktf"

	"cdktf-go-demo/generated/hashicorp/aws/provider"
	myConstructs "cdktf-go-demo/constructs"
)

func NewInfraStack(scope constructs.Construct, id string, config StackConfig) cdktf.TerraformStack {
	stack := cdktf.NewTerraformStack(scope, &id)

	// Provider
	provider.NewAwsProvider(stack, jsii.String("aws"), &provider.AwsProviderConfig{
		Region: jsii.String(config.Region),
	})

	// Networking layer
	network := myConstructs.NewNetworking(
		stack, "networking",
		config.Environment,
		config.VpcCidr,
		config.AvailabilityZones,
	)

	// Outputs
	cdktf.NewTerraformOutput(stack, jsii.String("vpc_id"), &cdktf.TerraformOutputConfig{
		Value: network.Vpc.Id(),
	})

	return stack
}

func getEnvOrDefault(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}

func main() {
	app := cdktf.NewApp(nil)

	NewInfraStack(app, "dev", DefaultDevConfig())
	NewInfraStack(app, "prod", DefaultProdConfig())

	app.Synth()
}
```

## Testing

Write Go tests for your infrastructure:

```go
// main_test.go
package main

import (
	"testing"

	"github.com/hashicorp/terraform-cdk-go/cdktf"
)

func TestStackSynthesizes(t *testing.T) {
	app := cdktf.Testing_App(nil)
	config := DefaultDevConfig()
	config.DbPassword = "test-password"

	stack := NewInfraStack(app, "test", config)
	synthesized := cdktf.Testing_Synth(stack)

	if !*cdktf.Testing_ToBeValidTerraform(synthesized) {
		t.Error("Expected stack to synthesize valid Terraform")
	}
}

func TestStackCreatesVpc(t *testing.T) {
	app := cdktf.Testing_App(nil)
	config := DefaultDevConfig()
	config.DbPassword = "test-password"

	stack := NewInfraStack(app, "test", config)
	synthesized := cdktf.Testing_Synth(stack)

	hasVpc := cdktf.Testing_ToHaveResource(synthesized, jsii.String("aws_vpc"))
	if !*hasVpc {
		t.Error("Expected stack to contain a VPC resource")
	}
}
```

Run tests:

```bash
go test ./... -v
```

## Loops and Dynamic Resource Creation

Go's range and slices work naturally:

```go
// Create security groups for a list of services
type ServiceConfig struct {
	Name   string
	Port   int
	CPU    int
	Memory int
}

services := []ServiceConfig{
	{Name: "api", Port: 8080, CPU: 256, Memory: 512},
	{Name: "worker", Port: 0, CPU: 512, Memory: 1024},
	{Name: "web", Port: 3000, CPU: 256, Memory: 512},
}

for _, svc := range services {
	var ingressRules []map[string]interface{}
	if svc.Port > 0 {
		ingressRules = append(ingressRules, map[string]interface{}{
			"from_port":   svc.Port,
			"to_port":     svc.Port,
			"protocol":    "tcp",
			"cidr_blocks": []string{vpcCidr},
		})
	}

	securitygroup.NewSecurityGroup(stack,
		jsii.String(fmt.Sprintf("%s-sg", svc.Name)),
		&securitygroup.SecurityGroupConfig{
			VpcId:       mainVpc.Id(),
			Name:        jsii.String(fmt.Sprintf("%s-%s-sg", environment, svc.Name)),
			Description: jsii.String(fmt.Sprintf("Security group for %s service", svc.Name)),
		},
	)
}
```

## Deploying

```bash
# Build to make sure everything compiles
go build

# See the plan
cdktf diff dev

# Deploy
cdktf deploy dev

# Deploy with auto-approve
cdktf deploy dev --auto-approve

# Destroy
cdktf destroy dev
```

## Working with Remote State

```go
// Configure S3 backend
cdktf.NewS3Backend(stack, &cdktf.S3BackendConfig{
	Bucket:        jsii.String("my-terraform-state"),
	Key:           jsii.String(fmt.Sprintf("cdktf/%s/terraform.tfstate", config.Environment)),
	Region:        jsii.String(config.Region),
	Encrypt:       jsii.Bool(true),
	DynamodbTable: jsii.String("terraform-locks"),
})
```

## Summary

CDKTF with Go gives you compiled, type-safe infrastructure code that catches errors before you even run a plan. The main trade-off compared to TypeScript or Python is verbosity - Go's explicit nature means more code, but it also means fewer surprises at runtime. Use structs for configuration, construct functions for reusable components, and Go's standard testing package for validation. For the general CDKTF setup guide, see [Install and Set Up CDKTF](https://oneuptime.com/blog/post/2026-02-23-install-setup-cdktf/view). For other languages, check out [TypeScript](https://oneuptime.com/blog/post/2026-02-23-cdktf-project-typescript/view), [Python](https://oneuptime.com/blog/post/2026-02-23-cdktf-project-python/view), [Java](https://oneuptime.com/blog/post/2026-02-23-cdktf-project-java/view), and [C#](https://oneuptime.com/blog/post/2026-02-23-cdktf-project-csharp/view).
