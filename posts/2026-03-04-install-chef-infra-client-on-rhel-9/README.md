# How to Install Chef Infra Client on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Configuration Management, Linux

Description: Step-by-step guide on install chef infra client using Red Hat Enterprise Linux 9.

---

This guide provides step-by-step instructions for completing this task on RHEL. Following these procedures ensures a reliable and secure setup.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session
- A Chef license ID
- Chef Infra Server URL and node credentials

## Step 1: Install Chef Infra Client

```bash
# Update the system first
sudo dnf update -y

# Install curl if it is not already available
sudo dnf install -y curl

# Install the latest Chef Infra Client 19 or later
curl -L "https://chefdownload-commercial.chef.io/install.sh?license_id=<LICENSE_ID>" | sudo bash -s -- -P chef-ice
```

Replace `<LICENSE_ID>` with your Chef license ID.

## Step 2: Configure Chef Infra Client

Create or edit the Chef Infra Client configuration file to match your environment:

```bash
# Open the configuration file
sudo mkdir -p /etc/chef
sudo vi /etc/chef/client.rb
```

Adjust the settings according to your requirements. Key parameters to configure include the Chef Infra Server URL, node name, client key, and logging options.

```bash
chef_server_url 'https://chef.example.com/organizations/ORG_NAME'
node_name 'rhel9-node.example.com'
client_key '/etc/chef/client.pem'
log_location STDOUT
```

Make sure the node's client key exists at the path configured in `client_key`.

## Step 3: Run Chef Infra Client

```bash
# Check the installed version
chef-client --version

# Run Chef Infra Client
sudo chef-client

# Run Chef Infra Client with debug logging if needed
sudo chef-client --log_level debug
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the installed version
chef-client --version

# Run Chef Infra Client and review the command output
sudo chef-client
```

## Troubleshooting

- If Chef Infra Client fails to connect, verify `chef_server_url`, `node_name`, and `client_key` in `/etc/chef/client.rb`.
- Ensure Chef Infra Client is installed: `chef-client --version`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor Chef Infra Client runs and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
