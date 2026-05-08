# Validation Summary: How to Validate Calicoctl etcd Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- calicoctl
- etcd and etcdctl
- TLS certificates
- OpenSSL
- Bash
- YAML

## Sources Consulted
- Calico documentation: Configure calicoctl to connect to an etcd datastore: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/etcd
- Calico documentation: Configure calicoctl: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/overview
- Calico documentation: calicoctl user reference and resource aliases: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico documentation: calicoctl get command: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: calicoctl apply command: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico documentation: GlobalNetworkSet resource: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkset
- Calico documentation: FelixConfiguration resource: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- etcd documentation: How to check cluster status: https://etcd.io/docs/v3.5/tutorials/how-to-check-cluster-status/
- etcd documentation: v3.6 configuration and TLS options: https://etcd.io/docs/v3.6/op-guide/configuration/

## Issues Found
- The YAML validation example used `import yaml` without listing PyYAML as a prerequisite. Added Python with PyYAML to the prerequisites.
- The configuration validation only grepped for field names and did not verify that `spec.datastoreType` is set to `etcdv3` or that `spec.etcdEndpoints` is populated. Replaced it with a small PyYAML-based check that validates the CalicoAPIConfig `spec` fields documented by Calico.
- The private key matching example used RSA modulus comparison, which fails for non-RSA keys. Replaced it with a public-key digest comparison using `openssl pkey`, which works across common key types supported by OpenSSL.
- The write validation example always printed `Write validation: OK` after the commands, even if `apply`, `get`, or `delete` failed. Updated it to report failure when validation commands fail and to clean up the temporary resource after a successful create.
- The full validation script used `eval` and unquoted environment variables for certificate checks, which could produce incorrect results or shell parsing problems. Reworked the helper to execute commands directly with quoted arguments and added an etcd endpoint health check.

## Review Notes
The calicoctl resource names, `get` and `apply` command usage, GlobalNetworkSet manifest shape, FelixConfiguration `default` resource reference, and etcdctl `endpoint health` / `member list` usage are consistent with official documentation. Calico documentation notes that newer Kubernetes-based deployments often prefer the Calico API server and `kubectl` for most operations, but this post is specifically scoped to clusters using an etcd datastore and remains technically relevant.
