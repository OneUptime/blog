# Validation Summary: How to Deploy Portainer on Oracle Cloud Free Tier

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Oracle Cloud Infrastructure (OCI)
- OCI Always Free tier
- Terraform
- Oracle Terraform provider (`oracle/oci`)
- Docker
- Portainer CE

## Sources Consulted
- Oracle Cloud Infrastructure Free Tier: https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier.htm
- Oracle Cloud Infrastructure Always Free Resources: https://docs.oracle.com/en-us/iaas/Content/FreeTier/resourceref.htm
- Oracle Cloud Infrastructure Compute Shapes: https://docs.oracle.com/en-us/iaas/Content/Compute/References/computeshapes.htm
- Oracle Cloud Infrastructure Security Lists: https://docs.oracle.com/en-us/iaas/Content/Network/Concepts/securitylists.htm
- Terraform Registry, `oracle/oci` provider: https://registry.terraform.io/providers/oracle/oci/latest
- Terraform Registry, `oci_core_instance`: https://registry.terraform.io/providers/oracle/oci/latest/docs/resources/core_instance
- Terraform Registry, `oci_core_security_list`: https://registry.terraform.io/providers/oracle/oci/latest/docs/resources/core_security_list
- HashiCorp Terraform `pathexpand` function: https://developer.hashicorp.com/terraform/language/functions/pathexpand
- Docker Docs, Install Docker Engine on Ubuntu: https://docs.docker.com/engine/install/ubuntu/
- Portainer Docs, Install Portainer CE with Docker on Linux: https://docs.portainer.io/2.33-lts/start/install-ce/server/docker/linux

## Issues Found
- The opening OCI Free Tier summary used `vCPU` wording and implied the Arm allocation as a flat per-instance quantity. I updated it to OCI's current OCPU terminology and clarified that the 4 OCPUs and 24 GB are total free-tier Arm resources across instances.
- The Terraform provider snippet pinned `oracle/oci` to `~> 5.0`, while the current Terraform Registry documentation is on the 8.x provider line. I updated the example to `~> 8.0` so the post reflects the current provider major version.
- The provider block hardcoded `us-ashburn-1`. Oracle's Free Tier documentation states that Always Free compute instances must be created in the tenancy's home region, so I changed the example to `region = var.region` and updated the summary text accordingly.
- The SSH key example used `file("~/.ssh/id_rsa.pub")`, which relies on shell-style `~` expansion. Terraform documents `pathexpand()` for home-directory expansion, so I changed this to `file(pathexpand("~/.ssh/id_rsa.pub"))`.
- The custom OCI security list example only defined ingress on port `9443` and omitted any egress rule. I added a stateful allow-all egress rule so the instance can reach Ubuntu package repositories and container registries during bootstrap.

## Review Notes
- Portainer's current Docker install documentation exposes `9443` for the UI and `8000` optionally for Edge agents. The post's `9443`-only example is technically valid for a basic local Portainer deployment.
- Docker's convenience install script at `get.docker.com` is still documented by Docker, but Docker does not recommend it for production environments. It is acceptable here as a simple bootstrap method for a small self-hosted VM.
- The Terraform snippets are partial examples and still assume surrounding VCN, subnet, variable, and data-source definitions exist elsewhere in the configuration.
