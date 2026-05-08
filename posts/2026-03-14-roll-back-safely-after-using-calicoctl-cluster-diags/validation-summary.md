# Validation Summary: Rolling Back Safely After Using calicoctl cluster diags

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- calicoctl
- Kubernetes
- Bash

## Sources Consulted
- Calico Open Source documentation: `calicoctl cluster diags` command, https://docs.tigera.io/calico/latest/reference/calicoctl/cluster/diags
- Calico Open Source documentation: `calicoctl apply` command, https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico Open Source documentation: `calicoctl` user reference, https://docs.tigera.io/calico/latest/reference/calicoctl/overview

## Issues Found
- The introduction said `calicoctl cluster diags` collects information only from the Calico datastore. The official command reference describes it as collecting diagnostic information and logs related to Calico, and the documented output includes Kubernetes resources and pod logs. Updated the wording to match the documented command behavior.
- The comparison script matched files only by basename, which could compare the wrong files or fail when diagnostic archives contain nested paths with repeated filenames. Updated it to compare YAML files by relative path within each extracted bundle and to handle paths safely with `find -print0`.
- The restore example assumed resource YAML files were at the root of the extracted bundle. Updated it to locate the relevant resource files inside the extracted diagnostics directory before applying them.
- The verification command used `calico-cluster-diags-*.tar.gz`, but the current Calico documentation shows `calicoctl cluster diags` writing `calico-diagnostics.tar.gz`. Updated the example command accordingly.

## Review Notes
The post is technically valid after the fixes. `calicoctl` was not installed in the local environment, so CLI behavior was verified against the official Calico command reference rather than local `--help` output.
