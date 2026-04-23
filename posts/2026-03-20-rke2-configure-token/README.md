# How to Configure RKE2 Token for Node Registration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE2, Kubernetes, Rancher, Security, Node Registration

Description: Learn how to configure, rotate, and manage the RKE2 cluster token used for secure node registration.

## Introduction

The RKE2 cluster token is a shared secret that authenticates new nodes joining the cluster. It acts as a pre-shared key that joining nodes use to authenticate to the cluster, and secure-format tokens also let joining nodes verify the server's certificate authority. Properly managing this token is essential for cluster security and smooth node onboarding.

## Understanding the RKE2 Token

RKE2 uses tokens for three related purposes:
1. **Node authentication**: Joining server or agent nodes present the token to prove they are authorized to join.
2. **CA bootstrapping**: When using a secure-format token, the joining node verifies the server's certificate authority during the initial connection. Short tokens do not provide this CA hash verification.
3. **Bootstrap data encryption**: The server token is used to encrypt confidential bootstrap data stored in the datastore.

The server token is written to `/var/lib/rancher/rke2/server/token`; RKE2 also creates `/var/lib/rancher/rke2/server/node-token` for registering server or agent nodes after the first server starts.

## Configuring a Custom Token at Installation

If you want to control the token from the beginning, define a strong custom token before starting your first server, rather than using the auto-generated one. This makes it easier to add nodes later without having to retrieve the auto-generated value.

### On the Server Node

```bash
# Create the RKE2 configuration directory

sudo mkdir -p /etc/rancher/rke2

# Create the server config with a custom token
sudo tee /etc/rancher/rke2/config.yaml > /dev/null <<EOF
# RKE2 server configuration
token: "MySecureClusterToken123!"
tls-san:
  - 192.168.1.100
  - my-cluster.example.com
EOF
```

Then install and start RKE2:

```bash
# Install RKE2 server
curl -sfL https://get.rke2.io | sudo sh -

# Enable and start the server service
sudo systemctl enable rke2-server.service
sudo systemctl start rke2-server.service
```

### On Agent Nodes

```bash
# Create the agent configuration
sudo mkdir -p /etc/rancher/rke2

sudo tee /etc/rancher/rke2/config.yaml > /dev/null <<EOF
# Point to the server and provide the matching token
server: https://192.168.1.100:9345
token: "MySecureClusterToken123!"
EOF

# Install and start the agent
curl -sfL https://get.rke2.io | sudo env INSTALL_RKE2_TYPE="agent" sh -
sudo systemctl enable rke2-agent.service
sudo systemctl start rke2-agent.service
```

## Retrieving the Auto-Generated Token

If you did not set a custom token, retrieve the auto-generated one from the server:

```bash
# Read the node token from the server
sudo cat /var/lib/rancher/rke2/server/node-token
```

The output will look like:

```text
K10a8f3e2b1c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0::server:abcdef1234567890
```

Use this full string as the `token` value in your agent's `config.yaml`.

## Using Environment Variables

You can also provide the runtime token through RKE2 environment variables, although the config file is usually easier to manage with systemd:

```bash
# Install the agent service
curl -sfL https://get.rke2.io | sudo env INSTALL_RKE2_TYPE="agent" sh -

# Provide the server URL and token through the systemd environment file
sudo tee /etc/default/rke2-agent.service > /dev/null <<EOF
RKE2_URL="https://192.168.1.100:9345"
RKE2_TOKEN="MySecureClusterToken123!"
EOF

sudo systemctl enable rke2-agent.service
sudo systemctl start rke2-agent.service
```

## Rotating the Cluster Token

RKE2 supports server token rotation to improve security. This is useful after a potential token compromise. After rotation, update all server and agent configurations that used the old token, then restart them with the new token.

### Step 1: Rotate the Server Token

```bash
# Run this on one server to rotate the original server token
sudo rke2 token rotate \
  --token 'MySecureClusterToken123!' \
  --new-token 'NewSecureToken456!'
```

### Step 2: Restart Servers

```bash
# Update each server node's configured token before restarting
sudo sed -i 's/MySecureClusterToken123!/NewSecureToken456!/' /etc/rancher/rke2/config.yaml

# Restart each server node one at a time
sudo systemctl restart rke2-server.service

# Verify the server is healthy before moving to the next
sudo /var/lib/rancher/rke2/bin/kubectl --kubeconfig /etc/rancher/rke2/rke2.yaml get nodes
```

### Step 3: Update Agent Nodes

```bash
# Update each agent node's config.yaml with the new token
sudo sed -i 's/MySecureClusterToken123!/NewSecureToken456!/' /etc/rancher/rke2/config.yaml

# Restart the agent
sudo systemctl restart rke2-agent.service
```

## Token Security Best Practices

1. **Use a strong, random token**: Generate a cryptographically secure token.

```bash
# Generate a secure random token
openssl rand -hex 32
```

2. **Store the token in a secrets manager**: Never hardcode tokens in scripts or commit them to version control.

3. **Use different tokens for different clusters**: Avoid reusing tokens across environments.

4. **Restrict access to the config file**: The config file containing the token should be readable only by root.

```bash
# Secure the config file permissions
sudo chmod 600 /etc/rancher/rke2/config.yaml
sudo chown root:root /etc/rancher/rke2/config.yaml
```

## Verifying Token Configuration

```bash
# Confirm nodes are successfully registered after token changes
sudo /var/lib/rancher/rke2/bin/kubectl \
  --kubeconfig /etc/rancher/rke2/rke2.yaml \
  get nodes -o wide
```

## Conclusion

The RKE2 token is a foundational security element for your cluster. By configuring a strong custom token before installation, storing it securely, and rotating it periodically, you can maintain a secure node registration process. Always ensure tokens are kept in sync between your server and agent configurations to avoid join failures.
