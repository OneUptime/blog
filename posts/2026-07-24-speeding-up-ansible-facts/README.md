# Speeding Up Ansible Fact Gathering with Subsets and Fact Caching

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Performance, Facts, Caching, Automation

Description: Reduce Ansible fact-gathering cost with explicit subsets, filtered setup calls, persistent caches, freshness rules, and safe invalidation.

---

By default, Ansible gathers facts at the beginning of each play. The `ansible.builtin.setup` module discovers operating-system, hardware, network, Python, mount, and other host data. That convenience can become a measurable cost across thousands of hosts or high-latency links.

There are three distinct optimizations:

- Disable gathering when a play uses no facts.
- Gather only the subsets or keys the play needs.
- Cache facts across runs when stale data is acceptable.

Apply them based on the play's data contract. Removing facts without inventory tests can make a fast play fail later with an undefined variable.

## Find Which Facts the Play Uses

Search roles and templates:

```bash
rg -n 'ansible_facts|ansible_[a-zA-Z0-9_]+' \
  roles playbooks templates
```

Inspect available facts on a representative host:

```bash
ansible app-01 \
  -i inventories/production \
  -m ansible.builtin.setup
```

Prefer the namespaced form in new code:

```jinja2
{{ ansible_facts['os_family'] }}
{{ ansible_facts['distribution_major_version'] }}
{{ ansible_facts['default_ipv4']['address'] }}
```

Ansible currently injects many facts as top-level variables with an `ansible_` prefix by default, but the project has deprecated that default for a future core release. Namespaced access makes the dependency explicit and avoids collisions with inventory variables.

## Disable Facts for Controller-Only or Static Plays

```yaml
- name: Update an external service
  hosts: app
  gather_facts: false
  tasks:
    - name: Register host metadata through an API
      ansible.builtin.uri:
        url: https://control.example.com/v1/hosts
        method: POST
        body_format: json
        body:
          hostname: "{{ inventory_hostname }}"
          environment: "{{ deploy_environment }}"
```

Inventory variables and magic variables such as `inventory_hostname` do not require setup facts. API orchestration and simple file copies often need none.

If an included role expects facts implicitly, document that requirement or gather them in the calling play. Avoid letting a role sometimes work only because an earlier unrelated play populated `hostvars`.

## Gather a Smaller Subset

At play level:

```yaml
- name: Configure Linux package repositories
  hosts: linux
  gather_facts: true
  gather_subset:
    - min
  tasks:
    - name: Select repository by OS family
      ansible.builtin.include_tasks:
        file: "repositories/{{ ansible_facts['os_family'] }}.yml"
```

The `min` subset gathers the baseline facts Ansible defines as minimal. If a play needs network data too:

```yaml
gather_subset:
  - min
  - network
```

To request a narrowly named subset without the implicit `all` and `min` sets, exclude both first:

```yaml
- name: Gather only selected network facts
  ansible.builtin.setup:
    gather_subset:
      - "!all"
      - "!min"
      - network
```

Subset names and contents can change with core versions. Check the `setup` module documentation for the installed release and test that every referenced key is present.

## Filter an Explicit Setup Call

The setup `filter` parameter uses shell-style matching against first-level fact keys:

```yaml
- name: Gather distribution facts only
  ansible.builtin.setup:
    gather_subset:
      - "!all"
      - "!min"
    filter:
      - ansible_distribution
      - ansible_distribution_major_version
      - ansible_os_family
```

This can be useful in a play that starts with `gather_facts: false` and needs a few values later:

```yaml
- name: Perform a targeted configuration
  hosts: app
  gather_facts: false
  tasks:
    - name: Gather service-manager fact
      ansible.builtin.setup:
        gather_subset:
          - "!all"
          - "!min"
          - service_mgr

    - name: Report the selected service manager
      ansible.builtin.debug:
        var: ansible_facts.service_mgr
```

The Windows setup implementation does not support the same filter behavior. Keep platform-specific fact handling in separate plays or roles.

## Understand the Default Cache

Facts are cached even without configuration, but the default `memory` cache lasts only for the current Ansible process. It can avoid repeat gathering within one run, not across separate playbook invocations.

Persistent cache plugins store facts in files or databases. Configure one plugin at a time. A simple controller-local example is `jsonfile`:

```ini
[defaults]
gathering = smart
fact_caching = jsonfile
fact_caching_connection = /var/cache/ansible/facts
fact_caching_timeout = 3600
```

Create the directory with restrictive ownership for the account running Ansible. Fact data can expose hostnames, addresses, interfaces, operating-system versions, mounts, environment details, and custom facts.

`gathering = smart` causes Ansible to gather facts for a host that lacks valid cached data and reuse valid cached facts otherwise. `gathering = explicit` gathers only when a play requests it. The default `implicit` policy gathers for each play unless `gather_facts: false` is set and does not provide the same persistent-cache optimization.

Confirm active settings:

```bash
ansible-config dump --only-changed
ansible-doc -t cache -l
ansible-doc -t cache ansible.builtin.jsonfile
```

For a shared or horizontally scaled controller, a controller-local file cache may be inappropriate. Use a supported shared plugin and secure it as infrastructure.

## Choose a Freshness Contract

Cache timeout is not merely a performance value. It states how long a play is willing to trust:

- IP addresses and routes
- distribution upgrades
- mounts and devices
- available memory and CPUs
- service manager
- local custom facts

A one-hour cache may be acceptable for selecting a package name, but unsafe immediately after provisioning a new network interface.

Refresh facts explicitly after a change that invalidates them:

```yaml
- name: Refresh facts after changing network configuration
  ansible.builtin.setup:
    gather_subset:
      - min
      - network
```

Clear gathered facts for current hosts when required:

```yaml
- name: Clear cached facts
  ansible.builtin.meta: clear_facts
```

`clear_facts` removes persistent facts for hosts in the play. Be aware that `set_fact` creates a high-precedence host variable, and `cacheable: true` also creates a lower-precedence cached fact. Clearing cached facts does not necessarily remove every in-memory host-variable copy created earlier in the run.

## Avoid Caching Secrets

Never mark a secret fact as cacheable:

```yaml
# Unsafe design
- name: Store a password as a persistent fact
  ansible.builtin.set_fact:
    database_password: "{{ fetched_password }}"
    cacheable: true
```

Cache plugins are not secret managers. Retrieve sensitive values at runtime, use `no_log: true`, and keep them out of persistent fact and inventory caches.

Custom facts under `/etc/ansible/facts.d` also deserve review. Static `.fact` files and executable fact scripts run on the managed node and populate `ansible_local`. Do not place credentials in them.

## Do Not Treat the Cache as a Database API

Ansible's cache-plugin documentation says plugin storage format is an internal implementation detail. Do not build external applications that read JSON cache files or Redis keys directly. The format or presence can change.

If another system needs host facts, export an intentional, versioned data format through a playbook or API instead of coupling it to cache internals.

## Watch for Time-Sensitive Facts

`ansible_date_time` records the time at which facts were gathered. It becomes stale during a long run and is even more obviously stale when loaded from a persistent cache.

For current controller time, use Jinja's `now()` where appropriate:

```jinja2
generated_at={{ now(utc=true, fmt='%Y-%m-%dT%H:%M:%SZ') }}
```

For current managed-node time, run a dedicated command or module rather than assuming a cached timestamp is live.

## Measure the Result

Compare:

```bash
time ansible-playbook -i inventory facts-all.yml
time ansible-playbook -i inventory facts-min.yml
time ansible-playbook -i inventory facts-cached.yml
```

Test a cold cache and a warm cache. Verify not only runtime but also:

- every template renders
- conditionals choose the right branch
- `hostvars` references have populated facts
- newly provisioned hosts do not receive stale identity
- cache outage behavior is acceptable
- permissions prevent other controller users from reading cached data

Fact optimization is most effective when the play explicitly states what it needs. A play with no facts should say so; a play needing only OS identity should request `min`; and a play using persistent facts should document its freshness and invalidation rules.

## Official Documentation

- [Discovering variables: facts and magic variables](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html)
- [ansible.builtin.setup module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/setup_module.html)
- [Cache plugins](https://docs.ansible.com/projects/ansible/latest/plugins/cache.html)
- [Ansible configuration settings](https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html)
- [ansible.builtin.meta module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/meta_module.html)

