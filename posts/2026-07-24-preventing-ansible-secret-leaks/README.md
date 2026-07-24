# Preventing Secret Leaks in Ansible Output, Logs, and Registered Variables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Security, Secrets Management, Logging, Automation

Description: Keep Ansible secrets out of stdout, diffs, logs, job artifacts, cached facts, command lines, and follow-up task output.

---

Encrypting a secret at rest is only the beginning. During a playbook run, Ansible can place decrypted values in task arguments, stdout, diffs, registered results, callback output, controller logs, fact caches, generated files, and process environments.

The central control is `no_log: true`, but it must follow the value through its whole lifetime. Protecting the lookup task does not automatically protect a later debug, assertion, loop label, or failed command that consumes the registered variable.

## Map the Secret's Path

Before writing tasks, identify each stage:

```text
source
  -> controller lookup or vault decryption
  -> Ansible variable
  -> module argument
  -> managed-node file or process
  -> registered result
  -> callback, log, cache, or job artifact
```

At each arrow ask whether the value is displayed, persisted, copied, or sent to another system. Minimize how many stages see it.

## Protect the Retrieval Task

```yaml
- name: Read application credentials
  ansible.builtin.set_fact:
    app_credentials: >-
      {{
        lookup(
          'community.hashi_vault.vault_kv2_get',
          'myapp/production',
          engine_mount_point='secret',
          url='https://vault.example.com'
        ).secret
      }}
  no_log: true
```

Lookups execute on the controller during templating. `no_log` censors normal task output, but the variable still contains the secret so later tasks can use it.

Ansible Vault carries the same warning: it protects encrypted data at rest only. Once decrypted, play and plugin authors remain responsible for preventing disclosure.

## Protect Every Consumer

This is unsafe:

```yaml
- name: Show retrieved credentials
  ansible.builtin.debug:
    var: app_credentials
```

Ansible's logging documentation explicitly notes that `no_log` does not affect separate debugging output. Protect follow-up tasks individually:

```yaml
- name: Create the application database user
  community.postgresql.postgresql_user:
    name: "{{ app_credentials.username }}"
    password: "{{ app_credentials.password }}"
    state: present
  no_log: true
```

Assertions can also expose the evaluated data or failure context. Suppress them:

```yaml
- name: Validate credential fields without displaying them
  ansible.builtin.assert:
    that:
      - app_credentials.username | default('') | length > 0
      - app_credentials.password | default('') | length >= 20
    fail_msg: The application credential is missing required fields.
    quiet: true
  no_log: true
```

Use a generic failure message. Do not concatenate the invalid value into it.

## Disable Diffs for Secret-Bearing Files

`--diff` can show before-and-after file content. Even a task that is safe during a normal run can reveal a password in CI when someone adds `--diff`.

```yaml
- name: Render application secrets
  become: true
  ansible.builtin.template:
    src: secrets.conf.j2
    dest: /etc/myapp/secrets.conf
    owner: root
    group: myapp
    mode: "0640"
  no_log: true
  diff: false
```

The Ansible check-mode documentation recommends `diff: false` for files containing secrets. Keep it in the role so callers cannot accidentally expose content through a global flag.

## Do Not Put Secrets in Task Names

Task names are output before module execution and are not a safe location for secret-derived values:

```yaml
# Unsafe
- name: Configure token {{ api_token }}
  ansible.builtin.uri:
    url: https://api.example.com/configure
    headers:
      Authorization: "Bearer {{ api_token }}"
  no_log: true
```

Use a static label:

```yaml
- name: Configure the API credential
  ansible.builtin.uri:
    url: https://api.example.com/configure
    method: POST
    headers:
      Authorization: "Bearer {{ api_token }}"
  no_log: true
```

Also keep secrets out of inventory host aliases, item labels, notification names, and tags.

## Treat Registered Variables as Sensitive

A task result can repeat its arguments, request body, headers, stdout, stderr, and exception details:

```yaml
- name: Authenticate to the internal API
  ansible.builtin.uri:
    url: https://api.example.com/login
    method: POST
    body_format: json
    body:
      username: "{{ app_credentials.username }}"
      password: "{{ app_credentials.password }}"
    return_content: true
  register: login_result
  no_log: true
```

`login_result` remains available in memory. Any task that prints it can disclose both request and response:

```yaml
- name: Use the returned access token
  ansible.builtin.uri:
    url: https://api.example.com/deploy
    method: POST
    headers:
      Authorization: "Bearer {{ login_result.json.access_token }}"
  no_log: true
```

Register only when needed, retain the narrowest useful field, and do not publish the result through `set_stats`, debug, or a custom callback.

## Avoid Cached Secret Facts

`set_fact` creates host variables for the current run. With `cacheable: true`, it also creates a lower-precedence `ansible_fact` that a configured persistent fact cache can retain:

```yaml
# Avoid for secret values
- name: Cache a database password
  ansible.builtin.set_fact:
    database_password: "{{ secret_value }}"
    cacheable: true
```

Fact caches may be files, Redis, or another plugin. Keep secrets out of cacheable facts. If sensitive data entered a cache, rotate the secret and clear the relevant cache through its supported mechanism.

Inventory caching creates a similar review requirement if dynamic inventory variables contain credentials. Prefer credential references or platform credential injection over putting secret values in inventory.

## Keep Secrets Out of Commands and URLs

Shell and command arguments can appear in output, process listings, audit systems, or the tool's own logs:

```yaml
# Risky
- name: Log in with a command-line password
  ansible.builtin.command:
    cmd: mycli login --password {{ database_password }}
  no_log: true
```

`no_log` controls Ansible output, not the managed node's process table. Prefer a module with a protected parameter, a short-lived credential file with restrictive permissions, standard input if the program safely supports it, or workload identity.

URLs are especially leak-prone because proxies and servers log them. Put tokens in an authorization header rather than a query string:

```yaml
- name: Call the protected endpoint
  ansible.builtin.uri:
    url: https://api.example.com/v1/status
    headers:
      Authorization: "Bearer {{ api_token }}"
  no_log: true
```

Headers can still be logged by some intermediaries, so configure the receiving system appropriately.

## Protect Loops Completely

`loop_control.label` reduces noisy output but is not a security control:

```yaml
- name: Create service accounts
  ansible.builtin.user:
    name: "{{ item.username }}"
    password: "{{ item.password_hash }}"
  loop: "{{ service_accounts }}"
  loop_control:
    label: "{{ item.username }}"
  no_log: true
```

Without `no_log`, failure output or callback serialization may include the complete item, including the hash or token. Protect the whole task.

## Review Controller Logging

Ansible writes normal task output to the controller's stdout. If `log_path` is configured, that output can also be persisted. AWX or another automation platform stores job events and output in its database.

Review these settings and integrations:

- `log_path`
- `display_args_to_stdout`
- callback plugins
- CI log retention and artifact uploads
- AWX job access and retention
- syslog behavior on managed nodes
- observability agents that capture process output

`display_args_to_stdout` can make similar tasks easier to distinguish by including variable values in output. Do not enable it casually in a secret-bearing environment.

Custom callbacks and third-party plugins must honor Ansible's censorship markers. Test the exact callback stack you deploy, rather than assuming every plugin treats `no_log` correctly.

## Limit Managed-Node Persistence

When rendering a secret, set ownership and mode explicitly:

```yaml
- name: Install the service credential
  become: true
  ansible.builtin.copy:
    content: "{{ service_credential }}"
    dest: /etc/myapp/credential
    owner: root
    group: myapp
    mode: "0640"
  no_log: true
  diff: false
```

Prefer application-native secret mounts or runtime identity when available. If a plaintext file is unavoidable:

- restrict its readers
- avoid world-readable backups
- configure log and crash-dump exclusion
- rotate it
- remove it when no longer needed
- consider how the file is copied during support collection

Encrypted source passed to modules such as `copy` or `template` is decrypted on the target as intended. Vault encryption does not keep the deployed file encrypted.

## Build Safe Diagnostic Patterns

Report metadata, not values:

```yaml
- name: Confirm secret readiness
  ansible.builtin.debug:
    msg:
      secret_present: "{{ api_token is defined }}"
      secret_length_valid: "{{ (api_token | default('')) | length >= 20 }}"
```

Even length and existence can be sensitive in some threat models. For high-value material, put the check in a `no_log` assertion and emit only a generic pass or fail.

Never temporarily remove `no_log` in a shared CI environment to diagnose a production credential. Reproduce with a disposable secret in an isolated environment.

## Test the Negative Space

Run a controlled test with a unique canary secret, then search authorized job output and logs for it:

```bash
rg -F 'CANARY-SECRET-VALUE' /secure/test-job-output
```

Check:

- normal success
- module failure
- unreachable host
- assertion failure
- loop failure
- `--check --diff`
- high verbosity
- callback and AWX output
- persistent fact and inventory caches

Rotate the canary afterward. This validates the actual execution stack, including plugins and platform retention.

The best secret is never fetched by Ansible because the workload uses its own identity. When Ansible must handle one, keep its lifetime short, its path narrow, and every output surface explicitly censored.

## Official Documentation

- [Logging Ansible output and no_log](https://docs.ansible.com/projects/ansible/latest/reference_appendices/logging.html)
- [Validating tasks and disabling diff](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html)
- [Ansible Vault security scope](https://docs.ansible.com/projects/ansible/latest/vault_guide/vault.html)
- [ansible.builtin.set_fact module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/set_fact_module.html)
- [AWX credentials](https://docs.ansible.com/projects/awx/en/24.6.1/userguide/credentials.html)

