# How to Use Custom Collections in Execution Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Collections, Execution Environments, ansible-builder

Description: Include custom and private Ansible collections in your Execution Environments from Galaxy, Automation Hub, Git repos, and local sources.

---

Ansible collections are the standard way to package and distribute modules, plugins, roles, and playbooks. When you build an Execution Environment, you want specific collections baked into the image so that every playbook run has exactly the right versions available. This post covers how to include collections from every possible source: Ansible Galaxy, Red Hat Automation Hub, private Galaxy servers, Git repositories, and local tarballs.

## The Galaxy Requirements File

Collections are declared in a `requirements.yml` file, which is referenced from your `execution-environment.yml`:

```yaml
# execution-environment.yml
---
version: 3

images:
  base_image:
    name: quay.io/ansible/ansible-runner:latest

dependencies:
  galaxy: requirements.yml
  python: requirements.txt
  system: bindep.txt
```

The requirements file follows the ansible-galaxy format:

```yaml
# requirements.yml - Basic collection requirements
---
collections:
  - name: community.general
    version: ">=8.0.0"
  - name: ansible.posix
    version: ">=1.5.0"
  - name: community.docker
    version: ">=3.4.0"
  - name: ansible.utils
    version: ">=3.0.0"
```

## Installing from Ansible Galaxy

Ansible Galaxy is the default source. You do not need to specify a source URL for Galaxy collections.

```yaml
# requirements.yml - Collections from Ansible Galaxy
---
collections:
  - name: community.general
    version: "8.2.0"
  - name: community.docker
    version: "3.7.0"
  - name: community.postgresql
    version: "3.2.0"
  - name: community.mysql
    version: "3.8.0"
  - name: ansible.posix
    version: "1.5.4"
  - name: ansible.utils
    version: "3.1.0"
  - name: community.crypto
    version: "2.16.0"
```

## Installing from Red Hat Automation Hub

If you have a Red Hat subscription, you can pull certified and validated collections from Automation Hub. This requires authentication.

First, create an ansible.cfg with your Automation Hub token:

```ini
# files/ansible.cfg - Automation Hub configuration
[galaxy]
server_list = automation_hub, galaxy

[galaxy_server.automation_hub]
url = https://console.redhat.com/api/automation-hub/content/published/
auth_url = https://sso.redhat.com/auth/realms/redhat-external/protocol/openid-connect/token
token = YOUR_AUTOMATION_HUB_TOKEN

[galaxy_server.galaxy]
url = https://galaxy.ansible.com/
```

Include the config in your EE build:

```yaml
# execution-environment.yml - With Automation Hub
---
version: 3

images:
  base_image:
    name: quay.io/ansible/ansible-runner:latest

additional_build_files:
  - src: files/ansible.cfg
    dest: configs

additional_build_steps:
  prepend_galaxy:
    - COPY _build/configs/ansible.cfg /etc/ansible/ansible.cfg
  append_final:
    # Remove the token from the final image
    - RUN rm -f /etc/ansible/ansible.cfg

dependencies:
  galaxy: requirements.yml
  python: requirements.txt
  system: bindep.txt
```

Now your requirements file can reference Automation Hub collections:

```yaml
# requirements.yml - Mix of Galaxy and Automation Hub collections
---
collections:
  # From Automation Hub (certified)
  - name: redhat.rhel_system_roles
    source: https://console.redhat.com/api/automation-hub/content/published/
  - name: redhat.insights
    source: https://console.redhat.com/api/automation-hub/content/published/

  # From Ansible Galaxy
  - name: community.general
    version: ">=8.0.0"
  - name: ansible.posix
    version: ">=1.5.0"
```

## Installing from a Private Galaxy Server

Many organizations run their own Galaxy server (like Pulp or a private Galaxy NG instance) to host internal collections.

```ini
# files/ansible.cfg - Private Galaxy server
[galaxy]
server_list = private_galaxy, public_galaxy

[galaxy_server.private_galaxy]
url = https://galaxy.internal.example.com/api/
token = YOUR_PRIVATE_TOKEN

[galaxy_server.public_galaxy]
url = https://galaxy.ansible.com/
```

Reference your internal collections in requirements.yml:

```yaml
# requirements.yml - Internal collections
---
collections:
  # Internal collections from your private Galaxy
  - name: mycompany.infrastructure
    version: ">=2.0.0"
    source: https://galaxy.internal.example.com/api/

  - name: mycompany.security
    version: ">=1.5.0"
    source: https://galaxy.internal.example.com/api/

  # Public collections
  - name: community.general
    version: ">=8.0.0"
```

## Installing from Git Repositories

For collections under active development or those not published to any Galaxy server, install directly from Git:

```yaml
# requirements.yml - Collections from Git
---
collections:
  # From a specific tag
  - name: https://github.com/myorg/ansible-collection-myapp.git
    type: git
    version: v2.1.0

  # From a specific branch
  - name: https://github.com/myorg/ansible-collection-network.git
    type: git
    version: develop

  # From a specific commit
  - name: https://github.com/myorg/ansible-collection-cloud.git
    type: git
    version: 8a3b2c1d

  # Using SSH (for private repos)
  - name: git@github.com:myorg/private-collection.git
    type: git
    version: main
```

For private Git repositories that need SSH keys during the build:

```yaml
# execution-environment.yml - Git SSH access during build
---
version: 3

images:
  base_image:
    name: quay.io/ansible/ansible-runner:latest

additional_build_files:
  - src: files/deploy_key
    dest: ssh

additional_build_steps:
  prepend_galaxy:
    - RUN mkdir -p /root/.ssh
    - COPY _build/ssh/deploy_key /root/.ssh/id_rsa
    - RUN chmod 600 /root/.ssh/id_rsa
    - RUN ssh-keyscan github.com >> /root/.ssh/known_hosts
  append_final:
    - RUN rm -rf /root/.ssh

dependencies:
  galaxy: requirements.yml
  python: requirements.txt
  system: bindep.txt
```

## Installing from Local Tarballs

If you build collections locally (using `ansible-galaxy collection build`), you can include the tarballs in your EE build.

Build your collection first:

```bash
# Build a collection tarball from source
cd /path/to/myorg/myapp
ansible-galaxy collection build --output-path /tmp/collections/
```

Then reference it in your project:

```yaml
# requirements.yml - Local collection tarballs
---
collections:
  - name: ./collections/myorg-myapp-1.0.0.tar.gz
    type: file

  - name: community.general
    version: ">=8.0.0"
```

Update your EE definition to include the local files:

```yaml
# execution-environment.yml - With local collections
---
version: 3

images:
  base_image:
    name: quay.io/ansible/ansible-runner:latest

additional_build_files:
  - src: collections/
    dest: collections

additional_build_steps:
  prepend_galaxy:
    - COPY _build/collections/ /tmp/collections/

dependencies:
  galaxy: requirements.yml
  python: requirements.txt
  system: bindep.txt
```

## Collection Dependencies and Transitive Resolution

Collections can depend on other collections. ansible-builder resolves these transitive dependencies automatically. For example, if your requirements.yml lists `community.docker`, and community.docker depends on `community.library_inventory_filtering_v1`, that collection will be installed automatically.

You can see the full dependency tree:

```bash
# Check collection dependencies
ansible-galaxy collection info community.docker --format json 2>/dev/null | python3 -m json.tool
```

To see what actually got installed in your EE:

```bash
# List all collections in the built image
podman run --rm my-ee:1.0 ansible-galaxy collection list
```

## Verifying Collections in the Built Image

After building, always verify that the expected collections are present and at the correct versions:

```bash
# List all installed collections
podman run --rm my-ee:1.0 ansible-galaxy collection list

# Check a specific collection version
podman run --rm my-ee:1.0 ansible-galaxy collection list community.general

# Verify a module from a collection works
podman run --rm my-ee:1.0 ansible-doc community.general.json_query
```

Create a verification playbook:

```yaml
---
# verify-collections.yml - Verify EE collections
- name: Verify collections are installed
  hosts: localhost
  connection: local
  gather_facts: false
  tasks:
    - name: Check community.general
      ansible.builtin.command: ansible-galaxy collection list community.general
      register: cg_check
      changed_when: false

    - name: Show community.general version
      ansible.builtin.debug:
        msg: "{{ cg_check.stdout_lines }}"

    - name: Use a module from community.general to prove it works
      community.general.json_query:
        data:
          users:
            - name: alice
              role: admin
            - name: bob
              role: user
        query: "users[?role=='admin'].name"
      register: query_result

    - name: Show query result
      ansible.builtin.debug:
        msg: "Admin users: {{ query_result.result }}"
```

Run the verification:

```bash
# Run verification playbook inside the EE
ansible-navigator run verify-collections.yml \
  --execution-environment-image my-ee:1.0 \
  --mode stdout \
  --pull-policy missing
```

## Handling Collection Updates

When you need to update collections in your EE, follow this process:

```bash
# Check for available updates
ansible-galaxy collection list 2>/dev/null | while read ns name ver; do
  echo "Checking $ns.$name (current: $ver)"
done

# Update the version in requirements.yml, then rebuild
ansible-builder build --tag my-ee:2.0 --verbosity 2

# Compare the old and new images
podman run --rm my-ee:1.0 ansible-galaxy collection list > /tmp/old-collections.txt
podman run --rm my-ee:2.0 ansible-galaxy collection list > /tmp/new-collections.txt
diff /tmp/old-collections.txt /tmp/new-collections.txt
```

## Wrapping Up

Getting custom collections into your Execution Environment is straightforward once you understand the different source types. Galaxy and Automation Hub are the simplest, Git repos give you flexibility for development builds, and local tarballs handle edge cases where nothing else works. Always verify your built images with `ansible-galaxy collection list` and a test playbook before rolling them out. And remember to clean up any authentication tokens from the final image layer so they do not end up in your container registry.
