# Tuning Ansible Performance with Forks, Pipelining, Async, and Free Strategy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Performance, Automation, SSH, Playbooks

Description: Tune Ansible concurrency and transport safely by measuring forks, SSH pipelining, asynchronous jobs, and free-strategy tradeoffs.

---

Ansible performance has several independent limits: controller CPU and memory, SSH round trips, target capacity, slow modules, external APIs, and synchronization imposed by the play. Increasing every concurrency setting at once makes failures harder to diagnose and can overload the systems being automated.

Tune one layer at a time:

1. Measure which tasks and hosts are slow.
2. Reuse connections and reduce SSH operations.
3. Increase host concurrency with forks.
4. Use asynchronous execution for suitable long-running work.
5. Consider the `free` strategy only when hosts do not need lockstep ordering.

Retest correctness after each change. A faster play that violates rollout sequencing is not an improvement.

## Establish a Repeatable Baseline

Run the same play against the same test inventory and record wall-clock time, recap, controller load, and target impact:

```bash
time ansible-playbook \
  -i inventories/performance \
  playbooks/site.yml \
  --limit performance_sample
```

Use verbosity to identify connection setup and retries, but remember that very verbose output has its own cost:

```bash
ansible-playbook -i inventories/performance playbooks/site.yml -vvv
```

Measure representative operations. A run with warm package metadata, cached DNS, and persistent SSH sockets can look very different from a cold CI worker.

Check active configuration before changing it:

```bash
ansible-config dump --only-changed
ansible --version
```

This also confirms which `ansible.cfg` Ansible loaded.

## Increase Forks Carefully

Ansible's default maximum is five forks. With the default linear strategy, up to that many hosts execute the current task concurrently before Ansible advances:

```ini
[defaults]
forks = 20
```

Override it for one run:

```bash
ansible-playbook -i inventory site.yml --forks 20
```

More forks can help when the controller spends time waiting on many independent hosts. They can hurt when:

- the controller lacks CPU, memory, file descriptors, or SSH capacity
- targets share a small package mirror, database, load balancer, or API
- a cloud service rate-limits requests
- delegated tasks all modify the same controller-side resource
- network links saturate

Raise the value in steps, such as 5, 10, 20, and 40, and look for the point where throughput stops improving or errors rise.

`forks` is an upper bound, not a promise. `serial` batches, `throttle`, strategy behavior, inventory size, and task design can reduce actual concurrency.

## Enable SSH Pipelining

When the connection plugin supports it, pipelining sends many modules to the target interpreter through the connection instead of first transferring a temporary module file. This reduces network operations:

```ini
[connection]
pipelining = true
```

The environment-variable equivalent is:

```bash
export ANSIBLE_PIPELINING=true
```

Test on a small group:

```bash
ansible all \
  -i inventories/performance \
  --limit performance_sample \
  -m ansible.builtin.ping \
  -vvv
```

Pipelining is disabled by default. It can conflict with sudo policies that require a TTY, and it is disabled when Ansible is configured to keep remote files. Modern automation accounts should generally not require an interactive TTY, but changing sudo policy is a security decision.

Pipelining does not eliminate every file transfer. Modules such as `copy` still need to move payload data, and connection plugins can override or lack support for the global option.

## Reuse Native SSH Connections

Ansible uses native OpenSSH by default when available, including support for ControlPersist. Inspect the effective SSH plugin configuration:

```bash
ansible-config dump | grep -E 'HOST_KEY_CHECKING|PIPELINING'
ansible all -i inventory -m ansible.builtin.ping -vvvv
```

Do not paste arbitrary control-path settings from old tuning guides. Modern Ansible and OpenSSH choose useful defaults, and long paths, read-only home directories, or shared CI workspaces can break custom socket locations.

If every task appears to establish a fresh session, inspect verbose SSH output, connection plugin selection, control-socket permissions, and whether the controller runtime survives between tasks.

## Use Async to Avoid Long Blocking Connections

By default, a task is synchronous. `async` sets a maximum runtime and `poll` controls waiting.

With positive polling, Ansible still waits before advancing to the next task, but it does not hold one SSH connection open for the entire operation:

```yaml
- name: Run a long database maintenance task
  ansible.builtin.command:
    cmd: /opt/myapp/bin/compact-database
  async: 3600
  poll: 15
```

With `poll: 0`, Ansible starts the job and immediately continues:

```yaml
- name: Start index rebuilding
  ansible.builtin.command:
    cmd: /opt/myapp/bin/rebuild-index
  async: 3600
  poll: 0
  register: rebuild_job
```

If later work depends on completion, poll explicitly:

```yaml
- name: Wait for index rebuilding
  ansible.builtin.async_status:
    jid: "{{ rebuild_job.ansible_job_id }}"
  register: rebuild_status
  until: rebuild_status.finished
  retries: 120
  delay: 15
```

Fire-and-forget jobs are not automatically checked by the playbook, and Ansible does not automatically remove their async cache files. Use `async_status` cleanup when appropriate:

```yaml
- name: Remove the completed async cache entry
  ansible.builtin.async_status:
    jid: "{{ rebuild_job.ansible_job_id }}"
    mode: cleanup
```

Do not run concurrent operations that require the same exclusive lock. The Ansible documentation specifically cautions against `poll: 0` for package-manager transactions when later commands expect those resources.

Async is not supported by every action and does not support check mode. Guard async work during a check run:

```yaml
when: not ansible_check_mode
```

## Understand Linear Versus Free

The default `linear` strategy runs a task across the current host batch before advancing those hosts to the next task:

```yaml
- name: Configure hosts in lockstep
  hosts: app
  strategy: linear
```

The `free` strategy allows each host to move through the play as quickly as it can:

```yaml
- name: Configure independent workers
  hosts: workers
  strategy: free
  tasks:
    # independent per-host tasks
```

`free` helps when one slow host otherwise makes every fast host wait at each task. It changes ordering semantics. Host A can execute task 10 while host B is still on task 3.

Do not use it without review when:

- tasks coordinate a cluster-wide transition
- a database migration must finish before any app process starts
- delegated tasks update one shared file or load balancer
- a task reads facts or state produced by other hosts
- operators depend on lockstep checkpoints

Keep `linear` and use `serial` for a controlled rolling update.

## Use throttle for Fragile Shared Resources

You can increase global forks while restricting one expensive task:

```yaml
- name: Register each host with the shared API
  ansible.builtin.uri:
    url: https://control.example.com/v1/hosts
    method: POST
    body_format: json
    body:
      hostname: "{{ inventory_hostname }}"
  throttle: 3
```

`throttle` limits concurrent workers for a task, block, or play. It cannot raise concurrency above the `forks` or `serial` limits.

Delegation does not serialize work. If a task delegated from 100 hosts writes the same controller-side file, multiple forks can still race. Redesign it as one `run_once` aggregation or throttle it to one.

## Optimize the Work, Not Only Scheduling

Concurrency cannot fix an unnecessarily expensive playbook. Common improvements include:

- disable fact gathering when no facts are used
- request only needed fact subsets
- use a persistent fact cache where freshness permits
- replace repeated shell queries with one registered result
- use state-aware modules rather than query-then-mutate shell pipelines
- avoid repeated package-cache refreshes
- render a complete configuration once instead of editing it line by line
- keep the controller near managed infrastructure to reduce latency

For network devices, repeated “show running configuration” commands can dominate execution time. Query expensive state only when the play actually needs it.

## A Controlled Tuning Sequence

Use a configuration such as:

```ini
[defaults]
forks = 20
strategy = linear

[connection]
pipelining = true
```

Then:

1. Validate pipelining on one non-production host.
2. Benchmark several fork counts.
3. Add `throttle` around rate-limited services.
4. Convert only suitable long operations to async.
5. Try `strategy: free` on a play whose hosts are truly independent.
6. Run correctness, idempotency, and failure-path tests after each change.

Do not treat the highest successful fork count in staging as a permanent production value. Inventory size, controller resources, target load, and external-service quotas change.

## Official Documentation

- [Controlling playbook execution: strategies and more](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_strategies.html)
- [Asynchronous actions and polling](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_async.html)
- [Ansible configuration settings](https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html)
- [ansible.builtin.free strategy](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/free_strategy.html)
- [SSH connection plugin](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html)

