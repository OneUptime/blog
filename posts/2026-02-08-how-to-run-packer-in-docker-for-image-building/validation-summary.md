# Validation Summary: How to Run Packer in Docker for Image Building

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- HashiCorp Packer
- Docker and Docker CLI
- Packer HCL templates
- Packer Amazon and Docker plugins
- AWS AMI image builds
- GitHub Actions CI/CD

## Sources Consulted
- HashiCorp Packer init command reference: https://developer.hashicorp.com/packer/docs/commands/init
- HashiCorp Packer Amazon EBS builder reference: https://developer.hashicorp.com/packer/plugins/builders/amazon/ebs
- HashiCorp Packer Docker builder reference: https://developer.hashicorp.com/packer/integrations/hashicorp/docker/latest/components/builder/docker
- HashiCorp Packer Docker tag post-processor reference: https://developer.hashicorp.com/packer/integrations/hashicorp/docker/latest/components/post-processor/docker-tag
- HashiCorp Packer Docker image on Docker Hub: https://hub.docker.com/r/hashicorp/packer/
- Docker run CLI reference: https://docs.docker.com/reference/cli/docker/container/run/
- GitHub Actions dependency caching reference: https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/caching-dependencies-to-speed-up-workflows
- Local verification with `docker run --rm hashicorp/packer:latest version`, `packer init`, and `packer validate -syntax-only` in the official Packer container.

## Issues Found
- The GitHub Actions example pinned `hashicorp/packer:1.10.0`, which is outdated relative to the current official Packer Docker image. Updated the CI example to `hashicorp/packer:1.15.4`, verified locally from the official `hashicorp/packer:latest` image.
- The GitHub Actions workflow did not mount the host plugin cache directory into the Packer container, so plugins downloaded by `packer init` would not be reused by later container invocations. Added `-v ~/.config/packer/plugins:/root/.config/packer/plugins` to the CI Docker commands.
- The GitHub Actions cache snippet used `~/.packer.d/plugins`, but current Packer documentation lists `$HOME/.config/packer/plugins` as the default Unix plugin directory. Updated the cache path to `~/.config/packer/plugins`.

## Review Notes
- The AWS and Docker Packer HCL snippets passed `packer validate -syntax-only` after `packer init` with the current official Packer container.
- Mounting `/var/run/docker.sock` is technically correct for the Docker builder, but it gives the container access to the host Docker daemon. The post already frames this as a Docker image build requirement; future revisions could call out the security implication more explicitly.
