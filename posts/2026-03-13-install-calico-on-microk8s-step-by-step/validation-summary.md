# Validation Summary: How to Install Calico on MicroK8s Step by Step

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- MicroK8s
- Kubernetes
- Calico CNI
- Calico NetworkPolicy
- calicoctl
- snap
- kubectl

## Sources Consulted
- MicroK8s CNI Configuration: https://microk8s.io/docs/change-cidr
- MicroK8s Get Started: https://microk8s.io/docs/getting-started
- MicroK8s Addons: https://microk8s.io/docs/addons
- MicroK8s Command Reference: https://microk8s.io/docs/command-reference
- Calico MicroK8s quickstart: https://docs.tigera.io/calico/latest/getting-started/kubernetes/microk8s
- Calico calicoctl install documentation: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico calicoctl configuration documentation: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/overview

## Issues Found
- The post described Calico as a MicroK8s add-on enabled with `microk8s enable calico`. Current MicroK8s documentation states that Calico is the default CNI from MicroK8s 1.19 onward, and the official add-ons list does not include a separate Calico add-on. I changed the post to say MicroK8s includes Calico by default and replaced the `microk8s enable calico` step with `microk8s status`.
- The introduction said the guide covered manual Calico installation for a specific Calico version, but the post only installs `calicoctl`. I changed that wording to say it covers installing `calicoctl`.
- The `calicoctl` install command wrote directly to `/usr/local/bin/calicoctl` and then ran `chmod` without `sudo`, which usually fails for non-root users. I changed the commands to download locally, make the binary executable, and then move it into `/usr/local/bin/` with `sudo`, matching the official Calico binary installation flow.
- The conclusion said Calico was installed using the built-in add-on system. I changed it to say MicroK8s was installed with its default Calico CNI configuration.

## Review Notes
The post uses MicroK8s `1.28/stable` and Calico `calicoctl` `v3.27.0` as examples. These commands are syntactically valid, but future updates should consider using currently supported MicroK8s channels and a `calicoctl` version that matches the Calico version deployed in the MicroK8s cluster.
