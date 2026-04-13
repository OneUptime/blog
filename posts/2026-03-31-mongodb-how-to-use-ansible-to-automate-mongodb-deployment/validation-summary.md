# Validation Summary: How to Use Ansible to Automate MongoDB Deployment

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB 7.0
- Ansible 2.12+ (ansible.builtin and community.mongodb collections)
- Ansible Vault for secrets management
- Jinja2 templating for configuration files
- systemd service management
- Ubuntu/Debian apt package management

## Sources Consulted
- MongoDB 7.0 installation documentation: https://www.mongodb.com/docs/v7.0/tutorial/install-mongodb-on-ubuntu/
- MongoDB 7.0 mongosh package information: https://www.mongodb.com/docs/mongodb-shell/install/
- Ansible builtin module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/
- community.mongodb collection documentation: https://docs.ansible.com/ansible/latest/collections/community/mongodb/
- MongoDB replica set configuration reference: https://www.mongodb.com/docs/v7.0/reference/configuration-options/
- Ansible Vault documentation: https://docs.ansible.com/ansible/latest/vault_guide/

## Issues Found

### 1. Incorrect shell package name for MongoDB 7.0
- **What was wrong:** The installation task listed `mongodb-org-shell` as a package to install. The `mongodb-org-shell` package provided the legacy `mongo` shell, which was removed in MongoDB 6.0. For MongoDB 7.0, the shell is provided by the `mongodb-mongosh` package.
- **What was changed:** Replaced `mongodb-org-shell` with `mongodb-mongosh` in the Install MongoDB packages task.
- **Why:** Using the old package name would cause `apt` to fail with a "package not found" error since `mongodb-org-shell` does not exist in the MongoDB 7.0 repository.

### 2. Misleading `--tags install` command with no tags defined
- **What was wrong:** The "Running the Playbook" section included the command `ansible-playbook site.yml -i inventory/hosts.yml --tags install` described as "Run only installation tasks," but none of the task files in the post define any tags. Running this command would execute no tasks at all.
- **What was changed:** Removed the `--tags install` example command.
- **Why:** Including a command that silently does nothing would confuse readers following the tutorial.

## Review Notes
- The `ansible.builtin.apt_key` module wraps the `apt-key` CLI tool, which is deprecated in modern Debian/Ubuntu releases. The recommended approach is to download the GPG key to `/etc/apt/keyrings/` using `ansible.builtin.get_url` and reference it with `signed-by` in the repository definition. The current approach still works but may generate deprecation warnings.
- The playbook enables `security.authorization` but does not configure a `security.keyFile` for inter-member authentication. In a real replica set deployment with auth enabled, a shared keyFile (or x.509 certificates) is required for members to authenticate with each other. Without it, replica set members cannot communicate after auth is initialized.
- The rolling upgrade playbook processes hosts in inventory order. If the primary (mongo1) is listed first, it would be upgraded before the secondaries. MongoDB best practice is to upgrade secondaries first, then step down and upgrade the primary last. Consider reordering the inventory or using `order: sorted` with inventory grouping to control upgrade order.
- `storage.engine: wiredTiger` is redundant for MongoDB 7.0+ since WiredTiger is the only supported storage engine. It is not harmful but adds unnecessary configuration.
