# Validation Summary: How to Use Ansible to Configure GCP Cloud NAT

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Google Cloud Platform
- Cloud NAT
- Cloud Router
- Google Cloud CLI
- VPC networking

## Sources Consulted
- Ansible `google.cloud` collection documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/index.html
- Ansible `google.cloud.gcp_compute_router` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_compute_router_module.html
- Ansible `google.cloud.gcp_compute_address` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_compute_address_module.html
- Ansible `google.cloud.gcp_compute_subnetwork` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_compute_subnetwork_module.html
- Google Cloud NAT overview: https://cloud.google.com/nat/docs/overview
- Google Cloud Public NAT setup guide: https://cloud.google.com/nat/docs/set-up-manage-network-address-translation
- Google Cloud CLI `gcloud compute routers nats create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/routers/nats/create
- Google Cloud CLI `gcloud compute routers nats update` reference: https://cloud.google.com/sdk/gcloud/reference/compute/routers/nats/update
- Google Cloud CLI `gcloud auth activate-service-account` reference: https://cloud.google.com/sdk/gcloud/reference/auth/activate-service-account
- Google Cloud NAT logs and metrics documentation: https://cloud.google.com/nat/docs/monitoring

## Issues Found
- The post used a nonexistent `google.cloud.gcp_compute_router_nat` Ansible module. The current official `google.cloud` collection documentation lists router, address, network, and subnetwork modules, but not a Cloud NAT module. Replaced the NAT module examples with Ansible `ansible.builtin.command` tasks that call documented `gcloud compute routers nats describe` and `gcloud compute routers nats create` commands.
- The prerequisites said Ansible 2.10+ was sufficient for the current `google.cloud` collection. The official collection documentation states current support for ansible-core 2.16.0 or newer, so the prerequisite was updated.
- The NAT examples assumed Ansible module fields such as `nat_ip_allocate_option`, `source_subnetwork_ip_ranges_to_nat`, `subnetworks`, and `log_config`. These were replaced with official `gcloud` flags such as `--auto-allocate-nat-external-ips`, `--nat-all-subnet-ip-ranges`, `--nat-custom-subnet-ip-ranges`, `--enable-logging`, and `--log-filter`.
- The static IP example passed reserved IP selfLinks to the nonexistent NAT module. It now passes the reserved address resource names to `--nat-external-ip-pool`, matching the `gcloud compute routers nats create` reference examples.
- The basic NAT debug output referenced `nat_config.name`, which is not returned by an Ansible command result. It now prints the configured NAT name directly.

## Review Notes
The Cloud NAT conceptual explanation, regional behavior, relationship with Cloud Router, no unsolicited inbound connection behavior, logging/monitoring metric names, and static IP allowlisting guidance are consistent with Google Cloud documentation. The examples now depend on both the `google.cloud` Ansible collection and the Google Cloud CLI.
