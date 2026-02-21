# How to Use Molecule destroy to Clean Up Test Instances

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Molecule, Testing, Cleanup, DevOps

Description: Learn how to properly clean up Molecule test instances with the destroy command, handle stuck containers, and manage cleanup in CI pipelines.

---

Molecule test instances consume resources. Docker containers eat memory and CPU, Vagrant VMs take up even more, and cloud instances cost actual money. Properly cleaning up test instances after you are done testing is not optional. The `molecule destroy` command tears down everything Molecule created, but there are nuances to how it works and situations where manual cleanup is needed.

## How molecule destroy Works

The `molecule destroy` command reverses what `molecule create` did. It removes containers, VMs, or cloud instances that were provisioned for testing.

```bash
# Destroy all instances for the default scenario
molecule destroy

# Destroy instances for a specific scenario
molecule destroy --scenario-name tls

# Destroy all instances across all scenarios
molecule destroy --all
```

When you run destroy, Molecule:

1. Reads the scenario configuration from `molecule.yml`
2. Looks up the running instance state from `.molecule/` directory
3. Runs the destroy playbook appropriate for the driver
4. Removes the state files from `.molecule/`

## What Gets Destroyed

The destroy command removes the test instances themselves. For Docker, that means stopping and removing containers. For Vagrant, it means `vagrant destroy`. For cloud drivers, it means terminating the cloud instances.

```bash
# Before destroy
molecule list

# Instance Name    Driver Name    Created    Converged
# ubuntu2204       docker         true       true
# rocky9           docker         true       true

molecule destroy

# After destroy
molecule list

# Instance Name    Driver Name    Created    Converged
# ubuntu2204       docker         false      false
# rocky9           docker         false      false
```

## Destroy Behavior During molecule test

When you run `molecule test`, destroy happens twice:

1. **Before create** - Removes any leftover instances from a previous run
2. **After verify** - Cleans up the instances created during this run

This ensures a clean start and clean finish. But you can control this behavior.

```bash
# Normal behavior: destroy before and after
molecule test

# Keep instances after the test (useful for debugging failures)
molecule test --destroy=never

# Destroy only at the end (trust that no stale instances exist)
molecule test --destroy=always
```

The `--destroy=never` option is extremely useful for debugging. When a test fails, you can log into the instance and investigate.

```bash
# Test fails, but instances stay up
molecule test --destroy=never

# Log in to investigate
molecule login --host ubuntu2204

# Check what went wrong inside the container
systemctl status nginx
journalctl -u nginx
cat /etc/nginx/nginx.conf

# When done investigating, clean up manually
molecule destroy
```

## Custom Destroy Playbooks

For advanced scenarios, you can write a custom `destroy.yml` playbook. This is useful when you need to clean up external resources alongside the instances.

```yaml
# molecule/default/destroy.yml - custom destroy with external cleanup
- name: Destroy
  hosts: localhost
  gather_facts: false
  tasks:
    - name: Remove DNS records created during testing
      community.general.nsupdate:
        key_name: "ansible-test"
        key_secret: "{{ lookup('env', 'DNS_KEY') }}"
        server: "dns.example.com"
        zone: "test.example.com"
        record: "{{ item.name }}"
        type: A
        state: absent
      loop: "{{ molecule_yml.platforms }}"
      ignore_errors: true

    - name: Stop and remove Docker containers
      community.docker.docker_container:
        name: "{{ item.name }}"
        state: absent
        force_kill: true
      loop: "{{ molecule_yml.platforms }}"

    - name: Remove Docker networks
      community.docker.docker_network:
        name: molecule
        state: absent
      ignore_errors: true
```

## Cleaning Up Stale Instances

Sometimes Molecule crashes or gets interrupted, leaving orphaned instances behind. Here is how to find and clean them up.

### Docker Stale Containers

```bash
# Find Molecule-created containers (they have a "molecule" label)
docker ps -a --filter "label=creator=molecule"

# Remove all Molecule containers
docker ps -a --filter "label=creator=molecule" -q | xargs -r docker rm -f

# If containers do not have labels, find them by name pattern
docker ps -a | grep molecule

# Nuclear option: remove ALL stopped containers (be careful)
docker container prune -f
```

### Vagrant Stale VMs

```bash
# List all Vagrant VMs globally
vagrant global-status

# Remove stale entries and VMs
vagrant global-status --prune

# Destroy a specific VM
vagrant destroy -f <vm-id>
```

### Resetting Molecule State

If the Molecule state files get out of sync with reality, reset them.

```bash
# Reset the Molecule state for the default scenario
molecule reset

# Then clean up any remaining resources manually
docker ps -a  # check for orphaned containers
docker rm -f <container-name>

# Now create fresh instances
molecule create
```

## The cleanup.yml Playbook

The `cleanup.yml` playbook (different from `destroy.yml`) runs before destroy and is meant for cleaning up external state that your role created during testing.

```yaml
# molecule/default/cleanup.yml - clean up external state before destroy
- name: Cleanup
  hosts: all
  become: true
  tasks:
    - name: Deregister from load balancer
      ansible.builtin.uri:
        url: "https://lb.example.com/api/deregister"
        method: POST
        body_format: json
        body:
          hostname: "{{ inventory_hostname }}"
      delegate_to: localhost
      ignore_errors: true

    - name: Revoke any certificates issued during testing
      ansible.builtin.command:
        cmd: "certbot revoke --cert-path /etc/letsencrypt/live/{{ inventory_hostname }}/cert.pem --non-interactive"
      ignore_errors: true

    - name: Remove temporary files from shared storage
      ansible.builtin.file:
        path: "/shared/test-artifacts/{{ inventory_hostname }}"
        state: absent
      delegate_to: localhost
```

## CI Pipeline Cleanup

In CI environments, cleanup is critical because orphaned resources can accumulate and cause problems. Here are patterns for different CI systems.

### GitHub Actions

```yaml
# .github/workflows/test.yml - always clean up, even on failure
jobs:
  molecule-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"

      - name: Install dependencies
        run: pip install molecule molecule-plugins[docker]

      - name: Run Molecule tests
        run: molecule test --destroy=always

      - name: Force cleanup on failure
        if: failure()
        run: |
          molecule destroy || true
          docker ps -a --filter "label=creator=molecule" -q | xargs -r docker rm -f || true
```

### GitLab CI

```yaml
# .gitlab-ci.yml - cleanup in after_script
molecule-test:
  image: python:3.11
  services:
    - docker:dind
  script:
    - pip install molecule molecule-plugins[docker]
    - molecule test
  after_script:
    # This runs even if the test fails
    - molecule destroy || true
    - docker ps -a -q | xargs -r docker rm -f || true
```

## Handling Destroy Failures

Sometimes destroy itself fails. Here are common causes and fixes.

### Container Already Removed

```
TASK [Destroy molecule instance(s)] ****************************
fatal: No container found with name "instance"
```

Fix: Reset the Molecule state.

```bash
molecule reset
```

### Docker Daemon Not Running

```
Cannot connect to the Docker daemon
```

Fix: Start Docker, then destroy.

```bash
sudo systemctl start docker
molecule destroy
```

### VM Provider Error

```
VBoxManage: error: The machine 'instance' is already locked
```

Fix: Force destroy with Vagrant directly.

```bash
cd ~/.cache/molecule/<role>/<scenario>/
vagrant destroy -f
molecule reset
```

## Automated Cleanup Script

For environments where multiple developers or CI jobs share a machine, a cleanup script prevents resource accumulation.

```bash
#!/bin/bash
# cleanup-molecule.sh - clean up stale Molecule resources

echo "Cleaning up stale Molecule Docker containers..."
docker ps -a --filter "label=creator=molecule" -q | xargs -r docker rm -f

echo "Cleaning up stale Docker networks..."
docker network ls --filter "name=molecule" -q | xargs -r docker network rm

echo "Pruning unused Docker images..."
docker image prune -f --filter "until=24h"

echo "Resetting Molecule state directories..."
find ~/.cache/molecule -name "state.yml" -mtime +1 -delete

echo "Cleanup complete."
```

Run it on a schedule via cron.

```bash
# Run cleanup daily at 3 AM
0 3 * * * /usr/local/bin/cleanup-molecule.sh >> /var/log/molecule-cleanup.log 2>&1
```

## Resource Monitoring

Keep an eye on resource usage, especially in shared environments.

```bash
# Check Docker resource usage
docker system df

# Check for Molecule containers specifically
docker stats --no-stream $(docker ps -a --filter "label=creator=molecule" -q)

# Check disk space used by Docker
du -sh /var/lib/docker/
```

## Best Practices

1. **Always destroy after testing in CI.** Use `molecule test --destroy=always` or add cleanup steps in `after_script`.

2. **Use `--destroy=never` during development.** Recreating instances is slow. Keep them running while you iterate and only destroy when you are done.

3. **Run periodic cleanup on shared machines.** A cron job that removes stale Molecule resources prevents gradual resource exhaustion.

4. **Check for orphans before creating.** If `molecule list` shows instances already exist, either destroy them first or use them directly.

5. **Write cleanup playbooks for external resources.** If your tests register with external services, deregister during cleanup.

Proper cleanup discipline keeps your test environment healthy and your colleagues happy. It is one of those things that seems unimportant until someone fills up the disk with orphaned containers.
