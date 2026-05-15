# Validation Summary: How to Install and Configure OpenShift Local (CRC) on RHEL 9

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Red Hat OpenShift Local
- CRC CLI
- OpenShift CLI (`oc`)
- OpenShift projects, applications, services, and routes

## Sources Consulted
- Red Hat OpenShift Local 2.35 Getting Started Guide: https://docs.redhat.com/en/documentation/red_hat_openshift_local/2.35/html/getting_started_guide/
- Red Hat OpenShift Local access and CLI guidance: https://docs.redhat.com/en/documentation/red_hat_openshift_local/2.35/html/getting_started_guide/accessing_the_openshift_cluster
- Red Hat OpenShift Local installation guidance: https://docs.redhat.com/en/documentation/red_hat_openshift_local/2.35/html/getting_started_guide/installing_gsg
- Red Hat Migration Toolkit for Applications documentation section covering OpenShift Local command flags: https://docs.redhat.com/en/documentation/migration_toolkit_for_applications/7.3/html-single/user_interface_guide/user_interface_guide
- CRC upstream documentation: https://crc.dev/docs/using/

## Issues Found
- The prerequisite memory value was listed as 9 GB RAM. Current Red Hat OpenShift Local documentation lists 10.5 GB available memory for the OpenShift Container Platform preset, so the prerequisite was updated.
- The prerequisite CPU wording was clarified from 4 CPU cores to 4 physical CPU cores to match Red Hat's documented requirement.
- NetworkManager was missing from the RHEL/Linux prerequisites. Red Hat lists NetworkManager as a required Linux package, so it was added.
- The `oc login` example assumed `developer` as a fixed password. Current Red Hat documentation instructs users to use the password printed by `crc start` or shown by `crc console --credentials`, so the command was changed to prompt for the password and a note was added.
- The conclusion described OpenShift Local as a "full OpenShift experience." Since OpenShift Local is a local, single-node development environment with differences from production OpenShift, this was changed to "local OpenShift experience."

## Review Notes
The remaining CRC commands (`crc setup`, `crc start -p`, `crc oc-env`, `crc console`, `crc stop`, and `crc delete`) are valid. The `-p` flag is still documented as the short form of `--pull-secret-file`.
