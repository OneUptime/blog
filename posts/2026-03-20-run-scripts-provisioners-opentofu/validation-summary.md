# Validation Summary: How to Run Scripts with Provisioners in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu provisioners
- OpenTofu `local-exec`
- OpenTofu `remote-exec`
- OpenTofu `file` provisioner
- OpenTofu SSH and WinRM connection blocks
- AWS EC2 and S3 examples
- AWS CLI `s3 cp`
- Bash, Python, and PowerShell scripts
- Consul Catalog HTTP API

## Sources Consulted
- OpenTofu local-exec provisioner documentation: https://opentofu.org/docs/language/resources/provisioners/local-exec/
- OpenTofu remote-exec provisioner documentation: https://opentofu.org/docs/language/resources/provisioners/remote-exec/
- OpenTofu file provisioner documentation: https://opentofu.org/docs/language/resources/provisioners/file/
- OpenTofu provisioner connection settings: https://opentofu.org/docs/language/resources/provisioners/connection/
- OpenTofu provisioners syntax and behavior: https://opentofu.org/docs/language/resources/provisioners/syntax/
- AWS CLI `s3 cp` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html
- Consul Catalog HTTP API documentation: https://developer.hashicorp.com/consul/api-docs/catalog
- Terraform local-exec provisioner documentation for shell injection guidance: https://developer.hashicorp.com/terraform/language/resources/provisioners/local-exec

## Issues Found
- The Consul registration example used `curl -X POST`, but the Consul Catalog register endpoint is `PUT /v1/catalog/register`. Changed it to `curl -X PUT`.
- The Consul registration payload used the EC2 instance ID as the node `Address`. Consul expects an address value, so the example now passes `self.private_ip` as `PRIVATE_IP` and uses that for `Address`.
- The Linux `remote-exec` inline example did not enable shell failure propagation for earlier inline commands. Added `set -e` as the first inline command so failures stop the script instead of being masked by later commands.
- The Python `local-exec` example used `interpreter = ["python3", "-c"]` while also setting `command = "python3 .../configure.py"`. With `-c`, Python treats the command string as source code, so the example would not run the script. Removed the interpreter override and kept the shell command.
- The interpreter options snippet defined multiple `interpreter` attributes in a single provisioner block, which is invalid HCL. Split it into separate provisioner examples and adjusted the Python and PowerShell commands to match their interpreters.
- The conclusion described the injection guidance as avoiding "shell variable interpolation." Reworded it to refer specifically to interpolating OpenTofu values directly into shell command strings.

## Review Notes
Provisioners are still correctly framed as a last-resort mechanism. The examples assume supporting variables, providers, credentials, executable script permissions, reachable instances, and host configuration such as SSH or WinRM availability are supplied elsewhere.
