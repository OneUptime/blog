# Validation Summary: How to Add Worker Nodes to K3s

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes
- Linux firewall configuration (`ufw`, `firewalld`)
- Ansible
- `kubectl`

## Sources Consulted
- K3s Quick-Start Guide: https://docs.k3s.io/quick-start
- K3s Configuration Options: https://docs.k3s.io/installation/configuration
- K3s Requirements: https://docs.k3s.io/installation/requirements
- K3s Agent CLI Reference: https://docs.k3s.io/cli/agent
- K3s Token CLI Reference: https://docs.k3s.io/cli/token
- Kubernetes `kubectl version` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Kubernetes API health endpoints: https://kubernetes.io/docs/reference/using-api/health-checks/
- Ansible `file` lookup reference: https://docs.ansible.com/projects/ansible-core/2.18/collections/ansible/builtin/file_lookup.html
- firewalld rich language reference: https://firewalld.org/documentation/man-pages/firewalld.richlanguage

## Issues Found
- `kubectl version --short` is not in the current kubectl reference. Changed it to `kubectl version`.
- The firewall examples opened UDP 8472 and TCP 10250 broadly. Updated the examples to match K3s firewall guidance by keeping 6443 open, allowing the default pod and service CIDRs, and restricting 8472 and 10250 to trusted node networks.
- The config-file install example used `sh - agent`; changed it to the documented `sh -s - agent` form.
- The sample `kubectl get nodes` output used the outdated `master`-only role and hard-coded an older K3s version. Updated the example to `control-plane,master` and generic `vX.Y.Z+k3s1` placeholders.
- The Ansible example used `lookup('file', '/var/lib/rancher/k3s/server/node-token')`, which reads from the Ansible controller rather than the K3s server. Replaced it with the token placeholder already obtained earlier in the post.
- The troubleshooting example used the deprecated Kubernetes API `/healthz` endpoint. Changed it to `/readyz`.

## Review Notes
- The firewall examples assume the default K3s pod CIDR `10.42.0.0/16`, service CIDR `10.43.0.0/16`, and IPv4 node networking. Clusters with custom CIDRs or IPv6 need adjusted rules.
- The version pinning examples intentionally use `vX.Y.Z+k3s1`; readers should replace that with the server version shown by `kubectl version`.
- K3s requires each joining node to have a unique hostname or an explicit `K3S_NODE_NAME`.
