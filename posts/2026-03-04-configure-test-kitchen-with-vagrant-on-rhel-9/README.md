# How to Configure Test Kitchen with Vagrant on RHEL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, Test Kitchen, Vagrant, Infrastructure Testing, Chef, Linux

Description: Learn how to configure Test Kitchen with the Vagrant driver on RHEL to automate infrastructure code testing, including suite definitions, provisioner setup, and verification with InSpec.

---

Test Kitchen is a test harness for infrastructure code. It creates ephemeral virtual machines, applies your configuration (Chef, Ansible, Puppet, or shell scripts), and runs verification tests against the result. When paired with Vagrant, it gives you a fully automated test cycle on RHEL. This guide covers the complete setup.

## How Test Kitchen Works

Test Kitchen follows a straightforward workflow:

1. **Create** - spin up a virtual machine using a driver (Vagrant, Docker, cloud, etc.)
2. **Converge** - apply your infrastructure code (Chef recipes, Ansible playbooks, etc.)
3. **Verify** - run tests against the configured instance (InSpec, Serverspec, etc.)
4. **Destroy** - tear down the virtual machine

## Prerequisites

- RHEL with Vagrant and Libvirt installed (see the Vagrant Libvirt guide)
- Ruby installed (for Test Kitchen and its gems)

## Installing Ruby

```bash
# Install Ruby and development tools
sudo dnf install -y ruby ruby-devel gcc make redhat-rpm-config
```

## Installing Test Kitchen

```bash
# Install Test Kitchen and plugins
gem install test-kitchen kitchen-vagrant kitchen-inspec inspec
```

Verify the installation:

```bash
# Check the version
kitchen version
```

## Setting Up a Project

```bash
# Create a project directory
mkdir -p /opt/infra-test
cd /opt/infra-test
```

```bash
# Initialize a Test Kitchen project
kitchen init --driver=vagrant --provisioner=shell
```

This creates a `.kitchen.yml` file and a `test/` directory.

## Configuring .kitchen.yml

Edit the configuration file:

```yaml
# .kitchen.yml
driver:
  name: vagrant
  provider: libvirt

provisioner:
  name: shell

verifier:
  name: inspec

platforms:
  - name: rhel-9
    driver:
      box: generic/rhel9
      customize:
        cpus: 2
        memory: 2048

suites:
  - name: default
    provisioner:
      script: provision.sh
    verifier:
      inspec_tests:
        - test/integration/default
```

## Creating a Provisioning Script

```bash
# Create the provisioning script
cat > provision.sh << 'EOF'
#!/bin/bash
set -e

# Install and configure Apache
dnf install -y httpd mod_ssl
systemctl enable --now httpd

# Configure firewall
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload

# Create a simple web page
echo "<h1>Test Kitchen Provisioned Server</h1>" > /var/www/html/index.html

# Install security updates
dnf update -y --security
EOF
chmod +x provision.sh
```

## Writing InSpec Tests

Create verification tests:

```bash
# Create the test directory
mkdir -p test/integration/default
```

```ruby
# test/integration/default/web_server_test.rb

# Test that Apache is installed
describe package('httpd') do
  it { should be_installed }
end

# Test that Apache is running and enabled
describe service('httpd') do
  it { should be_enabled }
  it { should be_running }
end

# Test that port 80 is listening
describe port(80) do
  it { should be_listening }
end

# Test that the web page is served
describe http('http://localhost') do
  its('status') { should eq 200 }
  its('body') { should include 'Test Kitchen Provisioned Server' }
end

# Test firewall rules
describe firewalld do
  it { should have_service_enabled_in_zone('http', 'public') }
  it { should have_service_enabled_in_zone('https', 'public') }
end
```

## Running the Test Cycle

```bash
# Create the VM
kitchen create

# Apply the provisioning
kitchen converge

# Run the tests
kitchen verify

# Destroy the VM
kitchen destroy
```

Or run the entire cycle at once:

```bash
# Full test cycle
kitchen test
```

## Using Ansible as a Provisioner

Install the Ansible provisioner:

```bash
# Install kitchen-ansible
gem install kitchen-ansible
```

Update .kitchen.yml:

```yaml
provisioner:
  name: ansible_playbook
  ansible_verbose: true
  require_ansible_repo: false
  require_chef_for_busser: false
  playbook: playbook.yml
```

Create the playbook:

```yaml
# playbook.yml
---
- hosts: all
  become: true
  tasks:
    - name: Install httpd
      dnf:
        name: httpd
        state: present

    - name: Start httpd
      systemd:
        name: httpd
        state: started
        enabled: true

    - name: Create index page
      copy:
        content: "<h1>Ansible Provisioned Server</h1>"
        dest: /var/www/html/index.html
```

## Multiple Suites

Test different configurations with multiple suites:

```yaml
suites:
  - name: webserver
    provisioner:
      script: provision-web.sh
    verifier:
      inspec_tests:
        - test/integration/webserver

  - name: database
    provisioner:
      script: provision-db.sh
    verifier:
      inspec_tests:
        - test/integration/database
    driver:
      customize:
        memory: 4096
```

```bash
# Run a specific suite
kitchen test webserver

# List all instances
kitchen list
```

## Multiple Platforms

Test across different operating systems:

```yaml
platforms:
  - name: rhel-9
    driver:
      box: generic/rhel9
  - name: centos-9
    driver:
      box: generic/centos9s
  - name: rocky-9
    driver:
      box: generic/rocky9
```

This creates a matrix of suites and platforms. Each combination gets its own instance.

## Lifecycle Hooks

Run commands at specific points in the lifecycle:

```yaml
provisioner:
  name: shell
  script: provision.sh

lifecycle:
  pre_converge:
    - local: echo "Starting provisioning"
  post_converge:
    - local: echo "Provisioning complete"
  pre_verify:
    - remote: systemctl status httpd
```

## Debugging Failed Tests

```bash
# Login to the VM for debugging
kitchen login

# Run converge again without destroying
kitchen converge

# Run verify with verbose output
kitchen verify -l debug
```

## CI/CD Integration

Add Test Kitchen to your CI pipeline:

```yaml
# .gitlab-ci.yml
test-infrastructure:
  stage: test
  script:
    - gem install test-kitchen kitchen-vagrant kitchen-inspec
    - kitchen test --destroy=always
  after_script:
    - kitchen destroy
```

## Conclusion

Test Kitchen with Vagrant on RHEL automates the testing of infrastructure code by spinning up real virtual machines, applying configuration, and running verification tests. Whether you use shell scripts, Chef, or Ansible as your provisioner, Test Kitchen gives you confidence that your infrastructure code works correctly before deploying it to production.
