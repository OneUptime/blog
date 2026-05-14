# Validation Summary: How to Map the Calico REST API to Real Kubernetes Traffic

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Kubernetes API and watches
- Calico API server and projectcalico.org/v3 resources
- Calico NetworkPolicy and GlobalNetworkPolicy
- Calico IPPool and IPAM
- calicoctl
- Kubernetes Python client
- Bash, curl, jq, and bc

## Sources Consulted
- Calico API server documentation: https://docs.tigera.io/calico/latest/operations/install-apiserver
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico component architecture reference: https://docs.tigera.io/calico/latest/reference/architecture/overview
- Calico calicoctl IPAM show reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Kubernetes API concepts and watch behavior: https://kubernetes.io/docs/reference/using-api/api-concepts/

## Issues Found
- The architecture diagrams implied REST API calls propagate directly to Felix through Typha. Updated them to show resource storage in the Kubernetes datastore, then observation by Typha/Felix, with Typha described as optional depending on deployment.
- The post claimed every REST API resource management call affects traffic and that policy automation has immediate sub-second impact. Narrowed this to policy and IP pool changes and described enforcement as occurring after Felix observes the datastore update and programs the dataplane, commonly within seconds.
- Scenario 2 labeled pod watching as a Calico REST API watch, but the code uses the Kubernetes CoreV1 API to watch Pods. Updated the diagram label.
- The Python controller could fail when `pod.metadata.labels` was unset and could generate a selector using `None` for pods without an `app` label. Added label defaulting and an `app` guard before creating the policy.
- The IPAM utilization command searched for a nonexistent `utilization` field in `calicoctl ipam show` output. Replaced it with parsing for the `IPS IN USE` percentage from Calico's documented table output and added a default of `0`.
- The audit watch attempted to derive a modifying user from `kubectl.kubernetes.io/last-applied-configuration`, which does not represent the watch event actor. Removed the unused and incorrect `USER` extraction.

## Review Notes
The `kubectl` binary is not installed in this workspace, so `kubectl create token` could not be checked locally with `--help`; the command form was reviewed against Kubernetes behavior conceptually and left unchanged. The post assumes Calico API server mode; current Calico documentation notes that the aggregated `calico-apiserver` is deprecated for new installations in favor of native v3 CRDs, but the post's prerequisite explicitly says the API server is deployed.
