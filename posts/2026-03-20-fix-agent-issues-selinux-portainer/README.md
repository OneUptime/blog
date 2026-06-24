# How to Fix Agent Issues When SELinux Is Enabled

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Troubleshooting, SELinux, Docker, Security, CentOS, RHEL

Description: Learn how to fix Portainer Agent failures caused by SELinux enforcement on RHEL, CentOS, and Fedora systems by applying correct SELinux labels and policies.

---

SELinux (Security-Enhanced Linux) is enabled by default on RHEL, CentOS, and Fedora. It uses mandatory access controls that can prevent the Portainer Agent from accessing the Docker socket or host volumes, even when the container has the correct Unix permissions. Portainer's Linux Agent documentation states that if SELinux must remain enabled, the Agent should be deployed with `--privileged`.

## Symptoms of SELinux Interference

```bash
# Agent container starts but Portainer shows "Unable to Connect"

docker logs portainer_agent 2>&1 | grep -iE "permission|denied|selinux"

# Check for SELinux denials in the audit log
sudo ausearch -m avc --start today

# Quick check for any SELinux denials related to Docker or Portainer
sudo sealert -a /var/log/audit/audit.log | grep -iE "docker|portainer|container"
```

## Option 1: Deploy the Agent with --privileged

Portainer's Linux installation guidance states that if SELinux must remain enabled, you should deploy the Agent with `--privileged`. Docker supports `:z` and `:Z` relabeling for bind mounts, but Portainer documents `--privileged` as the supported fix on SELinux-enforcing systems:

```bash
# Redeploy the agent with the privileged flag
docker run -d \
  --name portainer_agent \
  --restart=always \
  --privileged \
  -p 9001:9001 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  portainer/agent:latest
```

Because `--privileged` gives the container broad host access, use it only for the Portainer Agent container.

## Option 2: Apply a Custom SELinux Policy

Generate and apply a policy from the raw audit denials. Red Hat recommends using `audit2allow` only after you rule out a labeling problem:

```bash
# Capture denials while the agent is running and failing
sudo ausearch -m avc --raw --start today | \
  audit2allow -M portainer_agent

# Review the generated policy
cat portainer_agent.te

# Apply the policy module
sudo semodule -i portainer_agent.pp
```

## Option 3: Set SELinux to Permissive Mode (Testing Only)

To confirm SELinux is the cause, temporarily set it to permissive:

```bash
# Set permissive mode (does not enforce, but logs denials)
sudo setenforce 0

# If Portainer Agent now works, SELinux was the cause
# Re-enable enforcing and apply a proper policy instead
sudo setenforce 1
```

Do not leave SELinux in permissive mode on production systems.

## Option 4: Restore the Docker Socket Context

```bash
# Check current context of the Docker socket
ls -lZ /var/run/docker.sock

# Restore the default SELinux context if it has drifted
sudo restorecon -v /var/run/docker.sock
```

On systems using the default socket path, `/run/docker.sock` should have the `container_var_run_t` type. Restoring the default context is safer than assigning a generic type with `chcon`.

Restart the agent after any context changes and verify with `docker logs portainer_agent`.
