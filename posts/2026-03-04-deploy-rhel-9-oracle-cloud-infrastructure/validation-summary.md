# Validation Summary: How to Deploy RHEL on Oracle Cloud Infrastructure

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Oracle Cloud Infrastructure Compute
- OCI CLI
- OCI custom images / BYOI
- OCI security lists
- OCI block volumes
- Oracle Cloud Agent
- firewalld

## Sources Consulted
- Oracle Cloud Infrastructure Platform Images: https://docs.oracle.com/en-us/iaas/Content/Compute/References/images.htm
- Oracle Cloud Infrastructure Bring Your Own Image: https://docs.oracle.com/en-us/iaas/Content/Compute/References/bringyourownimage.htm
- Oracle OCI CLI compute instance launch command reference: https://docs.oracle.com/en-us/iaas/tools/oci-cli/latest/oci_cli_docs/cmdref/compute/instance/launch.html
- Oracle OCI CLI compute image list command reference: https://docs.oracle.com/en-us/iaas/tools/oci-cli/latest/oci_cli_docs/cmdref/compute/image/list.html
- Oracle OCI CLI security-list command reference: https://docs.oracle.com/en-us/iaas/tools/oci-cli/latest/oci_cli_docs/cmdref/network/security-list.html
- Oracle Cloud Agent documentation: https://docs.oracle.com/en-us/iaas/Content/Compute/Tasks/manage-plugins.htm
- Oracle OCI CLI installation documentation: https://docs.oracle.com/en-us/iaas/Content/API/SDKDocs/cliinstall.htm
- Oracle blog, RHEL runs on OCI supported by Oracle and Red Hat: https://blogs.oracle.com/cloud-infrastructure/post/red-hat-enterprise-linux-supported-oci
- Red Hat RHEL 9 image builder documentation for OCI images: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/composing_a_customized_rhel_system_image/index

## Issues Found
- The post stated that OCI supports RHEL as a platform image. Oracle's platform image documentation lists Oracle Linux, Ubuntu, and Windows families, while RHEL is documented through imported custom images/BYOI and Red Hat image builder workflows. I changed the introduction and image lookup comment to refer to imported RHEL custom images.
- The SSH command used `opc@<public-ip>`. Oracle's RHEL-on-OCI guidance uses the RHEL cloud image default user `cloud-user`, so I changed the SSH command to `ssh cloud-user@<public-ip>`.
- The security-list command was described as adding an ingress rule, but `oci network security-list update` updates the security list rule set. I changed the comment to say it replaces ingress rules and added `--force` so the command can run non-interactively.
- The OCI CLI installation used `pip3 install oci-cli` after installing `python3-pip`. Oracle's current quickstart recommends the Linux installer script for non-Oracle-Linux environments. I replaced the commands with the official installer script using `--accept-all-defaults`.
- The monitoring section installed `oracle-cloud-agent` directly from DNF and used an undocumented local `agent ctl start --plugin` command. Oracle documents manually installing Oracle Cloud Agent from an available RPM for non-standard images and enabling plugins through Console/API/CLI agent configuration. I changed the example to install a provided RPM and enable the Compute Instance Monitoring plugin with `oci compute instance update --agent-config`.

## Review Notes
The block volume path `/dev/oracleoci/oraclevdb` is plausible for OCI paravirtualized volume attachments, but device names can vary by attachment order. The security-list example is now technically accurate but intentionally narrow; in production, preserve existing ingress rules or use Network Security Groups for instance-scoped access control.
