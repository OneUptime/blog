# How to Orchestrate Multi-Server Deployments with SaltStack on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SaltStack, Configuration Management, Linux

Description: Learn how to orchestrate Multi-Server Deployments with SaltStack on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to Orchestrate Multi-Server Deployments with SaltStack on RHEL. Following these steps will help you set up a reliable configuration on RHEL.

## Prerequisites

- RHEL with a minimal or standard installation
- Root or sudo access
- A stable network connection

## Overview

Orchestrate Multi-Server Deployments with SaltStack requires careful planning and execution. This guide walks through the complete process from installation to verification.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Install the Salt Project repository and refresh the package metadata:

```bash
curl -fsSL https://github.com/saltstack/salt-install-guide/releases/latest/download/salt.repo | sudo tee /etc/yum.repos.d/salt.repo
sudo dnf clean expire-cache
```

## Step 2: Install Required Packages

Install the Salt master on the control node:

```bash
sudo dnf install -y salt-master
```

Install the Salt minion on each managed server:

```bash
sudo dnf install -y salt-minion
```

Verify the installation:

```bash
rpm -qi salt-master
rpm -qi salt-minion
```

## Step 3: Configure the Service

On each minion, configure the Salt master address:

```bash
sudo mkdir -p /etc/salt/minion.d
printf 'master: salt-master.example.com\n' | sudo tee /etc/salt/minion.d/master.conf
```

On the Salt master, keep orchestration files under the Salt file root, such as `/srv/salt/orch/`, and create an orchestration SLS file:

```bash
sudo mkdir -p /srv/salt/orch
sudo vi /srv/salt/orch/deploy_web.sls
```

Example orchestration file:

```yaml
web_highstate:
  salt.state:
    - tgt: 'web*'
    - highstate: True

app_highstate:
  salt.state:
    - tgt: 'app*'
    - highstate: True
    - require:
      - salt: web_highstate
```

Adjust the minion targets and required states based on your environment. Orchestration states execute on the Salt master and can use requisites to order work across multiple minions.

## Step 4: Start and Enable the Service

On the Salt master:

```bash
sudo systemctl enable --now salt-master
sudo systemctl status salt-master
```

On each minion:

```bash
sudo systemctl enable --now salt-minion
sudo systemctl status salt-minion
```

## Step 5: Verify the Configuration

Accept minion keys on the Salt master:

```bash
sudo salt-key
sudo salt-key -a web1
```

Test the setup from the Salt master:

```bash
sudo salt '*' test.version
sudo salt-run state.orchestrate orch.deploy_web
```

Check the logs for any errors:

```bash
journalctl -u salt-master -f
journalctl -u salt-minion -f
```

## Step 6: Configure Firewall Rules

If the Salt master is protected by firewalld, allow the Salt master ports:

```bash
sudo firewall-cmd --permanent --add-port=4505/tcp
sudo firewall-cmd --permanent --add-port=4506/tcp
sudo firewall-cmd --reload
```

## Step 7: Performance Tuning

Monitor resource usage and adjust configuration parameters based on your workload:

```bash
systemctl show salt-master --property=MemoryCurrent
top -p $(pidof salt-master)
```

## Security Considerations

- Limit shell and sudo access on the Salt master
- Accept only minion keys you recognize and trust
- Restrict Salt master ports with firewall rules
- Keep packages updated with `dnf update`

## Troubleshooting

Common issues and solutions:

1. **Service fails to start**: Check `journalctl -u salt-master -xe` or `journalctl -u salt-minion -xe` for error messages
2. **Permission denied**: Verify file ownership and SELinux contexts with `ls -laZ`
3. **Port conflicts**: Use `ss -tlnp` to identify processes using the port

## Conclusion

You have successfully configured orchestrate multi-server deployments with saltstack on RHEL. Monitor the service regularly and keep it updated to maintain security and performance.
