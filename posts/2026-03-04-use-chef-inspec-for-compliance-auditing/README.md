# How to Use Chef InSpec for Compliance Auditing on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Chef, Configuration Management, Compliance, Linux

Description: Learn how to use Chef InSpec for Compliance Auditing on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to use Chef InSpec for compliance auditing on RHEL. Following these steps will help you install Chef InSpec, create a small compliance profile, and run it against a RHEL system.

## Prerequisites

- RHEL with a minimal or standard installation
- Root or sudo access
- A stable network connection
- A valid Progress Chef license key for Chef InSpec 7

## Overview

Chef InSpec is a compliance-as-code tool that runs audit controls against local or remote systems. This guide walks through the complete process from installation to verification.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Install any required dependencies:

```bash
sudo dnf install -y curl
```

## Step 2: Install Required Packages

```bash
VERSION="<version>"
LICENSE_ID="<your-license-id>"
curl -o "inspec-enterprise-${VERSION}-linux.rpm" "https://chefdownload-commercial.chef.io/stable/inspec/download?eol=false&license_id=${LICENSE_ID}&m=x86_64&p=linux&pm=rpm&v=${VERSION}"
sudo dnf install -y "./inspec-enterprise-${VERSION}-linux.rpm"
```

Verify the installation:

```bash
inspec version
```

## Step 3: Configure the Profile

Create a new Chef InSpec profile:

```bash
inspec init profile rhel-baseline
cd rhel-baseline
```

The profile metadata is stored in `inspec.yml`, and controls are stored in the `controls/` directory. Start with the generated defaults and adjust the profile for your compliance requirements.

## Step 4: Add Compliance Controls

```bash
cat > controls/os_baseline.rb <<'EOF'
control 'rhel-1.0' do
  impact 0.7
  title 'OpenSSH server should be installed and running'
  desc 'The OpenSSH server package and service are commonly required for managed RHEL hosts.'

  describe package('openssh-server') do
    it { should be_installed }
  end

  describe service('sshd') do
    it { should be_enabled }
    it { should be_running }
  end
end

control 'rhel-1.1' do
  impact 0.5
  title 'The root account should use a protected shadow file'
  desc 'The /etc/shadow file should exist and be owned by root.'

  describe file('/etc/shadow') do
    it { should exist }
    it { should be_owned_by 'root' }
    it { should be_grouped_into 'root' }
  end
end
EOF
```

## Step 5: Verify the Configuration

Check the profile for metadata and control syntax issues:

```bash
inspec check .
```

Run the audit locally and accept the Chef EULA:

```bash
inspec exec . --chef-license accept
```

## Step 6: Run Against a Remote RHEL Host

If you audit another RHEL system over SSH, make sure the target allows SSH access from the audit workstation, then run:

```bash
inspec exec . --target ssh://rhel-admin@rhel.example.com --key-files ~/.ssh/id_rsa --sudo --chef-license accept
```

## Step 7: Performance Tuning

For routine audits, save machine-readable results so they can be archived or imported into reporting systems:

```bash
mkdir -p reports
inspec exec . --reporter cli json:reports/rhel-baseline.json --chef-license accept
```

## Security Considerations

- Run audits with the least privileges required for the controls
- Use SSH keys instead of passwords for remote scans
- Protect report files because they may contain system configuration details
- Keep packages updated with `dnf update`

## Troubleshooting

Common issues and solutions:

1. **License prompt blocks automation**: Add `--chef-license accept` or set `CHEF_LICENSE=accept`
2. **Permission denied**: Run the scan with `--sudo` or adjust the control so it only reads permitted files
3. **SSH connection fails**: Verify the username, key path, and target host with `ssh rhel-admin@rhel.example.com`

## Conclusion

You have successfully configured Chef InSpec for compliance auditing on RHEL. Review the results regularly and keep your profiles updated as your compliance requirements change.
