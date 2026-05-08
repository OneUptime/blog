# Validation Summary: Standardizing Team Workflows Around calicoctl node diags

## Status
validated

## Post Type
Operational guide

## Technologies Covered
- Calico Open Source
- calicoctl
- Kubernetes
- Bash
- Linux find, tar, ssh, and sudo commands

## Sources Consulted
- Calico documentation: calicoctl node diags - https://docs.tigera.io/calico/latest/reference/calicoctl/node/diags
- Calico documentation: calicoctl node commands - https://docs.tigera.io/calico/latest/reference/calicoctl/node/overview
- Calico documentation: calicoctl get - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: troubleshooting and diagnostics - https://docs.tigera.io/calico/latest/operations/troubleshoot/troubleshooting
- Kubernetes documentation: field selectors - https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/

## Issues Found
- The collection script assumed `calicoctl node diags` produced `/tmp/calico-diags-*.tar.gz`. Official Calico examples show the command reporting an actual generated path such as `/tmp/calico.../diags-...tar.gz`. Updated the script to parse the reported "Diags saved to" path and copy that archive.
- The remote collection path used `kubectl exec` into a `calico-node` pod. Calico documents that `calicoctl node ...` commands need host filesystem access and must run directly on the compute host. Updated the remote path to run the command over SSH on the target node and copy the resulting archive with `sudo cat`.
- The storage example used a bundle filename that did not match the documented `diags-...tar.gz` output pattern. Updated the example filename.
- The analysis script used unquoted command substitutions and route-file paths that could fail with multiple matches or paths containing spaces. Updated those commands to use `find` with safer quoting.
- The retention script searched recursively and did not constrain matches to diagnostic directories. Updated the `find` commands to operate on first-level directories under the storage root and to group the pre/post name predicates correctly.

## Review Notes
- The post is technically relevant and contains implementation details, so it was reviewed as a code/operations guide.
- The snippets pass `bash -n` after the corrections.
- The workflow assumes SSH access and passwordless or otherwise usable sudo on remote Calico nodes. That is operationally reasonable for a team runbook but should be documented in local team procedures.
