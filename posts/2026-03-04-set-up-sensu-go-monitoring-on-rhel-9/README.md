# How to Set Up Sensu Go Monitoring on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Monitoring, Linux

Description: Step-by-step guide on set up sensu go monitoring using Red Hat Enterprise Linux 9.

---

Setting up Sensu Go Monitoring on RHEL requires proper planning and configuration. This guide walks through each step from initial installation to verification.

## Prerequisites

- RHEL 9 with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 1: Install Sensu Go

Add the Sensu stable repository and install the backend, agent, and command-line tool:

```bash
# Add the Sensu repository
curl -s https://packagecloud.io/install/repositories/sensu/stable/script.rpm.sh | sudo bash

# Install the Sensu Go packages
sudo dnf install sensu-go-backend sensu-go-agent sensu-go-cli
```

## Step 2: Configure the Service

Copy the Sensu backend and agent configuration templates:

```bash
# Copy the backend configuration template
sudo curl -L https://docs.sensu.io/sensu-go/latest/files/backend.yml -o /etc/sensu/backend.yml

# Copy the agent configuration template
sudo curl -L https://docs.sensu.io/sensu-go/latest/files/agent.yml -o /etc/sensu/agent.yml
```

Edit the configuration files to match your environment:

```bash
# Open the backend configuration file
sudo vi /etc/sensu/backend.yml

# Open the agent configuration file
sudo vi /etc/sensu/agent.yml
```

Adjust the settings according to your requirements. Key parameters to configure include the backend state directory, agent backend URL, subscriptions, authentication settings, and logging options.

## Step 3: Enable and Start the Service

```bash
# Enable services to start on boot
sudo systemctl enable sensu-backend sensu-agent

# Start the backend
sudo systemctl start sensu-backend

# Set up the initial Sensu administrator account
export SENSU_BACKEND_CLUSTER_ADMIN_USERNAME=admin
export SENSU_BACKEND_CLUSTER_ADMIN_PASSWORD='ChangeMe123!'
sensu-backend init

# Start the agent
sudo systemctl start sensu-agent

# Check the status
sudo systemctl status sensu-backend sensu-agent
```

Configure sensuctl to connect to the local backend:

```bash
sensuctl configure -n \
  --username 'admin' \
  --password 'ChangeMe123!' \
  --namespace default \
  --url 'http://127.0.0.1:8080'
```

## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status sensu-backend sensu-agent

# Review recent logs
journalctl -u sensu-backend --no-pager -n 20
journalctl -u sensu-agent --no-pager -n 20

# Check the backend health API
curl http://127.0.0.1:8080/health

# Verify that the agent is registered
sensuctl entity list
```

## Troubleshooting

- If the backend fails to start, check the logs with `journalctl -u sensu-backend -e --no-pager`.
- If the agent fails to start, check the logs with `journalctl -u sensu-agent -e --no-pager`.
- Ensure all required packages are installed: `rpm -qa | grep sensu-go`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
