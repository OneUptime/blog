# Validation Summary: How to Set Up Packer with Docker Builder on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- HashiCorp Packer
- Packer Docker builder plugin
- Docker Engine
- Red Hat Universal Base Image 9
- Packer shell, file, and Ansible provisioners
- Packer Docker post-processors
- GitLab CI

## Sources Consulted
- HashiCorp Packer Docker builder documentation: https://developer.hashicorp.com/packer/integrations/hashicorp/docker/latest/components/builder/docker
- HashiCorp Packer Docker post-processors tutorial: https://developer.hashicorp.com/packer/tutorials/docker-get-started/docker-get-started-post-processors
- HashiCorp Packer Docker push post-processor documentation: https://developer.hashicorp.com/packer/integrations/hashicorp/docker/latest/components/post-processor/docker-push
- HashiCorp Packer Docker tag post-processor documentation: https://developer.hashicorp.com/packer/integrations/hashicorp/docker/latest/components/post-processor/docker-tag
- HashiCorp Packer CLI installation documentation: https://developer.hashicorp.com/packer/tutorials/docker-get-started/get-started-install-cli
- Docker Engine installation on RHEL documentation: https://docs.docker.com/engine/install/rhel/
- Red Hat RHEL 9 container tools documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/building_running_and_managing_containers/
- Red Hat UBI image documentation and catalog references: https://access.redhat.com/articles/4238681 and https://catalog.redhat.com/en/software/containers/ubi9/ubi/615bcf606feffc5384e8452e
- HashiCorp Packer Ansible provisioner documentation: https://developer.hashicorp.com/packer/integrations/hashicorp/ansible/latest/components/provisioner/ansible

## Issues Found
- The prerequisites said Docker or Podman could be installed. The Packer Docker builder documentation states that the builder requires Docker Engine, while Podman alternatives can have non-equivalent options. Changed the prerequisite to Docker Engine installed.
- The Docker installation command used `sudo dnf install -y docker`, which is not the Docker Engine installation path documented by Docker for RHEL. Replaced it with Docker's RHEL RPM repository setup and `docker-ce` package installation commands.
- The examples used `redhat/ubi9:latest`. Red Hat's documented UBI 9 image name is `registry.access.redhat.com/ubi9/ubi:latest` for unauthenticated pulls. Updated all UBI 9 references.
- The Docker builder `changes` example used `ENV APP_ENV=production`. HashiCorp's Docker builder documentation specifies Docker commit metadata changes with the `ENV KEY value` form. Updated it to `ENV APP_ENV production`.
- The registry push example used separate sibling `docker-tag` and `docker-push` post-processors. HashiCorp documents that sequential post-processing must use a plural `post-processors` block so the push receives the tagged artifact. Wrapped the tag and push steps in a `post-processors` block.
- The "Multi-Stage Builds" heading described a multiple-source Packer build, not a Docker multi-stage build. Renamed it to "Multi-Image Builds" and adjusted the lead sentence.

## Review Notes
Packer was not installed in the local workspace, so `packer validate` could not be run. The snippets were reviewed against official documentation and checked statically for syntax and configuration accuracy.
