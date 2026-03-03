# How to Create a CDKTF Project with Python

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CDKTF, Python, Infrastructure as Code, DevOps, CDK for Terraform

Description: A practical guide to building infrastructure with CDKTF and Python, covering project setup, resource creation, custom constructs, testing with pytest, and deployment workflows.

---

Python is a natural fit for CDKTF if your team already uses it for automation, scripting, or data engineering. The syntax is clean, the ecosystem is mature, and you can integrate infrastructure code with your existing Python tooling. This guide walks through creating a CDKTF project in Python, building real infrastructure, creating reusable constructs, and testing your code.

## Project Setup

```bash
# Create the project directory
mkdir cdktf-python-demo
cd cdktf-python-demo

# Initialize a Python CDKTF project
cdktf init --template=python --local
```

This creates a virtual environment and installs the base dependencies. The project structure looks like:

```text
cdktf-python-demo/
  main.py                # Entry point
  cdktf.json             # CDKTF configuration
  Pipfile                # Python dependencies (or requirements.txt)
  help                   # Usage guide
  .gen/                  # Generated provider bindings
```

Activate the virtual environment:

```bash
# If using pipenv (default)
pipenv shell

# Or if using venv
source .venv/bin/activate
```

## Installing Providers

Add the AWS provider:

```bash
# Install pre-built AWS provider
pip install cdktf-cdktf-provider-aws

# Or add it to cdktf.json and generate bindings
# cdktf.json: "terraformProviders": ["hashicorp/aws@~> 5.0"]
# cdktf get
```

Pre-built providers are recommended because they come with type hints that Python IDEs can use for autocomplete.

## Your First Stack

```python
# main.py
from constructs import Construct
from cdktf import App, TerraformStack, TerraformOutput
from cdktf_cdktf_provider_aws.provider import AwsProvider
from cdktf_cdktf_provider_aws.vpc import Vpc
from cdktf_cdktf_provider_aws.subnet import Subnet
from cdktf_cdktf_provider_aws.instance import Instance


class WebServerStack(TerraformStack):
    def __init__(self, scope: Construct, id: str, environment: str):
        super().__init__(scope, id)

        # Configure the AWS provider
        AwsProvider(self, "aws",
            region="us-east-1",
            default_tags=[{
                "tags": {
                    "Environment": environment,
                    "ManagedBy": "cdktf",
                }
            }]
        )

        # Create a VPC
        vpc = Vpc(self, "vpc",
            cidr_block="10.0.0.0/16",
            enable_dns_hostnames=True,
            enable_dns_support=True,
            tags={"Name": f"{environment}-vpc"}
        )

        # Create a public subnet
        subnet = Subnet(self, "public-subnet",
            vpc_id=vpc.id,
            cidr_block="10.0.1.0/24",
            availability_zone="us-east-1a",
            map_public_ip_on_launch=True,
            tags={"Name": f"{environment}-public-subnet"}
        )

        # Create an EC2 instance
        instance = Instance(self, "web-server",
            ami="ami-0c02fb55956c7d316",
            instance_type="t3.micro",
            subnet_id=subnet.id,
            tags={"Name": f"{environment}-web-server"}
        )

        # Outputs
        TerraformOutput(self, "instance_id", value=instance.id)
        TerraformOutput(self, "public_ip", value=instance.public_ip)


# Create the app
app = App()
WebServerStack(app, "dev", environment="dev")
app.synth()
```

## Building a Multi-Tier Architecture

Here's a more complete example with networking, database, and compute layers:

```python
# main.py
import os
from dataclasses import dataclass, field
from typing import List
from constructs import Construct
from cdktf import App, TerraformStack, TerraformOutput, S3Backend
from cdktf_cdktf_provider_aws.provider import AwsProvider
from cdktf_cdktf_provider_aws.vpc import Vpc
from cdktf_cdktf_provider_aws.subnet import Subnet
from cdktf_cdktf_provider_aws.internet_gateway import InternetGateway
from cdktf_cdktf_provider_aws.route_table import RouteTable
from cdktf_cdktf_provider_aws.route import Route
from cdktf_cdktf_provider_aws.route_table_association import RouteTableAssociation
from cdktf_cdktf_provider_aws.security_group import SecurityGroup
from cdktf_cdktf_provider_aws.db_instance import DbInstance
from cdktf_cdktf_provider_aws.db_subnet_group import DbSubnetGroup


@dataclass
class StackConfig:
    """Configuration for the infrastructure stack."""
    environment: str
    region: str
    vpc_cidr: str
    availability_zones: List[str]
    db_password: str
    db_instance_class: str = "db.t3.micro"
    multi_az: bool = False


class NetworkingLayer(Construct):
    """Creates VPC, subnets, and routing infrastructure."""

    def __init__(self, scope: Construct, id: str, config: StackConfig):
        super().__init__(scope, id)

        # VPC
        self.vpc = Vpc(self, "vpc",
            cidr_block=config.vpc_cidr,
            enable_dns_hostnames=True,
            enable_dns_support=True,
            tags={"Name": f"{config.environment}-vpc"}
        )

        # Internet Gateway
        igw = InternetGateway(self, "igw",
            vpc_id=self.vpc.id,
            tags={"Name": f"{config.environment}-igw"}
        )

        # Public route table
        public_rt = RouteTable(self, "public-rt",
            vpc_id=self.vpc.id,
            tags={"Name": f"{config.environment}-public-rt"}
        )

        Route(self, "public-route",
            route_table_id=public_rt.id,
            destination_cidr_block="0.0.0.0/0",
            gateway_id=igw.id,
        )

        # Create subnets for each AZ
        self.public_subnets = []
        self.private_subnets = []

        for i, az in enumerate(config.availability_zones):
            # Public subnet
            public_subnet = Subnet(self, f"public-{i}",
                vpc_id=self.vpc.id,
                cidr_block=f"10.0.{i}.0/24",
                availability_zone=az,
                map_public_ip_on_launch=True,
                tags={"Name": f"{config.environment}-public-{az}"}
            )
            self.public_subnets.append(public_subnet)

            # Associate with public route table
            RouteTableAssociation(self, f"public-rta-{i}",
                subnet_id=public_subnet.id,
                route_table_id=public_rt.id,
            )

            # Private subnet
            private_subnet = Subnet(self, f"private-{i}",
                vpc_id=self.vpc.id,
                cidr_block=f"10.0.{i + 100}.0/24",
                availability_zone=az,
                tags={"Name": f"{config.environment}-private-{az}"}
            )
            self.private_subnets.append(private_subnet)


class DatabaseLayer(Construct):
    """Creates RDS database with security group and subnet group."""

    def __init__(
        self,
        scope: Construct,
        id: str,
        config: StackConfig,
        vpc_id: str,
        vpc_cidr: str,
        subnet_ids: List[str],
    ):
        super().__init__(scope, id)

        # Security group for the database
        db_sg = SecurityGroup(self, "db-sg",
            vpc_id=vpc_id,
            name=f"{config.environment}-db-sg",
            description="Security group for RDS PostgreSQL",
            ingress=[{
                "from_port": 5432,
                "to_port": 5432,
                "protocol": "tcp",
                "cidr_blocks": [vpc_cidr],
                "description": "PostgreSQL from VPC",
            }],
            egress=[{
                "from_port": 0,
                "to_port": 0,
                "protocol": "-1",
                "cidr_blocks": ["0.0.0.0/0"],
            }],
        )

        # Subnet group
        subnet_group = DbSubnetGroup(self, "db-subnet-group",
            name=f"{config.environment}-db-subnets",
            subnet_ids=subnet_ids,
        )

        # RDS instance
        self.db = DbInstance(self, "postgres",
            identifier=f"{config.environment}-postgres",
            engine="postgres",
            engine_version="15.4",
            instance_class=config.db_instance_class,
            allocated_storage=20,
            db_name="appdb",
            username="dbadmin",
            password=config.db_password,
            db_subnet_group_name=subnet_group.name,
            vpc_security_group_ids=[db_sg.id],
            skip_final_snapshot=config.environment != "prod",
            multi_az=config.multi_az,
            tags={"Name": f"{config.environment}-postgres"}
        )


class InfrastructureStack(TerraformStack):
    """Main infrastructure stack composing networking and database layers."""

    def __init__(self, scope: Construct, id: str, config: StackConfig):
        super().__init__(scope, id)

        # Provider
        AwsProvider(self, "aws",
            region=config.region,
            default_tags=[{
                "tags": {
                    "Environment": config.environment,
                    "ManagedBy": "cdktf",
                }
            }]
        )

        # Remote state backend
        S3Backend(self,
            bucket="my-terraform-state",
            key=f"cdktf/{config.environment}/terraform.tfstate",
            region=config.region,
            encrypt=True,
        )

        # Networking
        network = NetworkingLayer(self, "networking", config)

        # Database
        database = DatabaseLayer(self, "database",
            config=config,
            vpc_id=network.vpc.id,
            vpc_cidr=config.vpc_cidr,
            subnet_ids=[s.id for s in network.private_subnets],
        )

        # Outputs
        TerraformOutput(self, "vpc_id", value=network.vpc.id)
        TerraformOutput(self, "db_endpoint",
            value=database.db.endpoint,
            sensitive=True,
        )


# Environment configurations
environments = {
    "dev": StackConfig(
        environment="dev",
        region="us-east-1",
        vpc_cidr="10.0.0.0/16",
        availability_zones=["us-east-1a", "us-east-1b"],
        db_password=os.environ.get("DEV_DB_PASSWORD", "changeme"),
        db_instance_class="db.t3.micro",
        multi_az=False,
    ),
    "prod": StackConfig(
        environment="prod",
        region="us-east-1",
        vpc_cidr="10.1.0.0/16",
        availability_zones=["us-east-1a", "us-east-1b", "us-east-1c"],
        db_password=os.environ.get("PROD_DB_PASSWORD", "changeme"),
        db_instance_class="db.r6g.large",
        multi_az=True,
    ),
}

# Create stacks for each environment
app = App()
for env_name, env_config in environments.items():
    InfrastructureStack(app, env_name, env_config)
app.synth()
```

## Using Python Features Effectively

### Dictionaries for Dynamic Resources

```python
# Define services as a dictionary and create resources dynamically
services = {
    "api": {"port": 8080, "cpu": 256, "memory": 512},
    "worker": {"port": None, "cpu": 512, "memory": 1024},
    "web": {"port": 3000, "cpu": 256, "memory": 512},
}

for name, config in services.items():
    ingress_rules = []
    if config["port"]:
        ingress_rules.append({
            "from_port": config["port"],
            "to_port": config["port"],
            "protocol": "tcp",
            "cidr_blocks": [vpc_cidr],
        })

    SecurityGroup(self, f"{name}-sg",
        vpc_id=vpc.id,
        name=f"{environment}-{name}-sg",
        ingress=ingress_rules,
    )
```

### Conditional Logic

```python
# Python conditionals are much cleaner than HCL's ternary
if environment == "prod":
    instance_class = "db.r6g.large"
    multi_az = True
    backup_retention = 30
else:
    instance_class = "db.t3.micro"
    multi_az = False
    backup_retention = 7
```

## Testing with pytest

```python
# tests/test_infrastructure.py
import pytest
from cdktf import Testing
from main import InfrastructureStack, StackConfig


@pytest.fixture
def dev_config():
    return StackConfig(
        environment="test",
        region="us-east-1",
        vpc_cidr="10.0.0.0/16",
        availability_zones=["us-east-1a", "us-east-1b"],
        db_password="test-password",
    )


def test_stack_synthesizes(dev_config):
    """Test that the stack synthesizes without errors."""
    app = Testing.app()
    stack = InfrastructureStack(app, "test", dev_config)
    synthesized = Testing.synth(stack)
    assert Testing.to_be_valid_terraform(synthesized)


def test_vpc_is_created(dev_config):
    """Test that a VPC is created with the correct CIDR."""
    app = Testing.app()
    stack = InfrastructureStack(app, "test", dev_config)
    synthesized = Testing.synth(stack)
    assert Testing.to_have_resource_with_properties(
        synthesized, "aws_vpc", {"cidr_block": "10.0.0.0/16"}
    )


def test_prod_has_multi_az():
    """Test that production uses multi-AZ database."""
    prod_config = StackConfig(
        environment="prod",
        region="us-east-1",
        vpc_cidr="10.1.0.0/16",
        availability_zones=["us-east-1a", "us-east-1b", "us-east-1c"],
        db_password="test-password",
        db_instance_class="db.r6g.large",
        multi_az=True,
    )
    app = Testing.app()
    stack = InfrastructureStack(app, "test", prod_config)
    synthesized = Testing.synth(stack)
    assert Testing.to_have_resource_with_properties(
        synthesized, "aws_db_instance", {"multi_az": True}
    )
```

Run tests:

```bash
pytest tests/ -v
```

## Using Existing Terraform Modules

Reference modules from the Terraform Registry:

```json
// cdktf.json
{
  "terraformModules": [
    {
      "name": "vpc",
      "source": "terraform-aws-modules/vpc/aws",
      "version": "5.0.0"
    }
  ]
}
```

```bash
cdktf get
```

```python
from imports.vpc import Vpc as VpcModule

vpc = VpcModule(self, "vpc",
    name="my-vpc",
    cidr="10.0.0.0/16",
    azs=["us-east-1a", "us-east-1b", "us-east-1c"],
    private_subnets=["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"],
    public_subnets=["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"],
    enable_nat_gateway=True,
    single_nat_gateway=True,
)
```

## Deployment

```bash
# Synthesize to Terraform JSON
cdktf synth

# See what will change
cdktf diff dev

# Deploy
cdktf deploy dev

# Deploy with auto-approve for CI
cdktf deploy dev --auto-approve

# Destroy
cdktf destroy dev
```

## Summary

CDKTF with Python gives you clean, readable infrastructure code with the full power of Python's ecosystem. Use dataclasses for configuration, constructs for reusable components, and pytest for testing. The ability to use loops, conditionals, and inheritance makes complex infrastructure patterns much more manageable than HCL. For the setup guide, see [Install and Set Up CDKTF](https://oneuptime.com/blog/post/2026-02-23-install-setup-cdktf/view). For other languages, check our guides on [TypeScript](https://oneuptime.com/blog/post/2026-02-23-cdktf-project-typescript/view), [Go](https://oneuptime.com/blog/post/2026-02-23-cdktf-project-go/view), [Java](https://oneuptime.com/blog/post/2026-02-23-cdktf-project-java/view), and [C#](https://oneuptime.com/blog/post/2026-02-23-cdktf-project-csharp/view).
