# Roles, Collections, and Repositories: Structuring Ansible Automation for Reuse

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ansible, Ansible Roles, Ansible Galaxy, Collection, Automation, DevOps

Description: Choose sensible boundaries for Ansible playbooks, roles, collections, repositories, dependencies, versions, and tests.

---

Ansible offers several kinds of reuse, and they solve different problems:

- A role organizes tasks, handlers, templates, files, and variables for one reusable automation responsibility.
- A collection packages namespaced Ansible content such as roles, playbooks, modules, and plugins.
- A repository is a source-control and ownership boundary. Ansible does not assign it runtime semantics.

Confusing those boundaries leads to one giant role, a collection for every three-task playbook, or a repository that mixes production inventory with independently released plugins. A good structure follows ownership, release cadence, and the kind of content being reused.

## A Decision Table

| Need | Best starting point |
|---|---|
| Reuse tasks and templates inside one automation project | Project-local role |
| Reuse one role across a small number of controlled projects | Versioned role or role in an internal collection |
| Distribute modules, inventory plugins, filters, and roles together | Collection |
| Namespace content and publish a versioned artifact | Collection |
| Keep inventories and top-level deployment playbooks together | Automation project repository |
| Give a component independent ownership and releases | Separate repository |
| Coordinate many tightly coupled roles that change together | One collection and often one repository |

Start with the smallest boundary that has a clear consumer. Moving a stable role into a collection later is easier than maintaining many empty packages before reuse exists.

## Structure the Consumer Automation Repository

An application or platform automation repository commonly owns inventory, entry-point playbooks, dependency pins, and project-local roles:

```text
platform-automation/
├── ansible.cfg
├── inventories/
│   ├── test/
│   │   └── hosts.yml
│   ├── staging/
│   │   ├── hosts.yml
│   │   ├── group_vars/
│   │   └── host_vars/
│   └── production/
│       ├── hosts.yml
│       ├── group_vars/
│       └── host_vars/
├── playbooks/
│   ├── site.yml
│   └── deploy-api.yml
├── roles/
│   └── api_deployment/
├── collections/
│   └── requirements.yml
├── role-requirements.yml
└── tests/
```

Because `playbooks/` and `roles/` are sibling directories in this layout, configure the project and dependency role paths:

```ini
# ansible.cfg
[defaults]
roles_path = ./roles:./.cache/roles
```

The top-level playbook composes reusable content:

```yaml
---
- name: Configure API servers
  hosts: api
  become: true
  roles:
    - role: api_deployment
```

This repository is an environment integration point. It answers which version of a role or collection is approved, which hosts receive it, and which release process invokes it.

Do not put production secrets in the same repository. Ansible Vault protects encrypted content at rest, but vault passwords and external credentials still require a separate control.

## Design One Role Around One Responsibility

Create a role skeleton:

```bash
ansible-galaxy role init roles/api_deployment
```

A conventional role can contain:

```text
roles/api_deployment/
├── defaults/
│   └── main.yml
├── files/
├── handlers/
│   └── main.yml
├── meta/
│   ├── argument_specs.yml
│   └── main.yml
├── tasks/
│   └── main.yml
├── templates/
├── tests/
└── vars/
    └── main.yml
```

Only include directories the role uses. At least one standard role directory is required.

Give each area a clear purpose:

- `tasks/` describes the state and includes smaller task files.
- `handlers/` contains notified actions such as a service restart.
- `templates/` contains Jinja templates.
- `files/` contains static files.
- `defaults/` contains consumer-configurable, low-precedence defaults.
- `vars/` contains higher-precedence internal values that normally should not be overridden.
- `meta/argument_specs.yml` validates role inputs.
- `meta/main.yml` can declare role metadata and dependencies.

Example defaults:

```yaml
# roles/api_deployment/defaults/main.yml
api_package_name: contoso-api
api_service_name: contoso-api
api_port: 8080
api_config_path: /etc/contoso-api/config.yml
```

Example input validation:

```yaml
# roles/api_deployment/meta/argument_specs.yml
---
argument_specs:
  main:
    short_description: Deploy and configure the Contoso API
    options:
      api_port:
        type: int
        required: false
        default: 8080
      api_release_digest:
        type: str
        required: true
```

Keep public variables documented and prefixed to avoid collisions. A generic variable such as `port` is far more likely to conflict than `api_port`.

## Break Up Tasks Without Creating Tiny Roles

One role can include operating-system or feature-specific task files:

```yaml
# roles/api_deployment/tasks/main.yml
---
- name: Install the API
  ansible.builtin.import_tasks: install.yml

- name: Configure the API
  ansible.builtin.import_tasks: configure.yml

- name: Start the API
  ansible.builtin.import_tasks: service.yml
```

Do not create separate roles named `api_install`, `api_config`, and `api_service` if they have one owner, one release, and are never useful independently. That replaces readable task files with cross-role variable and handler coupling.

Create a separate role when the content has its own responsibility, public interface, tests, consumers, and lifecycle.

## Choose Static or Dynamic Role Reuse Deliberately

Ansible can apply roles in three common ways:

```yaml
# Static role processing at play level
roles:
  - role: api_deployment
```

```yaml
# Static import at task level
- name: Import API deployment
  ansible.builtin.import_role:
    name: api_deployment
```

```yaml
# Dynamic include at runtime
- name: Include API deployment for enabled hosts
  ansible.builtin.include_role:
    name: api_deployment
  when: deploy_api | bool
```

The `roles:` keyword and `import_role` are static reuse: Ansible processes them while parsing the play. `include_role` is dynamic and is evaluated when execution reaches the task.

Prefer static reuse when the role is always part of the play and should be visible to syntax, tag, and task listing. Use dynamic inclusion when runtime data genuinely determines whether or how content is included. Do not select `include_role` merely because it seems more flexible.

## Understand What a Collection Adds

A collection is a versioned distribution format with a namespace and collection name:

```text
acme.platform
```

It can provide:

- Roles.
- Playbooks.
- Modules and module utilities.
- Inventory, connection, lookup, filter, test, and other plugins.
- Documentation and tests.

Consumers use fully qualified collection names:

```yaml
- name: Apply the hardening role
  ansible.builtin.include_role:
    name: acme.platform.hardening

- name: Query the internal service catalog
  acme.platform.service_record:
    name: payments
    state: present
```

FQCNs make ownership explicit and avoid collisions with content from another collection.

Create a skeleton:

```bash
ansible-galaxy collection init acme.platform
```

The generated namespace and collection directories contain a required `galaxy.yml`. A mature collection repository can have this content at its release root:

```text
acme-platform/
├── galaxy.yml
├── README.md
├── docs/
├── meta/
│   └── runtime.yml
├── playbooks/
├── plugins/
│   ├── filter/
│   ├── inventory/
│   ├── module_utils/
│   └── modules/
├── roles/
│   ├── hardening/
│   └── service_deployment/
└── tests/
```

Collection roles cannot embed their own plugins. Put plugins under the collection's `plugins/` tree so every role and playbook in the collection can use them.

Not every reusable role needs a collection. A collection becomes valuable when you need namespacing, artifact versioning, several related roles, plugins, or distribution through Galaxy or Automation Hub.

## Build and Install a Collection Artifact

From the directory containing `galaxy.yml`:

```bash
ansible-galaxy collection build
```

This produces a versioned tarball based on `galaxy.yml`. Test the artifact that consumers will install:

```bash
ansible-galaxy collection install \
  acme-platform-1.4.0.tar.gz \
  --force
```

Publish approved artifacts to Ansible Galaxy, a private Galaxy server, or Automation Hub according to the organization. Consumers should install a released artifact, not an arbitrary checkout of a default branch.

Increment the collection version when released content changes. A Git tag and the `galaxy.yml` version should describe the same content.

## Pin Consumer Dependencies

Declare collection dependencies:

```yaml
# collections/requirements.yml
---
collections:
  - name: acme.platform
    version: "1.4.0"
    source: https://galaxy.example.com/api/
  - name: community.general
    version: "11.2.0"
```

Install them:

```bash
ansible-galaxy collection install \
  -r collections/requirements.yml
```

Declare standalone role dependencies separately:

```yaml
# role-requirements.yml
---
roles:
  - name: acme.nginx
    version: "2.3.1"
    src: https://git.example.com/ansible/nginx-role.git
    scm: git
```

Install them into the configured role path:

```bash
ansible-galaxy role install \
  -r role-requirements.yml \
  --roles-path .cache/roles
```

Exact versions maximize reproducibility. Version ranges can be useful for collection-to-collection compatibility but require a lock or tested artifact promotion process in the consuming project.

Do not use `latest`, an unpinned branch, or a moving Git reference for production. A dependency update should be an intentional change with a review and test result.

## Distinguish Declared Dependencies from Hidden Coupling

A role can declare role dependencies in `meta/main.yml`:

```yaml
---
dependencies:
  - role: acme.common
    vars:
      common_enable_audit: true
```

Ansible runs those dependencies before the role. This is appropriate when the dependent role cannot function without them. It can also surprise a consumer by changing hosts before the requested role begins.

Prefer documenting optional companion roles in the top-level playbook. Use a metadata dependency only for a real invariant, keep its variables explicit, and test the combined behavior.

A collection declares collection dependencies in `galaxy.yml`. Those dependencies make content available; they do not automatically execute roles.

## Pick Repository Boundaries from Ownership and Release Cadence

### One automation repository

Use one repository for inventories, top-level playbooks, and project roles when one team releases them together. This provides atomic changes across environment data and orchestration.

### One repository per standalone role

This model can work for a mature role with independent consumers and releases. It becomes expensive when dozens of tiny roles require synchronized pull requests.

### One repository per collection

This is a strong default for a reusable content product. The collection's `galaxy.yml`, changelog, roles, plugins, and tests version together.

### A collection monorepo

Several collections in one repository can share CI and governance, but each collection still needs its own release root and artifact version. Build and test each one as a consumer would install it.

Never choose repository boundaries solely from the Ansible directory tree. Use:

- Clear code ownership.
- Compatible release cadence.
- Access and compliance boundaries.
- Independent consumer demand.
- Test and artifact publishing cost.

## Test at Each Boundary

For an automation repository:

```bash
ansible-playbook \
  -i inventories/test/hosts.yml \
  playbooks/site.yml \
  --syntax-check

ansible-playbook \
  -i inventories/test/hosts.yml \
  playbooks/site.yml \
  --check \
  --diff
```

Syntax and check mode are necessary but not sufficient. Run roles against disposable representative systems and verify the resulting service behavior and idempotence.

For a collection, place it in the supported `ansible_collections/<namespace>/<name>` path when running `ansible-test`:

```bash
ansible-test sanity
ansible-test units
ansible-test integration
```

The exact test targets depend on the content and platform. Modules and plugins need collection-level sanity and integration coverage. Roles need scenario coverage for supported operating systems, default inputs, overrides, handlers, and second-run idempotence.

Finally, build the collection tarball and install it into a clean environment. Source-tree tests can pass while artifact metadata excludes a required file.

## Common Structural Mistakes

### The giant role

One role manages users, databases, monitoring, application deployment, and cloud resources. Split by independent responsibility and lifecycle, not by arbitrary task count.

### The collection with only one private playbook

If there is no namespacing, distribution, or independent release need, a project-local role or task file is simpler.

### High-precedence public configuration

Consumer options placed in role `vars/` ignore normal inventory overrides. Move public inputs to `defaults/` and validate them.

### Plugins embedded in a collection role

Collection roles do not support that layout. Move plugins to the collection's top-level `plugins/` directory.

### Circular role dependencies

Roles that require one another have unclear ownership. Move shared behavior into a lower-level role or compose both from the playbook.

### Unpinned dependencies

A clean CI environment installs newer content and behaves differently. Pin, test, and promote artifact versions.

### Inventory inside a broadly distributed collection

Collections can distribute playbooks, but production inventory is usually owned by the consuming environment and protected by its access boundary.

## A Sustainable Default

For most teams:

1. Keep inventory and entry-point playbooks in an environment automation repository.
2. Begin reusable behavior as project-local roles.
3. Give roles a documented input interface in `defaults/` and `argument_specs.yml`.
4. Move related, stable roles into a collection when several projects consume them.
5. Put custom modules and plugins in a collection from the start.
6. Version and publish collection artifacts.
7. Pin dependencies in consumer repositories.
8. Split repositories only when ownership or release cadence is genuinely independent.

Roles organize behavior. Collections package a namespaced content product. Repositories organize people, history, and releases. Treating each boundary according to its purpose keeps reuse useful without turning every automation change into dependency management.

## Official Documentation

- [Roles](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_reuse_roles.html)
- [Using collections](https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_using_playbooks.html)
- [Collection structure](https://docs.ansible.com/projects/ansible/latest/dev_guide/developing_collections_structure.html)
- [Creating collections](https://docs.ansible.com/projects/ansible/latest/dev_guide/developing_collections_creating.html)
- [Installing collections](https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html)
- [Testing collections](https://docs.ansible.com/projects/ansible/latest/dev_guide/developing_collections_testing.html)
