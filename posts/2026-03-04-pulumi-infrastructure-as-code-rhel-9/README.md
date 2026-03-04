# How to Use Pulumi for Infrastructure as Code on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Pulumi, IaC, Infrastructure, Python, Linux

Description: Install Pulumi on RHEL and use real programming languages like Python to define and deploy cloud infrastructure.

---

Pulumi takes a different approach to infrastructure as code. Instead of a domain-specific language like HCL, you write infrastructure definitions in real programming languages like Python, TypeScript, or Go. This means you get loops, conditionals, functions, and type checking out of the box.

## Install Pulumi on RHEL

```bash
# Install Pulumi using the official installer
curl -fsSL https://get.pulumi.com | sh

# Add Pulumi to your PATH
echo 'export PATH=$HOME/.pulumi/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Verify the installation
pulumi version
```

## Install Python (for Python-based Pulumi programs)

```bash
# Install Python 3.11 and pip
sudo dnf install -y python3.11 python3.11-pip

# Verify
python3.11 --version
```

## Create a New Pulumi Project

```bash
# Create a project directory
mkdir pulumi-rhel && cd pulumi-rhel

# Initialize a new Pulumi project with Python
pulumi new aws-python --name rhel-infrastructure --yes

# This creates:
# Pulumi.yaml    - Project metadata
# Pulumi.dev.yaml - Stack configuration
# __main__.py    - Your infrastructure code
# requirements.txt - Python dependencies
# venv/          - Python virtual environment
```

## Write Infrastructure Code in Python

```python
# __main__.py - Deploy RHEL infrastructure on AWS

import pulumi
import pulumi_aws as aws

# Configuration
config = pulumi.Config()
instance_type = config.get("instanceType") or "t3.medium"

# Find the latest RHEL AMI
rhel9_ami = aws.ec2.get_ami(
    most_recent=True,
    owners=["309956199498"],  # Red Hat
    filters=[
        aws.ec2.GetAmiFilterArgs(
            name="name",
            values=["RHEL-9.*_HVM-*-x86_64-*-Hourly*"],
        ),
    ],
)

# Create a VPC
vpc = aws.ec2.Vpc(
    "rhel-vpc",
    cidr_block="10.0.0.0/16",
    enable_dns_hostnames=True,
    tags={"Name": "rhel-vpc"},
)

# Create a public subnet
subnet = aws.ec2.Subnet(
    "rhel-subnet",
    vpc_id=vpc.id,
    cidr_block="10.0.1.0/24",
    map_public_ip_on_launch=True,
    tags={"Name": "rhel-subnet"},
)

# Create an internet gateway
igw = aws.ec2.InternetGateway(
    "rhel-igw",
    vpc_id=vpc.id,
    tags={"Name": "rhel-igw"},
)

# Create a route table
route_table = aws.ec2.RouteTable(
    "rhel-rt",
    vpc_id=vpc.id,
    routes=[
        aws.ec2.RouteTableRouteArgs(
            cidr_block="0.0.0.0/0",
            gateway_id=igw.id,
        ),
    ],
)

# Associate route table with subnet
aws.ec2.RouteTableAssociation(
    "rhel-rta",
    subnet_id=subnet.id,
    route_table_id=route_table.id,
)

# Security group
sg = aws.ec2.SecurityGroup(
    "rhel-sg",
    vpc_id=vpc.id,
    description="Allow SSH access",
    ingress=[
        aws.ec2.SecurityGroupIngressArgs(
            protocol="tcp",
            from_port=22,
            to_port=22,
            cidr_blocks=["0.0.0.0/0"],
        ),
    ],
    egress=[
        aws.ec2.SecurityGroupEgressArgs(
            protocol="-1",
            from_port=0,
            to_port=0,
            cidr_blocks=["0.0.0.0/0"],
        ),
    ],
)

# Create multiple RHEL instances using a loop
server_count = 3
servers = []

for i in range(server_count):
    server = aws.ec2.Instance(
        f"rhel-server-{i}",
        ami=rhel9_ami.id,
        instance_type=instance_type,
        subnet_id=subnet.id,
        vpc_security_group_ids=[sg.id],
        tags={
            "Name": f"rhel9-server-{i}",
            "Environment": "development",
        },
    )
    servers.append(server)

# Export outputs
pulumi.export("vpc_id", vpc.id)
pulumi.export("server_ips", [s.public_ip for s in servers])
pulumi.export("ami_id", rhel9_ami.id)
```

## Deploy the Stack

```bash
# Configure AWS region
pulumi config set aws:region us-east-1

# Preview the deployment
pulumi preview

# Deploy the infrastructure
pulumi up --yes

# View outputs
pulumi stack output server_ips
```

## Manage Multiple Environments

```bash
# Create a production stack
pulumi stack init prod

# Set production-specific configuration
pulumi config set instanceType t3.large

# Deploy to production
pulumi up --yes

# Switch between stacks
pulumi stack select dev
pulumi stack select prod
```

## Destroy Resources

```bash
# Tear down the infrastructure
pulumi destroy --yes

# Remove the stack entirely
pulumi stack rm dev --yes
```

## Pulumi vs Terraform

| Feature | Pulumi | Terraform |
|---------|--------|-----------|
| Language | Python, TypeScript, Go, etc. | HCL |
| Loops | Native language loops | count, for_each |
| Testing | Standard test frameworks | terraform test |
| State | Pulumi Cloud or self-managed | Local or remote backends |

Pulumi lets you use the full power of programming languages to manage RHEL infrastructure. If your team already writes Python or TypeScript, Pulumi reduces the learning curve compared to picking up a new DSL.
