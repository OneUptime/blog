# How to Run Security Benchmarks with InSpec on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, InSpec, Compliance, CIS Benchmark

Description: Learn how to install Chef InSpec on Ubuntu and run security benchmarks and compliance checks to verify your system configuration against CIS and other security standards.

---

InSpec is an open-source framework for writing and running compliance checks as code. You describe the desired security state of a system using a Ruby-based DSL, and InSpec verifies whether the actual system matches those expectations. This makes compliance auditing repeatable, version-controllable, and automatable. Rather than manually checking dozens of security settings, you run a single command and get a detailed pass/fail report against CIS benchmarks, DISA STIGs, or your own custom policies.

## Installing InSpec on Ubuntu

InSpec is distributed by Progress Chef. Install it from their official package repository.

```bash
# Install required dependencies
sudo apt-get update
sudo apt-get install -y curl wget

# Download and install InSpec (check https://community.chef.io/downloads/tools/inspec for latest version)
INSPEC_VERSION="6.6.0"
curl -LO "https://packages.chef.io/files/stable/inspec/${INSPEC_VERSION}/ubuntu/22.04/inspec_${INSPEC_VERSION}-1_amd64.deb"

# Install the package
sudo dpkg -i "inspec_${INSPEC_VERSION}-1_amd64.deb"

# Verify installation
inspec version

# Accept the license (required on first use)
inspec --chef-license accept
```

Alternatively, use the install script:

```bash
# One-line install script from Chef
curl https://omnitruck.chef.io/install.sh | sudo bash -s -- -P inspec

# Accept license
inspec --chef-license accept
```

## Understanding InSpec Concepts

Before running profiles, understand the key concepts:

- **Control** - A single compliance check (e.g., "Password complexity must require 8+ characters")
- **Profile** - A collection of controls organized around a compliance standard
- **Resource** - InSpec's built-in abstractions for system components (files, packages, services, users, etc.)
- **Target** - The system being checked (local, SSH remote, Docker container, cloud API)

## Running Your First Check

Start with a simple inline check to verify InSpec is working:

```bash
# Run a one-off InSpec check (no profile required)
# Check that SSH is configured securely
inspec exec -e 'describe sshd_config do; its("PermitRootLogin") { should eq "no" }; end'

# Check that a specific file has correct permissions
inspec exec -e '
describe file("/etc/passwd") do
  it { should exist }
  it { should be_file }
  its("mode") { should cmp "0644" }
  its("owner") { should eq "root" }
end
'
```

## Using Community Profiles

The InSpec community maintains profiles for major compliance frameworks. The most widely used is the CIS Ubuntu Linux benchmark.

```bash
# Run the CIS Ubuntu 22.04 L1 benchmark profile from Chef Supermarket
# This checks against Center for Internet Security Level 1 recommendations
inspec exec https://github.com/dev-sec/linux-baseline \
  --chef-license accept

# Run CIS Ubuntu 22.04 benchmark (requires Supermarket account for some)
inspec exec https://github.com/nicholasfountain/cis-ubuntu-22.04-level1-hardening \
  --chef-license accept

# Save results to JSON for further processing
inspec exec https://github.com/dev-sec/linux-baseline \
  --chef-license accept \
  --reporter json:/tmp/inspec-results.json cli
```

A popular community profile for general Linux hardening:

```bash
# Clone and run the dev-sec Linux baseline profile
git clone https://github.com/dev-sec/linux-baseline.git /opt/inspec-profiles/linux-baseline

# Run the profile against the local system
inspec exec /opt/inspec-profiles/linux-baseline \
  --chef-license accept

# Run against a remote host via SSH
inspec exec /opt/inspec-profiles/linux-baseline \
  -t ssh://ubuntu@192.168.1.50 \
  -i ~/.ssh/id_rsa \
  --chef-license accept
```

## Writing Custom Controls

Custom controls let you check organization-specific requirements that community profiles don't cover.

### Creating a Profile

```bash
# Create a new InSpec profile
inspec init profile my-company-baseline

# Directory structure created:
# my-company-baseline/
#   controls/
#     example.rb
#   inspec.yml
#   README.md
```

### Writing Controls

```ruby
# my-company-baseline/controls/system-checks.rb

# Control 1: Verify NTP/Chrony is running
control "sys-001" do
  impact 0.7                        # 0.0-1.0 severity
  title "Time synchronization must be enabled"
  desc "System time must be synchronized with NTP to ensure accurate logging"
  tag "CIS": ["2.1.1"]

  describe service("chronyd") do
    it { should be_installed }
    it { should be_enabled }
    it { should be_running }
  end
end

# Control 2: Verify SSH configuration
control "ssh-001" do
  impact 1.0
  title "SSH must not allow root login"
  desc "Direct root login via SSH increases exposure to brute force attacks"
  tag "CIS": ["5.2.8"]

  describe sshd_config do
    its("PermitRootLogin") { should eq "no" }
    its("PasswordAuthentication") { should eq "no" }
    its("MaxAuthTries") { should cmp <= 4 }
    its("Protocol") { should eq "2" }
    its("X11Forwarding") { should eq "no" }
  end
end

# Control 3: Check password policies
control "auth-001" do
  impact 0.8
  title "Password complexity requirements must be configured"
  desc "Weak passwords increase risk of unauthorized access"

  describe file("/etc/security/pwquality.conf") do
    it { should exist }
    its("content") { should match(/minlen\s*=\s*([89]|[1-9][0-9]+)/) }
    its("content") { should match(/minclass\s*=\s*[3-4]/) }
    its("content") { should match(/dcredit\s*=\s*-[1-9]/) }
  end
end

# Control 4: Check file permissions on sensitive files
control "file-001" do
  impact 0.9
  title "Critical system files must have correct permissions"

  {
    "/etc/passwd"  => { mode: "0644", owner: "root", group: "root" },
    "/etc/shadow"  => { mode: "0640", owner: "root", group: "shadow" },
    "/etc/group"   => { mode: "0644", owner: "root", group: "root" },
    "/etc/sudoers" => { mode: "0440", owner: "root", group: "root" }
  }.each do |filepath, expected|
    describe file(filepath) do
      it { should exist }
      its("mode")  { should cmp expected[:mode] }
      its("owner") { should eq expected[:owner] }
      its("group") { should eq expected[:group] }
    end
  end
end

# Control 5: Verify unwanted packages are removed
control "pkg-001" do
  impact 0.5
  title "Unnecessary packages must not be installed"
  desc "Unused packages increase attack surface"

  %w[telnet rsh-client talk).each do |pkg|
    describe package(pkg) do
      it { should_not be_installed }
    end
  end
end

# Control 6: Check audit logging
control "audit-001" do
  impact 0.9
  title "Audit logging daemon must be running"

  describe service("auditd") do
    it { should be_installed }
    it { should be_enabled }
    it { should be_running }
  end

  describe file("/etc/audit/audit.rules") do
    it { should exist }
    its("content") { should match(/-a always,exit -F arch=b64 -S execve/) }
  end
end
```

### Profile Metadata

```yaml
# my-company-baseline/inspec.yml
name: my-company-baseline
title: Company Security Baseline
maintainer: Security Team
copyright: My Company
license: Apache-2.0
summary: Company-specific security baseline for Ubuntu servers
description: |
  Compliance checks for company security policy requirements
  covering system hardening, SSH configuration, audit logging,
  and package management.
version: 1.0.0
inspec_version: ">= 6.0"
supports:
  - platform-name: ubuntu
    release: "22.04"
  - platform-name: ubuntu
    release: "24.04"
```

## Running InSpec with Different Reporters

```bash
# CLI output (default) - human readable
inspec exec my-company-baseline --chef-license accept

# JSON output - for automated processing
inspec exec my-company-baseline \
  --chef-license accept \
  --reporter json:/tmp/results.json

# HTML report
inspec exec my-company-baseline \
  --chef-license accept \
  --reporter html:/tmp/inspec-report.html

# JUnit XML for CI systems
inspec exec my-company-baseline \
  --chef-license accept \
  --reporter junit:/tmp/inspec-junit.xml

# Multiple reporters at once
inspec exec my-company-baseline \
  --chef-license accept \
  --reporter cli json:/tmp/results.json html:/tmp/report.html
```

## Running Against Remote Hosts

```bash
# Scan a remote Ubuntu host via SSH
inspec exec my-company-baseline \
  -t ssh://ubuntu@web-server-01.example.com \
  -i ~/.ssh/deploy-key \
  --chef-license accept

# Scan a Docker container
inspec exec my-company-baseline \
  -t docker://container-name-or-id \
  --chef-license accept

# Scan with sudo escalation on remote host
inspec exec my-company-baseline \
  -t ssh://ubuntu@192.168.1.50 \
  -i ~/.ssh/id_rsa \
  --sudo \
  --chef-license accept
```

## Integrating InSpec into CI/CD

```yaml
# .gitlab-ci.yml - Run InSpec compliance checks in pipeline
compliance-check:
  stage: test
  image: chef/inspec:6
  before_script:
    - inspec --chef-license accept
  script:
    - inspec exec my-company-baseline
        --reporter cli junit:reports/inspec-results.xml
  artifacts:
    reports:
      junit: reports/inspec-results.xml
    expire_in: 1 week
  allow_failure: false  # Fail the pipeline on compliance violations
```

## Understanding the Output

InSpec output categorizes controls by status:

```
Profile: My Company Baseline (my-company-baseline)
Version: 1.0.0
Target OS: ubuntu 22.04

  [PASS]  sys-001: Time synchronization must be enabled
  [FAIL]  ssh-001: SSH must not allow root login
     [FAIL] sshd_config PermitRootLogin is expected to eq "no"
            got: "yes"
  [PASS]  auth-001: Password complexity requirements must be configured
  [SKIP]  pkg-001: Unnecessary packages must not be installed (control skipped)

Profile Summary: 2 successful controls, 1 control failure, 1 control skipped
Test Summary: 8 successful, 1 failure, 0 skipped
```

- **PASS** - Control requirement is met
- **FAIL** - Control requirement is not met (shows actual vs expected value)
- **SKIP** - Control was skipped (can be done with `only_if` conditions)
- **ERROR** - Control raised an error during execution

InSpec turns compliance from a manual checklist process into an automated, repeatable test suite. Running it regularly - especially after system changes or on new server provisioning - catches configuration drift before it becomes a security incident.
