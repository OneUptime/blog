# Validation Summary: How to Configure Specific IP Assignment with Calico IPAM

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico IPAM
- Calico IP pools
- Calico CNI pod annotations
- calicoctl
- Kubernetes Pods

## Sources Consulted
- Calico documentation, "Use a specific IP address with a pod": https://docs.tigera.io/calico/latest/networking/ipam/use-specific-ip
- Calico CNI plugin configuration reference, "Requesting a specific IP address": https://docs.tigera.io/calico/latest/reference/configure-cni-plugins
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- calicoctl `ipam show` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- calicoctl `ipam check` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check

## Issues Found
- The post described specific pod IP assignment but only showed a generic `IPPool` resource. I replaced the example with a Kubernetes Pod manifest using the documented `cni.projectcalico.org/ipAddrs` annotation.
- The prerequisites did not explicitly require Calico IPAM, even though Calico documents that specific pod IP assignment with `ipAddrs` requires the cluster to use Calico IPAM. I added that prerequisite.
- The configuration section did not state the key constraints for manual assignment. I added that the requested IP must be in a configured Calico IP pool, unused, and present on the pod at creation time.
- The configuration commands did not show how to check a specific requested IP. I added `calicoctl ipam show --ip=10.48.0.10`, which is documented for checking whether an IP address is in use.

## Review Notes
The existing `calicoctl get ippools -o yaml`, `calicoctl ipam show --show-blocks`, `calicoctl ipam check -o ipam-report.json`, and `kubectl get pods -A -o wide` commands are valid for inspecting IP pools, block usage, IPAM consistency, and resulting pod IPs. The example uses a direct Pod manifest because the annotation must exist when the pod is created.
