# Validation Summary: How to Use Ansible to Manage Container Registry Cleanup

## Status
validated

## Post Type
Tutorial / DevOps guide

## Technologies Covered
- Ansible
- Docker Hub API
- Docker Registry / CNCF Distribution
- AWS CLI
- Amazon Elastic Container Registry (ECR)
- ECR lifecycle policies
- Cron
- UFW

## Sources Consulted
- Ansible `ansible.builtin.uri` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `community.general.timezone` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible `ansible.builtin.hostname` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/hostname_module.html
- Ansible `ansible.builtin.cron` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible `community.general.ufw` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Docker Hub API reference: https://docs.docker.com/reference/api/hub/latest/
- Docker Hub deprecated API endpoints documentation: https://docs.docker.com/reference/api/hub/deprecated/
- Docker Hub tags documentation: https://docs.docker.com/docker-hub/repos/manage/hub-images/tags/
- AWS CLI `ecr batch-delete-image` command reference: https://docs.aws.amazon.com/cli/latest/reference/ecr/batch-delete-image.html
- Amazon ECR lifecycle policy properties documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/lifecycle_policy_parameters.html
- CNCF Distribution registry configuration documentation: https://distribution.github.io/distribution/about/configuration/

## Issues Found
- The Docker Hub examples used the older `/v2/repositories/{namespace}/{repository}/tags` endpoint shape. Updated the list and delete tag URLs to the current documented `/v2/namespaces/{namespace}/repositories/{repository}/tags` endpoint shape.
- The Docker Hub tag retention expression used Jinja's `slice` filter as if it performed Python-style list slicing. Replaced it with Python-style slicing after sorting so the playbook deletes older tags while keeping the newest `keep_count` tags.
- The cleanup strategy diagram said `v*` tags were protected, but the example only protects exact tag names in `protected_tags`. Updated the diagram to match the code.
- The ECR delete task queried a JSON array of digest strings, but `aws ecr batch-delete-image --image-ids` expects image identifier objects or shorthand values. Updated the query to return `{imageDigest: ...}` objects and delete them in batches of 100, matching the AWS CLI limit.
- The private registry garbage collection command placed `--delete-untagged` after the config path. Reordered the command to match documented usage and added a note to run garbage collection while the registry is stopped or read-only.
- The infrastructure provisioning example used `ansible.builtin.timezone`, which is not an ansible-core module in current Ansible documentation. Updated it to `community.general.timezone`.

## Review Notes
- The Docker Hub example retrieves one page of up to 100 tags. Repositories with more than 100 tags should follow the `next` pagination URL before applying a repository-wide retention policy.
- The local environment did not have `ansible` installed, so full `ansible-playbook --syntax-check` verification could not be run. The Markdown YAML snippets were parsed successfully with Python's YAML parser, and the corrected Jinja slicing expression was checked with the available Jinja runtime.
