# Validation Summary: How to Use Ansible to Manage Docker Registries

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- community.docker Ansible collection
- Docker Engine
- CNCF Distribution / Docker Registry HTTP API V2
- Apache htpasswd
- TLS certificates

## Sources Consulted
- Ansible community.docker.docker_container module documentation: https://docs.ansible.com/ansible/latest/collections/community/docker/docker_container_module.html
- Ansible ansible.builtin.uri module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible ansible.builtin.command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Docker Engine certificate configuration documentation: https://docs.docker.com/engine/security/certificates/
- Docker dockerd registry certificate documentation: https://docs.docker.com/reference/cli/dockerd/
- CNCF Distribution registry configuration documentation: https://distribution.github.io/distribution/about/configuration/
- CNCF Distribution Registry HTTP API V2 specification: https://distribution.github.io/distribution/spec/api/
- CNCF Distribution garbage collection documentation: https://distribution.github.io/distribution/about/garbage-collection/
- Apache HTTP Server htpasswd documentation: https://httpd.apache.org/docs/2.4/en/programs/htpasswd.html

## Issues Found
- The authentication playbook wrote `{{ auth_dir }}/htpasswd` without first ensuring that `auth_dir` exists in that standalone playbook. Added a task to create the auth directory.
- The htpasswd examples used `-b`, which places plaintext passwords on the command line. Apache documents this as discouraged. Changed the tasks to use `htpasswd -i` with Ansible's `stdin` parameter and added `no_log: true` to hide sensitive task data.
- The registry loads the htpasswd file at startup, so changing the file on an already running container may not take effect. Added `restart: true` to the auth-enabled container task.
- The lifecycle diagram said "Delete Old Tags via API"; the Registry HTTP API deletes manifests by digest, with tags used only to find references. Changed it to "Delete Old Manifests via API."
- The garbage collection explanation said deleted image layers pile up. Tightened the wording to unreferenced blobs, which matches the registry garbage collection model.

## Review Notes
- The examples use `registry:2.8`, which is valid for the Docker Distribution v2 registry examples in the post. Future updates may want to revisit the tag if the post is updated for Distribution v3.
- The API listing examples do not include pagination for large catalogs or tag sets. The endpoints are correct, but production automation should handle paginated responses.
