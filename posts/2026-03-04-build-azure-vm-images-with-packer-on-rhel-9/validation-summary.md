# Validation Summary: How to Build Azure VM Images with Packer on RHEL

## Status
not-technically-relevant

## Post Type
Placeholder / incomplete tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- HashiCorp Packer
- Azure VM images
- systemd
- journalctl
- rpm

## Sources Consulted
- HashiCorp Packer documentation: https://developer.hashicorp.com/packer/docs
- HashiCorp Packer install documentation for Linux and CentOS/RHEL: https://developer.hashicorp.com/packer/install
- HashiCorp Packer Azure plugin documentation: https://developer.hashicorp.com/packer/plugins/builders/azure
- HashiCorp Packer builders overview: https://developer.hashicorp.com/packer/docs/builders
- Microsoft Learn, Create Linux Azure VM Images with Packer: https://learn.microsoft.com/en-us/azure/virtual-machines/linux/build-image-with-packer

## Issues Found
- The post title and description claim to explain how to build Azure VM images with Packer on RHEL, but the body contains no Packer installation steps, Packer template, Azure plugin configuration, Azure authentication setup, image build command, or Azure image output configuration.
- The command examples use unresolved placeholders such as `/etc/<service>/config.conf`, `<service-name>`, and `<package-name>`. These are generic service-management examples and are not valid instructions for building Azure VM images with Packer.
- The post starts at "Step 2" and omits the actual setup workflow. Because the existing content is a placeholder template rather than a technically accurate implementation guide, it cannot be corrected without replacing the article with a new post.
- No changes were made to `README.md` because the review instructions allow correcting technical inaccuracies but do not allow adding new sections or replacing the post wholesale.

## Review Notes
The general claim that Packer can create consistent machine images is accurate, but the article does not provide the required technical content for the stated topic. A future replacement should include official HashiCorp Packer installation steps for RHEL-compatible systems, an Azure plugin `required_plugins` block, a valid `azure-arm` source configuration, Azure authentication prerequisites, `packer init`, `packer validate`, and `packer build` usage.
