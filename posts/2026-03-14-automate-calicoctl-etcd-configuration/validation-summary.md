# Validation Summary: Automating Calicoctl etcd Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- calicoctl
- etcd v3
- TLS client certificates
- Bash
- Ansible
- GitHub Actions

## Sources Consulted
- Calico documentation: Configure calicoctl to connect to an etcd datastore - https://docs.tigera.io/calico/latest/operations/calicoctl/configure/etcd
- Calico documentation: calicoctl get command reference - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: calicoctl apply command reference - https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- etcd documentation: How to check cluster status - https://etcd.io/docs/v3.5/tutorials/how-to-check-cluster-status/
- etcd documentation: Transport security model - https://etcd.io/docs/v3.6/op-guide/security/
- Ansible documentation: ansible.builtin.copy module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- GitHub Actions documentation: Workflow syntax for GitHub Actions - https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax

## Issues Found
- The Ansible example copied certificate files into `/etc/calico/certs` without first creating that directory. Ansible's `copy` module does not create a missing parent directory when copying a file to a file path, so I added a `file` task to create `/etc/calico/certs` with restrictive permissions before the copy loop.
- The CI/CD Mermaid flowchart said the pipeline generated a calicoctl config file, validated manifests, and verified applied resources, but the shown GitHub Actions workflow uses environment variables and only applies resources. I updated the diagram so it matches the workflow.
- The troubleshooting note for `transport: authentication handshake failed` described etcd as having a trusted client list based on certificate CN/SANs. etcd client certificate authentication is based on certificates chaining to the configured trusted CA, and client certificates should include the client authentication extended key usage; I corrected the note.

## Review Notes
- The calicoctl configuration keys (`datastoreType`, `etcdEndpoints`, `etcdKeyFile`, `etcdCertFile`, and `etcdCACertFile`) and equivalent environment variables are valid according to the current Calico documentation.
- The `calicoctl get` and `calicoctl apply` command forms, including `--config` and directory input through `-f`, are valid.
- The `etcdctl endpoint health` command and TLS flags shown are consistent with the etcd documentation.
