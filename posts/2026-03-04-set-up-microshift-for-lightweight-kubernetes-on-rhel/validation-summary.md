# Validation Summary: How to Set Up MicroShift for Lightweight Kubernetes on RHEL

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Red Hat Enterprise Linux
- Red Hat build of MicroShift
- Kubernetes
- CRI-O
- firewalld
- OpenShift CLI (`oc`)

## Sources Consulted
- Red Hat build of MicroShift 4.21 documentation: Installing with an RPM package: https://docs.redhat.com/en/documentation/red_hat_build_of_microshift/4.21/html-single/installing_with_an_rpm_package/index
- Red Hat build of MicroShift 4.21 documentation: CLI tools: https://docs.redhat.com/en/documentation/red_hat_build_of_microshift/4.21/html-single/cli_tools/cli_tools
- Red Hat build of MicroShift 4.14 documentation: Installing from an RPM package: https://docs.redhat.com/en/documentation/red_hat_build_of_microshift/4.14/html/installing/microshift-install-rpm
- Red Hat build of MicroShift 4.14 documentation: Using a firewall: https://docs.redhat.com/en/documentation/red_hat_build_of_microshift/4.14/html/networking/microshift-using-a-firewall

## Issues Found
- The post used MicroShift 4.14 repositories. Red Hat marks the 4.14 documentation as no longer maintained, so the repository example was updated to the current 4.21 repository naming and changed to `$(uname -m)` instead of hard-coded `x86_64`.
- The post installed `openshift-clients` with `dnf` on RHEL 9. Red Hat documents that installing `oc` as an RPM is not supported on RHEL 9, so the command was changed to install `microshift` only and the prerequisites now state that a matching `oc` binary must be installed separately.
- The install steps omitted the Red Hat pull secret setup required for CRI-O to pull MicroShift container images. Added the documented copy, ownership, and permission commands for `/etc/crio/openshift-pull-secret`.
- Firewall commands opened optional public ports without specifying the public zone. Updated port commands to use `--zone=public`, while keeping the documented trusted-source rules for MicroShift internal networking.
- The startup wait time said MicroShift may take a minute. Red Hat notes that first startup can take several minutes while images are downloaded and initialized, so the text and sleep duration were adjusted.
- The kubeconfig copy command used `sudo cp` and `chown`. Red Hat documents using `sudo cat ... > ~/.kube/config` followed by `chmod go-r`, so the commands were updated.
- The post claimed MicroShift typically uses around 500 MB of RAM at idle. I did not find an official current source for that fixed idle value, so it was replaced with a version- and workload-dependent sizing note.

## Review Notes
The guide now targets MicroShift 4.21 on RHEL 9. Systems on Extended Update Support releases may also need matching RHEL EUS repositories and an appropriate `subscription-manager release --set` value, depending on the chosen MicroShift/RHEL support matrix.
