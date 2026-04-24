# How to Use pytest-terraform with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Pytest, Python, Testing, Infrastructure Testing

Description: Learn how to use pytest-terraform to write Python-based tests for OpenTofu modules, leveraging pytest fixtures and assertions to validate deployed infrastructure.

## Introduction

pytest-terraform is a pytest plugin that provides fixtures for running OpenTofu operations within Python tests. It integrates with the pytest ecosystem - parametrize, fixtures, conftest - making it familiar to Python developers who want to test infrastructure with tools they already know.

## Installation

```bash
pip install pytest-terraform boto3
# or with uv:

uv add pytest-terraform boto3 pytest
```

## Basic Configuration

```python
# conftest.py
# No special hook is required to use OpenTofu.
# If `tofu` is on PATH, pytest-terraform will auto-detect it before `terraform`.
```

```ini
# pytest.ini
[pytest]
terraform-mod-dir = tests/fixtures
```

## Basic Module Test

```python
# test_vpc_module.py
from pytest_terraform import terraform

@terraform("vpc", scope="module")
def test_vpc_creation(vpc_vars, vpc):
    """Test that VPC is created with correct configuration."""
    # Module outputs are available via the .outputs mapping.
    vpc_id = vpc.outputs["vpc_id"]["value"]
    assert vpc_id is not None
    assert vpc_id.startswith("vpc-")

    private_subnets = vpc.outputs["private_subnet_ids"]["value"]
    assert len(private_subnets) > 0

    public_subnets = vpc.outputs["public_subnet_ids"]["value"]
    assert len(public_subnets) > 0

@terraform("vpc", scope="module")
def test_vpc_cidr(vpc_vars, vpc):
    """Test VPC CIDR block."""
    assert vpc.outputs["vpc_cidr"]["value"] == "10.99.0.0/16"
```

## Using AWS Boto3 for Validation

```python
# test_security_groups.py
import boto3
import os
from pytest_terraform import terraform

@terraform("security_groups", scope="function")
def test_security_group_no_public_ssh(security_groups):
    """Verify no security group allows SSH from 0.0.0.0/0."""
    sg_id = security_groups.outputs["web_security_group_id"]["value"]
    aws_region = os.environ.get("AWS_DEFAULT_REGION") or os.environ.get(
        "TF_VAR_aws_region", "us-east-1"
    )

    ec2 = boto3.client("ec2", region_name=aws_region)
    response = ec2.describe_security_groups(GroupIds=[sg_id])
    sg = response["SecurityGroups"][0]

    for rule in sg["IpPermissions"]:
        if rule.get("FromPort") == 22:
            for ip_range in rule.get("IpRanges", []):
                assert ip_range["CidrIp"] != "0.0.0.0/0", \
                    f"SSH port 22 is open to the internet from SG {sg_id}"
            for ipv6_range in rule.get("Ipv6Ranges", []):
                assert ipv6_range["CidrIpv6"] != "::/0", \
                    f"SSH port 22 is open to IPv6 internet from SG {sg_id}"
```

## Fixture for Terraform Variables

```python
# conftest.py
import json
import os
import pytest

@pytest.fixture(scope="session", autouse=True)
def terraform_vars():
    """Common variables for all terraform tests."""
    defaults = {
        "TF_VAR_environment": "test",
        "TF_VAR_aws_region": "us-east-1",
        "AWS_DEFAULT_REGION": "us-east-1",
    }
    monkeypatch = pytest.MonkeyPatch()
    for key, value in defaults.items():
        if key not in os.environ:
            monkeypatch.setenv(key, value)
    yield
    monkeypatch.undo()

@pytest.fixture(scope="module")
def vpc_vars(terraform_vars):
    """Variables specific to VPC tests."""
    defaults = {
        "TF_VAR_vpc_cidr": "10.99.0.0/16",
        "TF_VAR_azs": json.dumps(["us-east-1a", "us-east-1b"]),
        "TF_VAR_private_subnet_cidrs": json.dumps(["10.99.1.0/24", "10.99.2.0/24"]),
        "TF_VAR_public_subnet_cidrs": json.dumps(["10.99.101.0/24", "10.99.102.0/24"]),
    }
    monkeypatch = pytest.MonkeyPatch()
    for key, value in defaults.items():
        if key not in os.environ:
            monkeypatch.setenv(key, value)
    yield
    monkeypatch.undo()
```

## Testing with Parametrize

```python
# test_instance_types.py
import os
import pytest

@pytest.mark.parametrize("instance_type,expected_vcpus", [
    ("t3.micro", 2),
    ("t3.small", 2),
    ("t3.medium", 2),
])
def test_instance_default_vcpus(instance_type, expected_vcpus):
    """Test the default vCPU count for several T-series instance types."""
    import boto3
    aws_region = os.environ.get("AWS_DEFAULT_REGION") or os.environ.get(
        "TF_VAR_aws_region", "us-east-1"
    )
    ec2 = boto3.client("ec2", region_name=aws_region)
    types = ec2.describe_instance_types(InstanceTypes=[instance_type])
    instance_info = types["InstanceTypes"][0]
    assert instance_info["VCpuInfo"]["DefaultVCpus"] == expected_vcpus
```

## Directory Structure

```text
tests/
├── conftest.py
├── fixtures/
│   ├── vpc/
│   │   ├── main.tf          # Test fixture module
│   │   ├── outputs.tf
│   │   └── variables.tf
│   └── security_groups/
│       ├── main.tf
│       └── outputs.tf
├── test_vpc_module.py
└── test_security_groups.py
```

## Running pytest-terraform Tests

```bash
# Run all tests
pytest tests/ -v

# Run a specific test file
pytest tests/test_vpc_module.py -v

# Run with specific AWS region
TF_VAR_aws_region=us-east-1 AWS_DEFAULT_REGION=us-east-1 pytest tests/ -v

# Keep infrastructure after tests (for debugging)
# Example: set teardown=terraform.TEARDOWN_OFF on the @terraform decorator,
# then rerun the test file you want to inspect.
pytest tests/test_vpc_module.py -v

# Verbose with output capture disabled
pytest tests/ -v -s
```

## Conclusion

pytest-terraform bridges OpenTofu infrastructure testing with Python's mature testing ecosystem. Teams already using pytest for application testing can apply the same patterns - parametrize, fixtures, conftest - to infrastructure tests. The `scope="module"` option reuses deployed infrastructure across multiple test functions, reducing deployment time and cost when multiple tests validate the same infrastructure.
