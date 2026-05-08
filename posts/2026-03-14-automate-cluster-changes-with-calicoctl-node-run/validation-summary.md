# Validation Summary: Automating Cluster Changes with calicoctl node run

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico Open Source
- calicoctl
- calico/node
- etcdv3 datastore configuration
- Docker
- Bash
- SSH
- Ansible

## Sources Consulted
- Calico documentation: calicoctl node run command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/run
- Calico documentation: calicoctl node status command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico documentation: calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: Install calicoctl: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico documentation: Configure calicoctl for etcd: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/etcd
- Ansible documentation: ansible.builtin.file module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html
- Ansible documentation: ansible.builtin.get_url module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/get_url_module.html
- Ansible documentation: community.docker.docker_container module: https://docs.ansible.com/ansible/latest/collections/community/docker/docker_container_module.html

## Issues Found
- The prerequisites allowed either etcd or Kubernetes API datastores, but the examples use BGP-related `calicoctl node run` flags that do not apply with the Kubernetes API datastore. Updated the text and prerequisites to scope the examples to etcdv3 and explain the Kubernetes API caveat.
- The shell scripts would process commented lines in the sample `hosts.txt` file as hosts. Added blank-line and comment-line skips to the deployment, rolling restart, and pre-deployment scripts, and updated verification to skip comments.
- The fleet deployment heredoc expanded `$(hostname)` on the control host instead of the remote host. Changed the node name and log message to use the parsed host name.
- The fleet deployment example combined an explicit `--ip` with `--ip-autodetection-method`, making the autodetection method irrelevant. Removed the unused autodetection flag from that command.
- The etcdv3 examples did not consistently set `DATASTORE_TYPE=etcdv3`, which Calico documents as required when using environment variables for etcdv3. Added it where needed.
- The rolling restart example passed `ETCD_ENDPOINTS` from an unset remote shell variable and omitted the etcd TLS file environment variables. Added explicit etcdv3 endpoint and certificate environment variables.
- The Ansible playbook copied certificates into `/etc/calico/certs` without creating that directory first. Added a task to create the certificate directory.
- The Ansible playbook used the short `docker_container` module name. Updated it to the documented `community.docker.docker_container` fully qualified collection name.
- The Ansible playbook referenced a `calico-node.env.j2` template but did not use the generated environment file. Removed the unused template task.

## Review Notes
The corrected Bash snippets were checked with `bash -n`. The examples still assume Docker-based `calicoctl node run` deployments and Calico v3.27.0 images, so future maintenance should revisit the version pin and Docker dependency as the surrounding Calico deployment model changes.
