# Validation Summary: How to Automate Calicoctl etcd Configuration

## Status
validated

## Post Type
Technical operations guide

## Technologies Covered
- Calico
- calicoctl
- etcd
- Bash
- SSH and scp
- Ansible
- TLS certificate configuration

## Sources Consulted
- Calico documentation: Configure calicoctl to connect to an etcd datastore - https://docs.tigera.io/calico/latest/operations/calicoctl/configure/etcd
- Calico documentation: calicoctl get - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: calicoctl version - https://docs.tigera.io/calico/latest/reference/calicoctl/version
- Ansible documentation: ansible.builtin.file module - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/file_module.html
- Ansible documentation: ansible.builtin.copy module - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible documentation: ansible.builtin.template module - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html

## Issues Found
- The calicoctl configuration file used `etcdCACert`, `etcdCert`, and `etcdKey` with file paths. Calico documents those fields as inline certificate/key content fields; file paths should use `etcdCACertFile`, `etcdCertFile`, and `etcdKeyFile`. Updated the configuration snippet accordingly.
- The reusable shell script checked for the CA and client certificate but not the private key before exporting `ETCD_KEY_FILE`. Added a `client-key.pem` existence check so the script fails early when the TLS client key is missing.
- The standalone config-file commands wrote to `/etc/calico` without privilege escalation. Updated the example to use `sudo mkdir`, `sudo tee`, and `sudo chmod` so it works from a normal administrative shell.
- The certificate distribution script created privileged directories with `sudo` but then copied directly into `/etc/calico/...` using `scp`, which commonly fails for non-root SSH users. Updated the example to copy files to `/tmp`, install them into the privileged locations with `sudo install`, and remove the temporary copies.

## Review Notes
The documented `DATASTORE_TYPE=etcdv3`, `ETCD_ENDPOINTS`, `ETCD_CA_CERT_FILE`, `ETCD_CERT_FILE`, and `ETCD_KEY_FILE` environment variables align with current Calico documentation. The default calicoctl config path `/etc/calico/calicoctl.cfg`, `--config` option, and `calicoctl get nodes -o wide` usage also match the official calicoctl command reference. Calico documentation notes that newer releases recommend using the Calico API server and `kubectl` for most resource operations, but `calicoctl` remains valid for workflows that need direct datastore access and specific calicoctl subcommands.
