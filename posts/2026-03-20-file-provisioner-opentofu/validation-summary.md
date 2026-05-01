# Validation Summary: How to Use the file Provisioner in OpenTofu - Opentofu

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu
- OpenTofu provisioners (`file` and `remote-exec`)
- SSH
- WinRM
- HCL
- Infrastructure as Code

## Sources Consulted
- OpenTofu file provisioner documentation: https://opentofu.org/docs/language/resources/provisioners/file/
- OpenTofu remote-exec provisioner documentation: https://opentofu.org/docs/language/resources/provisioners/remote-exec/
- OpenTofu provisioner connection settings documentation: https://opentofu.org/docs/language/resources/provisioners/connection/
- OpenTofu provisioners syntax documentation: https://opentofu.org/docs/language/resources/provisioners/syntax/
- OpenTofu `templatefile` function documentation: https://opentofu.org/docs/language/functions/templatefile/

## Issues Found
- The basic syntax section incorrectly implied that the `file` provisioner requires SSH specifically. I changed that line to say a connection is required and that the example uses SSH, because the official OpenTofu documentation states that the `file` provisioner supports both `ssh` and `winrm`.
- The directory upload section omitted two documented behaviors: with `ssh`, the destination directory must already exist, and a trailing slash on `source` copies the directory contents into the destination instead of nesting the directory name. I updated the explanation and changed the example destination to `/tmp` so the example matches the documented behavior on a typical Unix host.
- The wildcard limitation was rephrased to match the documented contract more precisely: `source` accepts a single file or directory path.

## Review Notes
- The remaining examples and explanations are consistent with the current OpenTofu provisioner documentation.
- The statement about binary file support is consistent with the documented SSH `scp` transfer path and the WinRM base64 decode workflow, although the file provisioner documentation does not call it out as a separate bullet.
- OpenTofu documentation recommends using provisioners only as a last resort; the post's conclusion is aligned with that guidance.
