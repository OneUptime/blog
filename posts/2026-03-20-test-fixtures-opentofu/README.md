# How to Set Up Test Fixtures for OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Testing, Fixture, Test Infrastructure, Test Setup

Description: Learn how to create and manage OpenTofu test fixtures - reusable infrastructure configurations that set up prerequisites for module testing and integration tests.

## Introduction

Test fixtures are minimal OpenTofu configurations that create the prerequisite infrastructure needed to test a module in isolation. A VPC module test might need no fixtures, but a database module test needs a VPC fixture already deployed. Good fixtures are fast to apply, cheap to run, and easy to understand.

## Fixture Structure

```text
modules/
└── database/
    ├── main.tf
    ├── outputs.tf
    ├── variables.tf
    └── tests/
        ├── unit/
        │   └── unit.tftest.hcl     # Uses mock_provider
        ├── integration/
        │   └── integration.tftest.hcl  # Uses real AWS
        └── fixtures/
            └── networking/          # Prerequisite: VPC for the DB test
                ├── main.tf
                ├── outputs.tf
                └── terraform.tfvars
```

## Creating a VPC Fixture

```hcl
# tests/fixtures/networking/main.tf

# Minimal VPC for use as a test fixture

provider "aws" {
  region = "us-east-1"
}

resource "aws_vpc" "test" {
  cidr_block           = "10.99.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = { Name = "test-fixture-vpc", Purpose = "testing" }
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.test.id
  cidr_block        = "10.99.${count.index}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = { Name = "test-fixture-private-${count.index}", Purpose = "testing" }
}

data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_db_subnet_group" "test" {
  name       = "test-fixture-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_security_group" "db" {
  name   = "test-fixture-db-sg"
  vpc_id = aws_vpc.test.id

  tags = { Name = "test-fixture-db-sg", Purpose = "testing" }
}

resource "aws_vpc_security_group_ingress_rule" "db_postgres" {
  security_group_id = aws_security_group.db.id
  cidr_ipv4         = aws_vpc.test.cidr_block
  from_port         = 5432
  to_port           = 5432
  ip_protocol       = "tcp"
}
```

```hcl
# tests/fixtures/networking/outputs.tf
output "vpc_id"             { value = aws_vpc.test.id }
output "private_subnet_ids" { value = aws_subnet.private[*].id }
output "db_subnet_group"    { value = aws_db_subnet_group.test.name }
output "db_security_group"  { value = aws_security_group.db.id }
```

## Using Fixtures in Test Files

```hcl
# tests/integration/database_test.tftest.hcl

# Reference the pre-deployed fixture
# Option 1: Deploy the fixture inline in the test
run "setup_networking" {
  command = apply

  module {
    source = "./tests/fixtures/networking"
  }
}

# Use the fixture's outputs in the module under test
run "test_database_creation" {
  command = apply

  variables {
    vpc_id          = run.setup_networking.vpc_id
    subnet_ids      = run.setup_networking.private_subnet_ids
    db_subnet_group = run.setup_networking.db_subnet_group
    security_group  = run.setup_networking.db_security_group
    environment     = "test"
    db_identifier   = "test-db-${formatdate("MMDDhhmmss", timestamp())}"
  }

  assert {
    condition     = aws_db_instance.main.status == "available"
    error_message = "Database should be in available state"
  }
}
```

## Shared Fixtures with Terraform Data Sources

```hcl
# For long-running fixtures, deploy once and reference via data source

# tests/fixtures/shared/main.tf (deployed once per test session)
# ...

# tests/fixtures/shared_lookup/main.tf
# Reference pre-existing fixture via data sources from a helper module
data "aws_vpc" "test_fixture" {
  tags = {
    Name    = "test-fixture-vpc"
    Purpose = "testing"
  }
}

data "aws_subnets" "test_fixture_private" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.test_fixture.id]
  }
  tags = {
    Purpose = "testing"
  }
}

output "vpc_id"             { value = data.aws_vpc.test_fixture.id }
output "private_subnet_ids" { value = data.aws_subnets.test_fixture_private.ids }
```

```hcl
# tests/integration/database_test.tftest.hcl
run "lookup_shared_fixture" {
  command = apply

  module {
    source = "./tests/fixtures/shared_lookup"
  }
}

run "test_with_shared_fixture" {
  command = apply

  variables {
    vpc_id     = run.lookup_shared_fixture.vpc_id
    subnet_ids = run.lookup_shared_fixture.private_subnet_ids
  }
}
```

## Fixture Lifecycle Management

```bash
#!/bin/bash
# scripts/setup-test-fixtures.sh

echo "Deploying test fixtures..."
cd tests/fixtures/networking
tofu init
tofu apply -auto-approve
FIXTURE_OUTPUTS=$(tofu output -json)

# Export fixture outputs for tests
export TEST_VPC_ID=$(echo "$FIXTURE_OUTPUTS" | jq -r '.vpc_id.value')
export TEST_SUBNET_IDS=$(echo "$FIXTURE_OUTPUTS" | jq -r '.private_subnet_ids.value | join(",")')

if [ -n "${GITHUB_ENV:-}" ]; then
  {
    echo "TEST_VPC_ID=$TEST_VPC_ID"
    echo "TEST_SUBNET_IDS=$TEST_SUBNET_IDS"
  } >> "$GITHUB_ENV"
fi

echo "Fixtures deployed: VPC=$TEST_VPC_ID"
```

```bash
#!/bin/bash
# scripts/teardown-test-fixtures.sh

echo "Destroying test fixtures..."
cd tests/fixtures/networking
tofu destroy -auto-approve
echo "Fixtures destroyed"
```

## CI/CD Integration

```yaml
# .github/workflows/integration-tests.yml
jobs:
  integration:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: opentofu/setup-opentofu@v2
      - uses: aws-actions/configure-aws-credentials@v6
        with:
          role-to-assume: ${{ vars.TEST_ROLE_ARN }}
          aws-region: us-east-1

      - name: Deploy fixtures
        run: bash scripts/setup-test-fixtures.sh

      - name: Initialize integration tests
        run: tofu init -test-directory=tests/integration

      - name: Run integration tests
        run: tofu test -test-directory=tests/integration -verbose

      - name: Teardown fixtures
        if: always()  # Always clean up
        run: bash scripts/teardown-test-fixtures.sh
```

## Conclusion

Test fixtures reduce integration test complexity by separating prerequisite infrastructure from the module under test. The `run "setup" { module { source = "./tests/fixtures/..." } }` pattern in OpenTofu test files is convenient for self-contained tests, while shared fixtures deployed once per test session are more efficient for suites with many test files that need the same prerequisites.
