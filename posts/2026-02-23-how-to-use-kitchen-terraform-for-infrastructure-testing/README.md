# How to Use Kitchen-Terraform for Infrastructure Testing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Testing, Kitchen-Terraform, Ruby, InSpec, Infrastructure as Code

Description: Learn how to use Kitchen-Terraform with InSpec to write behavior-driven infrastructure tests for Terraform configurations and verify deployed resources.

---

Kitchen-Terraform is a Test Kitchen plugin that brings the familiar Kitchen workflow to Terraform testing. If you come from the Chef or Ruby world, it feels natural. You define test suites in a `.kitchen.yml` file, write verifiers using InSpec profiles, and Kitchen handles the lifecycle of creating infrastructure, running tests, and cleaning up. Even if you are new to Test Kitchen, it provides a structured approach to infrastructure testing that scales well.

## What Is Kitchen-Terraform

Kitchen-Terraform has three components:

1. **Kitchen driver** - Handles `terraform init`, `apply`, and `destroy`
2. **Kitchen provisioner** - Passes variables and configurations to Terraform
3. **Kitchen verifier** - Runs InSpec tests against the deployed infrastructure

The workflow looks like this: Kitchen creates the infrastructure using Terraform, extracts output values, passes those values to InSpec tests, and then destroys everything when done.

## Installation

Kitchen-Terraform is a Ruby gem. Install it alongside Test Kitchen and InSpec:

```bash
# Install using Bundler (recommended)
# Create a Gemfile in your project root

cat > Gemfile << 'EOF'
source "https://rubygems.org"

gem "test-kitchen", "~> 3.0"
gem "kitchen-terraform", "~> 7.0"
gem "inspec", "~> 5.0"
EOF

# Install the gems
bundle install
```

Or install directly:

```bash
gem install test-kitchen kitchen-terraform inspec
```

## Project Structure

A Kitchen-Terraform project has this layout:

```text
my-terraform-module/
  main.tf
  variables.tf
  outputs.tf
  .kitchen.yml
  Gemfile
  test/
    integration/
      default/
        controls/
          vpc_test.rb
          security_test.rb
        inspec.yml
```

## Configuring .kitchen.yml

The `.kitchen.yml` file defines your test configuration:

```yaml
# .kitchen.yml
driver:
  name: terraform
  # Root module directory
  root_module_directory: .
  # Parallelism for terraform operations
  parallelism: 4

provisioner:
  name: terraform

verifier:
  name: terraform
  systems:
    - name: default
      backend: aws
      # Pass Terraform outputs as InSpec inputs
      attrs_outputs:
        vpc_id: vpc_id
        subnet_ids: private_subnet_ids
        security_group_id: security_group_id

platforms:
  - name: aws

suites:
  - name: default
    driver:
      # Terraform variable values for this suite
      variables:
        vpc_cidr: "10.0.0.0/16"
        environment: "test"
        name: "kitchen-test"
    verifier:
      systems:
        - name: default
          backend: aws
          attrs_outputs:
            vpc_id: vpc_id
            subnet_ids: private_subnet_ids
```

## Writing InSpec Tests

InSpec tests (called controls) verify the deployed infrastructure:

```ruby
# test/integration/default/controls/vpc_test.rb
# InSpec tests for VPC infrastructure

# Read Terraform outputs passed as attributes
vpc_id = attribute("vpc_id")
subnet_ids = attribute("subnet_ids")

# Test that the VPC exists and is configured correctly
describe aws_vpc(vpc_id) do
  it { should exist }
  it { should be_available }
  its("cidr_block") { should eq "10.0.0.0/16" }
  its("state") { should eq "available" }
end

# Test that the VPC has DNS support enabled
describe aws_vpc(vpc_id) do
  its("dhcp_options_id") { should_not be_nil }
end

# Test each subnet
subnet_ids.each do |subnet_id|
  describe aws_subnet(subnet_id) do
    it { should exist }
    its("vpc_id") { should eq vpc_id }
    its("state") { should eq "available" }
  end
end
```

```ruby
# test/integration/default/controls/security_test.rb
# Security-focused infrastructure tests

security_group_id = attribute("security_group_id")

describe aws_security_group(security_group_id) do
  it { should exist }

  # Verify no unrestricted SSH access
  it { should_not allow_in(port: 22, ipv4_range: "0.0.0.0/0") }

  # Verify HTTPS is allowed
  it { should allow_in(port: 443, ipv4_range: "0.0.0.0/0") }
end

# Check that no S3 buckets are public
aws_s3_buckets.bucket_names.each do |bucket_name|
  # Only test buckets with our naming prefix
  next unless bucket_name.start_with?("kitchen-test")

  describe aws_s3_bucket(bucket_name) do
    it { should_not be_public }
    it { should have_versioning_enabled }
    it { should have_default_encryption_enabled }
  end
end
```

## InSpec Profile Configuration

Create the InSpec profile configuration:

```yaml
# test/integration/default/inspec.yml
name: terraform-infrastructure-tests
title: Infrastructure Tests
version: 1.0.0
summary: Tests for Terraform-deployed infrastructure

# Declare inputs that come from Terraform outputs
inputs:
  - name: vpc_id
    type: String
    description: VPC ID from Terraform
  - name: subnet_ids
    type: Array
    description: Subnet IDs from Terraform
  - name: security_group_id
    type: String
    description: Security group ID from Terraform

# Dependencies on InSpec resource packs
depends:
  - name: inspec-aws
    url: https://github.com/inspec/inspec-aws/archive/refs/tags/v1.83.60.tar.gz
```

## Running Kitchen Commands

Kitchen provides a set of commands that map to the test lifecycle:

```bash
# List all test suites and their status
bundle exec kitchen list

# Create the infrastructure (terraform init + apply)
bundle exec kitchen converge

# Run the InSpec tests against deployed infrastructure
bundle exec kitchen verify

# Destroy the infrastructure (terraform destroy)
bundle exec kitchen destroy

# Do everything: converge + verify + destroy
bundle exec kitchen test

# Run with debug output for troubleshooting
bundle exec kitchen test --log-level debug
```

## Multiple Test Suites

You can define multiple suites to test different configurations:

```yaml
# .kitchen.yml
driver:
  name: terraform
  root_module_directory: .

provisioner:
  name: terraform

verifier:
  name: terraform

platforms:
  - name: aws

suites:
  - name: minimal
    driver:
      variables:
        vpc_cidr: "10.0.0.0/16"
        environment: "test"
        enable_nat_gateway: false
        enable_vpn_gateway: false
    verifier:
      systems:
        - name: minimal
          backend: aws
          controls:
            - vpc_basic
          attrs_outputs:
            vpc_id: vpc_id

  - name: complete
    driver:
      variables:
        vpc_cidr: "10.1.0.0/16"
        environment: "test"
        enable_nat_gateway: true
        enable_vpn_gateway: true
        availability_zones:
          - us-east-1a
          - us-east-1b
          - us-east-1c
    verifier:
      systems:
        - name: complete
          backend: aws
          controls:
            - vpc_basic
            - vpc_nat_gateway
            - vpc_vpn
          attrs_outputs:
            vpc_id: vpc_id
            nat_gateway_ids: nat_gateway_ids
```

## Testing with Different Backends

Kitchen-Terraform supports multiple InSpec backends for testing different resource types:

```yaml
verifier:
  name: terraform
  systems:
    # Test AWS resources
    - name: aws_resources
      backend: aws
      attrs_outputs:
        vpc_id: vpc_id

    # Test SSH connectivity
    - name: ssh_connectivity
      backend: ssh
      hosts_output: instance_public_ips
      user: ubuntu
      key_files:
        - ~/.ssh/test-key.pem
      attrs_outputs:
        app_port: application_port

    # Test HTTP endpoints
    - name: http_endpoints
      backend: local
      attrs_outputs:
        api_url: api_endpoint_url
```

With an SSH backend, you can test what is running on the instances:

```ruby
# test/integration/default/controls/instance_test.rb
# Tests that run ON the deployed instance via SSH

describe service("nginx") do
  it { should be_installed }
  it { should be_enabled }
  it { should be_running }
end

describe port(80) do
  it { should be_listening }
end

describe file("/etc/nginx/nginx.conf") do
  it { should exist }
  its("content") { should match(/worker_processes auto/) }
end

app_port = attribute("app_port")
describe port(app_port) do
  it { should be_listening }
end
```

## Using Variable Files

Pass variable files to Kitchen:

```yaml
suites:
  - name: production
    driver:
      variable_files:
        - environments/production.tfvars
      variables:
        # Additional variables or overrides
        name_prefix: "kitchen-test"
```

## CI Integration

```yaml
# .github/workflows/kitchen-terraform.yml
name: Kitchen-Terraform

on:
  pull_request:
    paths:
      - 'modules/**'

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 60

    steps:
      - uses: actions/checkout@v4

      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.2'
          bundler-cache: true

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_TEST_ROLE }}
          aws-region: us-east-1

      - name: Run Kitchen Tests
        run: bundle exec kitchen test --destroy always
        env:
          AWS_REGION: us-east-1
```

## Kitchen-Terraform vs Other Testing Tools

Compared to other Terraform testing options:

- **vs Terraform native tests** - Kitchen-Terraform uses InSpec, which has a huge library of resource types and can test things like running services, file contents, and network connectivity via SSH. Native tests only check Terraform state values.

- **vs Terratest** - Kitchen-Terraform does not require Go knowledge. It uses Ruby and InSpec, which have a more declarative test syntax. Terratest is more flexible but requires writing more code.

- **vs manual testing** - Kitchen-Terraform automates the entire create-test-destroy lifecycle. Run `kitchen test` and walk away.

## Best Practices

1. **Use unique naming** - Include a random suffix in resource names to avoid conflicts between parallel test runs.

2. **Keep suites focused** - Each suite should test a specific configuration variant, not everything at once.

3. **Use the `--destroy always` flag in CI** - This ensures resources are cleaned up even if tests fail.

4. **Tag test resources** - Add tags so orphaned resources from failed CI runs can be identified and cleaned up.

5. **Start with basic controls** - Test existence and basic configuration first, then add security and compliance checks.

Kitchen-Terraform brings structure to infrastructure testing. The `.kitchen.yml` file gives you a single place to define all test configurations, and InSpec gives you a readable, auditable way to verify that your infrastructure meets your requirements.

For alternative testing approaches, see [How to Use Terratest for Go-Based Terraform Testing](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terratest-for-go-based-terraform-testing/view) and [How to Write Integration Tests for Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-write-integration-tests-for-terraform/view).
