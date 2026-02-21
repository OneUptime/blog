# How to Use the Ansible free Strategy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Strategy Plugins, Performance, Parallel Execution

Description: Use the Ansible free strategy to let each host proceed through tasks independently without waiting for other hosts to finish each task.

---

The `free` strategy lets each host proceed through the task list as fast as it can, without waiting for other hosts to finish the current task. In the default `linear` strategy, all hosts must complete task 1 before any host starts task 2. With the free strategy, a fast host can be on task 5 while a slow host is still on task 2. This can significantly reduce total playbook runtime when hosts have different performance characteristics.

## Enabling the Free Strategy

Set it per play:

```yaml
# free-strategy.yml - Use the free strategy
---
- name: Configure servers
  hosts: all
  strategy: free

  tasks:
    - name: Install packages
      apt:
        name:
          - nginx
          - python3
        state: present

    - name: Deploy configuration
      template:
        src: nginx.conf.j2
        dest: /etc/nginx/nginx.conf

    - name: Start service
      service:
        name: nginx
        state: started
```

Or set it globally:

```ini
# ansible.cfg
[defaults]
strategy = free
```

## How Free Execution Differs from Linear

With the linear strategy (3 tasks, 4 hosts):

```
Time -->
web-01: [Task 1] [wait] [Task 2] [wait] [Task 3]
web-02: [Task 1] [wait] [Task 2] [wait] [Task 3]
web-03: [Task 1.......] [Task 2] [wait] [Task 3]
web-04: [Task 1] [wait] [Task 2......] [Task 3]
                  ^wait for web-03    ^wait for web-04
```

With the free strategy:

```
Time -->
web-01: [Task 1] [Task 2] [Task 3] [done]
web-02: [Task 1] [Task 2] [Task 3] [done]
web-03: [Task 1.......] [Task 2] [Task 3] [done]
web-04: [Task 1] [Task 2......] [Task 3] [done]
```

No waiting. Each host moves to the next task as soon as its current task finishes.

## When Free Strategy Helps

The free strategy provides the biggest speedup when:

- Hosts have different hardware (some fast, some slow)
- Tasks have variable execution time (package downloads that depend on network speed)
- Some hosts have packages cached while others need to download them
- You are running against a mix of physical and virtual machines
- Tasks involve network operations with variable latency

Here is a concrete example. If you have 100 hosts and 10 tasks, where most hosts finish each task in 2 seconds but 5 hosts take 30 seconds per task:

- **Linear**: 10 tasks * 30 seconds = 300 seconds (the slow hosts set the pace for everyone)
- **Free**: Fast hosts finish in ~20 seconds, slow hosts finish in ~300 seconds, but the overall wall-clock time is still 300 seconds for everything to complete. However, fast hosts are done sooner and become available.

The real win is when the slow tasks are not on every host. If only certain hosts have slow tasks, free lets the others fly through.

## Free Strategy and Forks

The free strategy still respects the `forks` setting. If you have 20 hosts and `forks = 5`, at most 5 hosts run simultaneously. But unlike linear, those 5 slots are not tied to the same task. One slot might be running task 3 on web-01 while another runs task 1 on web-10:

```bash
# Run with 10 forks using free strategy
ansible-playbook -f 10 site.yml
```

## Caveats and Gotchas

The free strategy changes some assumptions that you might rely on.

**Handler timing is different.** Handlers run per host when the host finishes all tasks, not at a synchronized point. If web-01 finishes before web-02, its handlers run while web-02 is still working on tasks.

**Output is interleaved.** Since hosts run different tasks simultaneously, the terminal output mixes results from different tasks. This can be confusing to read:

```
ok: [web-01] TASK [Deploy config]
ok: [web-03] TASK [Install packages]
changed: [web-02] TASK [Deploy config]
ok: [web-04] TASK [Install packages]
changed: [web-01] TASK [Start service]
```

**Cross-host dependencies break.** If task 2 on host A depends on task 1 completing on host B, the free strategy does not guarantee this ordering:

```yaml
# This pattern is UNSAFE with the free strategy
- name: Register on load balancer
  command: register-host.sh {{ inventory_hostname }}
  delegate_to: lb-01

# Another host might not have completed its registration yet
- name: Check all hosts registered
  command: check-registrations.sh
  delegate_to: lb-01
  run_once: true
```

**Facts are not shared between hosts in real time.** If you use `set_fact` on one host and reference it from another, the free strategy does not guarantee the fact is set when the other host needs it.

## When to Avoid the Free Strategy

Do not use free when:

- Tasks have ordering dependencies across hosts
- You need synchronized handler execution
- You are using `delegate_to` with cross-host dependencies
- You are using `run_once` tasks that other hosts depend on
- Your playbook logic depends on all hosts being at the same task point

## Practical Example: Package Updates

Package updates are a perfect use case for the free strategy. Each host downloads and installs packages independently. Some hosts may have cached packages while others need to download everything:

```yaml
# update-packages.yml - Update all packages using free strategy
---
- name: Update all packages
  hosts: all
  strategy: free
  become: true

  tasks:
    - name: Update apt cache
      apt:
        update_cache: true
        cache_valid_time: 3600

    - name: Upgrade all packages
      apt:
        upgrade: dist
      register: upgrade_result

    - name: Check if reboot is needed
      stat:
        path: /var/run/reboot-required
      register: reboot_required

    - name: Report status
      debug:
        msg: >
          {{ inventory_hostname }}: {{ upgrade_result.stdout_lines | length }} packages updated,
          reboot {{ 'required' if reboot_required.stat.exists else 'not required' }}
```

Each host works through these tasks at its own pace. A host with all packages cached might finish in 10 seconds while one that needs to download 200 MB of updates takes 5 minutes. The fast hosts finish early instead of waiting for the slow ones.

## Combining Free with Serial

You can use `serial` with the free strategy. Each batch runs with free execution:

```yaml
- name: Update in batches with free execution
  hosts: webservers
  strategy: free
  serial: 10

  tasks:
    - name: Update packages
      apt:
        upgrade: safe
```

Within each batch of 10, hosts proceed independently. After all 10 finish, the next batch starts.

## Monitoring Free Strategy Runs

Since output is interleaved, use the `dense` callback for better readability:

```ini
# ansible.cfg - Dense output with free strategy
[defaults]
strategy = free
stdout_callback = dense
callback_whitelist = timer, profile_tasks
```

The dense callback shows aggregated counts per task, which makes more sense than individual host lines when tasks overlap.

The free strategy is a simple switch that can reduce playbook runtime when hosts have variable performance. Try it on read-only or independent tasks first. If the total runtime drops without breaking anything, keep it.
