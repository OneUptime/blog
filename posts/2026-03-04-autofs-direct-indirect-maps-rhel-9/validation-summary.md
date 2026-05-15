# Validation Summary: How to Set Up Direct and Indirect autofs Maps on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- autofs
- Direct and indirect automount maps
- NFS mount map entries
- systemd service management

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Mounting file systems on demand": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems#mounting-file-systems-on-demand_managing-file-systems
- Red Hat Enterprise Linux 9 documentation, "The autofs configuration files": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems#the-autofs-configuration-files_mounting-file-systems-on-demand
- auto.master(5) Linux manual page: https://man7.org/linux/man-pages/man5/auto.master.5.html
- autofs(5) Linux manual page: https://man7.org/linux/man-pages/man5/autofs.5.html

## Issues Found
- The setup snippet registered `/etc/auto.shares` in the master map but did not create the referenced map file. Added a `sudo tee /etc/auto.shares` command with the `data` and `logs` entries so the example is complete and matches the documented `mount-point options location` map format.
- The post said you cannot have permanent content in the indirect parent directory. Existing directories can contain underlying files, but the active autofs mount controls that directory and hides or supersedes that content while mounted. Reworded the statement to advise not relying on permanent content alongside automounted subdirectories.

## Review Notes
The remaining indirect-map examples match the RHEL 9 documentation and autofs manual syntax. The title and description mention direct maps, but the current post content only demonstrates indirect maps; future edits could add a direct-map example using `/-` in the master map and full-path keys in the map file.
