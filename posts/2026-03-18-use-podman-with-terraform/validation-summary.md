# Validation Summary: How to Use Podman with Terraform

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Podman
- Terraform
- Terraform Docker provider (`kreuzwerker/docker`)
- Terraform HCL
- systemd user socket activation

## Sources Consulted
- Podman `podman system service` documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman API reference: https://docs.podman.io/en/latest/_static/api.html
- Terraform Docker provider overview: https://raw.githubusercontent.com/kreuzwerker/terraform-provider-docker/master/docs/index.md
- Terraform Docker provider `docker_container` resource docs: https://raw.githubusercontent.com/kreuzwerker/terraform-provider-docker/master/docs/resources/container.md
- Terraform Docker provider `docker_image` resource docs: https://raw.githubusercontent.com/kreuzwerker/terraform-provider-docker/master/docs/resources/image.md
- Terraform Docker provider `docker_network` resource docs: https://raw.githubusercontent.com/kreuzwerker/terraform-provider-docker/master/docs/resources/network.md
- Terraform Docker provider `docker_volume` resource docs: https://raw.githubusercontent.com/kreuzwerker/terraform-provider-docker/master/docs/resources/volume.md
- Terraform Docker provider `docker_registry_image` data source docs: https://raw.githubusercontent.com/kreuzwerker/terraform-provider-docker/master/docs/data-sources/registry_image.md
- Terraform `abspath` function docs: https://developer.hashicorp.com/terraform/language/functions/abspath
- Terraform named values docs (`path.root`, `path.module`, `path.cwd`): https://developer.hashicorp.com/terraform/language/expressions/references
- Terraform variable block docs (`sensitive`): https://developer.hashicorp.com/terraform/language/block/variable
- Terraform sensitive variables tutorial: https://developer.hashicorp.com/terraform/tutorials/configuration-language/sensitive-variables
- Terraform Registry Podman providers: https://registry.terraform.io/providers/Project0/podman/latest
- Terraform Registry Podman providers: https://registry.terraform.io/providers/blechschmidt/podman/latest

## Issues Found
- The post said Terraform does not have a dedicated Podman provider. I corrected this to note that the Terraform Registry includes community Podman providers, while the Docker provider remains a practical option because Podman exposes a Docker-compatible API socket.
- The socket verification example used a Podman-native Libpod endpoint while describing the Docker-compatible API socket. I changed it to `curl --unix-socket "$XDG_RUNTIME_DIR/podman/podman.sock" http://d/_ping`, which matches the documented compatibility endpoint and directly verifies the socket.
- The provider example used a default `uid = "1000"` without explaining that this is only correct for users whose actual UID is 1000. I added a clarification telling readers to set `uid` to their real user ID when the default does not match.
- The application image example ignored `app_version` and defaulted to a mutable `latest` tag. I changed `docker_image.app` to use `myapp:${var.app_version}` and made `app_version` required so the example now uses an explicit version.
- The Nginx bind-mount example used `abspath("./nginx/conf.d")`, which resolves from Terraform's current working directory. I changed it to `path.root` so the path follows the root module location more reliably.
- The module example passed an image name directly into `docker_container.image`, even though the provider documentation describes this argument as the image ID. I renamed the module input to `image_id` and updated the example to pass `docker_image.app.image_id`.
- The "Variables and Secrets" section did not mention that `sensitive = true` only redacts CLI output. I added the missing caveat that Terraform still stores sensitive values in state.

## Review Notes
- Review was documentation-driven because this workspace does not have `terraform` or `podman` installed, so I could not execute the examples locally.
- The setup instructions are Linux/systemd-specific. That is now stated explicitly, which matters because `podman system service` is not available when `podman` is executed directly on macOS or Windows hosts.
- The remaining image examples use version tags rather than immutable digests. They are valid, but digest pinning would make repeated deployments more reproducible in the future.
