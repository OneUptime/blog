# Validation Summary: How to Manage RHEL Cloud Instances with Red Hat Satellite

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Red Hat Satellite
- Satellite host registration
- Activation keys
- Hammer CLI
- Satellite remote execution
- Errata and patch management

## Sources Consulted
- Red Hat Satellite 6.19 Managing hosts: registering hosts by using global registration: https://docs.redhat.com/en/documentation/red_hat_satellite/latest/html-single/managing_hosts/index
- Red Hat Satellite 6.19 Managing content: using activation keys for host registration: https://docs.redhat.com/en/documentation/red_hat_satellite/6.19/html/managing_content/managing_activation_keys_content-management
- Red Hat Satellite 6.19 Hammer reference: host-registration generate-command: https://docs.redhat.com/en/documentation/red_hat_satellite/6.19/html/hammer_reference/hammer-host-registration
- Red Hat Satellite 6.19 Managing content: applying errata by using CLI and remote execution: https://docs.redhat.com/en/documentation/red_hat_satellite/6.19/html/managing_content/managing_errata_content-management
- Red Hat Satellite 6.19 Release notes: deprecated features: https://docs.redhat.com/en/documentation/red_hat_satellite/6.19/html/release_notes/deprecated-features
- Red Hat Satellite 6.18 Overview, concepts, and deployment considerations: network ports: https://docs.redhat.com/en/documentation/red_hat_satellite/6.18/html/overview_concepts_and_deployment_considerations/networking-considerations-in-satellite

## Issues Found
- The post used the deprecated `katello-ca-consumer-latest.noarch.rpm` registration method and a direct `subscription-manager register --serverurl=...` command. Red Hat Satellite documentation now directs users to register hosts with the global registration template, generated from the Satellite UI, Hammer CLI, or API. I replaced the consumer RPM registration flow with a trusted CA setup step and a `hammer host-registration generate-command` example using an activation key.
- The prerequisites stated that cloud instances must reach Satellite on port `8443`. Current Satellite networking documentation lists port `8443` as deprecated for content host registration and only needed for older client hosts deployed before upgrades. I changed the prerequisite to require HTTPS port `443` and to refer readers to topology-specific additional ports for Capsule registration or HTTP callbacks.
- The client tools section referred to installing the Katello agent. Katello Agent is deprecated and Satellite uses remote execution for host package management. I changed the wording to install host tools and noted that remote execution SSH keys can be deployed during global registration.
- The Hammer CLI errata example used `hammer host errata apply` and described applying all available errata while passing a single erratum ID. Current Red Hat guidance applies errata through remote execution with `hammer job-invocation create --feature katello_errata_install`. I replaced the command with the current remote execution example and corrected the description to selected errata.

## Review Notes
The Satellite Client repository label shown for RHEL 9 x86_64 is valid, but the activation key should normally enable required repositories during registration. The post remains a concise example and does not cover Capsule-specific ports, pull-based remote execution, Red Hat Lightspeed/Insights setup, or compliance tooling configuration in depth.
