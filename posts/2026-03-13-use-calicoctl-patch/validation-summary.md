# Validation Summary: calicoctl Command Guide - Patch

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- calicoctl
- Kubernetes networking
- Calico FelixConfiguration
- Calico IPAM and diagnostics commands

## Sources Consulted
- Calico calicoctl user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico calicoctl validate reference: https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico calicoctl node diags reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/diags
- Calico calicoctl cluster diags reference: https://docs.tigera.io/calico/latest/reference/calicoctl/cluster/diags

## Issues Found
- The command reference described `calicoctl apply` as "create or update". Official Calico documentation describes `apply` as creating a resource if it does not exist and replacing the resource specification in its entirety if it already exists. Changed the wording to "create or replace" to avoid implying a partial update.

## Review Notes
The `calicoctl patch` example uses the documented `-p`/`--patch` JSON format and a valid FelixConfiguration field, `logSeverityScreen`. The `calicoctl validate -f resource.yaml` command is documented as an offline validation command. The diagnostic commands listed are valid calicoctl command families, but `calicoctl node diags` is node-local while `calicoctl cluster diags` can be run from a location with cluster access.
