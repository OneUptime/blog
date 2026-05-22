# Validation Summary: How to Use the file Provisioner in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform file provisioner
- Terraform remote-exec provisioner
- Terraform connection blocks over SSH and WinRM
- Terraform `templatefile()` function
- AWS EC2 examples
- Linux file permissions, systemd, TLS certificates, and Docker Compose

## Sources Consulted
- HashiCorp Terraform provisioners documentation: https://developer.hashicorp.com/terraform/language/provisioners
- HashiCorp Terraform resource/provisioner block reference: https://developer.hashicorp.com/terraform/language/block/resource
- HashiCorp Terraform `templatefile()` function documentation: https://developer.hashicorp.com/terraform/language/functions/templatefile
- HashiCorp Terraform file provisioner implementation: https://raw.githubusercontent.com/hashicorp/terraform/main/internal/builtin/provisioners/file/resource_provisioner.go
- Docker Compose CLI reference: https://docs.docker.com/reference/cli/docker/compose/
- systemd `systemctl` manual mirror: https://man.he.net/man1/systemctl

## Issues Found
- The destination description said file uploads must always use a full path including the filename. HashiCorp documents that the remote system evaluates the path and, for SSH, Terraform passes the path to remote `scp`; the wording was adjusted to recommend a filename path without overstating it as an absolute rule.
- A directory-upload comment said it uploaded the entire `scripts` directory while the example used a trailing slash. HashiCorp documents that a trailing slash copies the directory contents, so the comment now says it uploads the contents.
- The limitations section said the file provisioner does not follow or create symbolic links. Terraform's implementation uses normal filesystem stat/open behavior for the source, so local symlinks are not best described that way. The limitation now says symlinks are not preserved as links on the remote machine and recommends packaging with `tar` when preservation is required.

## Review Notes
- The post correctly explains that provisioners require connection settings for remote access, that Terraform executes multiple provisioners in order, and that trailing slashes affect directory upload behavior.
- HashiCorp recommends provisioners only when purpose-built alternatives such as cloud-init, images, or configuration management are not suitable; the post's alternatives section aligns with this guidance.
- The TLS private key example is syntactically valid, but private keys generated or referenced in Terraform can still appear in Terraform state depending on the resource and provider behavior. A future revision could add a security caveat without changing the core tutorial.
